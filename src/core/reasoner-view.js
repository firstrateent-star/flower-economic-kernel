import { FLOWER_METHODOLOGY } from './methodology-core.js';

function clone(value) {
  return value == null ? value : structuredClone(value);
}

function soilView(soil = []) {
  return soil.map((item) => ({
    id: item.id ?? null,
    principle: item.principle ?? null,
    scope: item.scope ?? null,
    status: item.status ?? null,
  }));
}

function fruitView(fruits = []) {
  return fruits.map((fruit) => ({
    id: fruit.id,
    name: fruit.name,
    status: fruit.status,
    platform: fruit.platform ?? null,
    pricing: clone(fruit.pricing ?? null),
    technicalTruth: clone(fruit.technicalTruth ?? null),
    marketTruth: clone(fruit.marketTruth ?? null),
    externalUsage: clone(fruit.externalUsage ?? null),
    independentUser: clone(fruit.independentUser ?? null),
    chargedEvent: clone(fruit.chargedEvent ?? null),
    creatorRevenueUsd: fruit.creatorRevenueUsd ?? null,
    settledValueUsd: fruit.settledValueUsd ?? null,
    monthlyRevenueUsd: fruit.monthlyRevenueUsd ?? null,
    repeatDemand: clone(fruit.repeatDemand ?? null),
    distributionRails: clone(fruit.distributionRails ?? null),
    agenticPaymentEligible: fruit.agenticPaymentEligible ?? null,
    inheritance: clone(fruit.inheritance ?? []),
    nextPressure: fruit.nextPressure ?? null,
    notes: fruit.notes ?? null,
  }));
}

function opportunityView(opportunities = []) {
  return opportunities.map((opp) => ({
    id: opp.id,
    name: opp.name,
    status: opp.status,
    thesis: opp.thesis ?? null,
    failureArchetype: opp.failureArchetype ?? null,
    reusableCapability: opp.reusableCapability ?? null,
    moneyFlow: opp.moneyFlow ?? null,
    buyer: opp.buyer ?? null,
    nutrientChannel: opp.nutrientChannel ?? null,
    passivity: opp.passivity ?? null,
    autonomyCompatibility: opp.autonomyCompatibility ?? null,
    reproductivePotential: opp.reproductivePotential ?? null,
    realityAccess: opp.realityAccess ?? null,
    cheapestRealityTest: opp.cheapestRealityTest ?? null,
    inheritedInfrastructure: opp.inheritedInfrastructure ?? null,
    whyNow: opp.whyNow ?? null,
    externalEvidence: clone(opp.externalEvidence ?? []),
    validationGate: clone(opp.validationGate ?? null),
    failedBecause: opp.failedBecause ?? null,
    measurementBlockedReason: opp.measurementBlockedReason ?? null,
    epistemicNote: opp.epistemicNote ?? null,
  }));
}

function transferSeedView(transferSeeds = []) {
  return transferSeeds.slice(-16).map((seed) => ({
    id: seed.id ?? null,
    improvementId: seed.improvementId ?? null,
    name: seed.name ?? null,
    status: seed.status ?? null,
    transformation: seed.transformation ?? null,
    beneficiaryClasses: clone(seed.beneficiaryClasses ?? []),
    externalValueMeasure: seed.externalValueMeasure ?? null,
    deliveryForms: clone(seed.deliveryForms ?? []),
    externalProblemEvidence: clone(seed.externalProblemEvidence ?? []),
    nextProbe: seed.nextProbe ?? null,
    internalDividend: clone(seed.internalDividend ?? null),
    antiGoodhartRisk: seed.antiGoodhartRisk ?? null,
    outwardMaintenanceBounded: seed.outwardMaintenanceBounded ?? null,
    epistemicNote: seed.epistemicNote ?? null,
  }));
}

