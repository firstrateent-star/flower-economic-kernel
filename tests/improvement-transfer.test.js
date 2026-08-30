import test from 'node:test';
import assert from 'node:assert/strict';
import {
  assessImprovementDividend,
  createTransferSeed,
  reconcileImprovementTransferSeeds,
} from '../src/core/improvement-transfer.js';

test('verified internal efficiency gain does not become external value by itself', () => {
  const improvement = {
    id: 'sensor_v2',
    name: 'Market gradient classifier',
    dimensions: {
      latency: { baseline: 100, after: 60, unit: 'ms', evidenceVerified: true },
      accuracy: { baseline: 0.7, after: 0.82, evidenceVerified: true },
    },
    transformation: 'Separate raw activity from broad repeating demand.',
    beneficiaryClasses: ['agent builders'],
    externalValueMeasure: 'Independent users change allocation decisions after consuming the classification.',
  };

  const assessment = assessImprovementDividend(improvement);
  assert.equal(assessment.internalState, 'internal_improvement_evidenced');
  assert.equal(assessment.transferHypothesisReady, true);
  assert.equal(assessment.shadowProbeReady, false);
  assert.equal(assessment.externalValueEvidenced, false);

  const seed = createTransferSeed(improvement);
  assert.equal(seed.status, 'hypothesis');
  assert.equal(seed.externalValueVerified, false);
});

test('regression is preserved instead of hidden by gains', () => {
  const assessment = assessImprovementDividend({
    id: 'tradeoff',
    dimensions: {
      latency: { baseline: 100, after: 50, evidenceVerified: true },
      errorRate: { baseline: 0.01, after: 0.04, evidenceVerified: true },
    },
    transformation: 'Faster classification.',
    beneficiaryClasses: ['systems'],
    externalValueMeasure: 'Measured task completion improvement.',
  });

  assert.equal(assessment.internalState, 'internal_tradeoff_evidenced');
  assert.deepEqual(assessment.improvedDimensions, ['latency']);
  assert.deepEqual(assessment.regressedDimensions, ['errorRate']);
  assert.equal(assessment.transferHypothesisReady, false);
});

test('verified outside pain can earn a reversible external shadow probe but not external value', () => {
  const improvement = {
    id: 'transfer_ready',
    dimensions: {
      energy: { baseline: 10, after: 7, unit: 'kWh-equivalent', evidenceVerified: true },
      complexityCapacity: { baseline: 4, after: 7, unit: 'decision-relevant dimensions', evidenceVerified: true },
    },
    transformation: 'Compress repeated evidence triage without dropping decision-capable distinctions.',
    beneficiaryClasses: ['agent runtimes', 'human analysts'],
    externalValueMeasure: 'Independent task completion uses fewer resources with equal-or-better decision quality.',
    externalProblemEvidence: [
      { source: 'measured_external_fixture', claim: 'The external workflow repeats the same evidence triage.', verified: true },
    ],
    outwardMaintenanceBounded: true,
    truthfulExternalClaim: true,
  };

  const assessment = assessImprovementDividend(improvement);
  assert.equal(assessment.shadowProbeReady, true);
  assert.equal(assessment.externalValueEvidenced, false);
  assert.equal(createTransferSeed(improvement).status, 'shadow_probe_ready');
});

test('external value requires explicit independent verification', () => {
  const improvement = {
    id: 'externally_evidenced',
    dimensions: {
      humanAttention: { baseline: 20, after: 5, unit: 'minutes', evidenceVerified: true },
    },
    transformation: 'Automate repetitive state reconciliation.',
    beneficiaryClasses: ['other stateful agent systems'],
    externalValueMeasure: 'Independent system reduces human intervention without decision regression.',
    externalProblemEvidence: [
      { source: 'external_system_measurement', claim: 'Repetitive reconciliation consumed human intervention.', verified: true },
    ],
    outwardMaintenanceBounded: true,
    truthfulExternalClaim: true,
    externalValueVerified: true,
  };

  const assessment = assessImprovementDividend(improvement);
  assert.equal(assessment.externalValueEvidenced, true);
  assert.equal(createTransferSeed(improvement).status, 'external_value_evidenced');
});

test('Garden reconciliation creates transfer options idempotently', () => {
  const garden = {
    internalImprovements: [{
      id: 'reuse_test',
      name: 'Reusable cache',
      dimensions: {
        recomputation: { baseline: 10, after: 2, evidenceVerified: true },
      },
      transformation: 'Avoid recomputing unchanged semantic dependencies.',
      beneficiaryClasses: ['stateful software systems'],
      externalValueMeasure: 'Independent workloads perform fewer equivalent recomputations.',
    }],
    transferSeeds: [],
  };

  const first = reconcileImprovementTransferSeeds(garden);
  const second = reconcileImprovementTransferSeeds(garden);
  assert.equal(first.changed, true);
  assert.equal(first.created.length, 1);
  assert.equal(second.changed, false);
  assert.equal(garden.transferSeeds.length, 1);
});
