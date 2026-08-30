import fs from 'node:fs';

const ACTOR_ID = '7EskFvYOwxznhKYhj';
const QUERIES = [
  'social preview',
  'open graph',
  'twitter card',
  'social card',
  'social metadata',
  'preview metadata',
  'crawler metadata',
  'cross crawler social preview drift guard',
  'social preview drift guard',
];

async function getJson(url, headers = {}) {
  const res = await fetch(url, { headers });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText} for ${url}`);
  return res.json();
}

async function searchStore(search, { includeUnrunnableActors = false } = {}) {
  const url = new URL('https://api.apify.com/v2/store');
  url.searchParams.set('search', search);
  url.searchParams.set('sortBy', 'relevance');
  url.searchParams.set('limit', '100');
  url.searchParams.set('responseFormat', 'agent');
  url.searchParams.set('includeUnrunnableActors', String(includeUnrunnableActors));
  return getJson(url);
}

function normalizeResult(search, body) {
  const data = body?.data ?? {};
  const items = data.items ?? [];
  const index = items.findIndex((item) => item.id === ACTOR_ID);
  return {
    search,
    totalResults: Number(data.total ?? items.length),
    actorFound: index >= 0,
    actorRank: index >= 0 ? index + 1 : null,
    actor: index >= 0 ? {
      id: items[index].id,
      username: items[index].username,
      name: items[index].name,
      title: items[index].title,
      description: items[index].description,
      categories: items[index].categories ?? [],
      stats: items[index].stats ?? {},
    } : null,
    topResults: items.slice(0, 5).map((item, i) => ({
      rank: i + 1,
      id: item.id,
      username: item.username,
      name: item.name,
      title: item.title,
      description: item.description,
      categories: item.categories ?? [],
      stats: item.stats ?? {},
    })),
  };
}

async function main() {
  const buyerVisible = [];
  const inclusive = [];
  for (const query of QUERIES) {
    buyerVisible.push(normalizeResult(query, await searchStore(query, { includeUnrunnableActors: false })));
    inclusive.push(normalizeResult(query, await searchStore(query, { includeUnrunnableActors: true })));
  }

  const token = process.env.APIFY_TOKEN || null;
  const actorRecord = token
    ? (await getJson(`https://api.apify.com/v2/actors/${ACTOR_ID}`, { Authorization: `Bearer ${token}` })).data
    : null;
  const publicStoreActor = buyerVisible.find((x) => x.actorFound)?.actor ?? inclusive.find((x) => x.actorFound)?.actor ?? null;
  const metadataAgreement = actorRecord && publicStoreActor ? {
    titleMatches: actorRecord.title === publicStoreActor.title,
    descriptionMatches: actorRecord.description === publicStoreActor.description,
    actorRecordTitle: actorRecord.title ?? null,
    publicStoreTitle: publicStoreActor.title ?? null,
    actorRecordDescription: actorRecord.description ?? null,
    publicStoreDescription: publicStoreActor.description ?? null,
    actorRecordModifiedAt: actorRecord.modifiedAt ?? null,
  } : null;

  const foundBuyerQueries = buyerVisible.filter((x) => x.actorFound);
  const foundInclusiveQueries = inclusive.filter((x) => x.actorFound);
  const output = {
    schemaVersion: 2,
    observedAt: new Date().toISOString(),
    actorId: ACTOR_ID,
    source: 'https://api.apify.com/v2/store',
    truthPolicy: {
      actorRecordTruth: 'Authenticated Actor resource metadata is observed independently from Store search metadata.',
      storeTruth: 'Actor exists publicly in Store.',
      discoveryTruth: 'Actor appears in a relevance-ranked public Store search for a plausible buyer query.',
      demandTruth: 'Discovery is exposure evidence only; it is not independent use, payment, or revenue.',
    },
    actorRecord: actorRecord ? {
      id: actorRecord.id,
      name: actorRecord.name,
      title: actorRecord.title,
      description: actorRecord.description,
      seoTitle: actorRecord.seoTitle ?? null,
      seoDescription: actorRecord.seoDescription ?? null,
      isPublic: actorRecord.isPublic,
      modifiedAt: actorRecord.modifiedAt,
    } : null,
    metadataAgreement,
    buyerVisible: {
      queryCount: buyerVisible.length,
      foundQueryCount: foundBuyerQueries.length,
      bestRank: foundBuyerQueries.length ? Math.min(...foundBuyerQueries.map((x) => x.actorRank)) : null,
      results: buyerVisible,
    },
    inclusive: {
      queryCount: inclusive.length,
      foundQueryCount: foundInclusiveQueries.length,
      bestRank: foundInclusiveQueries.length ? Math.min(...foundInclusiveQueries.map((x) => x.actorRank)) : null,
      results: inclusive,
    },
  };

  fs.mkdirSync('artifacts', { recursive: true });
  fs.writeFileSync('artifacts/social-preview-discovery-witness.json', JSON.stringify(output, null, 2));
  process.stdout.write(JSON.stringify({
    observedAt: output.observedAt,
    actorRecordTitle: output.actorRecord?.title ?? null,
    publicStoreTitle: output.metadataAgreement?.publicStoreTitle ?? null,
    titleMatches: output.metadataAgreement?.titleMatches ?? null,
    descriptionMatches: output.metadataAgreement?.descriptionMatches ?? null,
    buyerVisibleFoundQueries: output.buyerVisible.foundQueryCount,
    buyerVisibleBestRank: output.buyerVisible.bestRank,
  }));
}

main().catch((err) => {
  console.error(err.stack || err);
  process.exit(1);
});
