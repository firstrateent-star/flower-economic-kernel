import { Actor, log } from 'apify';

const UPSTREAM_ACTOR = 'compass/crawler-google-places';
const SAMPLE_QUERIES = [
  'local plumber Charleston SC',
  'local dentist Atlanta GA',
  'local HVAC company Austin TX',
  'local roofing company Tampa FL',
  'local auto repair Columbus OH',
  'local landscaping company Denver CO',
];

const BUSINESS_SUFFIXES = new Set([
  'llc', 'inc', 'incorporated', 'corp', 'corporation', 'co', 'company', 'ltd', 'limited',
  'pllc', 'pc', 'pa', 'lp', 'llp', 'group', 'services', 'service',
]);
const STOP_WORDS = new Set(['the', 'and', 'of', 'at', 'a', 'an']);

function decodeHtml(text) {
  return String(text ?? '')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/\s+/g, ' ')
    .trim();
}

function tokens(value) {
  return decodeHtml(value)
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .split(/\s+/)
    .filter((x) => x.length > 1 && !STOP_WORDS.has(x) && !BUSINESS_SUFFIXES.has(x));
}

function overlapScore(a, b) {
  const aa = new Set(tokens(a));
  const bb = new Set(tokens(b));
  if (!aa.size || !bb.size) return 0;
  const common = [...aa].filter((x) => bb.has(x)).length;
  return common / Math.min(aa.size, bb.size);
}

function digits(value) {
  return String(value ?? '').replace(/\D/g, '');
}

