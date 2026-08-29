import dns from 'node:dns/promises';
import http from 'node:http';
import https from 'node:https';
import net from 'node:net';

export const CRAWLER_PROFILES = {
  default: 'Mozilla/5.0 (compatible; SocialPreviewDriftGuard/0.1; +https://apify.com/)',
  facebook: 'facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)',
  x: 'Twitterbot/1.0',
  linkedin: 'LinkedInBot/1.0',
  slack: 'Slackbot-LinkExpanding 1.0 (+https://api.slack.com/robots)',
  discord: 'Discordbot/2.0',
};

const ISSUE_WEIGHT = { info: 2, risk: 12, fail: 35 };

function decodeHtml(value = '') {
  return String(value)
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)));
}

function parseAttributes(tag) {
  const attrs = {};
  const body = tag.replace(/^<\/?[a-z0-9:-]+/i, '').replace(/\/?\s*>$/, '');
  const re = /([^\s=/>]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g;
  let match;
  while ((match = re.exec(body))) {
    const key = match[1].toLowerCase();
    const value = decodeHtml(match[2] ?? match[3] ?? match[4] ?? '');
    if (!(key in attrs)) attrs[key] = value;
  }
  return attrs;
}

function firstMeta(html, selectorName, selectorValue) {
  const tags = html.match(/<meta\b[^>]*>/gi) ?? [];
  const wanted = String(selectorValue).toLowerCase();
  for (const tag of tags) {
    const attrs = parseAttributes(tag);
    if (String(attrs[selectorName] ?? '').toLowerCase() === wanted) return attrs.content ?? null;
  }
  return null;
}

function firstLink(html, relName) {
  const tags = html.match(/<link\b[^>]*>/gi) ?? [];
  const wanted = String(relName).toLowerCase();
  for (const tag of tags) {
    const attrs = parseAttributes(tag);
    const rels = String(attrs.rel ?? '').toLowerCase().split(/\s+/).filter(Boolean);
    if (rels.includes(wanted)) return attrs.href ?? null;
  }
  return null;
}

function normalizePublicUrl(value, base = null) {
  try {
    const url = base ? new URL(value, base) : new URL(value);
    if (!['http:', 'https:'].includes(url.protocol)) return null;
    url.hash = '';
    return url.href;
  } catch {
    return null;
  }
}

export function parseMetadata(html, finalUrl) {
  const titleMatch = html.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i);
  const canonicalRaw = firstLink(html, 'canonical');
  const og = {
    title: firstMeta(html, 'property', 'og:title'),
    description: firstMeta(html, 'property', 'og:description'),
    image: firstMeta(html, 'property', 'og:image'),
    url: firstMeta(html, 'property', 'og:url'),
    type: firstMeta(html, 'property', 'og:type'),
    siteName: firstMeta(html, 'property', 'og:site_name'),
  };
  const twitter = {
    card: firstMeta(html, 'name', 'twitter:card'),
    title: firstMeta(html, 'name', 'twitter:title'),
    description: firstMeta(html, 'name', 'twitter:description'),
    image: firstMeta(html, 'name', 'twitter:image'),
  };
  return {
    title: titleMatch ? decodeHtml(titleMatch[1].replace(/\s+/g, ' ').trim()) : null,
    canonical: canonicalRaw ? normalizePublicUrl(canonicalRaw, finalUrl) : null,
    canonicalRaw,
    og: {
      ...og,
      imageResolved: og.image ? normalizePublicUrl(og.image, finalUrl) : null,
      urlResolved: og.url ? normalizePublicUrl(og.url, finalUrl) : null,
    },
    twitter: {
      ...twitter,
      imageResolved: twitter.image ? normalizePublicUrl(twitter.image, finalUrl) : null,
    },
  };
}

function ipv4Private(address) {
  const parts = address.split('.').map(Number);
  if (parts.length !== 4 || parts.some((n) => !Number.isInteger(n) || n < 0 || n > 255)) return true;
  const [a, b] = parts;
  return a === 0
    || a === 10
    || a === 127
    || (a === 100 && b >= 64 && b <= 127)
    || (a === 169 && b === 254)
    || (a === 172 && b >= 16 && b <= 31)
    || (a === 192 && b === 168)
    || (a === 192 && b === 0)
    || (a === 192 && b === 0 && parts[2] === 2)
    || (a === 198 && (b === 18 || b === 19))
    || (a === 198 && b === 51 && parts[2] === 100)
    || (a === 203 && b === 0 && parts[2] === 113)
    || a >= 224;
}

