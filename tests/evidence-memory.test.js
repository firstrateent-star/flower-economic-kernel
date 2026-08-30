import test from 'node:test';
import assert from 'node:assert/strict';
import seed from './fixtures/test-seed.js';
import {
  assessEvidenceFreshness,
  opportunityEvidenceMemory,
  evidenceRevalidationNeeds,
} from '../src/core/evidence-memory.js';

test('structural failure evidence does not expire merely because time passes', () => {
  const assessment = assessEvidenceFreshness({
    dimension: 'failure_reality',
    observedAt: '2025-01-01T00:00:00.000Z',
    asOf: '2026-08-30T00:00:00.000Z',
    decisionClass: 'human_sovereignty',
  });

  assert.equal(assessment.status, 'event_fresh_unless_contradicted');
  assert.equal(assessment.action, 'reuse');
  assert.ok(assessment.ageDays > 500);
});

test('old market evidence remains history but requires revalidation for a current consequential decision', () => {
  const assessment = assessEvidenceFreshness({
    dimension: 'willingness_to_pay',
    observedAt: '2026-01-01T00:00:00.000Z',
    asOf: '2026-08-30T00:00:00.000Z',
    decisionClass: 'public_or_spend',
  });

  assert.equal(assessment.status, 'revalidation_due_for_decision');
  assert.equal(assessment.action, 'revalidate_before_decision');
});

test('old market evidence does not trigger research merely because time passed during exploration', () => {
  const assessment = assessEvidenceFreshness({
    dimension: 'buyer_demand',
    observedAt: '2026-01-01T00:00:00.000Z',
    asOf: '2026-08-30T00:00:00.000Z',
    decisionClass: 'exploration',
  });

  assert.equal(assessment.status, 'historically_useful_currentness_weak');
  assert.equal(assessment.action, 'reuse_as_history_do_not_claim_currentness');
});

test('evidence memory is a read-only decision query and preserves all experiments/sources', () => {
  const garden = structuredClone(seed);
  const opp = garden.opportunities[0];
  garden.experiments.push(
    {
      id: 'exp_old_failure',
      opportunityId: opp.id,
      status: 'integrated',
      integratedAt: '2025-01-01T00:00:00.000Z',
      validationDimension: 'failure_reality',
      result: { verdict: 'supports', sources: [{ url: 'https://failure.example/a' }] },
    },
    {
      id: 'exp_old_demand',
      opportunityId: opp.id,
      status: 'integrated',
      integratedAt: '2026-01-01T00:00:00.000Z',
      validationDimension: 'buyer_demand',
      result: { verdict: 'supports', sources: [{ url: 'https://market.example/a' }] },
    },
  );
  const before = JSON.stringify(garden);

  const memory = opportunityEvidenceMemory(garden, opp.id, {
    asOf: '2026-08-30T00:00:00.000Z',
    decisionClass: 'human_sovereignty',
  });
  const due = evidenceRevalidationNeeds(garden, opp.id, {
    asOf: '2026-08-30T00:00:00.000Z',
    decisionClass: 'human_sovereignty',
  });

  assert.equal(JSON.stringify(garden), before);
  assert.equal(memory.length, 2);
  assert.equal(memory.find((x) => x.dimension === 'failure_reality').freshness.action, 'reuse');
  assert.equal(due.length, 1);
  assert.equal(due[0].dimension, 'buyer_demand');
  assert.equal(due[0].sourceCount, 1);
});
