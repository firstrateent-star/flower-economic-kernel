const STORE = 'https://api.apify.com/v2/store';

const portfolio = [
  { id: 'BKGUeMqIiFcaELH8d', name: 'agent-trace-efficiency-auditor', query: 'Agent Trace Efficiency Auditor' },
  { id: 'negCd0HzBapwGxr7U', name: 'mcp-toolset-pruner', query: 'MCP Toolset Pruner' },
  { id: '7KeQJObJ5eqj6Crm5', name: 'agent-retry-loop-auditor', query: 'Agent Retry Loop Auditor' },
  { id: 'q31WQSvCAJd9rPQ2q', name: 'counterfactual-agent-verifier', query: 'Counterfactual Agent Verifier' },
];

async function findActor(actor) {
  const url = new URL(STORE);
  url.searchParams.set('search', actor.query);
  url.searchParams.set('limit', '50');
  url.searchParams.set('sortBy', 'relevance');
  const response = await fetch(url, { headers: { accept: 'application/json' } });
  if (!response.ok) throw new Error(`Store query failed ${response.status}: ${await response.text()}`);
  const items = (await response.json())?.data?.items ?? [];
  return items.find((x) => x?.id === actor.id || x?.name === actor.name) ?? null;
}

const actors = [];
for (const actor of portfolio) {
  const item = await findActor(actor);
  const stats = item?.stats ?? {};
  const public30 = stats.publicActorRunStats30Days ?? {};
  const externalRuns30Days = Number(public30.TOTAL ?? 0);
  const externalSucceeded30Days = Number(public30.SUCCEEDED ?? 0);
  actors.push({
    id: actor.id,
    name: actor.name,
    visible: Boolean(item),
    totalRunsIncludingOwner: stats.totalRuns ?? null,
    totalUsersIncludingOwner: stats.totalUsers ?? null,
    totalUsers7Days: stats.totalUsers7Days ?? null,
    totalUsers30Days: stats.totalUsers30Days ?? null,
    bookmarks: stats.bookmarkCount ?? null,
    reviews: stats.actorReviewCount ?? null,
    rating: stats.actorReviewRating ?? null,
    externalRuns30Days,
    externalSucceeded30Days,
    externalFailed30Days: Number(public30.FAILED ?? 0),
    externalTimedOut30Days: Number(public30['TIMED-OUT'] ?? 0),
    externalAborted30Days: Number(public30.ABORTED ?? 0),
    independentPickupObserved: externalRuns30Days > 0,
  });
}

const portfolioExternalRuns30Days = actors.reduce((sum, x) => sum + x.externalRuns30Days, 0);
const portfolioExternalSucceeded30Days = actors.reduce((sum, x) => sum + x.externalSucceeded30Days, 0);

console.log(JSON.stringify({
  observedAt: new Date().toISOString(),
  authority: 'public_store_non_owner_run_observation',
  actors,
  portfolioExternalRuns30Days,
  portfolioExternalSucceeded30Days,
  independentPickupObserved: portfolioExternalRuns30Days > 0,
  economicReturnVerified: false,
  epistemicBoundary: 'Apify publicActorRunStats30Days excludes runs started by the Actor owner. Non-owner runs are evidence of external pickup, but do not by themselves prove satisfaction, repeat use, attributable revenue, or profit. totalUsers includes the owner and is therefore not used as the germination witness.',
}, null, 2));
