import test from 'node:test';
import assert from 'node:assert/strict';
import seed from '../garden/seed.json' with { type: 'json' };
import { classifyPressure } from '../src/core/pressure.js';

test('seeded Garden begins by falsifying existing weak seed', () => {
  const g = structuredClone(seed);
  assert.deepEqual(classifyPressure(g), {
    type: 'FALSIFY',
    targetId: 'opp_maps_website_pointer_guard',
    why: 'A living seed has not earned attention yet.'
  });
});

test('pending approval stops autonomous cognition', () => {
  const g = structuredClone(seed);
  g.approvals.push({ id: 'a1', status: 'pending' });
  assert.equal(classifyPressure(g).type, 'HUMAN');
});

test('validated branch earns private build plan before speculative siblings', () => {
  const g = structuredClone(seed);
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
    why: 'Evidence has earned a private build plan; convert validated knowledge into Fruit before allocating more speculative experiments.',
  });
});
