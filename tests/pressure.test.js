import test from 'node:test';
import assert from 'node:assert/strict';
import seed from '../garden/seed.json' with { type: 'json' };
import { classifyPressure } from '../src/core/pressure.js';

function blankGarden() {
  const g = structuredClone(seed);
  g.opportunities = [];
  g.experiments = [];
  g.events = [];
  g.approvals = [];
  g.fruits = [];
  g.humanActuationQueue = [];
  return g;
}

test('canonical Garden surfaces the ranked Changed Method Navigator human membrane instead of speculative expansion', () => {
  const g = structuredClone(seed);
  const pressure = classifyPressure(g);
  assert.equal(pressure.type, 'HUMAN');
  assert.equal(pressure.targetId, 'fruit_changed_method_navigator');
  assert.match(pressure.why, /Autonomous work is exhausted/);
});

test('pending explicit approval still stops autonomous cognition', () => {
  const g = blankGarden();
  g.approvals.push({ id: 'a1', status: 'pending' });
  assert.equal(classifyPressure(g).type, 'HUMAN');
  assert.equal(classifyPressure(g).targetId, 'a1');
});

test('validated autonomous branch outranks an unrelated parked human membrane', () => {
  const g = blankGarden();
  g.fruits.push({
    id: 'fruit_waiting_human',
    name: 'Waiting Human Fruit',
    status: 'market_ready_private',
    sourcePath: 'actors/waiting-human',
  });
  g.humanActuationQueue.push({
    rank: 1,
    organismId: 'fruit_waiting_human',
    state: 'awaiting_explicit_authorization',
    why: 'A real user exposure decision remains.',
  });
  g.opportunities = [{
    id: 'opp_validated',
    name: 'Validated autonomous work',
    status: 'validated',
    fruitId: null,
  }];

  assert.deepEqual(classifyPressure(g), {
    type: 'BUILD_PLAN',
    targetId: 'opp_validated',
    why: 'Evidence has earned a private build artifact; convert validated knowledge into Fruit before allocating more speculative experiments.',
  });
});

test('ranked explicit human actuation outranks fallback Fruit status when autonomous work is exhausted', () => {
  const g = blankGarden();
  g.fruits.push(
    { id: 'fruit_verified', name: 'Verified', status: 'private_verified', sourcePath: 'actors/verified' },
    { id: 'fruit_market_ready', name: 'Market Ready', status: 'market_ready_private', sourcePath: 'actors/market-ready' },
  );
  g.humanActuationQueue.push({
    rank: 1,
    organismId: 'fruit_verified',
    state: 'awaiting_explicit_authorization',
    why: 'This queued actuation has already won the portfolio ranking.',
  });

  const pressure = classifyPressure(g);
  assert.equal(pressure.type, 'HUMAN');
  assert.equal(pressure.targetId, 'fruit_verified');
  assert.match(pressure.why, /portfolio ranking/);
});

test('market-ready private Fruit is recognized by legacy fallback when queue is absent', () => {
  const g = blankGarden();
  g.fruits = [{
    id: 'fruit_market_ready',
    name: 'Market Ready',
    status: 'market_ready_private',
  }];

  const pressure = classifyPressure(g);
  assert.equal(pressure.type, 'HUMAN');
  assert.equal(pressure.targetId, 'fruit_market_ready');
  assert.match(pressure.why, /market-ready private Fruit/);
});

test('live Fruit awaiting stranger usage is observation, not a human task', () => {
  const g = blankGarden();
  g.fruits = [{
    id: 'fruit_live_wait',
    name: 'Live Fruit',
    status: 'live',
    publicRelease: { economicBoundaryCrossed: true, storeUrl: 'https://example.com/fruit' },
    publicMeasurement: { status: 'awaiting_external_usage' },
  }];

  assert.deepEqual(classifyPressure(g), {
    type: 'EXPAND',
    targetId: null,
    why: 'No currently actionable opportunity remains; preserve blocked history and expand the search space.',
  });
});