function geometryView(geometry, allowedIds = null, transferSeeds = []) {
  if (!geometry) return {
    transferSeeds: transferSeedView(transferSeeds),
  };

  const allow = allowedIds ? new Set(allowedIds) : null;
  const centers = (geometry.centers ?? [])
    .filter((center) => !allow || allow.has(center.id))
    .map((center) => ({
      id: center.id,
      kind: center.kind,
      name: center.name,
      status: center.status,
      archetype: center.archetype ?? null,
      archetypeFamily: center.archetypeFamily ?? null,
      reusableCapability: center.reusableCapability ?? null,
      capabilityFamily: center.capabilityFamily ?? null,
      nutrientChannel: center.nutrientChannel ?? null,
      coverage: clone(center.coverage ?? {}),
    }));

  const visibleIds = new Set(centers.map((center) => center.id));
  const trimFamilies = (families = []) => families
    .map((family) => ({
      ...clone(family),
      centerIds: (family.centerIds ?? []).filter((id) => visibleIds.has(id)),
    }))
    .filter((family) => family.centerIds.length > 0)
    .map((family) => ({ ...family, reuseCount: family.centerIds.length }));

  return {
    version: geometry.version ?? null,
    stage: geometry.stage ?? null,
    metrics: clone(geometry.metrics ?? {}),
    fruitOfLifeCenters: clone(geometry.fruitOfLifeCenters ?? []),
    centers,
    archetypes: trimFamilies(geometry.archetypes ?? []),
    capabilities: trimFamilies(geometry.capabilities ?? []),
    transferSeeds: transferSeedView(transferSeeds),
  };
}

function targetIdFromArgs(target) {
  if (!target) return null;
  if (typeof target === 'string') return target;
  if (target.id) return target.id;
  if (target.opportunity?.id) return target.opportunity.id;
  if (target.experiment?.opportunityId) return target.experiment.opportunityId;
  return null;
}

// Geometry is a derived projection. refreshGeometry replaces its centers array whenever
// decision-relevant geometry input changes, so array identity is a safe cache boundary for
// normal runtime use. Synthetic fixtures likewise replace the array when testing invalidation.
// WeakMap keeps the index non-persistent and lets obsolete geometry be reclaimed automatically.
const neighborhoodIndexByCenters = new WeakMap();

function addFamilyMember(map, family, id) {
  if (!family || !id) return;
  const members = map.get(family) ?? [];
  members.push(id);
  map.set(family, members);
}

function neighborhoodIndex(centers) {
  const cached = neighborhoodIndexByCenters.get(centers);
  if (cached) {
    return {
      index: cached,
      recordsExamined: 0,
      lookupMode: 'cached_family_index',
    };
  }

  const centerById = new Map();
  const archetypeMembers = new Map();
  const capabilityMembers = new Map();
  let recordsExamined = 0;
  for (const center of centers) {
    recordsExamined += 1;
    if (center?.id) centerById.set(center.id, center);
    addFamilyMember(archetypeMembers, center?.archetypeFamily, center?.id);
    addFamilyMember(capabilityMembers, center?.capabilityFamily, center?.id);
  }

  const index = { centerById, archetypeMembers, capabilityMembers };
  neighborhoodIndexByCenters.set(centers, index);
  return {
    index,
    recordsExamined,
    lookupMode: 'built_family_index',
  };
}

function targetNeighborhoodResolution(garden, targetId) {
  if (!targetId || !garden.geometry) {
    return { ids: null, recordsExamined: 0, lookupMode: 'no_geometry' };
  }

  const centers = garden.geometry.centers ?? [];
  const indexed = neighborhoodIndex(centers);
  const targetCenter = indexed.index.centerById.get(targetId) ?? null;
  if (!targetCenter) {
    return {
      ids: [targetId],
      recordsExamined: indexed.recordsExamined,
      lookupMode: indexed.lookupMode === 'cached_family_index'
        ? 'cached_target_missing'
        : 'built_index_target_missing',
    };
  }

  const ids = new Set([targetId]);
  if (targetCenter.archetypeFamily) {
    for (const id of indexed.index.archetypeMembers.get(targetCenter.archetypeFamily) ?? []) ids.add(id);
  }
  if (targetCenter.capabilityFamily) {
    for (const id of indexed.index.capabilityMembers.get(targetCenter.capabilityFamily) ?? []) ids.add(id);
  }

  return {
    ids: [...ids],
    recordsExamined: indexed.recordsExamined,
    lookupMode: indexed.lookupMode,
  };
}

