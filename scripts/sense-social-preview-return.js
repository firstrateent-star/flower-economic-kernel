const fs = require('node:fs');

const ACTOR_ID = '7EskFvYOwxznhKYhj';
const token = process.env.APIFY_TOKEN;
if (!token) throw new Error('APIFY_TOKEN is required');

const headers = { Authorization: `Bearer ${token}` };

async function getJson(url) {
  const res = await fetch(url, { headers });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText} for ${url}`);
  return res.json();
}

function eventUnitPrice(run, eventName) {
  const event = run?.pricingInfo?.pricingPerEvent?.actorChargeEvents?.[eventName];
  if (!event) return null;
  if (Number.isFinite(event.eventPriceUsd)) return event.eventPriceUsd;
  return null;
}

function chargeSummary(run) {
  const counts = run.chargedEventCounts || {};
  let pricedEventUsd = 0;
  let pricedEvents = 0;
  const detail = {};
  for (const [name, countRaw] of Object.entries(counts)) {
    const count = Number(countRaw) || 0;
    const unitPriceUsd = eventUnitPrice(run, name);
    const grossChargeUsd = Number.isFinite(unitPriceUsd) ? count * unitPriceUsd : null;
    if (grossChargeUsd !== null) {
      pricedEventUsd += grossChargeUsd;
      pricedEvents += count;
    }
    detail[name] = { count, unitPriceUsd, grossChargeUsd };
  }
  return { counts: detail, pricedEvents, pricedEventUsd: Number(pricedEventUsd.toFixed(6)) };
}

async function main() {
  const me = (await getJson('https://api.apify.com/v2/users/me')).data;
  const list = (await getJson(`https://api.apify.com/v2/acts/${ACTOR_ID}/runs?desc=1&limit=100`)).data?.items || [];

  const detailed = [];
  for (const item of list) {
    if (!item?.id) continue;
    const run = (await getJson(`https://api.apify.com/v2/actor-runs/${item.id}`)).data;
    detailed.push(run);
  }

  const normalized = detailed.map((run) => {
    const selfRun = run.userId === me.id;
    const origin = run?.meta?.origin || null;
    const obviousNonMarketOrigin = ['DEVELOPMENT', 'TEST', 'CI'].includes(origin);
    const externalCandidate = !selfRun && !obviousNonMarketOrigin;
    const charges = chargeSummary(run);
    const externalChargedCandidate = externalCandidate && charges.pricedEvents > 0 && charges.pricedEventUsd > 0;
    return {
      id: run.id,
      startedAt: run.startedAt,
      finishedAt: run.finishedAt,
      status: run.status,
      origin,
      selfRun,
      obviousNonMarketOrigin,
      externalCandidate,
      externalChargedCandidate,
      chargedEventCounts: run.chargedEventCounts || {},
      pricedEventChargeUsd: charges.pricedEventUsd,
      usageTotalUsd: run.usageTotalUsd ?? null,
    };
  });

  const externalCandidates = normalized.filter((x) => x.externalCandidate);
  const externalChargedCandidates = normalized.filter((x) => x.externalChargedCandidate);
  const output = {
    schemaVersion: 1,
    observedAt: new Date().toISOString(),
    actorId: ACTOR_ID,
    truthPolicy: {
      externalCandidate: 'run user differs from Actor owner and origin is not DEVELOPMENT/TEST/CI; still requires interpretation before calling organic demand',
      externalChargedCandidate: 'external candidate run contains priced charged events; this is evidence of chargeable value, not settled creator revenue',
      confirmedCreatorRevenue: 'never inferred from run telemetry; requires creator-ledger or settlement evidence',
    },
    scannedRuns: normalized.length,
    externalCandidateRuns: externalCandidates.length,
    externalChargedCandidateRuns: externalChargedCandidates.length,
    externalCandidatePricedEventChargeUsd: Number(externalChargedCandidates.reduce((s, x) => s + x.pricedEventChargeUsd, 0).toFixed(6)),
    confirmedCreatorRevenueUsd: null,
    latestExternalCandidates: externalCandidates.slice(0, 20),
    latestRuns: normalized.slice(0, 20),
  };

  fs.mkdirSync('artifacts', { recursive: true });
  fs.writeFileSync('artifacts/social-preview-return-sensor.json', JSON.stringify(output, null, 2));
  process.stdout.write(JSON.stringify({
    observedAt: output.observedAt,
    scannedRuns: output.scannedRuns,
    externalCandidateRuns: output.externalCandidateRuns,
    externalChargedCandidateRuns: output.externalChargedCandidateRuns,
    externalCandidatePricedEventChargeUsd: output.externalCandidatePricedEventChargeUsd,
    confirmedCreatorRevenueUsd: output.confirmedCreatorRevenueUsd,
  }));
}

main().catch((err) => {
  console.error(err.stack || err);
  process.exit(1);
});
