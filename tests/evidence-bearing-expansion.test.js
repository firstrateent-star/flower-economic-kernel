import test from 'node:test';
import assert from 'node:assert/strict';
import seed from '../garden/seed.json' with { type: 'json' };
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

const candidate = {
  name: 'Evidence First Guard',
  thesis: 'A public machine-mediated workflow exposes a recurring resolvable state failure.',
  moneyFlow: 'Self-serve API checks paid per use.',
  buyer: 'Automation operators.',
  nutrientChannel: 'API marketplace.',
  passivity: 'Automatic fulfillment.',
  autonomyCompatibility: 'Read-only validation and deterministic output.',
  reproductivePotential: 'Reuses Flower validation infrastructure.',
  realityAccess: 'Concrete public support cases and incident records are searchable with current web_search.',
  cheapestRealityTest: 'Search exact public failure reports and kill if concrete cases do not recur.',
  inheritedInfrastructure: 'Bounded web-search experiment and validation gate.',
  whyNow: 'Machine workflows increasingly depend on brittle external state.',
};

test('evidence-bearing expansion earns failure reality then authorizes buyer demand without another failure search', async () => {
  const garden = exhaustedGarden();
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
  const scout = garden.experiments.find((x) => x.opportunityId === opp.id && x.method === 'evidence_bearing_expand_v1');
  assert.ok(scout);
  assert.equal(scout.status, 'integrated');
  assert.equal(scout.validationDimension, 'failure_reality');
  const buyer = garden.experiments.find((x) => x.opportunityId === opp.id && x.status === 'authorized');
  assert.ok(buyer);
  assert.equal(buyer.validationDimension, 'buyer_demand');
  assert.equal(result.breaths.length, 2);
});

test('expansion admits no opportunity when failure evidence lacks independent external support', async () => {
  const garden = exhaustedGarden();
  const reasoner = new MockReasoner({
    EXPAND: {
      data: { candidates: [candidate] },
      sources: [{ title: 'Only one source', url: 'https://one.example/failure' }],
      rawId: 'mock_expand_weak',
    },
  });

  const before = garden.opportunities.length;
  const result = await pulse({ garden, reasoner, maxBreaths: 12, maxCostlyBreaths: 1 });
  assert.equal(garden.opportunities.length, before);
  assert.equal(result.breaths.length, 1);
  assert.match(result.breaths[0].result.summary, /admitted no candidate/i);
});
