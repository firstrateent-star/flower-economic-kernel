import test from 'node:test';
import assert from 'node:assert/strict';
import {
  diagnoseMethodologyProjection,
  projectMethodologyForOperation,
} from '../research/methodology/methodology-projection.js';

test('known operations project methodology while preserving protected spine', () => {
  for (const operation of ['EXPAND', 'SELECT', 'FALSIFY', 'INTEGRATE', 'TRANSFER', 'IMPROVE']) {
    const result = diagnoseMethodologyProjection(operation);
    assert.equal(result.mode, 'operation_projection');
    assert.equal(result.protectedSpinePresent, true);
    assert.ok(result.projectedBytes < result.fullBytes);
    assert.ok(result.bytesSaved > 0);
    assert.equal(result.runtimeAuthority, false);
  }
});

test('SELECT retains terminal, regenerative, field, and efficiency governance', () => {
  const result = projectMethodologyForOperation('SELECT');
  for (const key of ['terminalGovernance', 'regenerativeValueGovernance', 'fieldGovernance', 'efficiency']) {
    assert.ok(result.projection[key]);
  }
  assert.ok(result.projection.center);
  assert.ok(Array.isArray(result.projection.invariants));
});

test('TRANSFER retains transfer governance and mutation boundary', () => {
  const result = projectMethodologyForOperation('TRANSFER');
  assert.ok(result.projection.selfImprovementValueGovernance);
  assert.ok(result.projection.mutationGovernance);
  assert.ok(result.projection.efficiency);
});

test('unknown operation safely falls back to full canon', () => {
  const result = diagnoseMethodologyProjection('UNKNOWN_OPERATION');
  assert.equal(result.mode, 'full_fallback');
  assert.equal(result.bytesSaved, 0);
  assert.equal(result.reductionFraction, 0);
});