function ipv6Private(address) {
  const lower = address.toLowerCase();
  if (lower === '::' || lower === '::1') return true;
  if (lower.startsWith('::ffff:')) {
    const mapped = lower.slice('::ffff:'.length);
    return net.isIP(mapped) === 4 ? ipv4Private(mapped) : true;
  }
  return lower.startsWith('fc')
    || lower.startsWith('fd')
    || /^fe[89ab]/.test(lower)
    || lower.startsWith('2001:db8:');
}

export function isPublicIp(address) {
  const family = net.isIP(address);
  if (family === 4) return !ipv4Private(address);
  if (family === 6) return !ipv6Private(address);
  return false;
}

async function resolvePublicAddresses(hostname) {
  const lower = hostname.toLowerCase();
  if (lower === 'localhost' || lower.endsWith('.localhost') || lower.endsWith('.local')) {
    throw new Error('Private or local hostname is not allowed.');
  }
  const records = await dns.lookup(hostname, { all: true, verbatim: true });
  if (!records.length) throw new Error('Hostname did not resolve.');
  if (records.some((record) => !isPublicIp(record.address))) {
    throw new Error('Hostname resolves to a private, reserved, or non-public address.');
  }
  return records;
}

export function createSafeLookup(addresses) {
  const records = addresses.map(({ address, family }) => ({ address, family }));
  let addressIndex = 0;
  return (_hostname, options, callback) => {
    if (options?.all === true) {
      callback(null, records);
      return;
    }
    const record = records[Math.min(addressIndex, records.length - 1)];
    addressIndex += 1;
    callback(null, record.address, record.family);
  };
}

async function requestOnce(urlString, { method = 'GET', userAgent, timeoutMs, maxBytes, extraHeaders = {} }) {
  const url = new URL(urlString);
  const addresses = await resolvePublicAddresses(url.hostname);
  const transport = url.protocol === 'https:' ? https : http;

  return new Promise((resolve, reject) => {
    const req = transport.request({
      protocol: url.protocol,
      hostname: url.hostname,
      port: url.port || undefined,
      path: `${url.pathname}${url.search}`,
      method,
      headers: {
        'user-agent': userAgent,
        accept: 'text/html,application/xhtml+xml,image/avif,image/webp,image/*,*/*;q=0.8',
        'accept-encoding': 'identity',
        ...extraHeaders,
      },
      lookup: createSafeLookup(addresses),
      servername: url.hostname,
    }, (res) => {
      const chunks = [];
      let total = 0;
      res.on('data', (chunk) => {
        total += chunk.length;
        if (total > maxBytes) {
          req.destroy(new Error(`Response exceeded ${maxBytes} bytes.`));
          return;
        }
        chunks.push(chunk);
      });
      res.on('end', () => {
        resolve({
          status: Number(res.statusCode ?? 0),
          headers: res.headers,
          body: Buffer.concat(chunks),
        });
      });
    });

    req.setTimeout(timeoutMs, () => req.destroy(new Error(`Request timed out after ${timeoutMs} ms.`)));
    req.on('error', reject);
    req.end();
  });
}

export async function safeFetch(urlString, options = {}) {
  const timeoutMs = Number(options.timeoutMs ?? 10_000);
  const maxBytes = Number(options.maxBytes ?? 2_000_000);
  const maxRedirects = Number(options.maxRedirects ?? 5);
  const userAgent = options.userAgent ?? CRAWLER_PROFILES.default;
  const method = options.method ?? 'GET';
  const extraHeaders = options.extraHeaders ?? {};
  let current = normalizePublicUrl(urlString);
  if (!current) throw new Error('Only public HTTP(S) URLs are supported.');

  const redirects = [];
  for (let i = 0; i <= maxRedirects; i += 1) {
    const response = await requestOnce(current, { method, userAgent, timeoutMs, maxBytes, extraHeaders });
    if ([301, 302, 303, 307, 308].includes(response.status) && response.headers.location) {
      if (i === maxRedirects) throw new Error('Too many redirects.');
      const next = normalizePublicUrl(response.headers.location, current);
      if (!next) throw new Error('Redirect target is not a public HTTP(S) URL.');
      redirects.push({ from: current, to: next, status: response.status });
      current = next;
      continue;
    }
    return { ...response, finalUrl: current, redirects };
  }
  throw new Error('Redirect handling failed.');
}

function addIssue(issues, code, severity, message, details = null) {
  const key = `${code}:${JSON.stringify(details ?? {})}`;
  if (issues.some((issue) => issue._key === key)) return;
  issues.push({ _key: key, code, severity, message, ...(details ? { details } : {}) });
}

