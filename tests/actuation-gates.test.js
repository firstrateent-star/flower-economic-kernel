import test from 'node:test';
import assert from 'node:assert/strict';
import seed from './fixtures/test-seed.js';
import { reconcileHumanActuationGates } from '../src/core/actuation-gates.js';

test('staged human actuation remains parked without independent return evidence', () => {
  const garden = structuredClone(seed);
  const fruit = garden.fruits[0];
  garden.humanActuationQueue = [{
    rank: 3,
    organismId: fruit.id,
    action: 'Authorize public distribution.',
    state: 'staged_not_earned_over_rank_1',
  }];

  const result = reconcileHumanActuationGates(garden);
  assert.deepEqual(result.changes, []);
  assert.equal(garden.humanActuationQueue[0].state, 'staged_not_earned_over_rank_1');
});

test('independent return earns eligibility but preserves static rank and human authorization boundary', () => {
  const garden = structuredClone(seed);
  const fruit = garden.fruits[0];
  fruit.independentUser = true;
  fruit.creatorRevenueUsd = 0.25;
  garden.humanActuationQueue = [
    {
      rank: 1,
      organismId: 'other_organism',
      action: 'Higher-ranked sovereignty action.',
      state: 'awaiting_explicit_authorization',
    },
    {
      rank: 3,
      organismId: fruit.id,
      action: 'Authorize public distribution.',
      state: 'staged_not_earned_over_rank_1',
    },
  ];

  const result = reconcileHumanActuationGates(garden);
  const item = garden.humanActuationQueue[1];
  assert.ok(result.changes.includes(`${fruit.id}:staged_human_action_earned`));
  assert.equal(item.state, 'awaiting_explicit_authorization');
  assert.equal(item.rank, 3);
  assert.equal(item.evidenceGate, 'independent_return_observed');
  assert.ok(item.evidenceGateSignals.includes('independent_user'));
  assert.ok(item.evidenceGateSignals.includes('creator_revenue'));
});

test('platform eligibility alone does not earn a market-return gated public actuation', () => {
  const garden = structuredClone(seed);
  const fruit = garden.fruits[0];
  fruit.agenticPaymentEligible = true;
  garden.humanActuationQueue = [{
    rank: 3,
    organismId: fruit.id,
    action: 'Authorize public distribution.',
    state: 'staged_not_earned_over_rank_1',
  }];

  reconcileHumanActuationGates(garden);
  assert.equal(garden.humanActuationQueue[0].state, 'staged_not_earned_over_rank_1');
});
