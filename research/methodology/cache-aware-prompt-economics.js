function finiteNonNegative(value) {
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

function observedTelemetry(sample = {}) {
  return {
    uncachedInputTokens: finiteNonNegative(sample.uncachedInputTokens),
    cachedReadTokens: finiteNonNegative(sample.cachedReadTokens),
    cacheWriteTokens: finiteNonNegative(sample.cacheWriteTokens),
    outputTokens: finiteNonNegative(sample.outputTokens),
  };
}

/**
 * Cache-aware prompt economics witness.
 * Rates are caller-supplied because model pricing/cache multipliers can change.
 * Missing telemetry remains unknown; structural byte reduction cannot substitute for observed token usage.
 */
export function effectivePromptCost(sample = {}, rates = {}) {
  const telemetry = observedTelemetry(sample);
  const inputRate = finiteNonNegative(rates.inputRatePerToken);
  const cachedReadRate = finiteNonNegative(rates.cachedReadRatePerToken);
  const cacheWriteRate = finiteNonNegative(rates.cacheWriteRatePerToken);
  const outputRate = finiteNonNegative(rates.outputRatePerToken);

  const requiredKnown = [
    telemetry.uncachedInputTokens,
    telemetry.cachedReadTokens,
    telemetry.cacheWriteTokens,
    telemetry.outputTokens,
    inputRate,
    cachedReadRate,
    cacheWriteRate,
    outputRate,
  ].every((value) => value !== null);

  if (!requiredKnown) {
    return {
      comparable: false,
      effectiveCost: null,
      telemetry,
      reason: 'missing_observed_token_or_rate_telemetry',
    };
  }

  const effectiveCost =
    telemetry.uncachedInputTokens * inputRate
    + telemetry.cachedReadTokens * cachedReadRate
    + telemetry.cacheWriteTokens * cacheWriteRate
    + telemetry.outputTokens * outputRate;

  return {
    comparable: true,
    effectiveCost,
    telemetry,
    reason: null,
  };
}

export function comparePromptStrategies({ fullStable = {}, projectedVariable = {}, rates = {} } = {}) {
  const full = effectivePromptCost(fullStable, rates);
  const projected = effectivePromptCost(projectedVariable, rates);

  let winner = null;
  if (full.comparable && projected.comparable) {
    if (full.effectiveCost < projected.effectiveCost) winner = 'full_stable';
    else if (projected.effectiveCost < full.effectiveCost) winner = 'projected_variable';
    else winner = 'cost_tie';
  }

  return {
    fullStable: full,
    projectedVariable: projected,
    winner,
    deterministicChoiceAuthorized: Boolean(winner && winner !== 'cost_tie'),
    decisionEquivalenceStillRequired: true,
    byteReductionIsSufficientEvidence: false,
    epistemicBoundary:
      'A smaller prompt is not necessarily cheaper when it reduces cache reuse or causes extra cache writes. Compare observed uncached input, cached reads, cache writes, outputs, and current model rates on the same workload. Cost advantage alone still cannot promote a prompt strategy unless governed decisions remain equivalent or improve.',
  };
}

export function cacheAwareCompressionDecision({ structuralReductionObserved = false, pairedTelemetryAvailable = false } = {}) {
  if (!structuralReductionObserved) return 'no_compression_signal';
  if (!pairedTelemetryAvailable) return 'measure_cache_aware_same_workload_cost';
  return 'compare_effective_cost_then_decision_equivalence';
}
