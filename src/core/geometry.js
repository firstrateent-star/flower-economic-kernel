import { createHash } from 'node:crypto';

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

function supportingDimensionMap(garden) {
  const map = new Map();
  for (const exp of garden.experiments ?? []) {
    if (exp.status !== 'integrated' || exp.result?.verdict !== 'supports' || !exp.validationDimension) continue;
    const set = map.get(exp.opportunityId) ?? new Set();
    set.add(exp.validationDimension);
    map.set(exp.opportunityId, set);
  }
  return map;
}

function centerCoverage(entity, kind, supportingDimensions = []) {
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

  for (const dimension of supportingDimensions) {
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

function centerForEntity(entity, kind, dimensions = []) {
  const archetype = inferArchetype(entity);
  const reusableCapability = inferCapability(entity);
  return {
    id: entity.id,
    kind,
    name: entity.name,
    status: entity.status,
    archetype,
    archetypeFamily: archetypeFamily(archetype),
    reusableCapability,
    capabilityFamily: capabilityFamily(reusableCapability),
    nutrientChannel: kind === 'fruit' ? entity.platform ?? null : entity.nutrientChannel ?? null,
    coverage: centerCoverage(entity, kind, dimensions),
  };
}

function buildCenters(garden) {
  const supportMap = supportingDimensionMap(garden);
  return [
    ...(garden.fruits ?? []).map((fruit) => centerForEntity(fruit, 'fruit')),
    ...(garden.opportunities ?? []).map((opp) => centerForEntity(opp, 'opportunity', [...(supportMap.get(opp.id) ?? [])])),
  ];
}

function groupCenters(centers, field) {
  const groups = new Map();
  for (const center of centers) {
    const key = center[field];
    if (!key) continue;
    const ids = groups.get(key) ?? [];
    ids.push(center.id);
    groups.set(key, ids);
  }
  for (const [key, ids] of groups) groups.set(key, [...new Set(ids)].sort());
  return groups;
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

function arraysEqual(a = [], b = []) {
  return a.length === b.length && a.every((value, index) => value === b[index]);
}

function oldFamilyMap(families = []) {
  return new Map(families.map((family) => [family.name, [...new Set(family.centerIds ?? [])].sort()]));
}

function changedFamilyKeys(previousFamilies, nextGroups) {
  const previous = oldFamilyMap(previousFamilies);
  const keys = new Set([...previous.keys(), ...nextGroups.keys()]);
  return [...keys].filter((key) => !arraysEqual(previous.get(key) ?? [], nextGroups.get(key) ?? []));
}

function buildEdgesIncrementally(previousGeometry, archetypeGroups, capabilityGroups) {
  if (!previousGeometry || previousGeometry.version < 4) {
    const edges = [];
    for (const [key, ids] of archetypeGroups) {
      if (ids.length > 1) addPairEdges(edges, key, ids, 'shared_failure_archetype_family');
    }
    for (const [key, ids] of capabilityGroups) {
      if (ids.length > 1) addPairEdges(edges, key, ids, 'shared_reusable_capability_family');
    }
    return {
      edges: edges.sort((a, b) => a.id.localeCompare(b.id)),
      mode: 'full',
      affectedArchetypeFamilies: [...archetypeGroups.keys()],
      affectedCapabilityFamilies: [...capabilityGroups.keys()],
    };
  }

  const affectedArchetypes = changedFamilyKeys(previousGeometry.archetypes, archetypeGroups);
  const affectedCapabilities = changedFamilyKeys(previousGeometry.capabilities, capabilityGroups);
  const affectedArchetypeSet = new Set(affectedArchetypes);
  const affectedCapabilitySet = new Set(affectedCapabilities);

  const edges = (previousGeometry.edges ?? []).filter((edge) => {
    if (edge.relation === 'shared_failure_archetype_family') return !affectedArchetypeSet.has(edge.key);
    if (edge.relation === 'shared_reusable_capability_family') return !affectedCapabilitySet.has(edge.key);
    return true;
  });

  for (const key of affectedArchetypes) {
    const ids = archetypeGroups.get(key) ?? [];
    if (ids.length > 1) addPairEdges(edges, key, ids, 'shared_failure_archetype_family');
  }
  for (const key of affectedCapabilities) {
    const ids = capabilityGroups.get(key) ?? [];
    if (ids.length > 1) addPairEdges(edges, key, ids, 'shared_reusable_capability_family');
  }

  return {
    edges: edges.sort((a, b) => a.id.localeCompare(b.id)),
    mode: 'incremental',
    affectedArchetypeFamilies: affectedArchetypes,
    affectedCapabilityFamilies: affectedCapabilities,
  };
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

function geometryInputSignature(garden) {
  // Geometry is a derived projection. Hash only fields that can affect that projection.
  const input = {
    fruits: (garden.fruits ?? []).map((fruit) => ({
      id: fruit.id,
      name: fruit.name,
      status: fruit.status,
      failureArchetype: fruit.failureArchetype ?? null,
      reusableCapability: fruit.reusableCapability ?? null,
      inheritedInfrastructure: fruit.inheritedInfrastructure ?? null,
      platform: fruit.platform ?? null,
      monthlyRevenueUsd: fruit.monthlyRevenueUsd ?? null,
      inheritance: fruit.inheritance ?? [],
    })),
    opportunities: (garden.opportunities ?? []).map((opp) => ({
      id: opp.id,
      name: opp.name,
      status: opp.status,
      thesis: opp.thesis ?? null,
      failureArchetype: opp.failureArchetype ?? null,
      reusableCapability: opp.reusableCapability ?? null,
      inheritedInfrastructure: opp.inheritedInfrastructure ?? null,
      nutrientChannel: opp.nutrientChannel ?? null,
      passivity: opp.passivity ?? null,
      autonomyCompatibility: opp.autonomyCompatibility ?? null,
      realityAccess: opp.realityAccess ?? null,
      reproductivePotential: opp.reproductivePotential ?? null,
    })),
    supportingExperiments: (garden.experiments ?? [])
      .filter((exp) => exp.status === 'integrated' && exp.result?.verdict === 'supports')
      .map((exp) => ({
        opportunityId: exp.opportunityId ?? null,
        validationDimension: exp.validationDimension ?? null,
      })),
  };

  return createHash('sha256').update(JSON.stringify(input)).digest('hex');
}

function familyList(groups) {
  return [...groups.entries()].map(([name, ids]) => ({
    name,
    centerIds: ids,
    reuseCount: ids.length,
  }));
}

export function refreshGeometry(garden) {
  const inputSignature = geometryInputSignature(garden);
  if (garden.geometry?.inputSignature === inputSignature) return garden.geometry;

  const previousGeometry = garden.geometry ?? null;
  const centers = buildCenters(garden);
  const archetypeGroups = groupCenters(centers, 'archetypeFamily');
  const capabilityGroups = groupCenters(centers, 'capabilityFamily');
  const edgeBuild = buildEdgesIncrementally(previousGeometry, archetypeGroups, capabilityGroups);
  const archetypes = familyList(archetypeGroups);
  const capabilities = familyList(capabilityGroups);
  const reusableArchetypes = archetypes.filter((x) => x.reuseCount > 1).length;
  const reusableCapabilities = capabilities.filter((x) => x.reuseCount > 1).length;
  const coverage = coverageMetrics(centers);

  let stage = 'seed_of_life';
  if ((garden.opportunities ?? []).length > 0) stage = 'flower_of_life';
  if ((garden.fruits ?? []).length > 0) stage = 'fruit_of_life';
  if (edgeBuild.edges.length > 0) stage = 'metatrons_cube';

  garden.geometry = {
    version: 5,
    inputSignature,
    stage,
    metaphorNote: 'Sacred-geometry language is used as a functional design metaphor: centers preserve evidence and agency; edges represent reusable relationships. It is not treated as empirical proof by itself.',
    fruitOfLifeCenters: FRUIT_OF_LIFE_CENTERS,
    centers,
    edges: edgeBuild.edges,
    archetypes,
    capabilities,
    metrics: {
      centerCount: centers.length,
      edgeCount: edgeBuild.edges.length,
      reusableArchetypeCount: reusableArchetypes,
      reusableCapabilityCount: reusableCapabilities,
      earnedEvidenceCenterCount: coverage.earnedEvidenceCenters,
      resolvedCenterCount: coverage.resolvedCenters,
      validatedOpportunityCount: (garden.opportunities ?? []).filter((x) => x.status === 'validated').length,
      buildReadyOpportunityCount: (garden.opportunities ?? []).filter((x) => x.status === 'build_ready').length,
      preservedBlockedKnowledge: (garden.opportunities ?? []).filter((x) => x.status === 'measurement_blocked').length,
      liveFruitCount: (garden.fruits ?? []).filter((x) => ['live', 'fruit', 'build_ready'].includes(x.status)).length,
    },
    recomputation: {
      mode: edgeBuild.mode,
      affectedArchetypeFamilies: edgeBuild.affectedArchetypeFamilies,
      affectedCapabilityFamilies: edgeBuild.affectedCapabilityFamilies,
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
