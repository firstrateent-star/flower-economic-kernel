import test from 'node:test';
import assert from 'node:assert/strict';
import seed from './fixtures/test-seed.js';
import { pulse } from '../src/core/kernel.js';
import { classifyPressure } from '../src/core/pressure.js';
import { MockReasoner } from '../src/reasoners/mock.js';

test('one new event integrates once and stops before ceremonial HUMAN breath', async () => {
  const garden = structuredClone(seed);
  garden.opportunities = [];
  garden.events = [{
    id: 'event_material_return',
    status: 'new',
    type: 'FRUIT_MATERIAL_OBSERVATION',
    summary: 'A monitored Fruit changed materially.',
  }];
  garden.humanActuationQueue = [{
    rank: 1,
    organismId: 'fruit_changed_method_navigator',
    action: 'Authorize market probe.',
    why: 'Only real exposure resolves the next uncertainty.',
    state: 'awaiting_explicit_authorization',
  }];
  const beforePulseCount = Number(garden.status.pulseCount ?? 0);

  const result = await pulse({
    garden,
    reasoner: new MockReasoner(),
    maxBreaths: 12,
    syncManifests: false,
  });

  assert.deepEqual(result.breaths.map((x) => x.pressure.type), ['INTEGRATE']);
  assert.equal(garden.events[0].status, 'processed');
  assert.equal(classifyPressure(garden).type, 'HUMAN');
  assert.equal(result.runBudget.costlyBreathsUsed, 0);
  assert.equal(garden.status.pulseCount, beforePulseCount + 1);
  assert.equal(garden.traces.filter((x) => x.kind === 'breath').at(-1).pressure.type, 'INTEGRATE');
});

test('direct pulse at unchanged HUMAN membrane performs zero breaths and does not increment pulse count', async () => {
  const garden = structuredClone(seed);
  garden.opportunities = [];
  garden.humanActuationQueue = [{
    rank: 1,
    organismId: 'fruit_changed_method_navigator',
    action: 'Authorize market probe.',
    why: 'Only real exposure resolves the next uncertainty.',
    state: 'awaiting_explicit_authorization',
  }];
  const beforePulseCount = Number(garden.status.pulseCount ?? 0);
  const beforeTraceCount = garden.traces.length;

  const result = await pulse({
    garden,
    reasoner: new MockReasoner(),
    maxBreaths: 12,
    syncManifests: false,
  });

  assert.equal(classifyPressure(garden).type, 'HUMAN');
  assert.equal(result.breaths.length, 0);
  assert.equal(result.runBudget.costlyBreathsUsed, 0);
  assert.equal(garden.status.pulseCount, beforePulseCount);
  assert.equal(garden.traces.length, beforeTraceCount);
});
