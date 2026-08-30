import test from 'node:test';
import assert from 'node:assert/strict';
import { buildReasonerGardenView, diagnoseReasonerActivation } from '../src/core/reasoner-view.js';

function gardenWithCenters(centers) {
  const opportunities = centers.map((center) => ({
    id: center.id,
    name: center.name,
    status: center.status,
    thesis: 'fixture',
    failureArchetype: center.archetypeFamily,
    reusableCapability: center.capabilityFamily,
  }));
  return {
    schemaVersion: 2,
    id: 'activation-index-fixture',
    center: { rootGoal: 'fixture', direction: 'fixture' },
    soil: [],
    fruits: [],
    opportunities,
    experiments: [],
    events: [],
    approvals: [],
    traces: [],
    transferSeeds: [],
    internalImprovements: [],
    humanActuationQueue: [],
    status: {},
    geometry: {
      version: 5,
      stage: 'fixture',
      metrics: {},
      fruitOfLifeCenters: [],
      centers,
      archetypes: [],
      capabilities: [],
    },
  };
}

function center(id, archetypeFamily, capabilityFamily) {
  return {
    id,
    kind: 'opportunity',
    name: id,
    status: 'seed',
    archetype: archetypeFamily,
    archetypeFamily,
    reusableCapability: capabilityFamily,
    capabilityFamily,
    nutrientChannel: null,
    coverage: {},
  };
}

test('first targeted lookup builds one family index and repeated lookup examines no geometry records', () => {
  const centers = Array.from({ length: 1000 }, (_, i) => center(
    i === 999 ? 'target' : `cold_${i}`,
    i === 10 || i === 999 ? 'shared_archetype' : `a_${i}`,
    i === 20 || i === 999 ? 'shared_capability' : `c_${i}`,
  ));
  const garden = gardenWithCenters(centers);
  const target = garden.opportunities.at(-1);

  const cold = diagnoseReasonerActivation({ garden, operation: 'FALSIFY', target });
  assert.equal(cold.recordsExamined, centers.length);
  assert.equal(cold.lookupMode, 'built_family_index');
  assert.equal(cold.resolvedIdCount, 3);

  const warm = diagnoseReasonerActivation({ garden, operation: 'FALSIFY', target });
  assert.equal(warm.recordsExamined, 0);
  assert.equal(warm.lookupMode, 'cached_family_index');
  assert.equal(warm.resolvedIdCount, 3);
});

test('indexed activation preserves the same target, archetype sibling, and capability sibling', () => {
  const centers = [
    center('unrelated', 'u1', 'u2'),
    center('archetype_sibling', 'shared_a', 'other_c'),
    center('capability_sibling', 'other_a', 'shared_c'),
    center('target', 'shared_a', 'shared_c'),
  ];
  const garden = gardenWithCenters(centers);
  const target = garden.opportunities.at(-1);
  const view = buildReasonerGardenView({ garden, operation: 'FALSIFY', target });
  const ids = view.opportunities.map((item) => item.id).sort();
  assert.deepEqual(ids, ['archetype_sibling', 'capability_sibling', 'target']);
});

test('replacing the derived centers array invalidates the cache instead of returning stale family membership', () => {
  const initialCenters = [
    center('sibling', 'shared_a', 'c1'),
    center('target', 'shared_a', 'c2'),
  ];
  const garden = gardenWithCenters(initialCenters);
  const target = garden.opportunities.at(-1);
  diagnoseReasonerActivation({ garden, operation: 'FALSIFY', target });
  assert.equal(diagnoseReasonerActivation({ garden, operation: 'FALSIFY', target }).recordsExamined, 0);

  const replacement = [
    center('sibling', 'different_a', 'c1'),
    center('target', 'shared_a', 'c2'),
  ];
  garden.geometry = { ...garden.geometry, centers: replacement };
  const rebuilt = diagnoseReasonerActivation({ garden, operation: 'FALSIFY', target });
  assert.equal(rebuilt.recordsExamined, replacement.length);
  assert.equal(rebuilt.lookupMode, 'built_family_index');
  assert.equal(rebuilt.resolvedIdCount, 1);
});

test('missing targets preserve prior fallback semantics after indexing', () => {
  const garden = gardenWithCenters([center('known', 'a', 'c')]);
  const cold = diagnoseReasonerActivation({ garden, operation: 'FALSIFY', target: 'missing' });
  assert.equal(cold.recordsExamined, 1);
  assert.equal(cold.resolvedIdCount, 1);
  const warm = diagnoseReasonerActivation({ garden, operation: 'FALSIFY', target: 'missing' });
  assert.equal(warm.recordsExamined, 0);
  assert.equal(warm.lookupMode, 'cached_target_missing');
  assert.equal(warm.resolvedIdCount, 1);
});
