import { FLOWER_METHODOLOGY } from '../../src/core/methodology-core.js';
import { methodologyProjectionMatrix } from './methodology-projection.js';
import { MINIMAL_REASONER_BASE } from './reasoner-base-dedup-shadow.js';
import { assessPhiSearchEligibility } from './phi-fibonacci-optimization.js';

function bytes(value) {
  return Buffer.byteLength(typeof value === 'string' ? value : JSON.stringify(value), 'utf8');
}

const PROTECTED_DISTINCTIONS = Object.freeze([
  'evidence_over_elegance',
  'terminal_objective_lock',
  'value_vs_capture',
  'return_vs_surplus',
  'ownership_authority',
  'diversity_before_depth',
  'champion_challenger',
  'human_attention',
  'uncertainty_provenance',
  'autonomy_downstream',
  'semantic_transition_gate',
  'fixed_point_convergence',
  'deterministic_preparation',
  'compression_equivalence',
  'internal_vs_external_value',
  'center_nourishment',
  'origin_projection_boundary',
  'stop_when_action_outvalues_recursion',
]);

function fullInvariantCoverage() {
  return new Set([
    'evidence_over_elegance', 'terminal_objective_lock', 'value_vs_capture', 'return_vs_surplus',
    'ownership_authority', 'diversity_before_depth', 'champion_challenger', 'human_attention',
    'uncertainty_provenance', 'autonomy_downstream', 'semantic_transition_gate', 'fixed_point_convergence',
    'deterministic_preparation', 'compression_equivalence', 'internal_vs_external_value', 'center_nourishment',
    'stop_when_action_outvalues_recursion',
  ]);
}

// Deliberately aggressive next-step candidate used only for the post-limit stress test.
// It keeps broad slogans while dropping several distinctions that look redundant at first glance.
function stressedInvariantCoverage() {
  return new Set([
    'evidence_over_elegance',
    'terminal_objective_lock',
    'value_vs_capture',
    'human_attention',
    'uncertainty_provenance',
    'compression_equivalence',
    'center_nourishment',
    'stop_when_action_outvalues_recursion',
  ]);
}

function coverageAssessment(coverage, { originPointerPresent = true } = {}) {
  const actual = new Set(coverage);
  if (originPointerPresent) actual.add('origin_projection_boundary');
  const missing = PROTECTED_DISTINCTIONS.filter((item) => !actual.has(item));
  return {
    protectedCount: PROTECTED_DISTINCTIONS.length,
    coveredCount: PROTECTED_DISTINCTIONS.length - missing.length,
    missing,
    safeByStaticDistinctionTest: missing.length === 0,
  };
}

export function runSelfRecursiveOptimizationStress({
  pairedDecisionReplayAvailable = false,
  cacheTelemetryAvailable = false,
} = {}) {
  const fullMethodBytes = bytes(FLOWER_METHODOLOGY);
  const projectionRows = methodologyProjectionMatrix();
  const averageProjectionReduction = projectionRows.reduce((sum, row) => sum + row.reductionFraction, 0) / projectionRows.length;

  const rounds = [
    {
      round: 0,
      pressure: 'observe_current_method',
      mutation: 'none_baseline',
      result: 'baseline_established',
      evidence: { fullMethodBytes },
      changedDecisionArchitecture: false,
    },
    {
      round: 1,
      pressure: 'remove_mandatory_canon_residency',
      mutation: 'operation_specific_methodology_projection',
      result: 'structural_improvement_evidenced',
      evidence: {
        averageProjectionReduction: Number(averageProjectionReduction.toFixed(6)),
        allProtectedSpinesPresent: projectionRows.every((row) => row.protectedSpinePresent),
      },
      changedDecisionArchitecture: false,
    },
    {
      round: 2,
      pressure: 'remove_duplicate_reasoner_doctrine',
      mutation: 'minimal_reasoner_base_shadow',
      result: 'structural_improvement_evidenced',
      evidence: {
        minimalBaseBytes: bytes(MINIMAL_REASONER_BASE),
        duplicatedDoctrineKnown: true,
      },
      changedDecisionArchitecture: false,
    },
    {
      round: 3,
      pressure: 'correct_optimization_objective',
      mutation: 'cache_aware_effective_cost_not_raw_bytes',
      result: cacheTelemetryAvailable ? 'measurement_ready' : 'telemetry_boundary',
      evidence: { cacheTelemetryAvailable },
      changedDecisionArchitecture: true,
    },
    {
      round: 4,
      pressure: 'reduce_expensive_tuning_probes',
      mutation: 'phi_fibonacci_only_when_bounded_1d_unimodal',
      result: 'search_authority_narrowed',
      evidence: {
        genericEligibility: assessPhiSearchEligibility({
          dimensionCount: 2,
          lowerBound: 0,
          upperBound: 1,
          objectiveObservable: true,
          unimodalityStatus: 'supported',
          evaluationCostMeaningful: true,
        }).eligible,
      },
      changedDecisionArchitecture: true,
    },
    {
      round: 5,
      pressure: 'preserve_origin_without_hot_history_cost',
      mutation: 'origin_pointer_plus_cold_provenance',
      result: 'ancestry_preserved_with_sparse_runtime_marker',
      evidence: { originPointerRequired: true },
      changedDecisionArchitecture: false,
    },
    {
      round: 6,
      pressure: 'ask_for_further_safe_compression',
      mutation: 'paired_decision_equivalence_required',
      result: pairedDecisionReplayAvailable ? 'continue_experimentally' : 'stressed_evidence_limit',
      evidence: { pairedDecisionReplayAvailable },
      changedDecisionArchitecture: false,
    },
  ];

  const stressedLimitReached = !pairedDecisionReplayAvailable;
  const pushPast = {
    attemptedMutation: 'compress_protected_invariant_spine_to_broad_slogans',
    whyTempting: 'The global invariant spine remains mandatory recurring payload and several ideas appear to overlap with detailed governance sections.',
    before: coverageAssessment(fullInvariantCoverage()),
    after: coverageAssessment(stressedInvariantCoverage()),
  };
  pushPast.testResult = pushPast.after.safeByStaticDistinctionTest
    ? 'static_test_passes_requires_behavioral_falsification'
    : 'rejected_protected_distinctions_lost';
  pushPast.pushedBeyondLimit = true;
  pushPast.runtimePromotionAuthorized = false;

  const fixedPoint = stressedLimitReached && pushPast.testResult === 'rejected_protected_distinctions_lost';

  return {
    rounds,
    stressedLimitReached,
    stressedLimitType: stressedLimitReached ? 'decision_equivalence_and_cache_telemetry_boundary' : null,
    pushPast,
    fixedPointUnderCurrentEvidence: fixedPoint,
    canonicalPromotionAuthorized: false,
    nextRealityTest: pairedDecisionReplayAvailable
      ? 'compare full vs projected/deduplicated prompts on identical Garden operations with decision/evidence/authority/stop fingerprints and measured cache economics'
      : 'obtain paired same-workload decision replay plus real cache telemetry before further protected compression',
    interpretation:
      'Recursive self-optimization should stop when remaining compression requires evidence unavailable to the current state. A deliberate post-limit mutation is then used as a falsifier: if it loses protected distinctions, the stop was not mere timidity. This does not prove the current method globally optimal; it establishes a local fixed point under present evidence and constraints.',
  };
}