function sameUrl(a, b) {
  if (!a || !b) return false;
  try {
    const left = new URL(a);
    const right = new URL(b);
    const clean = (url) => `${url.protocol}//${url.hostname.toLowerCase()}${url.port ? `:${url.port}` : ''}${url.pathname.replace(/\/$/, '') || '/'}${url.search}`;
    return clean(left) === clean(right);
  } catch {
    return a === b;
  }
}

export function compareProfileResults(profileResults) {
  const issues = [];
  const available = profileResults.filter((x) => !x.error);
  if (!available.length) {
    addIssue(issues, 'ALL_PROFILES_FAILED', 'fail', 'Every crawler profile failed to retrieve the page.');
    return issues.map(({ _key, ...issue }) => issue);
  }

  const baseline = available[0];
  for (const current of available.slice(1)) {
    if (current.status !== baseline.status) {
      addIssue(issues, 'PROFILE_STATUS_DRIFT', 'fail', 'Crawler profiles received different HTTP status codes.', { baseline: baseline.profile, current: current.profile, baselineStatus: baseline.status, currentStatus: current.status });
    }
    if (!sameUrl(current.finalUrl, baseline.finalUrl)) {
      addIssue(issues, 'PROFILE_REDIRECT_DRIFT', 'risk', 'Crawler profiles ended on different final URLs.', { baseline: baseline.profile, current: current.profile });
    }
    const fields = [
      ['og:title', baseline.metadata?.og?.title, current.metadata?.og?.title],
      ['og:image', baseline.metadata?.og?.imageResolved, current.metadata?.og?.imageResolved],
      ['og:url', baseline.metadata?.og?.urlResolved, current.metadata?.og?.urlResolved],
      ['canonical', baseline.metadata?.canonical, current.metadata?.canonical],
      ['twitter:card', baseline.metadata?.twitter?.card, current.metadata?.twitter?.card],
      ['twitter:image', baseline.metadata?.twitter?.imageResolved, current.metadata?.twitter?.imageResolved],
    ];
    for (const [field, left, right] of fields) {
      if ((left ?? null) !== (right ?? null)) {
        addIssue(issues, 'PROFILE_METADATA_DRIFT', field === 'og:image' || field === 'og:url' || field === 'canonical' ? 'fail' : 'risk', `Crawler profiles received different ${field} values.`, { field, baseline: baseline.profile, current: current.profile, baselineValue: left ?? null, currentValue: right ?? null });
      }
    }
  }

  return issues.map(({ _key, ...issue }) => issue);
}

function structuralIssues(profileResults) {
  const issues = [];
  for (const result of profileResults) {
    if (result.error) {
      addIssue(issues, 'PROFILE_FETCH_FAILED', 'fail', `Crawler profile ${result.profile} could not retrieve the page.`, { profile: result.profile, error: result.error });
      continue;
    }
    if (result.status >= 400) {
      addIssue(issues, 'HTTP_ERROR', 'fail', `Crawler profile ${result.profile} received HTTP ${result.status}.`, { profile: result.profile, status: result.status });
      continue;
    }
    const contentType = String(result.contentType ?? '').toLowerCase();
    if (!contentType.includes('text/html') && !contentType.includes('application/xhtml+xml')) {
      addIssue(issues, 'NON_HTML_RESPONSE', 'fail', `Crawler profile ${result.profile} did not receive HTML.`, { profile: result.profile, contentType: result.contentType });
      continue;
    }
    const metadata = result.metadata;
    if (!metadata?.og?.title) addIssue(issues, 'MISSING_OG_TITLE', 'risk', 'og:title is missing.', { profile: result.profile });
    if (!metadata?.og?.image) addIssue(issues, 'MISSING_OG_IMAGE', 'risk', 'og:image is missing.', { profile: result.profile });
    if (!metadata?.og?.url) addIssue(issues, 'MISSING_OG_URL', 'info', 'og:url is missing.', { profile: result.profile });
    if (!metadata?.twitter?.card) addIssue(issues, 'MISSING_TWITTER_CARD', 'info', 'twitter:card is missing.', { profile: result.profile });
    if (metadata?.canonical && metadata?.og?.urlResolved && !sameUrl(metadata.canonical, metadata.og.urlResolved)) {
      addIssue(issues, 'CANONICAL_OG_URL_CONFLICT', 'risk', 'Canonical URL and og:url disagree.', { profile: result.profile, canonical: metadata.canonical, ogUrl: metadata.og.urlResolved });
    }
    if (metadata?.og?.image && !metadata?.og?.imageResolved) {
      addIssue(issues, 'INVALID_OG_IMAGE_URL', 'fail', 'og:image could not be resolved to a public HTTP(S) URL.', { profile: result.profile, value: metadata.og.image });
    }
  }
  return issues.map(({ _key, ...issue }) => issue);
}

