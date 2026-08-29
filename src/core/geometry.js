export const FRUIT_OF_LIFE_CENTERS = [
  'failure_reality',
  'resolution_accessibility',
  'buyer_demand',
  'willingness_to_pay',
  'nutrient_channel',
  'passive_discoverability',
  'resolution_complexity',
  'automatic_fulfillment',
  'measurement_legibility',
  'maintenance_burden',
  'capital_risk',
  'inheritance',
  'harvest_sovereignty',
];

const LEGACY_ARCHETYPES = {
  fruit_exact_match_guard: 'identity_resolution',
  opp_maps_website_pointer_guard: 'identity_pointer_drift',
  opp_8ffa2bedaedb: 'contract_drift',
  opp_1eb391243197: 'duplicate_contradiction',
  opp_a179f5e22952: 'configuration_integrity',
  opp_085080b2ca29: 'compatibility_drift',
  opp_214d17e3d492: 'identity_metadata_conflict',
  opp_87e84931b10c: 'documentation_runtime_drift',
  opp_0ec6b9b8591b: 'document_structure_order',
};

const LEGACY_CAPABILITIES = {
  fruit_exact_match_guard: 'entity_identity_matching',
  opp_maps_website_pointer_guard: 'cross_source_identity_reconciliation',
  opp_8ffa2bedaedb: 'schema_contract_comparison',
  opp_1eb391243197: 'record_reconciliation',
  opp_a179f5e22952: 'dns_policy_inspection',
  opp_085080b2ca29: 'version_compatibility_evidence',
  opp_214d17e3d492: 'catalog_identity_reconciliation',
  opp_87e84931b10c: 'example_spec_runtime_comparison',
  opp_0ec6b9b8591b: 'document_structure_graph_analysis',
};

function slug(value) {
  return String(value ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 80);
}

function inferArchetype(entity) {
  if (entity?.failureArchetype) return slug(entity.failureArchetype);
  if (LEGACY_ARCHETYPES[entity?.id]) return LEGACY_ARCHETYPES[entity.id];
  const text = `${entity?.name ?? ''} ${entity?.thesis ?? ''}`.toLowerCase();
  if (/identity|exact match|pointer|gtin|brand|mpn/.test(text)) return 'identity_integrity';
  if (/duplicate|credit memo|contradict/.test(text)) return 'duplicate_contradiction';
  if (/schema|contract|webhook/.test(text)) return 'contract_drift';
  if (/compatib|version|release/.test(text)) return 'compatibility_drift';
  if (/reading order|pdf|document structure|tag/.test(text)) return 'document_structure_order';
  if (/spf|dmarc|authentication|configuration/.test(text)) return 'configuration_integrity';
  return null;
}

function inferCapability(entity) {
  if (entity?.reusableCapability) return slug(entity.reusableCapability);
  if (LEGACY_CAPABILITIES[entity?.id]) return LEGACY_CAPABILITIES[entity.id];
  if (entity?.inheritedInfrastructure) return slug(entity.inheritedInfrastructure);
  return null;
}

function supportingDimensions(garden, opportunityId) {
  return [...new Set((garden.experiments ?? [])
    .filter((exp) => exp.opportunityId === opportunityId && exp.status === 'integrated' && exp.result?.verdict === 'supports')
    .map((exp) => exp.validationDimension)
    .filter(Boolean))];
}

function centerCoverage(garden, entity, kind) {
  const coverage = Object.fromEntries(FRUIT_OF_LIFE_CENTERS.map((name) => [name, 'unknown']));
  if (kind === 'fruit') {
    coverage.failure_reality = 'inherited';
    coverage.buyer_demand = entity.monthlyRevenueUsd != null ? 'earned' : 'inherited';
    coverage.nutrient_channel = entity.platform ? 'observed' : 'unknown';
    coverage.automatic_fulfillment = 'inherited';
    coverage.inheritance = (entity.inheritance ?? []).length ? 'observed' : 'unknown';
    coverage.harvest_sovereignty = 'protected';
    return coverage;
  }

  for (const dimension of supportingDimensions(garden, entity.id)) {
    if (dimension in coverage) coverage[dimension] = 'earned';
  }
  if (entity.nutrientChannel) coverage.nutrient_channel = 'claimed';
  if (entity.passivity) coverage.passive_discoverability = 'claimed';
  if (entity.autonomyCompatibility) coverage.automatic_fulfillment = 'claimed';
  if (entity.realityAccess) coverage.measurement_legibility = 'claimed';
  if (entity.reproductivePotential || entity.inheritedInfrastructure) coverage.inheritance = 'claimed';
  coverage.capital_risk = 'bounded';
  coverage.harvest_sovereignty = 'protected';
  return coverage;
}

