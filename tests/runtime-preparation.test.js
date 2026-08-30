import test from 'node:test';
import assert from 'node:assert/strict';
import seed from '../garden/seed.json' with { type: 'json' };
import { prepareRuntimeState } from '../src/core/runtime-preparation.js';

test('shared runtime preparation reaches the canonical HUMAN membrane without cognition', async () => {
  const garden = structuredClone(seed);
  const prepared = await prepareRuntimeState({ garden, rootDir: process.cwd() });

  assert.equal(prepared.pressure.type, 'HUMAN');
  assert.equal(prepared.pressure.targetId, 'fruit_changed_method_navigator');
  assert.equal(prepared.wake.wake, false);
  assert.equal(prepared.wake.reason, 'human_membrane');
  assert.equal(prepared.observationIngest, null);
});

test('shared runtime preparation converges after current truth has been absorbed', async () => {
  const garden = structuredClone(seed);
  const first = await prepareRuntimeState({ garden, rootDir: process.cwd() });
  const afterFirst = JSON.stringify(garden);

  const second = await prepareRuntimeState({ garden, rootDir: process.cwd() });
  const afterSecond = JSON.stringify(garden);

  assert.equal(afterSecond, afterFirst);
  assert.deepEqual(second.legacy.stateMigrations, []);
  assert.deepEqual(second.legacy.repaired, []);
  assert.deepEqual(second.manifestSync.changes, []);
  assert.deepEqual(second.distributionTruth.changes, []);
  assert.deepEqual(second.pressure, first.pressure);
  assert.deepEqual(second.wake, first.wake);
});

test('equivalent Gardens receive equivalent prepared truth regardless of caller', async () => {
  const left = structuredClone(seed);
  const right = structuredClone(seed);

  const a = await prepareRuntimeState({ garden: left, rootDir: process.cwd() });
  const b = await prepareRuntimeState({ garden: right, rootDir: process.cwd() });

  assert.deepEqual(left, right);
  assert.deepEqual(a.pressure, b.pressure);
  assert.deepEqual(a.wake, b.wake);
  assert.deepEqual(a.legacy, b.legacy);
  assert.deepEqual(a.manifestSync.changes, b.manifestSync.changes);
  assert.deepEqual(a.distributionTruth.changes, b.distributionTruth.changes);
});
