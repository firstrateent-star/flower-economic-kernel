import test from 'node:test';
import assert from 'node:assert/strict';
import {
  auditActivationProjection,
  flowerGeometryProjectionAudit,
  neighborhoodByDimensions,
} from '../research/dimensional/activation-projection-audit.js';

const centers = [
  {
    id: 'target',
    archetypeFamily: 'identity_integrity',
    capabilityFamily: 'identity_reconciliation',
    nutrientChannel: 'market_a',
    coverage: { buyer_demand: 'earned', failure_reality: 'earned' },
  },
  {
    id: 'same_archetype_only',
    archetypeFamily: 'identity_integrity',
    capabilityFamily: 'representation_comparison',
    nutrientChannel: 'market_b',
    coverage: { buyer_demand: 'unknown', failure_reality: 'earned' },
  },
  {
    id: 'same_capability_only',
    archetypeFamily: 'record_consistency',
    capabilityFamily: 'identity_reconciliation',
    nutrientChannel: 'market_c',
    coverage: { buyer_demand: 'unknown', failure_reality: 'unknown' },
  },
  {
    id: 'hidden_demand_neighbor',
    archetypeFamily: 'configuration_integrity',
    capabilityFamily: 'configuration_inspection',
    nutrientChannel: 'market_d',
    coverage: { buyer_demand: 'earned', failure_reality: 'unknown' },
  },
];

test('a lower-dimensional projection can miss a declared decision-relevant neighbor', () => {
  const audit = flowerGeometryProjectionAudit(
    { centers },
    'target',
    ['coverage.buyer_demand'],
  );

  assert.equal(audit.dependencyComplete, false);
  assert.deepEqual(audit.missingRequiredIds, ['hidden_demand_neighbor']);
  assert.deepEqual(audit.missingRequiredDimensions, ['coverage.buyer_demand']);
});

test('using more dimensions than the declared decision requires can over-activate the local chart', () => {
  const audit = auditActivationProjection({
    centers,
    targetId: 'target',
    indexedDimensions: ['archetypeFamily', 'capabilityFamily'],
    requiredDimensions: ['capabilityFamily'],
  });

  assert.equal(audit.dependencyComplete, true);
  assert.equal(audit.minimalForDeclaredDependencies, false);
  assert.ok(audit.extraIndexedIds.includes('same_archetype_only'));
});

test('a dependency-complete chart can be both sparse and semantically sufficient for its declared dimensions', () => {
  const audit = auditActivationProjection({
    centers,
    targetId: 'target',
    indexedDimensions: ['coverage.buyer_demand'],
    requiredDimensions: ['coverage.buyer_demand'],
  });

  assert.equal(audit.dependencyComplete, true);
  assert.equal(audit.minimalForDeclaredDependencies, true);
  assert.deepEqual(new Set(audit.indexedIds), new Set(['target', 'hidden_demand_neighbor']));
});

test('missing target remains explicit rather than silently widening to the whole field', () => {
  const neighborhood = neighborhoodByDimensions(centers, 'missing', ['archetypeFamily']);
  assert.deepEqual(neighborhood.ids, ['missing']);
  assert.equal(neighborhood.target, null);
});

test('the audit labels required dimensions as hypotheses rather than established causal semantics', () => {
  const audit = flowerGeometryProjectionAudit({ centers }, 'target', ['coverage.buyer_demand']);
  assert.match(audit.epistemicNote, /hypotheses/);
  assert.match(audit.epistemicNote, /decision equivalence/);
});
