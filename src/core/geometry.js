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

function archetypeFamily(archetype) {
  const value = slug(archetype);
  if (!value) return null;
  if (/identity|pointer|entity|catalog|metadata/.test(value)) return 'identity_integrity';
  if (/contract|schema|compatib|version|documentation|runtime|drift/.test(value)) return 'representation_drift';
  if (/duplicate|contradiction|reconciliation/.test(value)) return 'record_consistency';
  if (/configuration|authentication|policy|spf|dmarc/.test(value)) return 'configuration_integrity';
  if (/document|structure|reading|order|semantic/.test(value)) return 'semantic_structure_integrity';
  return value;
}

function capabilityFamily(capability) {
  const value = slug(capability);
  if (!value) return null;
  if (/identity|entity|catalog.*recon|cross_source.*recon/.test(value)) return 'identity_reconciliation';
  if (/schema|contract|version|compatib|spec.*runtime|example.*runtime/.test(value)) return 'representation_comparison';
  if (/record|duplicate|credit.*recon/.test(value)) return 'record_reconciliation';
  if (/dns|policy|authentication/.test(value)) return 'configuration_inspection';
  if (/document|structure|graph|reading_order/.test(value)) return 'structure_graph_analysis';
  return value;
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

function coverageMetrics(centers) {
  let earnedEvidenceCenters = 0;
  let resolvedCenters = 0;
  for (const center of centers) {
    for (const state of Object.values(center.coverage ?? {})) {
      if (state === 'earned') earnedEvidenceCenters += 1;
      if (!['unknown', 'claimed'].includes(state)) resolvedCenters += 1;
    }
  }
  return { earnedEvidenceCenters, resolvedCenters };
}

export function refreshGeometry(garden) {
  const centers = [];

  for (const fruit of garden.fruits ?? []) {
    const archetype = inferArchetype(fruit);
    const reusableCapability = inferCapability(fruit);
    centers.push({
      id: fruit.id,
      kind: 'fruit',
      name: fruit.name,
      status: fruit.status,
      archetype,
      archetypeFamily: archetypeFamily(archetype),
      reusableCapability,
      capabilityFamily: capabilityFamily(reusableCapability),
      nutrientChannel: fruit.platform ?? null,
      coverage: centerCoverage(garden, fruit, 'fruit'),
    });
  }

  for (const opp of garden.opportunities ?? []) {
    const archetype = inferArchetype(opp);
    const reusableCapability = inferCapability(opp);
    centers.push({
      id: opp.id,
      kind: 'opportunity',
      name: opp.name,
      status: opp.status,
      archetype,
      archetypeFamily: archetypeFamily(archetype),
      reusableCapability,
      capabilityFamily: capabilityFamily(reusableCapability),
      nutrientChannel: opp.nutrientChannel ?? null,
      coverage: centerCoverage(garden, opp, 'opportunity'),
    });
  }

  const archetypeGroups = new Map();
  const capabilityGroups = new Map();
  for (const center of centers) {
    if (center.archetypeFamily) {
      const list = archetypeGroups.get(center.archetypeFamily) ?? [];
      list.push(center.id);
      archetypeGroups.set(center.archetypeFamily, list);
    }
    if (center.capabilityFamily) {
      const list = capabilityGroups.get(center.capabilityFamily) ?? [];
      list.push(center.id);
      capabilityGroups.set(center.capabilityFamily, list);
    }
  }

  const edges = [];
  for (const [key, ids] of archetypeGroups) {
    if (ids.length > 1) addPairEdges(edges, key, ids, 'shared_failure_archetype_family');
  }
  for (const [key, ids] of capabilityGroups) {
    if (ids.length > 1) addPairEdges(edges, key, ids, 'shared_reusable_capability_family');
  }

  const archetypes = [...archetypeGroups.entries()].map(([name, ids]) => ({
    name,
    centerIds: [...new Set(ids)],
    reuseCount: new Set(ids).size,
  }));
  const capabilities = [...capabilityGroups.entries()].map(([name, ids]) => ({
    name,
    centerIds: [...new Set(ids)],
    reuseCount: new Set(ids).size,
  }));
  const reusableArchetypes = archetypes.filter((x) => x.reuseCount > 1).length;
  const reusableCapabilities = capabilities.filter((x) => x.reuseCount > 1).length;
  const coverage = coverageMetrics(centers);

  let stage = 'seed_of_life';
  if ((garden.opportunities ?? []).length > 0) stage = 'flower_of_life';
  if ((garden.fruits ?? []).length > 0) stage = 'fruit_of_life';
  if (edges.length > 0) stage = 'metatrons_cube';

  garden.geometry = {
    version: 3,
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
      earnedEvidenceCenterCount: coverage.earnedEvidenceCenters,
      resolvedCenterCount: coverage.resolvedCenters,
      validatedOpportunityCount: (garden.opportunities ?? []).filter((x) => x.status === 'validated').length,
      buildReadyOpportunityCount: (garden.opportunities ?? []).filter((x) => x.status === 'build_ready').length,
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
      archetypeFamily: x.archetypeFamily,
      reusableCapability: x.reusableCapability,
      capabilityFamily: x.capabilityFamily,
    })),
  };
}
