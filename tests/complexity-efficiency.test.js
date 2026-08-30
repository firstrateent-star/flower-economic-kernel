import test from 'node:test';
import assert from 'node:assert/strict';
import seed from './fixtures/test-seed.js';
import { pulse } from '../src/core/kernel.js';
import { MockReasoner } from '../src/reasoners/mock.js';

test('one pulse closes more than twelve deterministic integrations without crossing a costly frontier', async () => {
  const garden = structuredClone(seed);
  garden.events = [];
  garden.approvals = [];
  garden.fruits = [];
  garden.humanActuationQueue = [];
  garden.opportunities = [];
  garden.experiments = [];

  for (let i = 0; i < 20; i += 1) {
    const oppId = `opp_free_closure_${i}`;
    const expId = `exp_free_closure_${i}`;
    garden.opportunities.push({
      id: oppId,
      name: `Free closure ${i}`,
      status: 'needs_test',
      thesis: 'Synthetic deterministic integration chain for closure testing.',
      experimentId: expId,
      selectedForExperiment: false,
    });
    garden.experiments.push({
      id: expId,
      opportunityId: oppId,
      status: 'result_ready',
      name: `Synthetic result ${i}`,
      actionType: 'web_search',
      method: 'bounded_public_web_search_v1',
      validationDimension: 'failure_reality',
      result: {
        verdict: 'supports',
        finding: `Synthetic external support ${i}.`,
        sources: [{ title: `source ${i}`, url: `https://evidence-${i}.example/failure` }],
      },
    });
  }

  const result = await pulse({
    garden,
    reasoner: new MockReasoner(),
    maxCostlyBreaths: 0,
    syncManifests: false,
  });

  assert.equal(result.runBudget.maxBreaths, 64);
  assert.equal(result.breaths.length, 20);
  assert.ok(result.breaths.every((step) => step.pressure.type === 'INTEGRATE'));
  assert.ok(garden.experiments.every((exp) => exp.status === 'integrated'));
  assert.equal(result.stoppedByCostFrontier, true);
  assert.equal(result.stoppedBySafetyCeiling, false);
});