async function probeImage(url, options) {
  try {
    let response = await safeFetch(url, {
      method: 'HEAD',
      userAgent: CRAWLER_PROFILES.default,
      timeoutMs: options.timeoutMs,
      maxBytes: 8_192,
      maxRedirects: 4,
    });
    if ([403, 405].includes(response.status)) {
      response = await safeFetch(url, {
        method: 'GET',
        userAgent: CRAWLER_PROFILES.default,
        timeoutMs: options.timeoutMs,
        maxBytes: 65_536,
        maxRedirects: 4,
        extraHeaders: { range: 'bytes=0-65535' },
      });
    }
    return {
      url,
      ok: response.status >= 200 && response.status < 400 && String(response.headers['content-type'] ?? '').toLowerCase().startsWith('image/'),
      status: response.status,
      contentType: response.headers['content-type'] ?? null,
      finalUrl: response.finalUrl,
    };
  } catch (error) {
    return { url, ok: false, error: error instanceof Error ? error.message : String(error) };
  }
}

export function scoreIssues(issues) {
  const riskScore = Math.min(100, issues.reduce((sum, issue) => sum + (ISSUE_WEIGHT[issue.severity] ?? 0), 0));
  const verdict = issues.some((issue) => issue.severity === 'fail')
    ? 'FAIL'
    : issues.some((issue) => issue.severity === 'risk')
      ? 'RISK'
      : 'PASS';
  return { verdict, riskScore };
}

export async function inspectUrl(url, options = {}) {
  const normalized = normalizePublicUrl(url);
  if (!normalized) {
    return { inputUrl: url, verdict: 'FAIL', riskScore: 100, issues: [{ code: 'INVALID_URL', severity: 'fail', message: 'Input must be a public HTTP(S) URL.' }], profiles: [], imageChecks: [], rulesetVersion: '0.1.0' };
  }

  const profileNames = [...new Set((options.profiles ?? ['default', 'facebook', 'x', 'linkedin']).filter((name) => CRAWLER_PROFILES[name]))].slice(0, 6);
  const timeoutMs = Number(options.timeoutMs ?? 10_000);
  const maxBytes = Number(options.maxBytes ?? 2_000_000);
  const profileResults = [];

  for (const profile of profileNames) {
    try {
      const response = await safeFetch(normalized, { userAgent: CRAWLER_PROFILES[profile], timeoutMs, maxBytes, maxRedirects: 5 });
      const contentType = response.headers['content-type'] ?? null;
      const html = response.body.toString('utf8');
      profileResults.push({
        profile,
        status: response.status,
        finalUrl: response.finalUrl,
        redirects: response.redirects,
        contentType,
        bytes: response.body.length,
        metadata: String(contentType ?? '').toLowerCase().includes('html') ? parseMetadata(html, response.finalUrl) : null,
      });
    } catch (error) {
      profileResults.push({ profile, error: error instanceof Error ? error.message : String(error) });
    }
  }

  const issues = [...structuralIssues(profileResults), ...compareProfileResults(profileResults)];
  const imageChecks = [];
  if (options.checkImages !== false) {
    const imageUrls = [...new Set(profileResults.flatMap((result) => [result.metadata?.og?.imageResolved, result.metadata?.twitter?.imageResolved]).filter(Boolean))].slice(0, 6);
    for (const imageUrl of imageUrls) {
      const check = await probeImage(imageUrl, { timeoutMs });
      imageChecks.push(check);
      if (!check.ok) addIssue(issues, 'PREVIEW_IMAGE_UNREACHABLE', 'fail', 'A declared preview image could not be retrieved as an image.', { url: imageUrl, status: check.status ?? null, error: check.error ?? null });
    }
  }

  const cleanIssues = issues.map(({ _key, ...issue }) => issue);
  const { verdict, riskScore } = scoreIssues(cleanIssues);
  return {
    inputUrl: url,
    normalizedUrl: normalized,
    verdict,
    riskScore,
    issues: cleanIssues,
    profiles: profileResults,
    imageChecks,
    profileCount: profileResults.length,
    rulesetVersion: '0.1.0',
    scope: 'Compares the public HTML and assets returned to crawler-style user agents. It does not claim to reproduce platform caches, proprietary ranking, or final rendered social cards.',
    checkedAt: new Date().toISOString(),
  };
}
