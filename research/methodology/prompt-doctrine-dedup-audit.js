const CONCEPTS = [
  {
    id: 'evidence_over_enthusiasm',
    methodology: [/Evidence outranks elegance/i, /external truth/i],
    reasoner: [/external reality over enthusiasm/i, /Never claim economic validation/i],
  },
  {
    id: 'value_capture_separation',
    methodology: [/Value creation and value capture are separate ledgers/i, /capture without evidence/i],
    reasoner: [/Never optimize capture at the expense of useful value/i, /valueCapturePath/i],
  },
  {
    id: 'autonomy_downstream',
    methodology: [/Autonomy is a direction of compression after value is evidenced/i],
    reasoner: [/Passivity and autonomy are downstream compression advantages/i, /Passivity, autonomy, and reproductive inheritance improve a validated loop/i],
  },
  {
    id: 'anti_goodhart',
    methodology: [/Metrics are servants of the objective/i, /antiGoodhart/i],
    reasoner: [/antiGoodhartRisk/i, /optimizing the apparent success metric/i],
  },
  {
    id: 'human_attention_burden',
    methodology: [/Human attention is scarce capital/i],
    reasoner: [/humanBoundary/i, /continuing human labor/i],
  },
  {
    id: 'return_not_surplus',
    methodology: [/Gross return is not regenerative surplus/i, /fullCost/i],
    reasoner: [/lifecycleCostModel/i, /gross return cannot masquerade as surplus/i],
  },
  {
    id: 'sacred_geometry_not_evidence',
    methodology: [/evidence outranks elegance/i],
    reasoner: [/Sacred-geometry language is a functional design metaphor/i, /does not lower evidence thresholds/i],
  },
];

function matchesAny(text, patterns) {
  return patterns.some((pattern) => pattern.test(text));
}

export function auditDoctrineDuplication({ methodologySource = '', reasonerSource = '' } = {}) {
  const rows = CONCEPTS.map((concept) => {
    const inMethodology = matchesAny(methodologySource, concept.methodology);
    const inReasoner = matchesAny(reasonerSource, concept.reasoner);
    return {
      id: concept.id,
      inMethodology,
      inReasoner,
      duplicatedAcrossLayers: inMethodology && inReasoner,
    };
  });

  const duplicated = rows.filter((row) => row.duplicatedAcrossLayers);
  return {
    rows,
    conceptCount: rows.length,
    duplicatedConceptCount: duplicated.length,
    duplicationFraction: rows.length ? Number((duplicated.length / rows.length).toFixed(6)) : 0,
    recommendation: duplicated.length >= 3
      ? 'paired_replay_dedup_candidate'
      : 'insufficient_duplication_signal',
    runtimeAuthority: false,
    canonicalPromotionAuthorized: false,
    epistemicBoundary:
      'Concept overlap across prompt layers is a maintenance and token-cost signal, not proof that either wording is behaviorally redundant. Remove doctrine from reasoner code only after paired same-workload replay preserves decision, evidence, authority, and stop behavior.',
  };
}
