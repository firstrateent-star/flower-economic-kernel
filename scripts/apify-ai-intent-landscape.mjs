const STORE = 'https://api.apify.com/v2/store';

const intents = [
  { intent: 'agent retry loop', evidence: 'strong_internal_external_benchmark' },
  { intent: 'MCP tool selection', evidence: 'strong_platform_and_discovery' },
  { intent: 'agent trace efficiency', evidence: 'strong_trace_benchmark' },
  { intent: 'agent replay verifier', evidence: 'strong_internal_methodology_need' },
  { intent: 'AI agent regression test', evidence: 'strong_internal_methodology_need' },
  { intent: 'agent configuration benchmark', evidence: 'strong_internal_and_external_research' },
  { intent: 'counterfactual agent evaluation', evidence: 'strong_internal_methodology_need' },
  { intent: 'same workload benchmark', evidence: 'strong_internal_methodology_need' },
  { intent: 'LLM routing benchmark', evidence: 'strong_external_research' },
  { intent: 'LLM cost optimization', evidence: 'adjacent_market_only' },
  { intent: 'token cost analysis', evidence: 'adjacent_market_only' },
  { intent: 'agent latency optimization', evidence: 'adjacent_market_only' },
  { intent: 'prompt context optimization', evidence: 'weak_on_current_200_trace_corpus' },
  { intent: 'agent memory optimization', evidence: 'unverified' },
  { intent: 'tool schema optimization', evidence: 'platform_congruency_signal' },
  { intent: 'MCP security audit', evidence: 'unverified' },
  { intent: 'agent permissions audit', evidence: 'unverified' },
  { intent: 'AI agent evaluation', evidence: 'crowded_category_expected' },
  { intent: 'agent failure trace', evidence: 'strong_internal_external_benchmark' },
  { intent: 'agent human approval audit', evidence: 'unverified' },
  { intent: 'agent model routing', evidence: 'strong_external_research' },
];

async function search(intent, agentic = false) {
  const url = new URL(STORE);
  url.searchParams.set('search', intent);
  url.searchParams.set('limit', '20');
  url.searchParams.set('sortBy', 'relevance');
  url.searchParams.set('responseFormat', 'agent');
  if (agentic) url.searchParams.set('allowsAgenticUsers', 'true');
  const response = await fetch(url, { headers: { accept: 'application/json' } });
  if (!response.ok) throw new Error(`${intent} failed ${response.status}: ${await response.text()}`);
  return (await response.json())?.data ?? {};
}

const rows = [];
for (const item of intents) {
  const normal = await search(item.intent, false);
  const agentic = await search(item.intent, true);
  const normalItems = normal.items ?? [];
  const agenticItems = agentic.items ?? [];
  rows.push({
    ...item,
    returnedCount: normalItems.length,
    agenticReturnedCount: agenticItems.length,
    top: normalItems.slice(0, 5).map((x, index) => ({
      rank: index + 1,
      name: x.name,
      title: x.title,
      username: x.username,
      totalUsers: x.stats?.totalUsers ?? null,
      totalRuns: x.stats?.totalRuns ?? null,
      externalRuns30Days: x.stats?.publicActorRunStats30Days?.TOTAL ?? null,
      reviews: x.stats?.actorReviewCount ?? null,
      rating: x.stats?.actorReviewRating ?? null,
      pricingModel: x.currentPricingInfo?.pricingModel ?? null,
      agenticEligible: Boolean(agenticItems.some((a) => a?.id === x?.id)),
    })),
  });
}

console.log(JSON.stringify({
  observedAt: new Date().toISOString(),
  authority: 'market_landscape_observation_only',
  rows,
  rule: 'Do not infer opportunity from low result count alone. A candidate needs independent problem evidence, a bounded useful transformation, and evidence that existing top results do not already solve it well.',
  epistemicBoundary: 'Search return count is not market size or demand. Relevance search may return semantically adjacent Actors. This landscape is for challenger generation and pruning, not deterministic product selection.',
}, null, 2));
