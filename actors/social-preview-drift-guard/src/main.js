import { Actor, log } from 'apify';
import { CRAWLER_PROFILES, inspectUrl } from './core.js';

function uniqueUrls(input) {
  const values = [input?.url, ...(Array.isArray(input?.urls) ? input.urls : [])]
    .map((value) => String(value ?? '').trim())
    .filter(Boolean);
  return [...new Set(values)].slice(0, 100);
}

function normalizeMeasurementResult(result) {
  const profileResults = Array.isArray(result?.profiles) ? result.profiles : [];
  const allProfilesTransportFailed = profileResults.length > 0 && profileResults.every((profile) => Boolean(profile?.error));
  if (!allProfilesTransportFailed) {
    return {
      ...result,
      measurementStatus: 'observed',
    };
  }

  return {
    ...result,
    verdict: 'INCONCLUSIVE',
    riskScore: null,
    measurementStatus: 'inconclusive',
    measurementReason: 'ALL_PROFILES_TRANSPORT_FAILED',
    issues: (result?.issues ?? []).map((issue) => {
      if (issue?.code === 'PROFILE_FETCH_FAILED' || issue?.code === 'ALL_PROFILES_FAILED') {
        return { ...issue, severity: 'measurement' };
      }
      return issue;
    }),
  };
}

function summarizeIssues(results) {
  const counts = new Map();
  for (const result of results) {
    for (const issue of result?.issues ?? []) {
      const key = `${issue.severity ?? 'unknown'}:${issue.code ?? 'UNKNOWN'}`;
      counts.set(key, Number(counts.get(key) ?? 0) + 1);
    }
  }
  return [...counts.entries()]
    .map(([key, count]) => {
      const [severity, ...codeParts] = key.split(':');
      return { severity, code: codeParts.join(':'), count };
    })
    .sort((a, b) => {
      const rank = { fail: 4, risk: 3, measurement: 2, info: 1, unknown: 0 };
      return (rank[b.severity] ?? 0) - (rank[a.severity] ?? 0) || b.count - a.count || a.code.localeCompare(b.code);
    })
    .slice(0, 12);
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

async function runActor() {
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
  const chargingManager = Actor.getChargingManager();
  const pricingInfo = chargingManager.getPricingInfo();

  let workUrls = urls;
  if (pricingInfo.isPayPerEvent) {
    const chargeable = chargingManager.calculateMaxEventChargeCountWithinLimit('url-checked');
    if (Number.isFinite(chargeable)) workUrls = urls.slice(0, Math.max(0, Number(chargeable)));
    if (!workUrls.length) {
      await Actor.setValue('OUTPUT', {
        ok: true,
        requestedUrls: urls.length,
        emittedResults: 0,
        chargeLimitReached: true,
        pricingModel: 'pay_per_event',
        note: 'The configured run charge limit does not permit another url-checked result.',
      });
      log.info('No URL work started because the user charge limit allows zero results.');
      return;
    }
  }

  log.info('Social Preview Drift Guard started', {
    requestedUrls: urls.length,
    workUrls: workUrls.length,
    profiles,
    checkImages,
    maxConcurrency,
    pricingModel: pricingInfo.isPayPerEvent ? 'pay_per_event' : 'platform_or_unmonetized',
  });

  const results = await mapConcurrent(workUrls, maxConcurrency, async (url, index) => {
    log.info('Checking URL', { index: index + 1, total: workUrls.length, url });
    const rawResult = await inspectUrl(url, { profiles, timeoutMs, maxBytes, checkImages });
    return normalizeMeasurementResult(rawResult);
  });

  const delivered = [];
  let chargeLimitReached = workUrls.length < urls.length;

  for (const result of results) {
    if (pricingInfo.isPayPerEvent && result.verdict !== 'INCONCLUSIVE') {
      const chargeResult = await Actor.pushData(result, 'url-checked');
      if (Number(chargeResult?.chargedCount ?? 0) > 0) delivered.push(result);
      if (chargeResult?.eventChargeLimitReached) {
        chargeLimitReached = true;
        log.info('User charge limit reached; stopping before additional results.', { emitted: delivered.length });
        break;
      }
    } else {
      await Actor.pushData(result);
      delivered.push(result);
    }
  }

  const firstResult = delivered[0] ?? null;
  const issueSummary = summarizeIssues(delivered);
  const summary = {
    ok: true,
    requestedUrls: urls.length,
    processedUrls: workUrls.length,
    emittedResults: delivered.length,
    pass: delivered.filter((x) => x.verdict === 'PASS').length,
    risk: delivered.filter((x) => x.verdict === 'RISK').length,
    fail: delivered.filter((x) => x.verdict === 'FAIL').length,
    inconclusive: delivered.filter((x) => x.verdict === 'INCONCLUSIVE').length,
    firstResult: firstResult ? {
      inputUrl: firstResult.inputUrl ?? null,
      verdict: firstResult.verdict ?? null,
      riskScore: firstResult.riskScore ?? null,
      measurementStatus: firstResult.measurementStatus ?? null,
      measurementReason: firstResult.measurementReason ?? null,
      issueCodes: (firstResult.issues ?? []).slice(0, 12).map((issue) => ({
        code: issue.code ?? null,
        severity: issue.severity ?? null,
      })),
      profileErrors: (firstResult.profiles ?? [])
        .filter((profile) => profile?.error)
        .slice(0, 6)
        .map((profile) => ({ profile: profile.profile ?? null, error: profile.error ?? null })),
    } : null,
    issueSummary,
    profiles,
    checkImages,
    chargeLimitReached,
    pricingModel: pricingInfo.isPayPerEvent ? 'pay_per_event' : 'platform_or_unmonetized',
    rulesetVersion: '0.1.0',
    note: 'PASS/RISK/FAIL is emitted only when the page was observed. INCONCLUSIVE means the Actor could not gather enough transport-level evidence to judge the URL. Inconclusive results are not charged as url-checked events.',
  };

  await Actor.setValue('OUTPUT', summary);
  log.info('Social Preview Drift Guard complete', summary);
}

await Actor.init();
try {
  await runActor();
} finally {
  await Actor.exit();
}