function extractWebsiteNames(html) {
  const out = [];
  const patterns = [
    /<meta[^>]+property=["']og:site_name["'][^>]+content=["']([^"']+)["']/i,
    /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:site_name["']/i,
    /<meta[^>]+name=["']application-name["'][^>]+content=["']([^"']+)["']/i,
    /<title[^>]*>([\s\S]*?)<\/title>/i,
  ];
  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match?.[1]) out.push(decodeHtml(match[1]).slice(0, 180));
  }

  // JSON-LD organization/local-business names are especially useful identity signals.
  const jsonName = /["'](?:name|legalName)["']\s*:\s*["']([^"']{2,180})["']/gi;
  let match;
  while ((match = jsonName.exec(html)) && out.length < 8) out.push(decodeHtml(match[1]));
  return [...new Set(out)].slice(0, 8);
}

function cityFromAddress(address) {
  const parts = String(address ?? '').split(',').map((x) => x.trim()).filter(Boolean);
  return parts.length >= 2 ? parts.at(-2).replace(/\b[A-Z]{2}\s*\d{0,10}\b/i, '').trim() : null;
}

export function classifyMapsWebsitePair({ business, html, finalUrl }) {
  const mapName = business?.title ?? business?.name ?? null;
  const website = business?.website ?? business?.url ?? null;
  if (!mapName || !website || !html) {
    return { status: 'unverifiable', reason: 'Missing map identity, website, or website content.', mapName, website, finalUrl };
  }

  const names = extractWebsiteNames(html);
  const bestNameScore = names.reduce((best, name) => Math.max(best, overlapScore(mapName, name)), 0);
  const phone = digits(business?.phone ?? business?.phoneUnformatted ?? business?.phoneNumber);
  const htmlDigits = digits(html);
  const phoneMatch = phone.length >= 7 && htmlDigits.includes(phone.slice(-7));

  const address = business?.address ?? business?.street ?? null;
  const streetNumber = String(address ?? '').match(/\b\d{1,6}\b/)?.[0] ?? null;
  const city = cityFromAddress(address);
  const lowerText = decodeHtml(html).toLowerCase();
  const locationMatch = !!(
    (streetNumber && lowerText.includes(streetNumber))
    && (city && lowerText.includes(city.toLowerCase()))
  );

  if (bestNameScore >= 0.6 || phoneMatch || (bestNameScore >= 0.4 && locationMatch)) {
    return {
      status: 'match_signal',
      reason: 'Website contains strong business-name, phone, or combined name/location identity signal.',
      mapName, website, finalUrl, websiteNames: names, bestNameScore, phoneMatch, locationMatch,
    };
  }

  if (names.length > 0 && bestNameScore < 0.25 && !phoneMatch && !locationMatch) {
    return {
      status: 'mismatch_candidate',
      reason: 'Website presents a different brand identity and exposes no corroborating phone/location signal.',
      mapName, website, finalUrl, websiteNames: names, bestNameScore, phoneMatch, locationMatch,
    };
  }

  return {
    status: 'unverifiable',
    reason: 'Signals are too weak or mixed to classify safely.',
    mapName, website, finalUrl, websiteNames: names, bestNameScore, phoneMatch, locationMatch,
  };
}

async function fetchWebsite(url) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  try {
    const response = await fetch(url, {
      redirect: 'follow',
      signal: controller.signal,
      headers: { 'user-agent': 'Mozilla/5.0 compatible; FlowerEconomicKernel/0.1; identity-research' },
    });
    const contentType = response.headers.get('content-type') ?? '';
    if (!response.ok || !contentType.includes('text/html')) {
      return { ok: false, status: response.status, finalUrl: response.url ?? url, html: null };
    }
    const html = (await response.text()).slice(0, 160000);
    return { ok: true, status: response.status, finalUrl: response.url ?? url, html };
  } catch (error) {
    return { ok: false, status: null, finalUrl: url, html: null, error: error?.message ?? String(error) };
  } finally {
    clearTimeout(timeout);
  }
}

export async function executeMapsWebsiteSample({ maxChargeUsd = 0.25 } = {}) {
  const client = Actor.newClient();
  const upstreamInput = {
    searchStringsArray: SAMPLE_QUERIES,
    maxCrawledPlacesPerSearch: 1,
    language: 'en',
    website: 'allPlaces',
    skipClosedPlaces: true,
    scrapePlaceDetailPage: false,
    includeWebResults: false,
  };

  log.info('Direct Maps→website sample starting', {
    upstreamActor: UPSTREAM_ACTOR,
    queries: SAMPLE_QUERIES.length,
    maxTotalChargeUsd: maxChargeUsd,
  });

  const run = await client.actor(UPSTREAM_ACTOR).call(upstreamInput, {
    timeout: 90,
    waitSecs: 90,
    maxItems: SAMPLE_QUERIES.length,
    maxTotalChargeUsd: maxChargeUsd,
    forcePermissionLevel: 'LIMITED_PERMISSIONS',
    log: null,
  });

  if (!run?.defaultDatasetId) throw new Error('Direct Maps sample returned no dataset.');
  if (run.status && run.status !== 'SUCCEEDED') throw new Error(`Direct Maps sample failed upstream (status: ${run.status}).`);

  const { items } = await client.dataset(run.defaultDatasetId).listItems({ limit: SAMPLE_QUERIES.length });
  const pairs = [];
  for (const business of items ?? []) {
    const website = business?.website;
    if (!website) {
      pairs.push({ status: 'unverifiable', reason: 'Map record exposed no website.', mapName: business?.title ?? business?.name ?? null, website: null });
      continue;
    }
    const fetched = await fetchWebsite(website);
    if (!fetched.ok) {
      pairs.push({ status: 'unverifiable', reason: `Website could not be evaluated (HTTP ${fetched.status ?? 'fetch_error'}).`, mapName: business?.title ?? business?.name ?? null, website, finalUrl: fetched.finalUrl });
      continue;
    }
    pairs.push(classifyMapsWebsitePair({ business, html: fetched.html, finalUrl: fetched.finalUrl }));
  }

  const evaluable = pairs.filter((x) => x.status !== 'unverifiable');
  const mismatches = pairs.filter((x) => x.status === 'mismatch_candidate');
  const matches = pairs.filter((x) => x.status === 'match_signal');

  let verdict = 'inconclusive';
  if (mismatches.length >= 1 && evaluable.length >= 4) verdict = 'supports';
  else if (mismatches.length === 0 && evaluable.length >= 5) verdict = 'weakens';

  const sources = [];
  for (const pair of pairs) {
    if (pair.website) sources.push({ title: `${pair.mapName ?? 'Business'} website`, url: pair.finalUrl ?? pair.website });
  }
  for (const business of items ?? []) {
    const mapsUrl = business?.url;
    if (mapsUrl) sources.push({ title: `${business?.title ?? business?.name ?? 'Business'} Google Maps record`, url: mapsUrl });
  }

  const uniqueSources = [...new Map(sources.filter((s) => s.url).map((s) => [s.url, s])).values()];
  const finding = `Direct stratified sample: ${items?.length ?? 0} Maps records, ${evaluable.length} evaluable pairs, ${mismatches.length} mismatch candidate(s), ${matches.length} match signal(s).`;
  const observations = [
    finding,
    ...mismatches.slice(0, 2).map((x) => `Mismatch candidate: ${x.mapName} → ${x.website}; website identity signals: ${(x.websiteNames ?? []).slice(0, 2).join(' | ') || 'none'}.`),
    `Method changed from web-discussion search to direct Maps-record and website observation; upstream spend hard-capped at $${maxChargeUsd.toFixed(2)}.`,
  ].slice(0, 4);

  return {
    verdict,
    finding,
    observations,
    sources: uniqueSources,
    sample: {
      queries: SAMPLE_QUERIES,
      recordsReturned: items?.length ?? 0,
      evaluable: evaluable.length,
      mismatchCandidates: mismatches.length,
      matchSignals: matches.length,
      pairs,
    },
    upstream: {
      actor: UPSTREAM_ACTOR,
      runId: run.id ?? null,
      maxTotalChargeUsd: maxChargeUsd,
    },
  };
}
