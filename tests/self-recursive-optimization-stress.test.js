import test from 'node:test';
import assert from 'node:assert/strict';
import { runSelfRecursiveOptimizationStress } from '../research/methodology/self-recursive-optimization-stress.js';

test('recursive optimization reaches an evidence boundary rather than inventing further authority', () => {
  const result = runSelfRecursiveOptimizationStress();
  assert.equal(result.stressedLimitReached, true);
  assert.equal(result.stressedLimitType, 'decision_equivalence_and_cache_telemetry_boundary');
  assert.equal(result.canonicalPromotionAuthorized, false);
});

test('post-limit push rejects aggressive protected-spine compression when distinctions disappear', () => {
  const result = runSelfRecursiveOptimizationStress();
  assert.equal(result.pushPast.pushedBeyondLimit, true);
  assert.equal(result.pushPast.testResult, 'rejected_protected_distinctions_lost');
  assert.ok(result.pushPast.after.missing.includes('ownership_authority'));
  assert.ok(result.pushPast.after.missing.includes('fixed_point_convergence'));
  assert.ok(result.pushPast.after.missing.includes('internal_vs_external_value'));
  assert.equal(result.pushPast.runtimePromotionAuthorized, false);
});

test('current recursive run is a local fixed point only under current evidence', () => {
  const result = runSelfRecursiveOptimizationStress();
  assert.equal(result.fixedPointUnderCurrentEvidence, true);
  assert.match(result.interpretation, /local fixed point under present evidence/i);
});

test('if paired replay becomes available the stress boundary reopens rather than pretending permanence', () => {
  const result = runSelfRecursiveOptimizationStress({ pairedDecisionReplayAvailable: true, cacheTelemetryAvailable: true });
  assert.equal(result.stressedLimitReached, false);
  assert.equal(result.fixedPointUnderCurrentEvidence, false);
  assert.match(result.nextRealityTest, /compare full vs projected/i);
});
