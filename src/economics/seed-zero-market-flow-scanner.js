const GENERATIVE_TERMS = [
  'lead', 'leads', 'prospect', 'contact', 'email', 'phone', 'price', 'product', 'listing',
  'inventory', 'job', 'jobs', 'property', 'real estate', 'search result', 'serp', 'ad library',
  'review', 'competitor', 'supplier', 'vendor', 'marketplace', 'e-commerce', 'ecommerce',
];

const DIAGNOSTIC_TERMS = [
  'validator', 'validation', 'checker', 'audit', 'health check', 'diagnostic', 'verify', 'verification',
  'spf', 'dmarc', 'dns', 'metadata', 'preview', 'broken link', 'security scan',
];

const COMMODITY_DOMINANCE_TERMS = [
  'instagram', 'tiktok', 'youtube', 'google maps', 'google search', 'amazon', 'linkedin', 'facebook',
];

const FLOW_FAMILIES = [
  { id: 'lead_generation', terms: ['lead', 'prospect', 'contact', 'email finder', 'phone', 'business'] },
  { id: 'commerce_inventory', terms: ['product', 'price', 'inventory', 'e-commerce', 'ecommerce', 'shop', 'marketplace'] },
  { id: 'jobs_talent', terms: ['job', 'jobs', 'vacancy', 'hiring', 'candidate'] },
  { id: 'real_estate', terms: ['real estate', 'property', 'rental', 'rent', 'home listing'] },
  { id: 'ads_competitive_intel', terms: ['ad library', 'ads', 'advertising', 'competitor', 'creative'] },
  { id: 'search_discovery', terms: ['search result', 'serp', 'search engine', 'keyword'] },
  { id: 'reviews_reputation', terms: ['review', 'reviews', 'rating', 'reputation'] },
  { id: 'content_for_ai', terms: ['rag', 'llm', 'ai model', 'content crawler', 'markdown'] },
  { id: 'diagnostics', terms: DIAGNOSTIC_TERMS },
];

function text(actor) {
  return `${actor?.title ?? ''} ${actor?.name ?? ''} ${actor?.description ?? ''}`.toLowerCase();
}

function containsAny(value, terms) {
  return terms.some((term) => value.includes(term));
}

function recentUsers(actor) {
  const stats = actor?.stats ?? {};
  return Number(stats.totalUsers30Days ?? stats.totalUsers7Days ?? 0);
}

function sevenDayUsers(actor) {
  return Number(actor?.stats?.totalUsers7Days ?? 0);
}

function totalUsers(actor) {
  return Number(actor?.stats?.totalUsers ?? 0);
}

function pricingModel(actor) {
  return String(actor?.currentPricingInfo?.pricingModel ?? actor?.pricingModel ?? '').toUpperCase();
}

function familyFor(actor) {
  const value = text(actor);
  const hits = FLOW_FAMILIES
    .map((family) => ({ family: family.id, hits: family.terms.filter((term) => value.includes(term)).length }))
    .filter((x) => x.hits > 0)
    .sort((a, b) => b.hits - a.hits || a.family.localeCompare(b.family));
  return hits[0]?.family ?? 'other';
}

export function summarizeFamilies(actors = []) {
  const byFamily = new Map();
  for (const actor of actors) {
    const family = familyFor(actor);
    const row = byFamily.get(family) ?? {
      family,
      actors: 0,
      recentUsers: 0,
      sevenDayUsers: 0,
      totalUsers: 0,
      payPerEventActors: 0,
      agenticActors: 0,
      topActorRecentUsers: 0,
      topActorShare: 0,
    };
    row.actors += 1;
    row.recentUsers += recentUsers(actor);
    row.sevenDayUsers += sevenDayUsers(actor);
    row.totalUsers += totalUsers(actor);
    if (pricingModel(actor) === 'PAY_PER_EVENT') row.payPerEventActors += 1;
    if (actor?.allowsAgenticUsers === true) row.agenticActors += 1;
    row.topActorRecentUsers = Math.max(row.topActorRecentUsers, recentUsers(actor));
    byFamily.set(family, row);
  }

  return [...byFamily.values()].map((row) => {
    const competition = Math.max(1, row.actors);
    const demand = Math.log1p(row.recentUsers * 3 + row.sevenDayUsers * 5 + row.totalUsers * 0.02);
    const ppeShare = row.payPerEventActors / competition;
    const agenticShare = row.agenticActors / competition;
    const concentration = row.recentUsers > 0 ? row.topActorRecentUsers / row.recentUsers : 1;
    const crowdingPenalty = Math.log1p(competition);
    const concentrationPenalty = concentration > 0.8 ? 1.25 : concentration > 0.6 ? 0.6 : 0;
    const diagnosticPenalty = row.family === 'diagnostics' ? 1.5 : 0;
    const flowBonus = row.family === 'diagnostics' || row.family === 'other' ? 0 : 1.25;
    const score = demand + ppeShare + agenticShare + flowBonus - crowdingPenalty - concentrationPenalty - diagnosticPenalty;
    return {
      ...row,
      payPerEventShare: Number(ppeShare.toFixed(3)),
      agenticShare: Number(agenticShare.toFixed(3)),
      topActorShare: Number(concentration.toFixed(3)),
      score: Number(score.toFixed(3)),
    };
  }).sort((a, b) => b.score - a.score || b.recentUsers - a.recentUsers || a.family.localeCompare(b.family));
}

