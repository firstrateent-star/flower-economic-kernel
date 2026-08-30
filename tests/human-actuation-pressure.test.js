import test from 'node:test';
import assert from 'node:assert/strict';
import seed from './fixtures/test-seed.js';
import { classifyPressure } from '../src/core/pressure.js';

function afterFreshChallenge(garden) {
  garden.status ??= {};
  garden.status.lastPressure = { type: 'EXPAND' };
  return garden;
}

test('a fresh heterogeneous challenger pass precedes an unchosen human boundary', () => {
  const garden = structuredClone(seed);
  garden.opportunities = [];
  garden.experiments = [];
  garden.events = [];
  garden.approvals = [];
  garden.status.lastPressure = { type: 'STILLNESS' };
  garden.fruits = [
    { id: 'fruit_rank_1', name: 'Rank One', status: 'market_ready_private', marketTruth: 'unresolved' },
  ];
  garden.humanActuationQueue = [
    { rank: 1, organismId: 'fruit_rank_1', state: 'awaiting_explicit_authorization', why: 'Explore market truth.' },
  ];

  const pressure = classifyPressure(garden);
  assert.equal(pressure.type, 'EXPAND');
  assert.equal(pressure.targetId, null);
});

test('static rank wins after fresh challenger pressure is exhausted and market-return evidence is tied', () => {
  const garden = afterFreshChallenge(structuredClone(seed));
  garden.opportunities = [];
  garden.experiments = [];
  garden.events = [];
  garden.approvals = [];
  garden.fruits = [
    { id: 'fruit_rank_1', name: 'Rank One', status: 'market_ready_private', marketTruth: 'unresolved' },
    { id: 'fruit_rank_3', name: 'Rank Three', status: 'live', marketTruth: 'unresolved' },
  ];
  garden.humanActuationQueue = [
    { rank: 1, organismId: 'fruit_rank_1', state: 'awaiting_explicit_authorization', why: 'Explore market truth.' },
    { rank: 3, organismId: 'fruit_rank_3', state: 'awaiting_explicit_authorization', why: 'Expand distribution.' },
  ];

  assert.equal(classifyPressure(garden).targetId, 'fruit_rank_1');
});

test('verified independent use can outrank an unproven lower-activation-distance branch after challenger pressure is exhausted', () => {
  const garden = afterFreshChallenge(structuredClone(seed));
  garden.opportunities = [];
  garden.experiments = [];
  garden.events = [];
  garden.approvals = [];
  garden.fruits = [
    { id: 'fruit_rank_1', name: 'Rank One', status: 'market_ready_private', marketTruth: 'unresolved' },
    { id: 'fruit_rank_3', name: 'Rank Three', status: 'live', independentUser: true },
  ];
  garden.humanActuationQueue = [
    { rank: 1, organismId: 'fruit_rank_1', state: 'awaiting_explicit_authorization', why: 'Explore market truth.' },
    { rank: 3, organismId: 'fruit_rank_3', state: 'awaiting_explicit_authorization', why: 'Expand distribution.' },
  ];

  assert.equal(classifyPressure(garden).targetId, 'fruit_rank_3');
});

test('actual revenue/repeat return outranks independent use while static rank breaks ties', () => {
  const garden = afterFreshChallenge(structuredClone(seed));
  garden.opportunities = [];
  garden.experiments = [];
  garden.events = [];
  garden.approvals = [];
  garden.fruits = [
    { id: 'fruit_independent', name: 'Independent', status: 'live', independentUser: true },
    { id: 'fruit_revenue', name: 'Revenue', status: 'live', creatorRevenueUsd: 0.01 },
  ];
  garden.humanActuationQueue = [
    { rank: 1, organismId: 'fruit_independent', state: 'awaiting_explicit_authorization', why: 'Independent use.' },
    { rank: 9, organismId: 'fruit_revenue', state: 'awaiting_explicit_authorization', why: 'Proven return.' },
  ];

  assert.equal(classifyPressure(garden).targetId, 'fruit_revenue');
});

test('agentic eligibility or raw platform readiness alone does not change the human ranking', () => {
  const garden = afterFreshChallenge(structuredClone(seed));
  garden.opportunities = [];
  garden.experiments = [];
  garden.events = [];
  garden.approvals = [];
  garden.fruits = [
    { id: 'fruit_rank_1', name: 'Rank One', status: 'market_ready_private' },
    { id: 'fruit_rank_3', name: 'Rank Three', status: 'live', agenticPaymentEligible: true },
  ];
  garden.humanActuationQueue = [
    { rank: 1, organismId: 'fruit_rank_1', state: 'awaiting_explicit_authorization', why: 'Explore market truth.' },
    { rank: 3, organismId: 'fruit_rank_3', state: 'awaiting_explicit_authorization', why: 'Platform eligibility only.' },
  ];

  assert.equal(classifyPressure(garden).targetId, 'fruit_rank_1');
});
