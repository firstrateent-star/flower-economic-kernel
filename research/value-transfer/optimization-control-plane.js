import { compareMarginalActions } from '../../src/core/value-gradient.js';

function finiteNonNegative(value) {
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

/**
 * Shadow-only task-shape router. It does not execute anything.
 * Evidence for the thresholds must be established on Flower workloads before runtime use.
 */
export function classifyExecutionShape(stage = {}) {
  const chainLength = finiteNonNegative(stage.deterministicChainLength);
  const repeatedCalls = finiteNonNegative(stage.repeatedCalls);
  const intermediateBytes = finiteNonNegative(stage.intermediateBytes);
  const toolCatalogSize = finiteNonNegative(stage.toolCatalogSize);
  const semanticDependency = stage.semanticDependency === true;
  const deterministicReductionAvailable = stage.deterministicReductionAvailable === true;

  const known = [chainLength, repeatedCalls, intermediateBytes, toolCatalogSize].filter((x) => x !== null).length;
  const deterministicPressure = (
    (chainLength !== null && chainLength >= 8)
    || (repeatedCalls !== null && repeatedCalls >= 12)
    || (intermediateBytes !== null && intermediateBytes >= 64_000)
    || (toolCatalogSize !== null && toolCatalogSize >= 40)
  );

  let recommendation = 'insufficient_evidence';
  if (semanticDependency && !deterministicPressure) recommendation = 'direct_semantic_tooling';
  if (!semanticDependency && deterministicReductionAvailable && deterministicPressure) {
    recommendation = 'local_deterministic_reduction';
  }
  if (semanticDependency && deterministicPressure && deterministicReductionAvailable) {
    recommendation = 'hybrid_reduce_then_semantic';
  }

  return {
    recommendation,
    evidenceCoverage: known / 4,
    inputs: {
      chainLength,
      repeatedCalls,
      intermediateBytes,
      toolCatalogSize,
      semanticDependency,
      deterministicReductionAvailable,
    },
    runtimeAuthority: false,
    epistemicBoundary:
      'These task-shape thresholds are shadow heuristics derived from current external benchmark patterns, not verified Flower-optimal thresholds. Runtime promotion requires same-workload replay with decision, cost, latency, and error witnesses.',
  };
}

/**
 * Shadow-only gate for whether adaptive cognition has demonstrated headroom over a
 * cheaper stable policy. The gate is deliberately conservative: stable verified
 * equivalence favors stillness, while non-stationarity/conflict only creates a
 * candidate for adaptive cognition rather than authorizing it.
 */
export function assessAdaptiveHeadroom(state = {}) {
  const policyStable = state.policyStable === true;
  const decisionEquivalent = state.decisionEquivalentWitness === true;
  const nonStationarityDetected = state.nonStationarityDetected === true;
  const unresolvedConflict = state.unresolvedConflict === true;
  const materialUncertainty = state.materialUncertainty === true;
  const expectedAdaptationGain = finiteNonNegative(state.expectedAdaptationGain);
  const adaptiveCost = finiteNonNegative(state.adaptiveCost);

  let recommendation = 'insufficient_evidence';
  if (policyStable && decisionEquivalent && !nonStationarityDetected && !unresolvedConflict && !materialUncertainty) {
    recommendation = 'preserve_stable_policy';
  } else if (nonStationarityDetected || unresolvedConflict || materialUncertainty) {
    recommendation = 'adaptive_cognition_candidate';
  }

  const gainComparable = expectedAdaptationGain !== null && adaptiveCost !== null && adaptiveCost > 0;
  const expectedGainDensity = gainComparable
    ? Number((expectedAdaptationGain / adaptiveCost).toFixed(6))
    : null;

  return {
    recommendation,
    policyStable,
    decisionEquivalent,
    nonStationarityDetected,
    unresolvedConflict,
    materialUncertainty,
    expectedAdaptationGain,
    adaptiveCost,
    expectedGainDensity,
    gainComparable,
    runtimeAuthority: false,
    epistemicBoundary:
      'Adaptive cognition must demonstrate decision headroom over a cheaper stable policy. Non-stationarity or uncertainty can justify a shadow challenger, but does not itself prove that an LLM/control layer improves the outcome.',
  };
}

function normalizedConstraint(constraint) {
  if (typeof constraint !== 'string') return null;
  const value = constraint.trim().toLowerCase();
  return value || null;
}

/**
 * Detect constraints repeated across branches without pretending repetition proves leverage.
 */
export function detectSharedConstraints(branches = []) {
  const index = new Map();

  for (const branch of branches) {
    const branchId = branch?.id ?? null;
    const constraints = new Set(
      (branch?.constraints ?? branch?.blockingConstraints ?? [])
        .map(normalizedConstraint)
        .filter(Boolean),
    );
    for (const constraint of constraints) {
      const entry = index.get(constraint) ?? { constraint, branchIds: [] };
      if (branchId !== null) entry.branchIds.push(branchId);
      index.set(constraint, entry);
    }
  }

  return [...index.values()]
    .map((entry) => ({
      ...entry,
      branchCount: entry.branchIds.length,
      shared: entry.branchIds.length >= 2,
      leverageVerified: false,
    }))
    .filter((entry) => entry.shared)
    .sort((a, b) => b.branchCount - a.branchCount || a.constraint.localeCompare(b.constraint));
}

/**
 * Run the emerging optimization mechanisms together in shadow mode.
 */
export function shadowOptimizationControlPlane({ actions = [], stage = {}, branches = [], headroom = {} } = {}) {
  return {
    marginalFrontier: compareMarginalActions(actions),
    executionShape: classifyExecutionShape(stage),
    adaptiveHeadroom: assessAdaptiveHeadroom(headroom),
    sharedConstraints: detectSharedConstraints(branches),
    authority: 'shadow_only',
    externalValueVerified: false,
    canonicalPromotionAuthorized: false,
  };
}
