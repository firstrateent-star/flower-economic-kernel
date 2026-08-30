import test from 'node:test';
import assert from 'node:assert/strict';
import seed from './fixtures/test-seed.js';
import { pulse } from '../src/core/kernel.js';
import { FLOWER_METHODOLOGY_VERSION } from '../src/core/methodology-core.js';
import { MockReasoner } from '../src/reasoners/mock.js';

test('pulse can falsify a seed and autonomously choose the required failure-reality experiment dimension first', async () => {
  const garden = structuredClone(seed);
  garden.opportunities[0].status = 'seed';
  const reasoner = new MockReasoner({
    FALSIFY: {
      data: {
        verdict: 'needs_test',
        rationale: 'Pain appears plausible but base-rate frequency is unknown.',
        evidence: ['A paid upstream workflow exists.'],
        counterEvidence: ['No measured random-sample error rate yet.'],
        cheapestFalsifier: { question: 'How often do pointers disagree?', action: 'sample', estimatedCostUsd: 0 },
        principles: []
      },
      sources: [{ title: 'example', url: 'https://example.test/evidence' }],
      rawId: 'mock_falsify'
    }
  });

  const result = await pulse({ garden, reasoner, maxBreaths: 2 });
  assert.equal(result.breaths[0].pressure.type, 'FALSIFY');
  assert.equal(result.breaths[1].pressure.type, 'EXPERIMENT');
  assert.equal(garden.opportunities[0].status, 'supported');
  assert.equal(garden.experiments[0].status, 'authorized');
  assert.equal(garden.experiments[0].validationDimension, 'failure_reality');
  assert.equal(garden.experiments[0].originMethodologyVersion, FLOWER_METHODOLOGY_VERSION);
});

test('an authorized web-search experiment routes to bounded execution instead of STILLNESS', async () => {
  const garden = structuredClone(seed);
  garden.experiments.push({
    id: 'exp_authorized_search',
    opportunityId: garden.opportunities[0].id,
    status: 'authorized',
    name: 'Public failure-signal search',
    tests: 'Search public evidence for concrete website-pointer failures and demand.',
    actionType: 'web_search',
    validationDimension: 'failure_reality',
    oneTimeCostUsd: 0,
    recurringUsd: 0,
    successCondition: 'Concrete externally sourced workflow or failure evidence exists.',
    killCondition: 'No meaningful signal is found.',
    authorization: { allowed: true, requiresApproval: false, reason: 'Observation capability.' }
  });
  garden.opportunities[0].experimentId = 'exp_authorized_search';

  const reasoner = new MockReasoner({
    EXECUTE_EXPERIMENT: {
      data: {
        verdict: 'supports',
        finding: 'Concrete external signal found.',
        observations: ['A public source documents the relevant failure mode.']
      },
      sources: [{ title: 'external evidence', url: 'https://example.test/external' }],
      rawId: 'mock_execute'
    }
  });

  const result = await pulse({ garden, reasoner, maxBreaths: 1 });
  assert.equal(result.breaths[0].pressure.type, 'EXECUTE_EXPERIMENT');
  assert.equal(garden.experiments[0].status, 'result_ready');
  assert.equal(garden.experiments[0].result.sourceCount, 1);
});

test('integrating a sourced experiment result updates the opportunity and clears the active experiment pointer', async () => {
  const garden = structuredClone(seed);
  garden.experiments.push({
    id: 'exp_result_ready',
    opportunityId: garden.opportunities[0].id,
    status: 'result_ready',
    name: 'Public failure-signal search',
    actionType: 'web_search',
    validationDimension: 'failure_reality',
    result: {
      verdict: 'supports',
      finding: 'Concrete external signal found.',
      sources: [{ title: 'external evidence', url: 'https://example.test/external' }],
      sourceCount: 1
    }
  });
  garden.opportunities[0].experimentId = 'exp_result_ready';

  const result = await pulse({ garden, reasoner: new MockReasoner(), maxBreaths: 1 });
  assert.equal(result.breaths[0].pressure.type, 'INTEGRATE');
  assert.equal(garden.experiments[0].status, 'integrated');
  assert.equal(garden.opportunities[0].status, 'supported');
  assert.equal(garden.opportunities[0].experimentId, null);
  assert.deepEqual(garden.opportunities[0].externalEvidence, ['https://example.test/external']);
});

