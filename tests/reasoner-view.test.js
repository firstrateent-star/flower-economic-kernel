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
  assert.equal(view.reasonerView.activation.mode, 'global');
  assert.equal('edges' in view.geometry, false);
  assert.equal('traces' in view, false);
  assert.equal('events' in view, false);
  assert.equal('approvals' in view, false);
  assert.deepEqual(view.fruits[0].pricing, garden.fruits[0].pricing);
  assert.deepEqual(view.fruits[0].distributionRails, garden.fruits[0].distributionRails);
});

test('targeted reasoning activates only the target geometry neighborhood while retaining portfolio totals', () => {
  const garden = structuredClone(seed);
  const target = garden.opportunities[0];
  target.failureArchetype = 'identity_pointer_drift';
  target.reusableCapability = 'entity_identity_matching';
  garden.opportunities.push(
    {
      id: 'opp_related_identity',
      name: 'Related Identity Check',
      status: 'needs_test',
      thesis: 'Identity can drift across representations.',
      failureArchetype: 'identity_metadata_conflict',
      reusableCapability: 'cross_source_identity_reconciliation',
    },
    {
      id: 'opp_unrelated_semantic',
      name: 'Unrelated Semantic Check',
      status: 'needs_test',
      thesis: 'Document reading order can fail.',
      failureArchetype: 'document_structure_order',
      reusableCapability: 'document_structure_graph_analysis',
    },
  );
  refreshGeometry(garden);

  const view = buildReasonerGardenView({ garden, operation: 'FALSIFY', target });
  const visibleIds = new Set(view.geometry.centers.map((center) => center.id));

  assert.equal(view.reasonerView.activation.mode, 'target_neighborhood');
  assert.ok(visibleIds.has(target.id));
  assert.ok(visibleIds.has('opp_related_identity'));
  assert.equal(visibleIds.has('opp_unrelated_semantic'), false);
  assert.equal(view.portfolioSummary.opportunityCount, garden.opportunities.length);
  assert.equal(view.opportunities.some((opp) => opp.id === 'opp_unrelated_semantic'), false);
});

test('global comparison operations keep the full compressed field', () => {
  const garden = structuredClone(seed);
  garden.opportunities.push({
    id: 'opp_unrelated_global',
    name: 'Unrelated Global Candidate',
    status: 'needs_test',
    thesis: 'Another independent hypothesis.',
    failureArchetype: 'document_structure_order',
  });
  refreshGeometry(garden);

  for (const operation of ['EXPAND', 'SELECT']) {
    const view = buildReasonerGardenView({ garden, operation, target: garden.opportunities[0] });
    assert.equal(view.reasonerView.activation.mode, 'global');
    assert.equal(view.opportunities.length, garden.opportunities.length);
    assert.equal(view.geometry.centers.length, garden.geometry.centers.length);
  }
});

test('efficient reasoner passes the projected Garden and target activation into existing reasoner logic', async () => {
  const garden = structuredClone(seed);
  refreshGeometry(garden);
  garden.traces.push({ id: 'trace_should_not_cross_boundary', kind: 'telemetry' });

  let capturedGarden = null;
  const originalReason = OpenAIReasoner.prototype.reason;
  OpenAIReasoner.prototype.reason = async function capture(args) {
    capturedGarden = args.garden;
    return { data: { verdict: 'needs_test', rationale: 'test', evidence: [], counterEvidence: [], cheapestFalsifier: { question: 'q', action: 'a', estimatedCostUsd: 0 }, principles: [] }, sources: [], rawId: 'captured', usage: null };
  };

  try {
    const reasoner = new EfficientOpenAIReasoner({ apiKey: 'test-key' });
    await reasoner.reason({
      operation: 'FALSIFY',
      garden,
      target: garden.opportunities[0],
      prompt: 'test',
      allowWebSearch: false,
    });
  } finally {
    OpenAIReasoner.prototype.reason = originalReason;
  }

  assert.ok(capturedGarden);
  assert.equal('traces' in capturedGarden, false);
  assert.equal('edges' in capturedGarden.geometry, false);
  assert.equal(capturedGarden.reasonerView.activation.targetId, garden.opportunities[0].id);
  assert.deepEqual(capturedGarden.soil.map((x) => x.principle), garden.soil.map((x) => x.principle));
});
