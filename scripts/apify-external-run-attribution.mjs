import crypto from 'node:crypto';

const token = process.env.APIFY_TOKEN;
if (!token) throw new Error('APIFY_TOKEN is required.');

const actors = [
  { id: 'BKGUeMqIiFcaELH8d', name: 'agent-trace-efficiency-auditor' },
  { id: 'negCd0HzBapwGxr7U', name: 'mcp-toolset-pruner' },
  { id: '7KeQJObJ5eqj6Crm5', name: 'agent-retry-loop-auditor' },
];

async function api(path) {
  const response = await fetch(`https://api.apify.com/v2${path}`, {
    headers: { accept: 'application/json', authorization: `Bearer ${token}` },
  });
  if (!response.ok) throw new Error(`${path} failed ${response.status}: ${await response.text()}`);
  return (await response.json())?.data;
}

const me = await api('/users/me');
if (!me?.id) throw new Error('Could not resolve owner account.');
const salt = crypto.createHash('sha256').update(me.id).digest('hex');
const anon = (id) => crypto.createHash('sha256').update(`${salt}:${id}`).digest('hex').slice(0, 12);

const rows = [];
for (const actor of actors) {
  const data = await api(`/actors/${actor.id}/runs?limit=100&desc=true`);
  const items = data?.items ?? [];
  for (const run of items) {
    if (!run?.userId || run.userId === me.id) continue;
    const chargedEventCounts = run.chargedEventCounts ?? {};
    rows.push({
      actor: actor.name,
      runId: run.id,
      externalUserKey: anon(run.userId),
      origin: run.meta?.origin ?? null,
      status: run.status ?? null,
      startedAt: run.startedAt ?? null,
      finishedAt: run.finishedAt ?? null,
      pricingModel: run.pricingInfo?.pricingModel ?? null,
      chargedEventCounts,
      chargedEventTotal: Object.values(chargedEventCounts).reduce((s, value) => s + (Number(value) || 0), 0),
      usageTotalUsd: Number.isFinite(Number(run.usageTotalUsd)) ? Number(run.usageTotalUsd) : null,
    });
  }
}

const users = [...new Set(rows.map((x) => x.externalUserKey))];
const origins = Object.fromEntries([...new Set(rows.map((x) => x.origin ?? 'UNKNOWN'))].map((origin) => [origin, rows.filter((x) => (x.origin ?? 'UNKNOWN') === origin).length]));
const chargedRuns = rows.filter((x) => x.chargedEventTotal > 0);
const crossPortfolioUsers = users.map((key) => ({
  externalUserKey: key,
  actors: [...new Set(rows.filter((x) => x.externalUserKey === key).map((x) => x.actor))],
  runCount: rows.filter((x) => x.externalUserKey === key).length,
})).filter((x) => x.actors.length > 1);

console.log(JSON.stringify({
  observedAt: new Date().toISOString(),
  authority: 'authenticated_run_metadata_observation',
  externalRunCount: rows.length,
  distinctExternalUserCount: users.length,
  origins,
  chargedExternalRunCount: chargedRuns.length,
  chargedExternalEventCount: chargedRuns.reduce((s, x) => s + x.chargedEventTotal, 0),
  crossPortfolioUsers,
  rows,
  economicReturnVerified: false,
  epistemicBoundary: 'External user IDs are salted and hashed before output. Non-owner runs establish external execution. Run origin and charge-event metadata help distinguish likely validation, API, MCP, web, or other paths, but do not prove user satisfaction, repeat demand, or settled developer revenue. Charged events are not treated as settled return without payout/earnings evidence.',
}, null, 2));
