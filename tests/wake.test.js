import test from 'node:test';
import assert from 'node:assert/strict';
import { classifyWake, materialObservationChanged } from '../src/core/wake.js';

test('material observation changes wake Flower', () => {
  const before = { independentUser: 'unresolved', chargedEvent: 'unresolved', creatorRevenue: 0 };
  const after = { independentUser: true, chargedEvent: 'unresolved', creatorRevenue: 0 };
  assert.equal(materialObservationChanged(before, after), true);
  assert.equal(classifyWake({ previousObservation: before, currentObservation: after }).wake, true);
});

test('first metric-only baseline does not wake Flower', () => {
  const baseline = { totalRuns: 2, pageViews: 8 };
  assert.equal(materialObservationChanged(null, baseline), false);
  assert.equal(classifyWake({ currentObservation: baseline }).wake, false);
});

test('first material baseline does wake Flower', () => {
  const baseline = { externalUsage: 'unresolved', totalRuns: 2 };
  assert.equal(materialObservationChanged(null, baseline), true);
  assert.equal(classifyWake({ currentObservation: baseline }).reason, 'material_observation_change');
});

test('non-material metric churn does not wake Flower', () => {
  const before = { status: 'live', totalRuns: 13, creatorRevenue: 0 };
  const after = { status: 'live', totalRuns: 14, creatorRevenue: 0 };
  assert.equal(materialObservationChanged(before, after), false);
  assert.deepEqual(classifyWake({ previousObservation: before, currentObservation: after }), {
    wake: false,
    reason: 'stillness',
    detail: 'No decision-relevant state change or autonomous pressure exists.',
  });
});

test('new reality event wakes Flower immediately', () => {
  const result = classifyWake({ event: { id: 'event_1', status: 'new' }, pressure: { type: 'HUMAN' } });
  assert.equal(result.wake, true);
  assert.equal(result.reason, 'new_reality_event');
});

test('autonomous machine-carried pressure wakes Flower', () => {
  const result = classifyWake({ pressure: { type: 'INTEGRATE' } });
  assert.equal(result.wake, true);
  assert.equal(result.reason, 'autonomous_pressure_available');
});

test('human membrane does not self-loop', () => {
  const result = classifyWake({ pressure: { type: 'HUMAN', targetId: 'fruit_changed_method_navigator' } });
  assert.equal(result.wake, false);
  assert.equal(result.reason, 'human_membrane');
});
