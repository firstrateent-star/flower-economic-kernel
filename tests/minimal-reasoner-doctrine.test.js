import test from 'node:test';
import assert from 'node:assert/strict';
import { diagnoseMinimalReasonerDoctrine } from '../research/methodology/minimal-reasoner-doctrine.js';

test('minimal reasoner doctrine reduces duplicated base instructions structurally', () => {
  const result = diagnoseMinimalReasonerDoctrine();
  assert.ok(result.minimalBytes < result.legacyBytes);
  assert.ok(result.bytesSaved > 0);
  assert.ok(result.reductionFraction > 0);
  assert.equal(result.runtimeAuthority, false);
  assert.equal(result.decisionEquivalenceVerified, false);
});

test('minimal reasoner doctrine preserves mechanics, authority, uncertainty, and origin lineage', () => {
  const result = diagnoseMinimalReasonerDoctrine();
  for (const value of Object.values(result.preservesMechanics)) assert.equal(value, true);
});
