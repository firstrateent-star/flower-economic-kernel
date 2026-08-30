import test from 'node:test';
import assert from 'node:assert/strict';
import seed from './fixtures/test-seed.js';
import { pulse } from '../src/core/kernel.js';
import { MockReasoner } from '../src/reasoners/mock.js';

function exhaustedGarden() {
  const garden = structuredClone(seed);
  for (const opp of garden.opportunities) {
    opp.status = 'measurement_blocked';
    opp.experimentId = null;
    opp.selectedForExperiment = false;
  }
  return garden;
}

function baseCandidate(overrides = {}) {
  return {
    name: 'Evidence First Guard',
    thesis: 'A public machine-mediated workflow exposes a recurring resolvable state failure.',
    moneyFlow: 'Self-serve API checks paid per use.',
    buyer: 'Automation operators.',
    nutrientChannel: 'API marketplace.',
    passivity: 'Automatic fulfillment.',
    autonomyCompatibility: 'Read-only validation and deterministic output.',
    reproductivePotential: 'Reuses Flower validation infrastructure.',
    realityAccess: 'Concrete public support cases and buyer pages are searchable with current web_search.',
    cheapestRealityTest: 'Search exact public failure reports and buyer signals; reject if failure provenance does not recur.',
    inheritedInfrastructure: 'Bounded web-search experiment and validation gate.',
    whyNow: 'Machine workflows increasingly depend on brittle external state.',
    failureArchetype: 'representation_state_mismatch',
    reusableCapability: 'cross_source_state_comparator',
    resolutionPrimitive: 'compare declared state with independently observable state and return fail-closed evidence',
    geometryReuse: 'Extends representation-comparison geometry while preserving a distinct nutrient channel.',
    failureEvidence: [
      { url: 'https://one.example/failure-a', claim: 'Concrete failure A.' },
      { url: 'https://two.example/failure-b', claim: 'Concrete failure B.' },
      { url: 'https://one.example/failure-c', claim: 'Concrete failure C.' },
    ],
    buyerEvidence: [],
    ...overrides,
  };
}

test('failure-only evidence-bearing expansion earns failure reality then authorizes buyer demand for the next frontier', async () => {
  const garden = exhaustedGarden();
  const candidate = baseCandidate();
  const reasoner = new MockReasoner({
    EXPAND: {
      data: { candidates: [candidate] },
      sources: [
        { title: 'Failure A', url: 'https://one.example/failure-a' },
        { title: 'Failure B', url: 'https://two.example/failure-b' },
        { title: 'Failure C', url: 'https://one.example/failure-c' },
      ],
      rawId: 'mock_expand_web',
      usage: { input_tokens: 1, output_tokens: 1 },
    },
  });

  const result = await pulse({ garden, reasoner, maxBreaths: 2, maxCostlyBreaths: 1 });
  const opp = garden.opportunities.find((x) => x.name === candidate.name);
  assert.ok(opp);
  assert.equal(opp.status, 'supported');
  const scout = garden.experiments.find((x) => x.opportunityId === opp.id && x.method === 'evidence_bearing_expand_v2' && x.validationDimension === 'failure_reality');
  assert.ok(scout);
  assert.equal(scout.status, 'integrated');
  assert.equal(scout.result.sources.length, 3);
  const buyer = garden.experiments.find((x) => x.opportunityId === opp.id && x.status === 'authorized');
  assert.ok(buyer);
  assert.equal(buyer.validationDimension, 'buyer_demand');
  assert.equal(result.breaths.length, 2);
});

test('one evidence-bearing frontier may validate both dimensions when provenance is separately mapped', async () => {
  const garden = exhaustedGarden();
  const candidate = baseCandidate({
    buyerEvidence: [
      { url: 'https://market.example/product', claim: 'Comparable paid product has public pricing.' },
      { url: 'https://buyers.example/request', claim: 'Buyer explicitly seeks this class of resolution.' },
    ],
  });
  const reasoner = new MockReasoner({
    EXPAND: {
      data: { candidates: [candidate] },
      sources: [
        { title: 'Failure A', url: 'https://one.example/failure-a' },
        { title: 'Failure B', url: 'https://two.example/failure-b' },
        { title: 'Failure C', url: 'https://one.example/failure-c' },
        { title: 'Paid product', url: 'https://market.example/product' },
        { title: 'Buyer request', url: 'https://buyers.example/request' },
      ],
      rawId: 'mock_overlap_frontier',
      usage: { input_tokens: 1, output_tokens: 1 },
    },
  });

  const result = await pulse({ garden, reasoner, maxBreaths: 12, maxCostlyBreaths: 1 });
  const opp = garden.opportunities.find((x) => x.name === candidate.name);
  assert.ok(opp);
  assert.equal(opp.status, 'validated');
  assert.equal(opp.validationGate.pass, true);
  assert.deepEqual(new Set(opp.validationGate.dimensions), new Set(['failure_reality', 'buyer_demand']));
  assert.equal(garden.experiments.filter((x) => x.opportunityId === opp.id && x.method === 'evidence_bearing_expand_v2').length, 2);
  assert.equal(result.breaths.length, 1);
  assert.equal(result.stoppedByCostFrontier, true);
});

test('retrieved pages do not count when candidate evidence does not map to exact consulted URLs', async () => {
  const garden = exhaustedGarden();
  const candidate = baseCandidate({
    failureEvidence: [
      { url: 'https://not-retrieved.example/a', claim: 'Unmapped claim.' },
      { url: 'https://not-retrieved.example/b', claim: 'Unmapped claim.' },
      { url: 'https://not-retrieved.example/c', claim: 'Unmapped claim.' },
    ],
  });
  const reasoner = new MockReasoner({
    EXPAND: {
      data: { candidates: [candidate] },
      sources: [
        { title: 'Generic A', url: 'https://one.example/generic' },
        { title: 'Generic B', url: 'https://two.example/generic' },
        { title: 'Generic C', url: 'https://three.example/generic' },
      ],
      rawId: 'mock_unmapped',
    },
  });

  const before = garden.opportunities.length;
  const result = await pulse({ garden, reasoner, maxBreaths: 12, maxCostlyBreaths: 1 });
  assert.equal(garden.opportunities.length, before);
  assert.equal(result.breaths.length, 1);
  assert.ok((garden.scoutMisses ?? []).length > 0);
  assert.match(garden.scoutMisses.at(-1).reason, /mapping/i);
});

test('an empty expansion is preserved as a scout miss rather than forcing a candidate', async () => {
  const garden = exhaustedGarden();
  const reasoner = new MockReasoner({
    EXPAND: {
      data: { candidates: [] },
      sources: [],
      rawId: 'mock_empty_scout',
    },
  });

  const before = garden.opportunities.length;
  const result = await pulse({ garden, reasoner, maxBreaths: 12, maxCostlyBreaths: 1 });
  assert.equal(garden.opportunities.length, before);
  assert.equal(result.breaths.length, 1);
  assert.equal((garden.scoutMisses ?? []).length, 1);
  assert.match(result.breaths[0].result.summary, /no candidate/i);
});
