import test from 'node:test';
import assert from 'node:assert/strict';
import seed from '../garden/seed.json' with { type: 'json' };
import { classifyPressure } from '../src/core/pressure.js';

test('seeded Garden does not let a legacy live Fruit block an autonomous experiment', () => {
  const g = structuredClone(seed);
  assert.deepEqual(classifyPressure(g), {
    type: 'EXPERIMENT',
    targetId: 'opp_maps_website_pointer_guard',
    why: 'The idea is plausible but lacks external evidence; design the cheapest discriminating reality test.'
  });
});

test('pending explicit approval still stops autonomous cognition', () => {
  const g = structuredClone(seed);
  g.approvals.push({ id: 'a1', status: 'pending' });
  assert.equal(classifyPressure(g).type, 'HUMAN');
  assert.equal(classifyPressure(g).targetId, 'a1');
});

test('validated autonomous branch outranks an unrelated parked human membrane', () => {
  const g = structuredClone(seed);
  g.fruits.push({
    id: 'fruit_waiting_human',
    name: 'Waiting Human Fruit',
    status: 'private_verified',
    sourcePath: 'actors/waiting-human',
  });
  g.opportunities = [
    {
      ...structuredClone(seed.opportunities[0]),
      id: 'opp_validated',
      status: 'validated',
      fruitId: null,
    },
    {
      ...structuredClone(seed.opportunities[0]),
      id: 'opp_reserve',
      status: 'needs_test',
    },
  ];

  assert.deepEqual(classifyPressure(g), {
    type: 'BUILD_PLAN',
    targetId: 'opp_validated',
    why: 'Evidence has earned a private build artifact; convert validated knowledge into Fruit before allocating more speculative experiments.',
  });
});

test('publish-ready human boundary surfaces only after autonomous work is exhausted', () => {
  const g = structuredClone(seed);
  g.opportunities = g.opportunities.map((x) => ({ ...x, status: 'compost' }));
  g.fruits.push(
    { id: 'fruit_verified', name: 'Verified', status: 'private_verified', sourcePath: 'actors/verified' },
    { id: 'fruit_publish', name: 'Publish', status: 'publish_ready', sourcePath: 'actors/publish' },
  );

  const pressure = classifyPressure(g);
  assert.equal(pressure.type, 'HUMAN');
  assert.equal(pressure.targetId, 'fruit_publish');
  assert.match(pressure.why, /Autonomous work is exhausted/);
});

test('live Fruit awaiting stranger usage is observation, not a human task', () => {
  const g = structuredClone(seed);
  g.opportunities = g.opportunities.map((x) => ({ ...x, status: 'compost' }));
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
