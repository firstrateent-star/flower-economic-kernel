import test from 'node:test';
import assert from 'node:assert/strict';
import seed from '../garden/seed.json' with { type: 'json' };
import { pulse } from '../src/core/kernel.js';
import { MockReasoner } from '../src/reasoners/mock.js';

test('pulse falsifies current seed and reaches an experiment proposal without human choosing the next operation', async () => {
  const garden = structuredClone(seed);
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
    },
    EXPERIMENT: {
      data: {
        experiment: {
          name: 'Random-sample pointer disagreement test',
          tests: 'Measure whether website attribution errors occur at a meaningful base rate.',
          actionType: 'sandbox',
          oneTimeCostUsd: 0,
          recurringUsd: 0,
          successCondition: 'Non-trivial multi-signal mismatch rate.',
          killCondition: 'Errors are vanishingly rare or reducible to a trivial single check.'
        }
      },
      sources: [],
      rawId: 'mock_experiment'
    }
  });

  const result = await pulse({ garden, reasoner, maxBreaths: 2 });
  assert.equal(result.breaths[0].pressure.type, 'FALSIFY');
  assert.equal(result.breaths[1].pressure.type, 'EXPERIMENT');
  assert.equal(garden.opportunities[0].status, 'supported');
  assert.equal(garden.experiments[0].status, 'authorized');
});
