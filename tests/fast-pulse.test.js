import test from 'node:test';
import assert from 'node:assert/strict';
import seed from '../garden/seed.json' with { type: 'json' };
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

test('one costly EXPAND automatically ranks and authorizes the first reality test', async () => {
  const garden = structuredClone(seed);
  for (const opp of garden.opportunities) opp.status = 'dormant';
  garden.experiments = [];
  garden.selections = [];

  const reasoner = new MockReasoner({
    EXPAND: {
      data: { candidates: [candidate('First Ranked Fruit'), candidate('Reserve Fruit')] },
      sources: [],
      rawId: 'expand_mock',
      usage: { total_tokens: 1 },
    },
  });

  const result = await pulse({ garden, reasoner, maxBreaths: 12, maxCostlyBreaths: 1 });

  assert.deepEqual(result.breaths.map((x) => x.pressure.type), ['EXPAND', 'EXPERIMENT']);
  assert.deepEqual(result.breaths.map((x) => x.costClass), ['reasoner', 'free']);
  assert.equal(result.runBudget.costlyBreathsUsed, 1);
  assert.equal(result.stoppedByCostFrontier, true);

  const first = garden.opportunities.find((x) => x.name === 'First Ranked Fruit');
  const reserve = garden.opportunities.find((x) => x.name === 'Reserve Fruit');
  assert.equal(first.status, 'needs_test');
  assert.equal(first.selectedForExperiment, true);
  assert.equal(reserve.selectionState, 'reserve');
  assert.ok(first.experimentId);
  assert.equal(classifyPressure(garden).type, 'EXECUTE_EXPERIMENT');
});

test('one web-search frontier automatically integrates and lines up the reserve sibling', async () => {
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

  assert.deepEqual(result.breaths.map((x) => x.pressure.type), [
    'EXECUTE_EXPERIMENT',
    'INTEGRATE',
    'EXPERIMENT',
  ]);
  assert.deepEqual(result.breaths.map((x) => x.costClass), ['web_search', 'free', 'free']);
  assert.equal(garden.opportunities[0].status, 'measurement_blocked');
  assert.ok(garden.opportunities[1].experimentId);
  assert.equal(classifyPressure(garden).type, 'EXECUTE_EXPERIMENT');
  assert.equal(result.stoppedByCostFrontier, true);
});

test('email DNS weakening threshold makes the branch dormant before another search', async () => {
  const garden = structuredClone(seed);
  const email = {
    ...candidate('Transactional Email Authentication Preflight API'),
    id: 'opp_a179f5e22952',
    status: 'supported',
    selectedForExperiment: true,
    selectionState: 'selected',
    experimentId: 'exp_dns',
    sources: [],
    externalEvidence: [],
    reasoningEvidence: [],
    counterEvidence: [],
  };
  garden.opportunities = [email];
  garden.experiments = [{
    id: 'exp_dns',
    opportunityId: email.id,
    status: 'result_ready',
    name: 'Direct ESP-Signaled SPF/DMARC DNS Sample',
    actionType: 'observe',
    method: 'email_auth_dns_sample',
    oneTimeCostUsd: 0,
    recurringUsd: 0,
    validationDimension: 'failure_reality',
    killCondition: 'At least eight ESP-signaled domains with zero hard failures.',
    result: {
      verdict: 'weakens',
      finding: '23 ESP-signaled domains exposed zero hard failures.',
      observations: [],
      sources: [{ title: 'DNS evidence', url: 'dns://example.com/TXT' }],
      sample: { espSignaled: 23, hardFailureDomains: 0 },
    },
  }];

  const result = await pulse({
    garden,
    reasoner: new MockReasoner(),
    maxBreaths: 12,
    maxCostlyBreaths: 0,
  });

  assert.deepEqual(result.breaths.map((x) => x.pressure.type), ['INTEGRATE']);
  assert.equal(email.status, 'dormant');
  assert.equal(email.selectedForExperiment, false);
  assert.equal(classifyPressure(garden).type, 'EXPAND');
  assert.equal(result.stoppedByCostFrontier, true);
});
