import test from 'node:test';
import assert from 'node:assert/strict';
import seed from './fixtures/test-seed.js';
import { FRUIT_OF_LIFE_CENTERS, refreshGeometry } from '../src/core/geometry.js';

test('Fruit-of-Life geometry exposes exactly thirteen functional centers without making them thirteen mandatory tests', () => {
  assert.equal(FRUIT_OF_LIFE_CENTERS.length, 13);
  assert.equal(new Set(FRUIT_OF_LIFE_CENTERS).size, 13);
  assert.ok(FRUIT_OF_LIFE_CENTERS.includes('failure_reality'));
  assert.ok(FRUIT_OF_LIFE_CENTERS.includes('inheritance'));
  assert.ok(FRUIT_OF_LIFE_CENTERS.includes('harvest_sovereignty'));
});

test('legacy identity branches become connected reusable geometry instead of isolated history', () => {
  const garden = structuredClone(seed);
  garden.opportunities.push(
    {
      id: 'opp_identity_pointer_test',
      name: 'Pointer Identity Guard',
      status: 'measurement_blocked',
      thesis: 'A pointer can identify the wrong entity.',
      nutrientChannel: 'API marketplace',
    },
    {
      id: 'opp_catalog_identity_test',
      name: 'Catalog Identity Conflict Guard',
      status: 'measurement_blocked',
      thesis: 'Catalog metadata can disagree about product identity.',
      nutrientChannel: 'merchant tooling',
    },
  );

  const geometry = refreshGeometry(garden);
  assert.equal(geometry.stage, 'metatrons_cube');
  const identity = geometry.archetypes.find((x) => x.name === 'identity_integrity');
  assert.ok(identity);
  assert.ok(identity.reuseCount >= 3);
  assert.ok(geometry.edges.some((x) => x.relation === 'shared_failure_archetype_family' && x.key === 'identity_integrity'));
});

test('supporting experiments mark only earned validation centers while prose remains claimed', () => {
  const garden = structuredClone(seed);
  const opp = garden.opportunities[0];
  opp.status = 'supported';
  opp.nutrientChannel = 'API marketplace';
  opp.passivity = 'Self-serve';
  garden.experiments.push({
    id: 'exp_failure_support',
    opportunityId: opp.id,
    status: 'integrated',
    validationDimension: 'failure_reality',
    result: {
      verdict: 'supports',
      sources: [{ url: 'https://one.example/failure' }],
    },
  });

  const geometry = refreshGeometry(garden);
  const center = geometry.centers.find((x) => x.id === opp.id);
  assert.equal(center.coverage.failure_reality, 'earned');
  assert.equal(center.coverage.buyer_demand, 'unknown');
  assert.equal(center.coverage.nutrient_channel, 'claimed');
  assert.equal(center.coverage.passive_discoverability, 'claimed');
});

test('geometry cache ignores telemetry churn and preserves the exact derived graph', () => {
  const garden = structuredClone(seed);
  const first = refreshGeometry(garden);
  const firstSerialized = JSON.stringify(first);
  const firstUpdatedAt = first.updatedAt;

  garden.traces.push({
    id: 'trace_irrelevant_to_geometry',
    kind: 'telemetry',
    at: '2026-08-30T17:00:00.000Z',
  });
  garden.status.lastBreathAt = '2026-08-30T17:00:00.000Z';

  const second = refreshGeometry(garden);
  assert.equal(second, first);
  assert.equal(second.updatedAt, firstUpdatedAt);
  assert.equal(JSON.stringify(second), firstSerialized);
});

test('geometry cache invalidates when a geometry-relevant state field changes', () => {
  const garden = structuredClone(seed);
  const first = refreshGeometry(garden);
  const firstSignature = first.inputSignature;
  const target = garden.opportunities[0];

  target.status = 'validated';
  const second = refreshGeometry(garden);

  assert.notEqual(second, first);
  assert.notEqual(second.inputSignature, firstSignature);
  assert.equal(second.centers.find((x) => x.id === target.id).status, 'validated');
  assert.equal(second.metrics.validatedOpportunityCount, 1);
});
