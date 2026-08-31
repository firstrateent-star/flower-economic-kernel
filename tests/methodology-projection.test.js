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
    assert.equal(result.originIntegrity.present, true);
    assert.equal(result.originIntegrity.preservesUnverifiedBoundary, true);
    assert.equal(result.originIntegrity.preservesProjectionBoundary, true);
    assert.ok(result.projectedBytes < result.fullBytes);
    assert.ok(result.bytesSaved > 0);
    assert.equal(result.runtimeAuthority, false);
  }
});

test('projected methodology always preserves origin lineage without turning it into runtime authority', () => {
  const result = projectMethodologyForOperation('SELECT');
  assert.equal(result.projection.originPointer.lineageId, 'flower-of-life-dimensional-inquiry-origin-v1');
  assert.match(result.projection.originPointer.generativeSeed, /FLOWER OF LIFE/);
  assert.match(result.projection.originPointer.epistemicStatus, /unverified/i);
  assert.match(result.projection.originPointer.projectionRule, /projections?/i);
  assert.ok(result.projection.originPointer.provenancePaths.includes('docs/FLOWER_ORIGIN_PROVENANCE.md'));
  assert.ok(result.projection.originPointer.provenancePaths.includes('methodology/meta-learning/origin-episodes-v1.json'));
  assert.equal(result.runtimeAuthority, false);
});

test('projected methodology always preserves stop conditions and ACT/REST/RECURSE safeguards', () => {
  const result = projectMethodologyForOperation('FALSIFY');
  assert.ok(Array.isArray(result.projection.stopConditions));
  assert.ok(result.projection.stopConditions.some((item) => item.includes('lower expected value than a safe available action')));
  assert.deepEqual(
    result.projection.operatingSafeguards.map((item) => item.split(':')[0]),
    ['ACT', 'REST', 'RECURSE'],
  );
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

test('unknown operation safely falls back to full canon while preserving recoverable origin pointer', () => {
  const result = diagnoseMethodologyProjection('UNKNOWN_OPERATION');
  assert.equal(result.mode, 'full_fallback');
  assert.equal(result.bytesSaved, 0);
  assert.equal(result.reductionFraction, 0);
  assert.equal(result.originIntegrity.present, true);
});
