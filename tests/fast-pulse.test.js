import test from 'node:test';
import assert from 'node:assert/strict';
import seed from './fixtures/test-seed.js';
import { pulse } from '../src/core/kernel.js';
import { classifyPressure } from '../src/core/pressure.js';
import { MockReasoner } from '../src/reasoners/mock.js';

function candidate(name = 'Fresh Machine Fruit') {
  return {
    name,
    thesis: 'A recurring machine-mediated workflow contains an unresolved failure that can be checked with public evidence.',
    moneyFlow: 'Self-serve metered API usage.',
    buyer: 'Developers operating automated workflows.',
    nutrientChannel: 'Developer marketplaces and search.',
    passivity: 'Self-serve discovery and fulfillment.',
    autonomyCompatibility: 'Read-only validation and automated delivery.',
    reproductivePotential: 'Reuses validation, API, and distribution infrastructure.',
    realityAccess: 'Public buyer and workflow evidence is searchable with the current web executor.',
    cheapestRealityTest: 'Search for concrete buyer/action signals before build.',
    inheritedInfrastructure: 'Flower experiment and API patterns.',
    whyNow: 'Machine-mediated workflows continue to expand.',
  };
}

test('one evidence-bearing EXPAND automatically authorizes the next unearned reality dimension without another costly reasoner breath', async () => {
  const garden = structuredClone(seed);
  for (const opp of garden.opportunities) opp.status = 'dormant';
  garden.experiments = [];
  garden.selections = [];

  const sources = [
    { title: 'Failure case A', url: 'https://issues.example/failure-a' },
    { title: 'Failure case B', url: 'https://issues.example/failure-b' },
    { title: 'Failure case C', url: 'https://docs.example/failure-c' },
  ];
  const first = {
    ...candidate('First Ranked Fruit'),
    failureEvidence: sources.map((source, index) => ({
      url: source.url,
      claim: `Concrete failure case ${index + 1}.`,
    })),
    buyerEvidence: [],
  };

  const reasoner = new MockReasoner({
    EXPAND: {
      data: { candidates: [first] },
      sources,
      rawId: 'expand_mock',
      usage: { total_tokens: 1 },
    },
  });

  const result = await pulse({ garden, reasoner, maxBreaths: 12, maxCostlyBreaths: 1 });

  assert.deepEqual(result.breaths.map((x) => x.pressure.type), ['EXPAND', 'EXPERIMENT']);
  assert.deepEqual(result.breaths.map((x) => x.costClass), ['reasoner', 'free']);
  assert.equal(result.runBudget.costlyBreathsUsed, 1);
  assert.equal(result.stoppedByCostFrontier, true);

  const admitted = garden.opportunities.find((x) => x.name === 'First Ranked Fruit');
  assert.ok(admitted);
  assert.equal(admitted.status, 'supported');
  assert.equal(admitted.selectedForExperiment, true);

  const failureScout = garden.experiments.find((x) =>
    x.opportunityId === admitted.id && x.validationDimension === 'failure_reality' && x.status === 'integrated'
  );
  const buyerExperiment = garden.experiments.find((x) =>
    x.opportunityId === admitted.id && x.validationDimension === 'buyer_demand' && x.status === 'authorized'
  );
  assert.ok(failureScout);
  assert.ok(buyerExperiment);
  assert.equal(admitted.experimentId, buyerExperiment.id);
  assert.equal(classifyPressure(garden).type, 'EXECUTE_EXPERIMENT');
});

