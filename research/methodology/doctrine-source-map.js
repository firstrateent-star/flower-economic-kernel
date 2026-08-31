const DOCTRINE_SOURCE_MAP = Object.freeze({
  evidence_over_enthusiasm: {
    authority: 'canonical_methodology',
    source: 'FLOWER_METHODOLOGY.invariants',
    operationRestatementAllowed: false,
  },
  value_capture_separation: {
    authority: 'canonical_methodology',
    source: 'FLOWER_METHODOLOGY.invariants + regenerativeValueGovernance',
    operationRestatementAllowed: false,
  },
  autonomy_downstream: {
    authority: 'canonical_methodology',
    source: 'FLOWER_METHODOLOGY.invariants',
    operationRestatementAllowed: false,
  },
  anti_goodhart: {
    authority: 'canonical_methodology',
    source: 'FLOWER_METHODOLOGY.terminalGovernance + selfImprovementValueGovernance',
    operationRestatementAllowed: false,
  },
  human_attention_burden: {
    authority: 'canonical_methodology',
    source: 'FLOWER_METHODOLOGY.invariants',
    operationRestatementAllowed: false,
  },
  return_not_surplus: {
    authority: 'canonical_methodology',
    source: 'FLOWER_METHODOLOGY.invariants + regenerativeValueGovernance',
    operationRestatementAllowed: false,
  },
  sacred_geometry_not_evidence: {
    authority: 'origin_boundary',
    source: 'docs/FLOWER_ORIGIN_PROVENANCE.md + methodology projection originPointer',
    operationRestatementAllowed: false,
  },
  json_only_output: {
    authority: 'operation_mechanics',
    source: 'reasoner protocol',
    operationRestatementAllowed: true,
  },
  schema_requirements: {
    authority: 'operation_mechanics',
    source: 'structuredFormatFor(operation)',
    operationRestatementAllowed: true,
  },
  executor_capabilities: {
    authority: 'runtime_capability_boundary',
    source: 'current executor/runtime state',
    operationRestatementAllowed: true,
  },
});

export function doctrineSourceMap() {
  return structuredClone(DOCTRINE_SOURCE_MAP);
}

export function classifyDoctrineConcept(id) {
  return DOCTRINE_SOURCE_MAP[id] ? structuredClone(DOCTRINE_SOURCE_MAP[id]) : null;
}

export function doctrineSourceSummary() {
  const rows = Object.entries(DOCTRINE_SOURCE_MAP).map(([id, item]) => ({ id, ...item }));
  return {
    rows,
    canonicalCount: rows.filter((x) => x.authority === 'canonical_methodology').length,
    originBoundaryCount: rows.filter((x) => x.authority === 'origin_boundary').length,
    operationMechanicsCount: rows.filter((x) => x.operationRestatementAllowed).length,
    runtimeAuthority: false,
    principle:
      'Each doctrine concept should have one authoritative source. Runtime prompts may restate mechanics and current capability facts, but should not duplicate canonical policy unless paired replay proves the redundancy is behaviorally necessary.',
  };
}
