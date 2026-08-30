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

function geometryView(geometry, allowedIds = null) {
  if (!geometry) return null;

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

  // Pairwise edges are reconstructible from family membership and can grow O(n^2).
  // Preserve the centers/families/coverage that determine those edges instead of
  // transmitting every redundant pair across the costly cognition boundary.
  return {
    version: geometry.version ?? null,
    stage: geometry.stage ?? null,
    metrics: clone(geometry.metrics ?? {}),
    fruitOfLifeCenters: clone(geometry.fruitOfLifeCenters ?? []),
    centers,
    archetypes: trimFamilies(geometry.archetypes ?? []),
    capabilities: trimFamilies(geometry.capabilities ?? []),
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

function targetNeighborhoodIds(garden, targetId) {
  if (!targetId || !garden.geometry) return null;
  const targetCenter = (garden.geometry.centers ?? []).find((center) => center.id === targetId);
  if (!targetCenter) return [targetId];

  const ids = new Set([targetId]);
  for (const center of garden.geometry.centers ?? []) {
    if (center.id === targetId) continue;
    const sharedArchetype = targetCenter.archetypeFamily
      && center.archetypeFamily === targetCenter.archetypeFamily;
    const sharedCapability = targetCenter.capabilityFamily
      && center.capabilityFamily === targetCenter.capabilityFamily;
    if (sharedArchetype || sharedCapability) ids.add(center.id);
  }
  return [...ids];
}

function operationActivation({ garden, operation, target }) {
  // Global comparison/search operations need the whole compressed field. Targeted
  // operations wake only the target neighborhood. This keeps the knowledge topology
  // global while making costly execution sparse.
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
    soil: soilView(garden.soil),
    fruits: fruitView(fruits),
    opportunities: opportunityView(opportunities),
    scoutMisses: operation === 'EXPAND' ? clone((garden.scoutMisses ?? []).slice(-20)) : [],
    geometry: geometryView(garden.geometry, activation.ids),
    portfolioSummary: {
      fruitCount: (garden.fruits ?? []).length,
      opportunityCount: (garden.opportunities ?? []).length,
      liveFruitCount: (garden.fruits ?? []).filter((fruit) => fruit.status === 'live').length,
      unresolvedMarketTruthCount: (garden.fruits ?? []).filter((fruit) => fruit.marketTruth === 'unresolved').length,
    },
    reasonerView: {
      operation,
      activation,
      omittedAsExecutionNoise: [
        'traces',
        'events',
        'approvals',
        'runtime status timestamps',
        'pairwise geometry edges reconstructible from family membership',
        ...(activation.ids ? ['organisms outside the target geometry neighborhood; aggregate portfolio counts retained'] : []),
      ],
    },
  };
}
