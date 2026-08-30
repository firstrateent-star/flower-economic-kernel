import test from 'node:test';
import assert from 'node:assert/strict';
import {
  compareImprovementObservations,
  integrateImprovementObservation,
} from '../src/core/improvement-observatory.js';

function observation(overrides = {}) {
  return {
    workloadKey: 'stable_fixture',
    workloadVersion: 1,
    implementationKey: 'before',
    dimensions: {
      latency: { value: 100, unit: 'ms', direction: 'lower', evidenceVerified: true },
      accuracy: { value: 1, unit: 'fixture-pass-rate', direction: 'higher', evidenceVerified: true },
    },
    decisionWitness: {
      verified: true,
      taskKey: 'stable_fixture_decision',
      resultFingerprint: 'same-decision',
    },
    ...overrides,
  };
}

test('different workloads cannot self-promote into an improvement', () => {
  const baseline = observation();
  const after = observation({
    workloadKey: 'different_fixture',
    implementationKey: 'after',
    dimensions: {
      latency: { value: 20, unit: 'ms', direction: 'lower', evidenceVerified: true },
      accuracy: { value: 1, unit: 'fixture-pass-rate', direction: 'higher', evidenceVerified: true },
    },
  });
  const comparison = compareImprovementObservations(baseline, after);
  assert.equal(comparison.comparisonValid, false);
  assert.equal(comparison.sameWorkload, false);
  assert.equal(comparison.assessment.internalState, 'internal_improvement_unverified');
});

test('verified decision-equivalent resource reduction can become an evidenced internal improvement', () => {
  const baseline = observation();
  const after = observation({
    implementationKey: 'after',
    dimensions: {
      latency: { value: 60, unit: 'ms', direction: 'lower', evidenceVerified: true },
      accuracy: { value: 1, unit: 'fixture-pass-rate', direction: 'higher', evidenceVerified: true },
    },
  });
  const comparison = compareImprovementObservations(baseline, after);
  assert.equal(comparison.comparisonValid, true);
  assert.equal(comparison.witness.mode, 'verified_decision_equivalence');
  assert.equal(comparison.assessment.internalState, 'internal_improvement_evidenced');
  assert.deepEqual(comparison.assessment.improvedDimensions, ['latency']);
});

test('a regression remains visible and blocks Pareto improvement promotion', () => {
  const baseline = observation();
  const after = observation({
    implementationKey: 'after',
    dimensions: {
      latency: { value: 60, unit: 'ms', direction: 'lower', evidenceVerified: true },
      accuracy: { value: 0.8, unit: 'fixture-pass-rate', direction: 'higher', evidenceVerified: true },
    },
  });
  const comparison = compareImprovementObservations(baseline, after);
  assert.equal(comparison.comparisonValid, true);
  assert.equal(comparison.assessment.internalState, 'internal_tradeoff_evidenced');
  assert.deepEqual(comparison.assessment.regressedDimensions, ['accuracy']);
});

test('observatory records baseline then promotes only a comparable Pareto improvement', () => {
  const garden = {};
  const first = integrateImprovementObservation(garden, observation());
  assert.equal(first.state, 'baseline_recorded');
  assert.equal(garden.internalImprovements.length, 0);

  const second = integrateImprovementObservation(garden, observation({
    implementationKey: 'after',
    dimensions: {
      latency: { value: 70, unit: 'ms', direction: 'lower', evidenceVerified: true },
      accuracy: { value: 1, unit: 'fixture-pass-rate', direction: 'higher', evidenceVerified: true },
    },
  }));
  assert.equal(second.state, 'internal_improvement_evidenced');
  assert.equal(garden.internalImprovements.length, 1);
  assert.equal(garden.internalImprovements[0].comparisonVerified, true);
});

test('same observation integrates idempotently', () => {
  const garden = {};
  const item = observation();
  const first = integrateImprovementObservation(garden, item);
  const second = integrateImprovementObservation(garden, item);
  assert.equal(first.changed, true);
  assert.equal(second.changed, false);
  assert.equal(garden.improvementObservations.length, 1);
});
