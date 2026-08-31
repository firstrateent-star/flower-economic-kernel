const STORE = 'https://api.apify.com/v2/store';

const portfolio = [
  {
    id: 'BKGUeMqIiFcaELH8d',
    name: 'agent-trace-efficiency-auditor',
    intents: [
      'agent trace efficiency',
      'AI agent trace optimization',
      'agent retry debugging',
      'LLM trace cost',
      'agent tool call optimization',
    ],
  },
  {
    id: 'negCd0HzBapwGxr7U',
    name: 'mcp-toolset-pruner',
    intents: [
      'MCP tool selection',
      'MCP tool pruning',
      'reduce MCP tools',
      'agent tool catalog',
      'tool allowlist',
    ],
  },
];

async function query(search, agentic = false) {
  const url = new URL(STORE);
  url.searchParams.set('search', search);
  url.searchParams.set('limit', '50');
  url.searchParams.set('sortBy', 'relevance');
  url.searchParams.set('responseFormat', 'agent');
  if (agentic) url.searchParams.set('allowsAgenticUsers', 'true');
  const response = await fetch(url, { headers: { accept: 'application/json' } });
  if (!response.ok) throw new Error(`Store query failed ${response.status}: ${await response.text()}`);
  return (await response.json())?.data?.items ?? [];
}

function hitOf(items, actor) {
  const index = items.findIndex((x) => x?.id === actor.id || x?.name === actor.name);
  if (index < 0) return null;
  const x = items[index];
  return {
    rank: index + 1,
    id: x.id,
    name: x.name,
    title: x.title,
    totalUsers: x.stats?.totalUsers ?? x.totalUsers ?? null,
    totalUsers7Days: x.stats?.totalUsers7Days ?? null,
    totalUsers30Days: x.stats?.totalUsers30Days ?? null,
    bookmarkCount: x.stats?.bookmarks ?? x.bookmarkCount ?? null,
    rating: x.stats?.rating ?? x.rating ?? null,
    pricingModel: x.currentPricingInfo?.pricingModel ?? x.pricingInfos?.[0]?.pricingModel ?? null,
  };
}

const report = {
  observedAt: new Date().toISOString(),
  authority: 'public_store_observation_only',
  actors: [],
};

for (const actor of portfolio) {
  const rows = [];
  for (const intent of actor.intents) {
    const items = await query(intent, false);
    const hit = hitOf(items, actor);
    const agenticItems = await query(intent, true);
    const agenticHit = hitOf(agenticItems, actor);
    rows.push({
      intent,
      visible: Boolean(hit),
      rank: hit?.rank ?? null,
      agenticVisible: Boolean(agenticHit),
      agenticRank: agenticHit?.rank ?? null,
      observedMetadata: hit,
    });
  }
  const visible = rows.filter((x) => x.visible);
  const ranks = visible.map((x) => x.rank).filter(Number.isFinite);
  report.actors.push({
    id: actor.id,
    name: actor.name,
    intendedQueries: actor.intents.length,
    visibleQueries: visible.length,
    discoveryCoverage: actor.intents.length ? visible.length / actor.intents.length : null,
    bestRank: ranks.length ? Math.min(...ranks) : null,
    medianRank: ranks.length ? ranks.sort((a,b)=>a-b)[Math.floor((ranks.length - 1) / 2)] : null,
    agenticVisibleQueries: rows.filter((x) => x.agenticVisible).length,
    rows,
  });
}

report.epistemicBoundary = 'Store visibility/rank is a discovery signal, not demand or revenue. Self-owned runs and exact-title matches do not prove stranger value. Popularity and return use must be independently observed.';
console.log(JSON.stringify(report, null, 2));
