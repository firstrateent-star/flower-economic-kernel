const ARCHETYPE_TERMS = {
  stateful_delta: [
    'monitor', 'monitoring', 'alert', 'alerts', 'change detector', 'change detection', 'change monitor',
    'diff', 'delta', 'incremental', 'dedup', 'dedupe', 'deduplicate', 'tracker', 'tracking', 'watchlist',
  ],
  decision_transform: [
    'analyzer', 'analysis', 'intelligence', 'score', 'scoring', 'classifier', 'classification', 'classify',
    'normalizer', 'normalize', 'enrichment', 'enricher', 'enrich', 'matcher', 'matching', 'ranking', 'ranker',
  ],
  diagnostic: [
    'validator', 'validation', 'checker', 'audit', 'diagnostic', 'verify', 'verification', 'health check',
  ],
  source_access: [
    'scraper', 'scrape', 'extractor', 'extract', 'crawler', 'crawl', 'downloader', 'download', 'search api',
    'data api', 'api scraper', 'web scraper',
  ],
  workflow_generation: [
    'finder', 'generator', 'lead finder', 'prospect finder', 'research agent', 'automation', 'automator',
  ],
};

const PRIORITY = ['stateful_delta', 'decision_transform', 'diagnostic', 'source_access', 'workflow_generation'];

function normalize(value) {
  return String(value ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

function hasTerm(value, term) {
  const haystack = ` ${normalize(value)} `;
  const needle = normalize(term);
  return needle.length > 0 && haystack.includes(` ${needle} `);
}

function matchingTerms(value, terms) {
  return terms.filter((term) => hasTerm(value, term));
}

function actorTitle(actor) {
  return `${actor?.title ?? ''} ${actor?.name ?? ''}`;
}

function actorDescription(actor) {
  return actor?.description ?? '';
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

export function classifyMarketArchetype(actor) {
  const title = actorTitle(actor);
  const description = actorDescription(actor);
  const titleHits = Object.fromEntries(
    Object.entries(ARCHETYPE_TERMS).map(([archetype, terms]) => [archetype, matchingTerms(title, terms)]),
  );
  const descriptionHits = Object.fromEntries(
    Object.entries(ARCHETYPE_TERMS).map(([archetype, terms]) => [archetype, matchingTerms(description, terms)]),
  );

  const titleWinner = PRIORITY.find((archetype) => titleHits[archetype].length > 0);
  if (titleWinner) {
    return {
      archetype: titleWinner,
      evidenceSurface: 'title',
      matchedTerms: titleHits[titleWinner],
    };
  }

  const rankedDescription = PRIORITY
    .map((archetype) => ({ archetype, hits: descriptionHits[archetype] }))
    .filter((x) => x.hits.length > 0)
    .sort((a, b) => b.hits.length - a.hits.length || PRIORITY.indexOf(a.archetype) - PRIORITY.indexOf(b.archetype));

  if (rankedDescription.length > 0) {
    return {
      archetype: rankedDescription[0].archetype,
      evidenceSurface: 'description',
      matchedTerms: rankedDescription[0].hits,
    };
  }

  return { archetype: 'other', evidenceSurface: 'none', matchedTerms: [] };
}

export function summarizeMarketArchetypes(actors = []) {
  const rows = new Map();
  let allRecentUsers = 0;

  for (const actor of actors) {
    const classification = classifyMarketArchetype(actor);
    const recent = recentUsers(actor);
    allRecentUsers += recent;
    const row = rows.get(classification.archetype) ?? {
      archetype: classification.archetype,
      actors: 0,
      activeActors: 0,
      meaningfulActors: 0,
      recentUsers: 0,
      sevenDayUsers: 0,
      totalUsers: 0,
      payPerEventActors: 0,
      agenticActors: 0,
      titleClassifiedActors: 0,
      topActorRecentUsers: 0,
    };
    row.actors += 1;
    row.recentUsers += recent;
    row.sevenDayUsers += sevenDayUsers(actor);
    row.totalUsers += totalUsers(actor);
    if (recent > 0) row.activeActors += 1;
    if (recent >= 5) row.meaningfulActors += 1;
    if (pricingModel(actor) === 'PAY_PER_EVENT') row.payPerEventActors += 1;
    if (actor?.allowsAgenticUsers === true) row.agenticActors += 1;
    if (classification.evidenceSurface === 'title') row.titleClassifiedActors += 1;
    row.topActorRecentUsers = Math.max(row.topActorRecentUsers, recent);
    rows.set(classification.archetype, row);
  }

  return [...rows.values()].map((row) => {
    const actorCount = Math.max(1, row.actors);
    const concentration = row.recentUsers > 0 ? row.topActorRecentUsers / row.recentUsers : 1;
    return {
      ...row,
      recentUserShare: allRecentUsers > 0 ? Number((row.recentUsers / allRecentUsers).toFixed(4)) : 0,
      activeShare: Number((row.activeActors / actorCount).toFixed(4)),
      meaningfulShare: Number((row.meaningfulActors / actorCount).toFixed(4)),
      payPerEventShare: Number((row.payPerEventActors / actorCount).toFixed(4)),
      agenticShare: Number((row.agenticActors / actorCount).toFixed(4)),
      titleClassificationShare: Number((row.titleClassifiedActors / actorCount).toFixed(4)),
      recentUsersPerActor: Number((row.recentUsers / actorCount).toFixed(2)),
      topActorShare: Number(concentration.toFixed(4)),
    };
  }).sort((a, b) => b.recentUsers - a.recentUsers || b.activeActors - a.activeActors || a.archetype.localeCompare(b.archetype));
}