function addPairEdges(edges, key, ids, relation) {
  const unique = [...new Set(ids)].sort();
  for (let i = 0; i < unique.length; i += 1) {
    for (let j = i + 1; j < unique.length; j += 1) {
      edges.push({
        id: `${relation}:${key}:${unique[i]}:${unique[j]}`,
        from: unique[i],
        to: unique[j],
        relation,
        key,
      });
    }
  }
}

export function refreshGeometry(garden) {
  const centers = [];

  for (const fruit of garden.fruits ?? []) {
    centers.push({
      id: fruit.id,
      kind: 'fruit',
      name: fruit.name,
      status: fruit.status,
      archetype: inferArchetype(fruit),
      reusableCapability: inferCapability(fruit),
      nutrientChannel: fruit.platform ?? null,
      coverage: centerCoverage(garden, fruit, 'fruit'),
    });
  }

  for (const opp of garden.opportunities ?? []) {
    centers.push({
      id: opp.id,
      kind: 'opportunity',
      name: opp.name,
      status: opp.status,
      archetype: inferArchetype(opp),
      reusableCapability: inferCapability(opp),
      nutrientChannel: opp.nutrientChannel ?? null,
      coverage: centerCoverage(garden, opp, 'opportunity'),
    });
  }

  const archetypeGroups = new Map();
  const capabilityGroups = new Map();
  for (const center of centers) {
    if (center.archetype) {
      const list = archetypeGroups.get(center.archetype) ?? [];
      list.push(center.id);
      archetypeGroups.set(center.archetype, list);
    }
    if (center.reusableCapability) {
      const list = capabilityGroups.get(center.reusableCapability) ?? [];
      list.push(center.id);
      capabilityGroups.set(center.reusableCapability, list);
    }
  }

  const edges = [];
  for (const [key, ids] of archetypeGroups) {
    if (ids.length > 1) addPairEdges(edges, key, ids, 'shared_failure_archetype');
  }
  for (const [key, ids] of capabilityGroups) {
    if (ids.length > 1) addPairEdges(edges, key, ids, 'shared_reusable_capability');
  }

  const archetypes = [...archetypeGroups.entries()].map(([name, ids]) => ({ name, centerIds: [...new Set(ids)], reuseCount: new Set(ids).size }));
  const capabilities = [...capabilityGroups.entries()].map(([name, ids]) => ({ name, centerIds: [...new Set(ids)], reuseCount: new Set(ids).size }));
  const reusableArchetypes = archetypes.filter((x) => x.reuseCount > 1).length;
  const reusableCapabilities = capabilities.filter((x) => x.reuseCount > 1).length;

  let stage = 'seed_of_life';
  if ((garden.opportunities ?? []).length > 0) stage = 'flower_of_life';
  if ((garden.fruits ?? []).length > 0) stage = 'fruit_of_life';
  if (edges.length > 0) stage = 'metatrons_cube';

  garden.geometry = {
    version: 1,
    stage,
    metaphorNote: 'Sacred-geometry language is used as a functional design metaphor: centers preserve evidence and agency; edges represent reusable relationships. It is not treated as empirical proof by itself.',
    fruitOfLifeCenters: FRUIT_OF_LIFE_CENTERS,
    centers,
    edges,
    archetypes,
    capabilities,
    metrics: {
      centerCount: centers.length,
      edgeCount: edges.length,
      reusableArchetypeCount: reusableArchetypes,
      reusableCapabilityCount: reusableCapabilities,
      preservedBlockedKnowledge: (garden.opportunities ?? []).filter((x) => x.status === 'measurement_blocked').length,
      liveFruitCount: (garden.fruits ?? []).filter((x) => ['live', 'fruit', 'build_ready'].includes(x.status)).length,
    },
    updatedAt: new Date().toISOString(),
  };

  return garden.geometry;
}

export function geometryBrief(garden) {
  const geometry = refreshGeometry(garden);
  return {
    stage: geometry.stage,
    metrics: geometry.metrics,
    reusableArchetypes: geometry.archetypes.filter((x) => x.reuseCount > 1).slice(0, 8),
    reusableCapabilities: geometry.capabilities.filter((x) => x.reuseCount > 1).slice(0, 8),
    recentCenters: geometry.centers.slice(-8).map((x) => ({
      id: x.id,
      name: x.name,
      status: x.status,
      archetype: x.archetype,
      reusableCapability: x.reusableCapability,
    })),
  };
}
