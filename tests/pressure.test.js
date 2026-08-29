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
