import test from 'node:test';
import assert from 'node:assert/strict';
import seed from './fixtures/test-seed.js';
import { classifyPressure } from '../src/core/pressure.js';
import { breathe, pressureCostClass } from '../src/core/kernel.js';
import { MockReasoner } from '../src/reasoners/mock.js';

test('verified internal improvement creates one bounded TRANSFER pressure and then converges', async () => {
  const garden = structuredClone(seed);
  garden.opportunities = [];
  garden.fruits = [];
  garden.humanActuationQueue = [];
  garden.internalImprovements = [{
    id: 'imp_semantic_cache',
    name: 'Semantic dependency cache',
    dimensions: {
      recomputation: { baseline: 10, after: 2, unit: 'equivalent recomputations', evidenceVerified: true },
      accuracy: { baseline: 1, after: 1, unit: 'decision-equivalence fixture pass', evidenceVerified: true },
    },
    internalEvidence: ['Equivalent decisions were preserved while recomputation fell.'],
  }];
  garden.transferSeeds = [];

  const pressure = classifyPressure(garden);
  assert.equal(pressure.type, 'TRANSFER');
  assert.equal(pressure.targetId, 'imp_semantic_cache');
  assert.equal(pressureCostClass(garden, pressure), 'reasoner');

  const reasoner = new MockReasoner({
    TRANSFER: {
      data: {
        transferable: true,
        transformation: 'Avoid recomputing unchanged semantic dependencies while preserving decision-equivalent state.',
        beneficiaryClasses: ['stateful agent systems', 'workflow engines'],
        externalValueMeasure: 'Independent workloads perform fewer equivalent recomputations without decision regression.',
        deliveryForms: ['library', 'runtime policy'],
        nextExternalProbe: 'Run a shadow benchmark on an independent stateful workflow.',
        antiGoodhartRisk: 'Optimizing cache hits could preserve stale state if semantic invalidation is incomplete.',
        outwardMaintenanceBounded: true,
      },
      sources: [],
      rawId: 'mock_transfer',
    },
  });

  const step = await breathe({ garden, reasoner, pressure });
  assert.equal(step.result.action, 'TRANSFER');
  assert.equal(garden.internalImprovements[0].transferAssessmentState, 'hypothesis_derived');
  assert.equal(garden.transferSeeds.length, 1);
  assert.equal(garden.transferSeeds[0].status, 'hypothesis');
  assert.equal(garden.transferSeeds[0].externalValueVerified, false);

  const nextPressure = classifyPressure(garden);
  assert.notEqual(nextPressure.type, 'TRANSFER');
});

test('context-specific improvement may remain internal without repeated cognition', async () => {
  const garden = structuredClone(seed);
  garden.opportunities = [];
  garden.fruits = [];
  garden.humanActuationQueue = [];
  garden.internalImprovements = [{
    id: 'imp_local_only',
    name: 'Local fixture shortcut',
    dimensions: {
      latency: { baseline: 5, after: 1, unit: 'ms', evidenceVerified: true },
    },
  }];
  garden.transferSeeds = [];

  const reasoner = new MockReasoner({
    TRANSFER: {
      data: {
        transferable: false,
        transformation: null,
        beneficiaryClasses: [],
        externalValueMeasure: null,
        deliveryForms: [],
        nextExternalProbe: null,
        antiGoodhartRisk: null,
        outwardMaintenanceBounded: true,
      },
      sources: [],
      rawId: 'mock_no_transfer',
    },
  });

  const pressure = classifyPressure(garden);
  assert.equal(pressure.type, 'TRANSFER');
  await breathe({ garden, reasoner, pressure });
  assert.equal(garden.internalImprovements[0].transferAssessmentState, 'no_transfer_hypothesis');
  assert.equal(garden.transferSeeds.length, 0);
  assert.notEqual(classifyPressure(garden).type, 'TRANSFER');
});
