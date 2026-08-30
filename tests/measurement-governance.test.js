import test from 'node:test';
import assert from 'node:assert/strict';
import seed from './fixtures/test-seed.js';
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

function supportingBuyerDemandExperiment(opportunityId) {
  return {
    id: 'exp_buyer_support',
    opportunityId,
    status: 'integrated',
    actionType: 'web_search',
    validationDimension: 'buyer_demand',
    result: {
      verdict: 'supports',
      finding: 'External evidence supports buyer demand.',
      observations: [],
      sources: [{ title: 'Buyer evidence', url: 'https://example.org/buyer-evidence' }],
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
  garden.experiments = [supportingBuyerDemandExperiment(opp.id), inconclusiveWebExperiment(opp.id)];

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
  garden.experiments = [supportingBuyerDemandExperiment(opp.id), inconclusiveWebExperiment(opp.id)];

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

test('email authentication branch uses zero-spend DNS reality before semantic failure search', async () => {
  const garden = structuredClone(seed);
  const opp = {
    ...structuredClone(garden.opportunities[0]),
    id: 'opp_a179f5e22952',
    name: 'Transactional Email Authentication Preflight API',
    status: 'supported',
    selectedForExperiment: true,
    selectionState: 'selected',
    experimentId: null,
  };
  garden.opportunities = [opp];
  garden.experiments = [supportingBuyerDemandExperiment(opp.id)];

  assert.equal(classifyPressure(garden).type, 'EXPERIMENT');
  await pulse({ garden, reasoner: new MockReasoner(), maxBreaths: 1 });

  const direct = garden.experiments.find((exp) => exp.method === 'email_auth_dns_sample');
  assert.ok(direct);
  assert.equal(direct.opportunityId, opp.id);
  assert.equal(direct.validationDimension, 'failure_reality');
  assert.equal(direct.actionType, 'observe');
  assert.equal(direct.oneTimeCostUsd, 0);
  assert.equal(direct.recurringUsd, 0);
  assert.equal(direct.status, 'authorized');
});

test('legacy unmapped scout context is unknown, not a non-supporting failure search', async () => {
  const garden = structuredClone(seed);
  const opp = {
    ...structuredClone(garden.opportunities[0]),
    id: 'opp_legacy_provenance_test',
    name: 'Legacy Provenance Test',
    status: 'supported',
    selectedForExperiment: true,
    selectionState: 'selected',
    experimentId: null,
  };
  garden.opportunities = [opp];
  garden.experiments = [
    supportingBuyerDemandExperiment(opp.id),
    {
      id: 'exp_legacy_scout',
      opportunityId: opp.id,
      status: 'legacy_context',
      actionType: 'web_search',
      method: 'evidence_bearing_expand_v1',
      validationDimension: 'failure_reality',
      result: {
        verdict: 'inconclusive',
        legacyVerdict: 'supports',
        provenanceStatus: 'legacy_unmapped',
        finding: 'Historical source pool was not dimension-mapped.',
        observations: [],
        sources: [{ title: 'Historical source', url: 'https://history.example/source' }],
      },
    },
  ];

  assert.equal(classifyPressure(garden).type, 'EXPERIMENT');
  await pulse({ garden, reasoner: new MockReasoner(), maxBreaths: 1 });

  assert.notEqual(opp.status, 'measurement_blocked');
  const freshFailure = garden.experiments.find((exp) =>
    exp.opportunityId === opp.id
    && exp.status === 'authorized'
    && exp.validationDimension === 'failure_reality'
  );
  assert.ok(freshFailure);
  assert.equal(freshFailure.method, 'bounded_public_web_search_v1');
});