test('a non-supporting web-search frontier blocks that sibling and directly authorizes the sole reserve', async () => {
  const garden = structuredClone(seed);
  garden.opportunities = [
    {
      ...candidate('First Fruit'),
      id: 'opp_first',
      status: 'needs_test',
      selectedForExperiment: true,
      selectionState: 'selected',
      experimentId: 'exp_first',
      sources: [],
      externalEvidence: [],
      reasoningEvidence: [],
      counterEvidence: [],
    },
    {
      ...candidate('Reserve Fruit'),
      id: 'opp_reserve',
      status: 'needs_test',
      selectedForExperiment: false,
      selectionState: 'reserve',
      experimentId: null,
      sources: [],
      externalEvidence: [],
      reasoningEvidence: [],
      counterEvidence: [],
    },
  ];
  garden.experiments = [{
    id: 'exp_first',
    opportunityId: 'opp_first',
    status: 'authorized',
    authorization: { allowed: true, requiresApproval: false },
    name: 'Buyer Search',
    tests: 'Search buyer signals.',
    actionType: 'web_search',
    method: 'bounded_public_web_search_v1',
    oneTimeCostUsd: 0,
    recurringUsd: 0,
    successCondition: 'Concrete buyer signals.',
    killCondition: 'No concrete buyer signals.',
    validationDimension: 'buyer_demand',
  }];
  garden.selections = [];

  const reasoner = new MockReasoner({
    EXECUTE_EXPERIMENT: {
      data: {
        verdict: 'inconclusive',
        finding: 'Searchable material exists but concrete buyer action remains unresolved.',
        observations: ['Evidence was mixed.'],
      },
      sources: [{ title: 'External evidence', url: 'https://example.com/evidence' }],
      rawId: 'search_mock',
      usage: { total_tokens: 1 },
    },
  });

  const result = await pulse({ garden, reasoner, maxBreaths: 12, maxCostlyBreaths: 1 });
  assert.deepEqual(result.breaths.map((x) => x.pressure.type), ['EXECUTE_EXPERIMENT', 'INTEGRATE', 'EXPERIMENT']);
  assert.equal(garden.experiments.find((x) => x.id === 'exp_first').status, 'integrated');
  assert.equal(garden.opportunities.find((x) => x.id === 'opp_first').selectionState, 'measurement_blocked');
  assert.equal(garden.opportunities.find((x) => x.id === 'opp_first').status, 'measurement_blocked');
  const reserve = garden.opportunities.find((x) => x.id === 'opp_reserve');
  assert.ok(reserve.experimentId);
  assert.equal(classifyPressure(garden).type, 'EXECUTE_EXPERIMENT');
});

test('email DNS weakening threshold makes the branch dormant before another search', async () => {
  const garden = structuredClone(seed);
  garden.opportunities = [{
    ...candidate('Transactional Email Authentication Preflight'),
    id: 'opp_a179f5e22952',
    status: 'needs_test',
    selectedForExperiment: true,
    selectionState: 'selected',
    experimentId: 'exp_dns',
    sources: [],
    externalEvidence: [],
    reasoningEvidence: [],
    counterEvidence: [],
  }];
  garden.experiments = [{
    id: 'exp_dns',
    opportunityId: 'opp_a179f5e22952',
    status: 'result_ready',
    authorization: { allowed: true, requiresApproval: false },
    name: 'Direct ESP-Signaled SPF/DMARC DNS Sample',
    tests: 'Inspect public DNS.',
    actionType: 'observe',
    method: 'email_auth_dns_sample',
    oneTimeCostUsd: 0,
    recurringUsd: 0,
    successCondition: 'At least two hard failures.',
    killCondition: 'At least eight ESP-signaled domains and zero hard failures.',
    validationDimension: 'failure_reality',
    result: {
      verdict: 'weakens',
      finding: 'No hard SPF/DMARC failures in the bounded sample.',
      sources: [{ title: 'DNS evidence', url: 'dns://example.com/TXT' }],
      sample: { espSignaled: 8, hardFailureDomains: 0 },
    },
  }];

  const result = await pulse({ garden, reasoner: new MockReasoner(), maxBreaths: 4, maxCostlyBreaths: 1 });
  assert.equal(result.breaths[0].pressure.type, 'INTEGRATE');
  assert.equal(garden.opportunities[0].status, 'dormant');
  assert.equal(garden.opportunities[0].experimentId, null);
});