function targetNeighborhoodIds(garden, targetId) {
  return targetNeighborhoodResolution(garden, targetId).ids;
}

function operationActivation({ garden, operation, target }) {
  if (!operation || ['EXPAND', 'SELECT'].includes(operation)) {
    return { mode: 'global', ids: null, targetId: targetIdFromArgs(target) };
  }

  const targetId = targetIdFromArgs(target);
  if (!targetId) return { mode: 'global_fallback', ids: null, targetId: null };
  return {
    mode: 'target_neighborhood',
    ids: targetNeighborhoodIds(garden, targetId),
    targetId,
  };
}

export function diagnoseReasonerActivation({ garden, operation = null, target = null } = {}) {
  if (!garden) throw new Error('diagnoseReasonerActivation requires a Garden.');
  if (!operation || ['EXPAND', 'SELECT'].includes(operation)) {
    return {
      mode: 'global',
      targetId: targetIdFromArgs(target),
      recordsExamined: 0,
      centerCount: garden.geometry?.centers?.length ?? 0,
      lookupMode: 'global_no_neighborhood_lookup',
    };
  }

  const targetId = targetIdFromArgs(target);
  if (!targetId) {
    return {
      mode: 'global_fallback',
      targetId: null,
      recordsExamined: 0,
      centerCount: garden.geometry?.centers?.length ?? 0,
      lookupMode: 'missing_target',
    };
  }

  const resolution = targetNeighborhoodResolution(garden, targetId);
  return {
    mode: 'target_neighborhood',
    targetId,
    recordsExamined: resolution.recordsExamined,
    centerCount: garden.geometry?.centers?.length ?? 0,
    lookupMode: resolution.lookupMode,
    resolvedIdCount: resolution.ids?.length ?? 0,
  };
}

export function buildReasonerGardenView({ garden, operation = null, target = null } = {}) {
  if (!garden) throw new Error('buildReasonerGardenView requires a Garden.');

  const activation = operationActivation({ garden, operation, target });
  const allowed = activation.ids ? new Set(activation.ids) : null;
  const fruits = allowed ? (garden.fruits ?? []).filter((fruit) => allowed.has(fruit.id)) : garden.fruits;
  const opportunities = allowed
    ? (garden.opportunities ?? []).filter((opp) => allowed.has(opp.id))
    : garden.opportunities;

  return {
    schemaVersion: garden.schemaVersion,
    id: garden.id,
    center: clone(garden.center),
    methodology: clone(FLOWER_METHODOLOGY),
    soil: soilView(garden.soil),
    fruits: fruitView(fruits),
    opportunities: opportunityView(opportunities),
    transferSeeds: operation === 'EXPAND' || operation === 'SELECT'
      ? transferSeedView(garden.transferSeeds ?? [])
      : [],
    scoutMisses: operation === 'EXPAND' ? clone((garden.scoutMisses ?? []).slice(-20)) : [],
    geometry: geometryView(garden.geometry, activation.ids, operation === 'EXPAND' || operation === 'SELECT' ? garden.transferSeeds ?? [] : []),
    portfolioSummary: {
      fruitCount: (garden.fruits ?? []).length,
      opportunityCount: (garden.opportunities ?? []).length,
      transferSeedCount: (garden.transferSeeds ?? []).length,
      liveFruitCount: (garden.fruits ?? []).filter((fruit) => fruit.status === 'live').length,
      unresolvedMarketTruthCount: (garden.fruits ?? []).filter((fruit) => fruit.marketTruth === 'unresolved').length,
    },
    reasonerView: {
      operation,
      activation,
      methodologyVersion: FLOWER_METHODOLOGY.version,
      omittedAsExecutionNoise: [
        'traces',
        'events',
        'approvals',
        'runtime status timestamps',
        'full internal-improvement records after transfer-seed crystallization',
        'pairwise geometry edges reconstructible from family membership',
        ...(activation.ids ? ['organisms outside the target geometry neighborhood; aggregate portfolio counts retained'] : []),
      ],
    },
  };
}
