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
    creatorRevenueUsd: fruit.creatorRevenueUsd ?? null,
    monthlyRevenueUsd: fruit.monthlyRevenueUsd ?? null,
    repeatDemand: fruit.repeatDemand ?? null,
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

function geometryView(geometry) {
  if (!geometry) return null;

  // Pairwise edges are reconstructible from family membership and can grow O(n^2).
  // Preserve the complete centers/families/coverage that determine those edges instead
  // of transmitting every redundant pair across the costly cognition boundary.
  return {
    version: geometry.version ?? null,
    stage: geometry.stage ?? null,
    metrics: clone(geometry.metrics ?? {}),
    fruitOfLifeCenters: clone(geometry.fruitOfLifeCenters ?? []),
    centers: (geometry.centers ?? []).map((center) => ({
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
    })),
    archetypes: clone(geometry.archetypes ?? []),
    capabilities: clone(geometry.capabilities ?? []),
  };
}

export function buildReasonerGardenView({ garden, operation = null } = {}) {
  if (!garden) throw new Error('buildReasonerGardenView requires a Garden.');

  return {
    schemaVersion: garden.schemaVersion,
    id: garden.id,
    center: clone(garden.center),
    soil: soilView(garden.soil),
    fruits: fruitView(garden.fruits),
    opportunities: opportunityView(garden.opportunities),
    scoutMisses: clone((garden.scoutMisses ?? []).slice(-20)),
    geometry: geometryView(garden.geometry),
    reasonerView: {
      operation,
      omittedAsExecutionNoise: [
        'traces',
        'events',
        'approvals',
        'runtime status timestamps',
        'pairwise geometry edges reconstructible from family membership',
      ],
    },
  };
}
