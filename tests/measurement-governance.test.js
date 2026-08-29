import test from 'node:test';
import assert from 'node:assert/strict';
import seed from '../garden/seed.json' with { type: 'json' };
import { pulse } from '../src/core/kernel.js';
import { classifyPressure } from '../src/core/pressure.js';
import { MockReasoner } from '../src/reasoners/mock.js';

function inconclusiveWebExperiment(opportunityId, id = 'exp_failure_web') {
  return {
    id,
    opportunityId,
    status: 'result_ready',
    actionType: 'web_search',
    validationDimension: 'failure_reality',
    result: {
      verdict: 'inconclusive',
      finding: 'Public evidence did not resolve whether the claimed failure occurs often enough.',
      observations: [],
      sources: [{ title: 'Example evidence', url: 'https://example.com/evidence' }],
      sourceCount: 1,
    },
  };
}

test('non-Maps inconclusive failure web search becomes measurement_blocked on integration', async () => {
  const garden = structuredClone(seed);
  const opp = {
    ...structuredClone(garden.opportunities[0]),
    id: 'opp_invoice_guard_test',
    name: 'Invoice Duplicate Guard',
    status: 'supported',
    selectedForExperiment: true,
    selectionState: 'selected',
    experimentId: 'exp_failure_web',
  };
  garden.opportunities = [opp];
  garden.experiments = [inconclusiveWebExperiment(opp.id)];

  const result = await pulse({ garden, reasoner: new MockReasoner(), maxBreaths: 1 });

  assert.equal(result.breaths[0].pressure.type, 'INTEGRATE');
  assert.equal(opp.status, 'measurement_blocked');
  assert.equal(opp.measurementBlockedDimension, 'failure_reality');
  assert.equal(opp.selectedForExperiment, false);
  assert.equal(opp.selectionState, 'measurement_blocked');
  assert.equal(classifyPressure(garden).type, 'EXPAND');
});

test('Maps pointer guard preserves its branch-specific direct-sample escape hatch', async () => {
  const garden = structuredClone(seed);
  const opp = garden.opportunities[0];
  opp.status = 'supported';
  opp.selectedForExperiment = true;
  opp.selectionState = 'selected';
  opp.experimentId = 'exp_failure_web';
  garden.experiments = [inconclusiveWebExperiment(opp.id)];

  await pulse({ garden, reasoner: new MockReasoner(), maxBreaths: 1 });

  assert.equal(opp.status, 'needs_test');
  assert.notEqual(opp.status, 'measurement_blocked');
  assert.equal(classifyPressure(garden).type, 'EXPERIMENT');

  await pulse({ garden, reasoner: new MockReasoner(), maxBreaths: 1 });
  const direct = garden.experiments.find((exp) => exp.method === 'maps_website_sample' && exp.status === 'authorized');
  assert.ok(direct);
  assert.equal(direct.opportunityId, 'opp_maps_website_pointer_guard');
  assert.equal(direct.oneTimeCostUsd, 0.5);
});
