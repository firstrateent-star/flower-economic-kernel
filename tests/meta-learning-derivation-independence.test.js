import test from 'node:test';
import assert from 'node:assert/strict';
import {
  auditDerivationIndependence,
  DERIVATION_INDEPENDENCE_PRINCIPLE,
} from '../research/meta-learning/derivation-independence.js';

const base = {
  outcomeState: 'supported',
  mechanismsApplied: ['sparse_activation'],
};

test('multiple episodes from one derivation family do not become independent confirmation', () => {
  const result = auditDerivationIndependence([
    { ...base, id: 'a', derivationFamily: 'same_origin' },
    { ...base, id: 'b', derivationFamily: 'same_origin' },
    { ...base, id: 'c', derivationFamily: 'same_origin' },
  ]);
  const row = result[0];
  assert.equal(row.positiveEpisodeCount, 3);
  assert.equal(row.explicitIndependentDerivationCount, 1);
  assert.equal(row.recurrenceWithoutIndependenceRisk, true);
});

test('explicitly distinct derivation families are represented separately', () => {
  const result = auditDerivationIndependence([
    { ...base, id: 'geometry', derivationFamily: 'a_n_frontier_growth' },
    { ...base, id: 'runtime', derivationFamily: 'measured_reasoner_projection' },
    { ...base, id: 'human', derivationFamily: 'repeated_prompt_failure' },
  ]);
  const row = result[0];
  assert.equal(row.explicitIndependentDerivationCount, 3);
  assert.equal(row.recurrenceWithoutIndependenceRisk, false);
});

test('missing derivation ancestry stays unresolved rather than being treated as independent', () => {
  const result = auditDerivationIndependence([
    { ...base, id: 'unknown_1' },
    { ...base, id: 'unknown_2' },
  ]);
  const row = result[0];
  assert.equal(row.explicitIndependentDerivationCount, 0);
  assert.deepEqual(row.unresolvedDerivationEpisodeIds, ['unknown_1', 'unknown_2']);
  assert.equal(row.recurrenceWithoutIndependenceRisk, true);
});

test('independent convergence remains bounded evidence, not universal proof', () => {
  assert.match(DERIVATION_INDEPENDENCE_PRINCIPLE.boundary, /does not override/);
  assert.equal(DERIVATION_INDEPENDENCE_PRINCIPLE.currentStatus, 'research_candidate_not_canonical');
});