export function scoreActor(actor, familySummary = null) {
  const value = text(actor);
  const recent = recentUsers(actor);
  const week = sevenDayUsers(actor);
  const total = totalUsers(actor);
  const demand = Math.log1p(recent * 4 + week * 6 + total * 0.02);
  const generativeBonus = containsAny(value, GENERATIVE_TERMS) ? 1.5 : 0;
  const diagnosticPenalty = containsAny(value, DIAGNOSTIC_TERMS) ? 1.4 : 0;
  const dominantCommodityPenalty = containsAny(value, COMMODITY_DOMINANCE_TERMS) && total > 1000 ? 1.25 : 0;
  const ppeBonus = pricingModel(actor) === 'PAY_PER_EVENT' ? 0.8 : 0;
  const agenticBonus = actor?.allowsAgenticUsers === true ? 0.6 : 0;
  const familyCrowdingPenalty = familySummary ? Math.min(2, Math.log1p(familySummary.actors) / 2) : 0;
  const incumbentPenalty = familySummary?.topActorShare > 0.8 && recent < familySummary.topActorRecentUsers * 0.05 ? 0.8 : 0;
  const score = demand + generativeBonus + ppeBonus + agenticBonus - diagnosticPenalty - dominantCommodityPenalty - familyCrowdingPenalty - incumbentPenalty;
  return Number(score.toFixed(3));
}

export function rankSeedZeroCandidates(actors = [], { minimumRecentUsers = 1, limit = 100 } = {}) {
  const families = summarizeFamilies(actors);
  const familyMap = new Map(families.map((x) => [x.family, x]));
  const ranked = actors
    .map((actor) => {
      const family = familyFor(actor);
      return {
        id: actor.id,
        username: actor.username,
        name: actor.name,
        title: actor.title,
        description: actor.description,
        family,
        recentUsers: recentUsers(actor),
        sevenDayUsers: sevenDayUsers(actor),
        totalUsers: totalUsers(actor),
        pricingModel: pricingModel(actor),
        allowsAgenticUsers: actor?.allowsAgenticUsers === true,
        score: scoreActor(actor, familyMap.get(family)),
      };
    })
    .filter((x) => x.recentUsers >= minimumRecentUsers)
    .sort((a, b) => b.score - a.score || b.recentUsers - a.recentUsers || String(a.title ?? '').localeCompare(String(b.title ?? '')))
    .slice(0, limit);
  return { families, candidates: ranked };
}

export async function fetchPublicStore({ fetchImpl = fetch, pageSize = 1000, maxActors = 5000 } = {}) {
  const actors = [];
  for (let offset = 0; offset < maxActors; offset += pageSize) {
    const url = new URL('https://api.apify.com/v2/store');
    url.searchParams.set('limit', String(Math.min(pageSize, maxActors - offset)));
    url.searchParams.set('offset', String(offset));
    url.searchParams.set('sortBy', 'popularity');
    url.searchParams.set('includeUnrunnableActors', 'false');
    const response = await fetchImpl(url);
    if (!response.ok) throw new Error(`Apify Store request failed: HTTP ${response.status}`);
    const body = await response.json();
    const items = body?.data?.items ?? [];
    actors.push(...items);
    if (items.length === 0 || actors.length >= Number(body?.data?.total ?? 0)) break;
  }
  return actors.slice(0, maxActors);
}
