import test from 'node:test';
import assert from 'node:assert/strict';
import { minimalCausalFlower, assessOperatorResidency, flowerBenchAblationPlan } from '../research/methodology/minimal-causal-flower.js';

test('minimal causal Flower exposes six operators without self-promoting', () => {
  const result = minimalCausalFlower();
  assert.deepEqual(result.sequence, ['LOCK','PROJECT','PROBE','ACT','VERIFY','CRYSTALLIZE_REST']);
  assert.equal(result.canonicalReplacementAuthorized, false);
});

test('operator residency requires causal evidence and still cannot self-promote', () => {
  const cold = assessOperatorResidency('PROJECT', {});
  assert.equal(cold.state, 'residency_unverified');
  assert.equal(cold.hotResidencyAuthorized, false);

  const candidate = assessOperatorResidency('PROJECT', { scarceResourceImprovedWith: true });
  assert.equal(candidate.state, 'hot_residency_candidate');
  assert.equal(candidate.hotResidencyAuthorized, false);
});

test('compensating regression blocks an earned residency candidate', () => {
  const result = assessOperatorResidency('VERIFY', {
    decisionChanged: true,
    compensatingRegression: true,
  });
  assert.equal(result.state, 'residency_unverified');
});

test('ablation plan preserves multiple protected outcomes and refuses one score', () => {
  const plan = flowerBenchAblationPlan();
  assert.equal(plan.addOne.length, 6);
  assert.equal(plan.leaveOneOut.length, 6);
  assert.equal(plan.oneScoreAuthorized, false);
  assert.equal(plan.canonicalPromotionAuthorized, false);
});
