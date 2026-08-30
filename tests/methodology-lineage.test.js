import test from 'node:test';
import assert from 'node:assert/strict';
import seed from './fixtures/test-seed.js';
import { FLOWER_METHODOLOGY_VERSION } from '../src/core/methodology-core.js';
import {
  captureMethodologyArtifactIds,
  stampNewMethodologyArtifactOrigins,
  resolveMethodologyArtifactOrigin,
} from '../src/core/methodology-lineage.js';
import { addTrace } from '../src/core/transitions.js';

test('new decision artifacts receive origin methodology while legacy artifacts remain unknown', () => {
  const garden = structuredClone(seed);
  const before = captureMethodologyArtifactIds(garden);
  garden.experiments.push({ id: 'exp_lineage_new', opportunityId: garden.opportunities[0].id, status: 'authorized' });

  const stamped = stampNewMethodologyArtifactOrigins(garden, before);
  assert.equal(stamped.length, 1);
  assert.equal(garden.experiments.at(-1).originMethodologyVersion, FLOWER_METHODOLOGY_VERSION);
  assert.equal(resolveMethodologyArtifactOrigin(garden, garden.opportunities[0].id).originMethodologyVersion, null);
});

test('later trace distinguishes current processing methodology from target origin methodology', () => {
  const garden = structuredClone(seed);
  garden.traces = [];
  garden.experiments.push({
    id: 'exp_from_prior_method',
    opportunityId: garden.opportunities[0].id,
    status: 'result_ready',
    originMethodologyVersion: '2026-08-29.legacy-method',
  });

  addTrace(garden, {
    kind: 'breath',
    pressure: { type: 'INTEGRATE', targetId: 'exp_from_prior_method' },
    summary: 'Observed result from an intervention originated under an older methodology.',
  });

  assert.equal(garden.traces[0].methodologyVersion, FLOWER_METHODOLOGY_VERSION);
  assert.equal(garden.traces[0].targetOriginMethodologyVersion, '2026-08-29.legacy-method');
});

test('lineage helper never overwrites an explicit origin version', () => {
  const garden = structuredClone(seed);
  const before = captureMethodologyArtifactIds(garden);
  garden.fruits.push({ id: 'fruit_imported', name: 'Imported Fruit', originMethodologyVersion: 'external-or-prior' });
  stampNewMethodologyArtifactOrigins(garden, before);
  assert.equal(garden.fruits.at(-1).originMethodologyVersion, 'external-or-prior');
});
