import { resolveTxt as nodeResolveTxt } from 'node:dns/promises';

// Deterministic cross-section of software, commerce, creator, infrastructure, and
// collaboration domains where automated email is a normal product function. This is
// intentionally a bounded probe, not a prevalence claim about the whole internet.
export const DEFAULT_EMAIL_AUTH_DOMAINS = [
  'github.com', 'gitlab.com', 'bitbucket.org', 'vercel.com', 'netlify.com', 'supabase.com',
  'digitalocean.com', 'cloudflare.com', 'render.com', 'fly.io', 'stripe.com', 'shopify.com',
  'squarespace.com', 'wix.com', 'gumroad.com', 'etsy.com', 'eventbrite.com', 'patreon.com',
  'substack.com', 'beehiiv.com', 'mailchimp.com', 'klaviyo.com', 'customer.io', 'intercom.com',
  'zendesk.com', 'hubspot.com', 'twilio.com', 'sendgrid.com', 'mailgun.com', 'postmarkapp.com',
  'brevo.com', 'notion.so', 'figma.com', 'canva.com', 'asana.com', 'airtable.com',
  'typeform.com', 'calendly.com', 'zapier.com', 'make.com', 'slack.com', 'dropbox.com',
  'zoom.us', 'miro.com', 'monday.com', 'linear.app', 'freshworks.com', 'atlassian.com',
];

const ESP_MARKERS = [
  'sendgrid.net', 'mailgun.org', 'mailgun.com', 'amazonses.com', 'mandrillapp.com',
  'sparkpostmail.com', 'postmarkapp.com', 'mailjet.com', 'sendinblue.com', 'brevo.com',
  'hubspotemail.net', 'klaviyomail.com', 'customer.io',
];

function flattenTxt(records) {
  return (records ?? []).map((parts) => parts.join('')).filter(Boolean);
}

function withTimeout(promise, ms = 4000) {
  let timer;
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      timer = setTimeout(() => reject(new Error(`DNS timeout after ${ms}ms`)), ms);
    }),
  ]).finally(() => clearTimeout(timer));
}

async function safeTxt(name, resolveTxt) {
  try {
    return { ok: true, records: flattenTxt(await withTimeout(resolveTxt(name))) };
  } catch (error) {
    const code = error?.code ?? null;
    if (['ENODATA', 'ENOTFOUND', 'NXDOMAIN'].includes(code)) return { ok: true, records: [] };
    return { ok: false, records: [], error: error instanceof Error ? error.message : String(error) };
  }
}

function analyzeDomain(domain, rootRecords, dmarcRecords) {
  const spf = rootRecords.filter((x) => /^v=spf1\b/i.test(x));
  const dmarc = dmarcRecords.filter((x) => /^v=dmarc1\b/i.test(x));
  const espMarkers = ESP_MARKERS.filter((marker) => spf.some((record) => record.toLowerCase().includes(marker)));

  const hardFailures = [];
  const risks = [];

  if (spf.length > 1) hardFailures.push('multiple_spf_records');
  if (dmarc.length > 1) hardFailures.push('multiple_dmarc_records');
  if (dmarcRecords.length > 0 && dmarc.length === 0) hardFailures.push('malformed_dmarc_record');

  if (dmarc.length === 0) risks.push('missing_dmarc');
  const dmarcPolicy = dmarc[0]?.match(/(?:^|;)\s*p=([^;\s]+)/i)?.[1]?.toLowerCase() ?? null;
  if (dmarcPolicy === 'none') risks.push('dmarc_monitoring_only');

  return {
    domain,
    spfCount: spf.length,
    dmarcCount: dmarc.length,
    dmarcPolicy,
    espMarkers,
    espSignaled: espMarkers.length > 0,
    hardFailures,
    risks,
  };
}

export async function executeEmailAuthDnsSample({
  domains = DEFAULT_EMAIL_AUTH_DOMAINS,
  resolveTxt = nodeResolveTxt,
  concurrency = 6,
} = {}) {
  const queue = [...new Set(domains)].slice(0, 50);
  const observations = [];
  let cursor = 0;

  async function worker() {
    while (cursor < queue.length) {
      const index = cursor;
      cursor += 1;
      const domain = queue[index];
      const [root, dmarc] = await Promise.all([
        safeTxt(domain, resolveTxt),
        safeTxt(`_dmarc.${domain}`, resolveTxt),
      ]);

      if (!root.ok || !dmarc.ok) {
        observations[index] = {
          domain,
          dnsReadable: false,
          error: root.error ?? dmarc.error ?? 'DNS lookup failed',
        };
        continue;
      }

      observations[index] = {
        dnsReadable: true,
        ...analyzeDomain(domain, root.records, dmarc.records),
      };
    }
  }

  await Promise.all(Array.from({ length: Math.min(concurrency, queue.length || 1) }, () => worker()));

  const readable = observations.filter((x) => x?.dnsReadable);
  const espSignaled = readable.filter((x) => x.espSignaled);
  const hardFailureDomains = espSignaled.filter((x) => x.hardFailures.length > 0);
  const riskDomains = espSignaled.filter((x) => x.hardFailures.length > 0 || x.risks.length > 0);

  let verdict = 'inconclusive';
  if (espSignaled.length >= 8 && hardFailureDomains.length >= 2) verdict = 'supports';
  else if (espSignaled.length >= 8 && hardFailureDomains.length === 0) verdict = 'weakens';

  const finding = verdict === 'supports'
    ? `${hardFailureDomains.length} of ${espSignaled.length} ESP-signaled domains exposed hard SPF/DMARC DNS failures. This supports directly observable authentication failure states, but does not prove inbox-placement impact or DKIM alignment.`
    : verdict === 'weakens'
      ? `Among ${espSignaled.length} ESP-signaled domains, none exposed a hard SPF/DMARC DNS failure. Softer risks existed on ${riskDomains.length}, but the bounded sample does not justify a failure-reality claim.`
      : `Only ${espSignaled.length} of ${readable.length} readable domains exposed a recognized transactional-ESP marker, so the bounded DNS sample cannot resolve failure reality.`;

  const sources = espSignaled.map((x) => ({
    title: `DNS TXT evidence for ${x.domain}`,
    url: `dns://${x.domain}/TXT`,
  }));

  return {
    verdict,
    finding,
    observations: observations.filter(Boolean),
    sources,
    sample: {
      requested: queue.length,
      readable: readable.length,
      espSignaled: espSignaled.length,
      hardFailureDomains: hardFailureDomains.length,
      riskDomains: riskDomains.length,
    },
    limitations: [
      'A root-domain DNS probe cannot discover unknown DKIM selectors.',
      'ESP markers in SPF indicate likely automated-email authorization, not message volume.',
      'DNS configuration evidence does not by itself prove inbox-placement or revenue impact.',
    ],
  };
}
