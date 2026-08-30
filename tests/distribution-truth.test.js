import test from 'node:test';
import assert from 'node:assert/strict';
import seed from '../garden/seed.json' with { type: 'json' };
import { reconcileDistributionTruth } from '../src/core/distribution-truth.js';

test('verified agentic sidecar clears stale eligibility uncertainty without inventing demand', () => {
  const garden = structuredClone(seed);
  const fruit = garden.fruits.find((x) => x.id === 'fruit_social_preview_drift_guard');
  fruit.distributionState = {
    rails: {
      apifyAgenticPayments: { state: 'eligible' },
    },
    truthLadder: {
      independentUserTruth: 'unresolved',
      creatorRevenueTruth: '0_confirmed',
      repeatDemandTruth: 'unresolved',
    },
  };

  const result = reconcileDistributionTruth(garden);
  assert.equal(fruit.agenticPaymentEligible, true);
  assert.equal(fruit.distributionRails.apifyAgenticPayments, 'eligible');
  assert.deepEqual(fruit.unresolvedAgenticTruth, []);
  assert.equal(fruit.creatorRevenueUsd, 0);
  assert.equal(fruit.externalUsage, 'unresolved');
  assert.equal(fruit.repeatDemand, undefined);
  assert.ok(result.changes.includes(`${fruit.id}:agentic_payment_eligible`));

  const kyc = garden.humanActuationQueue.find((x) => x.organismId === fruit.id && /KYC/i.test(x.action));
  assert.equal(kyc.state, 'resolved_by_platform_truth');
});

test('distribution projection only promotes independent usage and repeat demand when explicitly confirmed', () => {
  const garden = structuredClone(seed);
  const fruit = garden.fruits.find((x) => x.id === 'fruit_social_preview_drift_guard');
  fruit.distributionState = {
    truthLadder: {
      independentUserTruth: true,
      creatorRevenueTruth: 2.5,
      repeatDemandTruth: 'confirmed',
    },
  };

  reconcileDistributionTruth(garden);
  assert.equal(fruit.externalUsage, 'independent_confirmed');
  assert.equal(fruit.creatorRevenueUsd, 2.5);
  assert.equal(fruit.repeatDemand, true);
});
