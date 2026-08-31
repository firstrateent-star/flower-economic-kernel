import test from 'node:test';
import assert from 'node:assert/strict';
import {
  cacheAwareCompressionDecision,
  comparePromptStrategies,
  effectivePromptCost,
} from '../research/methodology/cache-aware-prompt-economics.js';

test('missing cache telemetry cannot declare a prompt-cost winner', () => {
  const result = comparePromptStrategies({
    fullStable: { uncachedInputTokens: 1000 },
    projectedVariable: { uncachedInputTokens: 600 },
    rates: { inputRatePerToken: 1, cachedReadRatePerToken: 0.2, cacheWriteRatePerToken: 1.25, outputRatePerToken: 1 },
  });
  assert.equal(result.winner, null);
  assert.equal(result.deterministicChoiceAuthorized, false);
});

test('smaller projected prompt can lose when stable prompt has enough cache reuse', () => {
  const rates = { inputRatePerToken: 1, cachedReadRatePerToken: 0.2, cacheWriteRatePerToken: 1.25, outputRatePerToken: 1 };
  const result = comparePromptStrategies({
    fullStable: { uncachedInputTokens: 100, cachedReadTokens: 900, cacheWriteTokens: 0, outputTokens: 100 },
    projectedVariable: { uncachedInputTokens: 550, cachedReadTokens: 0, cacheWriteTokens: 50, outputTokens: 100 },
    rates,
  });
  assert.equal(result.winner, 'full_stable');
  assert.equal(result.byteReductionIsSufficientEvidence, false);
  assert.equal(result.decisionEquivalenceStillRequired, true);
});

test('projected prompt wins when observed effective cost is lower', () => {
  const rates = { inputRatePerToken: 1, cachedReadRatePerToken: 0.2, cacheWriteRatePerToken: 1.25, outputRatePerToken: 1 };
  const result = comparePromptStrategies({
    fullStable: { uncachedInputTokens: 800, cachedReadTokens: 200, cacheWriteTokens: 0, outputTokens: 100 },
    projectedVariable: { uncachedInputTokens: 350, cachedReadTokens: 150, cacheWriteTokens: 0, outputTokens: 100 },
    rates,
  });
  assert.equal(result.winner, 'projected_variable');
  assert.equal(result.deterministicChoiceAuthorized, true);
});

test('compression pressure asks for paired cache-aware telemetry before promotion', () => {
  assert.equal(cacheAwareCompressionDecision({ structuralReductionObserved: true, pairedTelemetryAvailable: false }), 'measure_cache_aware_same_workload_cost');
  assert.equal(cacheAwareCompressionDecision({ structuralReductionObserved: true, pairedTelemetryAvailable: true }), 'compare_effective_cost_then_decision_equivalence');
});

test('effective cost remains non-comparable when current rates are unknown', () => {
  const result = effectivePromptCost(
    { uncachedInputTokens: 10, cachedReadTokens: 10, cacheWriteTokens: 0, outputTokens: 10 },
    { inputRatePerToken: 1 },
  );
  assert.equal(result.comparable, false);
  assert.equal(result.effectiveCost, null);
});
