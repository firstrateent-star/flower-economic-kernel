import test from 'node:test';
import assert from 'node:assert/strict';
import {
  SIX_OPERATOR_KERNEL,
  ORIGIN_STRESSED_KERNEL,
  assessOriginContinuity,
  factorKernelMotions,
} from '../research/methodology/origin-continuity-kernel.js';

test('six-operator optimization kernel lacks explicit representation-opening capacity', () => {
  const result = assessOriginContinuity(SIX_OPERATOR_KERNEL);
  assert.equal(result.originContinuityStructurallyRepresented, false);
  assert.deepEqual(result.missingCapabilities, ['representationOpening']);
  assert.equal(result.canonicalPromotionAuthorized, false);
});

test('origin-stressed kernel structurally represents representation opening without claiming value', () => {
  const result = assessOriginContinuity(ORIGIN_STRESSED_KERNEL);
  assert.equal(result.originContinuityStructurallyRepresented, true);
  assert.deepEqual(result.missingCapabilities, []);
  assert.equal(result.empiricalValueVerified, false);
  assert.match(result.semanticGuard, /NOT THE CURRENT ONTOLOGY/);
});

test('deeper factorization retains preserve, generate, and reality-selection motions', () => {
  const motions = new Set(factorKernelMotions().map((x) => x.motion));
  assert.deepEqual([...motions].sort(), ['GENERATE', 'PRESERVE', 'REALITY_SELECT']);
});