test('two independent supporting dimensions with source diversity earn only a private-build validation state', async () => {
  const garden = structuredClone(seed);
  const oppId = garden.opportunities[0].id;
  garden.opportunities[0].status = 'supported';

  garden.experiments.push({
    id: 'exp_buyer_demand',
    opportunityId: oppId,
    status: 'integrated',
    name: 'Buyer demand search',
    actionType: 'web_search',
    validationDimension: 'buyer_demand',
    result: {
      verdict: 'supports',
      finding: 'Demand signal exists.',
      sources: [
        { title: 'market A', url: 'https://market.example/a' },
        { title: 'market B', url: 'https://buyers.example/b' }
      ]
    }
  });
  garden.experiments.push({
    id: 'exp_failure_ready',
    opportunityId: oppId,
    status: 'result_ready',
    name: 'Failure reality search',
    actionType: 'web_search',
    validationDimension: 'failure_reality',
    result: {
      verdict: 'supports',
      finding: 'Failure mode exists.',
      sources: [{ title: 'failure evidence', url: 'https://evidence.example/failure' }]
    }
  });
  garden.opportunities[0].experimentId = 'exp_failure_ready';

  const result = await pulse({ garden, reasoner: new MockReasoner(), maxBreaths: 1 });
  assert.equal(result.breaths[0].pressure.type, 'INTEGRATE');
  assert.equal(garden.opportunities[0].status, 'validated');
  assert.equal(garden.opportunities[0].validationGate.pass, true);
  assert.match(garden.opportunities[0].epistemicNote, /PRIVATE build plan/i);
});

test('a direct failure-reality sample that meets its predeclared kill condition makes the opportunity dormant', async () => {
  const garden = structuredClone(seed);
  const oppId = garden.opportunities[0].id;
  garden.opportunities[0].status = 'needs_test';
  garden.experiments.push({
    id: 'exp_direct_weakens',
    opportunityId: oppId,
    status: 'result_ready',
    name: 'Direct Stratified Maps→Website Identity Sample',
    actionType: 'spend',
    method: 'maps_website_sample',
    oneTimeCostUsd: 0.50,
    recurringUsd: 0,
    validationDimension: 'failure_reality',
    killCondition: 'At least five evaluable pairs show no mismatch candidate, weakening the failure-rate thesis enough to avoid a private build for now.',
    result: {
      verdict: 'weakens',
      finding: 'Direct stratified sample: 6 Maps records, 5 evaluable pairs, 0 mismatch candidate(s), 5 match signal(s).',
      sources: [{ title: 'business', url: 'https://business.example/' }],
      sample: {
        evaluable: 5,
        mismatchCandidates: 0,
        matchSignals: 5
      }
    }
  });
  garden.opportunities[0].experimentId = 'exp_direct_weakens';

  const result = await pulse({ garden, reasoner: new MockReasoner(), maxBreaths: 1 });
  assert.equal(result.breaths[0].pressure.type, 'INTEGRATE');
  assert.equal(garden.experiments.at(-1).status, 'integrated');
  assert.equal(garden.opportunities[0].status, 'dormant');
  assert.equal(garden.opportunities[0].experimentId, null);
  assert.match(garden.opportunities[0].failedBecause, /kill condition/i);
  assert.match(garden.opportunities[0].epistemicNote, /Dormant, not disproven/i);
  assert.equal(garden.opportunities[0].selectionState, 'dormant');
  assert.equal(garden.opportunities[0].validationGate.pass, false);
});
