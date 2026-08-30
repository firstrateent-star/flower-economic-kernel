import test from 'node:test';
import assert from 'node:assert/strict';
import seed from './fixtures/test-seed.js';
import { refreshGeometry } from '../src/core/geometry.js';
import { buildReasonerGardenView } from '../src/core/reasoner-view.js';
import { OpenAIReasoner } from '../src/reasoners/openai.js';
import { EfficientOpenAIReasoner } from '../src/reasoners/efficient-openai.js';

test('reasoner Garden view preserves decision structure while removing execution noise and redundant edges', () => {
  const garden = structuredClone(seed);
  garden.traces.push({ id: 'trace_noise', kind: 'breath', summary: 'not decision context' });
  garden.events.push({ id: 'event_noise', status: 'processed', type: 'OLD_EVENT' });
  garden.approvals.push({ id: 'approval_noise', status: 'resolved' });
  garden.fruits[0].pricing = { model: 'PAY_PER_EVENT', usd: 0.01 };
  garden.fruits[0].distributionRails = { apifyStore: 'live', agentic: 'eligible' };
  refreshGeometry(garden);

  const original = JSON.stringify(garden);
  const view = buildReasonerGardenView({ garden, operation: 'EXPAND' });

  assert.equal(JSON.stringify(garden), original);
  assert.equal(view.soil.length, garden.soil.length);
  assert.deepEqual(view.soil.map((x) => x.principle), garden.soil.map((x) => x.principle));
  assert.equal(view.geometry.centers.length, garden.geometry.centers.length);
  assert.equal(view.geometry.archetypes.length, garden.geometry.archetypes.length);
  assert.equal(view.geometry.capabilities.length, garden.geometry.capabilities.length);
  assert.equal('edges' in view.geometry, false);
  assert.equal('traces' in view, false);
  assert.equal('events' in view, false);
  assert.equal('approvals' in view, false);
  assert.deepEqual(view.fruits[0].pricing, garden.fruits[0].pricing);
  assert.deepEqual(view.fruits[0].distributionRails, garden.fruits[0].distributionRails);
});

test('efficient reasoner passes the projected Garden into the existing reasoner logic', async () => {
  const garden = structuredClone(seed);
  refreshGeometry(garden);
  garden.traces.push({ id: 'trace_should_not_cross_boundary', kind: 'telemetry' });

  let capturedGarden = null;
  const originalReason = OpenAIReasoner.prototype.reason;
  OpenAIReasoner.prototype.reason = async function capture(args) {
    capturedGarden = args.garden;
    return { data: { candidates: [] }, sources: [], rawId: 'captured', usage: null };
  };

  try {
    const reasoner = new EfficientOpenAIReasoner({ apiKey: 'test-key' });
    await reasoner.reason({
      operation: 'EXPAND',
      garden,
      target: null,
      prompt: 'test',
      allowWebSearch: false,
    });
  } finally {
    OpenAIReasoner.prototype.reason = originalReason;
  }

  assert.ok(capturedGarden);
  assert.equal('traces' in capturedGarden, false);
  assert.equal('edges' in capturedGarden.geometry, false);
  assert.equal(capturedGarden.geometry.centers.length, garden.geometry.centers.length);
  assert.deepEqual(capturedGarden.soil.map((x) => x.principle), garden.soil.map((x) => x.principle));
});
