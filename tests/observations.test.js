import test from 'node:test';
import assert from 'node:assert/strict';
import seed from './fixtures/test-seed.js';
import { ingestFruitObservation } from '../src/core/observations.js';
import { classifyPressure } from '../src/core/pressure.js';

test('metric-only baseline observation is stored without waking the Garden', () => {
  const garden = structuredClone(seed);
  const fruit = garden.fruits[0];
  const result = ingestFruitObservation(garden, {
    fruitId: fruit.id,
    source: 'test_sensor',
    metrics: { totalRuns: 2 },
    truth: {},
  });

  assert.equal(result.changed, false);
  assert.equal(result.stateChanged, true);
  assert.equal(result.reason, 'baseline_observation');
  assert.equal(result.event, null);
  assert.equal(garden.observations[fruit.id].metrics.totalRuns, 2);
  assert.equal(garden.events.length, 0);
});

test('material Fruit truth creates a normal unprocessed Garden event', () => {
  const garden = structuredClone(seed);
  const fruit = garden.fruits[0];
  ingestFruitObservation(garden, {
    fruitId: fruit.id,
    source: 'test_sensor',
    truth: { independentUser: 'unresolved', creatorRevenueUsd: 0 },
  });
  garden.events = [];

  const result = ingestFruitObservation(garden, {
    fruitId: fruit.id,
    source: 'test_sensor',
    truth: { independentUser: true, creatorRevenueUsd: 0 },
    metrics: { totalRuns: 3 },
  });

  assert.equal(result.changed, true);
  assert.equal(result.stateChanged, true);
  assert.equal(result.event.status, 'new');
  assert.equal(result.event.type, 'FRUIT_MATERIAL_OBSERVATION');
  assert.equal(fruit.observedTruth.independentUser, true);
  assert.equal(classifyPressure(garden).type, 'INTEGRATE');
});

test('metric churn after an established truth baseline is a persistence no-op', () => {
  const garden = structuredClone(seed);
  const fruit = garden.fruits[0];
  ingestFruitObservation(garden, {
    fruitId: fruit.id,
    source: 'test_sensor',
    observedAt: '2026-08-30T12:00:00.000Z',
    truth: { externalUsage: 'unresolved' },
    metrics: { totalRuns: 2 },
  });
  garden.events = [];
  const before = JSON.stringify(garden);

  const result = ingestFruitObservation(garden, {
    fruitId: fruit.id,
    source: 'test_sensor',
    observedAt: '2026-08-30T13:00:00.000Z',
    truth: { externalUsage: 'unresolved' },
    metrics: { totalRuns: 3 },
  });

  assert.equal(result.changed, false);
  assert.equal(result.stateChanged, false);
  assert.equal(result.reason, 'non_material_observation');
  assert.equal(garden.events.length, 0);
  assert.equal(garden.observations[fruit.id].metrics.totalRuns, 2);
  assert.equal(JSON.stringify(garden), before);
});
