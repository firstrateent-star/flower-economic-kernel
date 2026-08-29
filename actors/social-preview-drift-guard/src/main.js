import { Actor, log } from 'apify';
import { CRAWLER_PROFILES, inspectUrl } from './core.js';

function uniqueUrls(input) {
  const values = [input?.url, ...(Array.isArray(input?.urls) ? input.urls : [])]
    .map((value) => String(value ?? '').trim())
    .filter(Boolean);
  return [...new Set(values)].slice(0, 100);
}

async function mapConcurrent(items, concurrency, worker) {
  const output = new Array(items.length);
  let cursor = 0;
  const runners = Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    while (true) {
      const index = cursor;
      cursor += 1;
      if (index >= items.length) return;
      output[index] = await worker(items[index], index);
    }
  });
  await Promise.all(runners);
  return output;
}

await Actor.init();

try {
  const input = (await Actor.getInput()) ?? {};
  const urls = uniqueUrls(input);
  if (!urls.length) throw new Error('Provide at least one URL in `url` or `urls`.');

  const profiles = [...new Set(Array.isArray(input.profiles) ? input.profiles : ['default', 'facebook', 'x', 'linkedin'])]
    .filter((name) => CRAWLER_PROFILES[name])
    .slice(0, 6);
  if (!profiles.length) throw new Error('At least one valid crawler profile is required.');

  const maxConcurrency = Math.max(1, Math.min(Number(input.maxConcurrency ?? 4), 10));
  const timeoutMs = Math.max(3_000, Math.min(Number(input.requestTimeoutSecs ?? 10) * 1000, 30_000));
  const maxBytes = Math.max(250_000, Math.min(Number(input.maxHtmlMb ?? 2) * 1_000_000, 5_000_000));
  const checkImages = input.checkImages !== false;

  log.info('Social Preview Drift Guard started', {
    urlCount: urls.length,
    profiles,
    checkImages,
    maxConcurrency,
  });

  const results = await mapConcurrent(urls, maxConcurrency, async (url, index) => {
    log.info('Checking URL', { index: index + 1, total: urls.length, url });
    return inspectUrl(url, { profiles, timeoutMs, maxBytes, checkImages });
  });

  const pricingInfo = Actor.getChargingManager().getPricingInfo();
  let emitted = 0;
  let chargeLimitReached = false;

  for (const result of results) {
    if (pricingInfo.isPayPerEvent) {
      const chargeResult = await Actor.pushData(result, 'url-checked');
      emitted += Number(chargeResult?.chargedCount ?? 0) > 0 ? 1 : 0;
      if (chargeResult?.eventChargeLimitReached) {
        chargeLimitReached = true;
        log.info('User charge limit reached; stopping before additional results.', { emitted });
        break;
      }
    } else {
      await Actor.pushData(result);
      emitted += 1;
    }
  }

  const delivered = results.slice(0, emitted || (pricingInfo.isPayPerEvent ? 0 : results.length));
  const summary = {
    ok: true,
    requestedUrls: urls.length,
    emittedResults: emitted,
    pass: delivered.filter((x) => x.verdict === 'PASS').length,
    risk: delivered.filter((x) => x.verdict === 'RISK').length,
    fail: delivered.filter((x) => x.verdict === 'FAIL').length,
    profiles,
    checkImages,
    chargeLimitReached,
    pricingModel: pricingInfo.isPayPerEvent ? 'pay_per_event' : 'platform_or_unmonetized',
    rulesetVersion: '0.1.0',
    note: 'Each dataset item is one URL audit. PASS/RISK/FAIL describes public crawler-facing metadata consistency, not a guarantee of any platform’s cached or final rendered card.',
  };

  await Actor.setValue('OUTPUT', summary);
  log.info('Social Preview Drift Guard complete', summary);
} finally {
  await Actor.exit();
}
