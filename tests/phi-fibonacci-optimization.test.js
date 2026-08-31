import test from 'node:test';
import assert from 'node:assert/strict';
import {
  PHI,
  TAU,
  fibonacci,
  assessPhiSearchEligibility,
  goldenSectionBracket,
  fibonacciSearchPlan,
  assessFlowerPhiFibonacciUse,
} from '../research/methodology/phi-fibonacci-optimization.js';

test('phi identities are numerically consistent', () => {
  assert.ok(Math.abs(PHI * TAU - 1) < 1e-12);
  assert.ok(Math.abs(PHI * PHI - (PHI + 1)) < 1e-12);
});

test('golden-section bracket reuses one evaluation geometry', () => {
  const bracket = goldenSectionBracket({ lowerBound: 0, upperBound: 10 });
  assert.ok(bracket.leftProbe > 0 && bracket.leftProbe < bracket.rightProbe);
  assert.ok(bracket.rightProbe < 10);
  assert.ok(Math.abs(bracket.retainedFractionPerStep - TAU) < 1e-12);
  assert.equal(bracket.reusableEvaluationProperty, true);
});

test('Fibonacci plan reflects finite evaluation budget', () => {
  assert.equal(fibonacci(10), 55);
  const plan = fibonacciSearchPlan({ lowerBound: 0, upperBound: 1, maxEvaluations: 10 });
  assert.equal(plan.fibonacciN, 55);
  assert.ok(plan.firstProbe < plan.secondProbe);
  assert.ok(Math.abs(plan.worstCaseFinalIntervalFractionApprox - 1 / 55) < 1e-12);
});

test('phi receives no optimization authority for multi-dimensional or unknown-shape problems', () => {
  const result = assessPhiSearchEligibility({
    dimensionCount: 4,
    lowerBound: 0,
    upperBound: 1,
    objectiveObservable: true,
    evaluationCostMeaningful: true,
    unimodalityStatus: 'verified',
  });
  assert.equal(result.eligible, false);
  assert.equal(result.authority, 'no_optimization_authority');
});

test('unverified unimodality does not earn golden-ratio routing', () => {
  const use = assessFlowerPhiFibonacciUse({
    dimensionCount: 1,
    lowerBound: 0,
    upperBound: 1,
    objectiveObservable: true,
    evaluationCostMeaningful: true,
    unimodalityStatus: 'assumed',
  });
  assert.equal(use.runtimeUse, 'do_not_route_by_phi_or_fibonacci');
  assert.equal(use.canonicalPromotionAuthorized, false);
});

test('fixed finite budget selects Fibonacci only after eligibility is earned', () => {
  const use = assessFlowerPhiFibonacciUse({
    dimensionCount: 1,
    lowerBound: 0,
    upperBound: 1,
    objectiveObservable: true,
    evaluationCostMeaningful: true,
    unimodalityStatus: 'supported',
    maxEvaluations: 8,
  });
  assert.equal(use.recommendedMethod, 'fibonacci');
  assert.equal(use.runtimeUse, 'fibonacci_search_candidate');
  assert.equal(use.canonicalPromotionAuthorized, false);
});

test('open-ended eligible scalar search selects golden-section candidate', () => {
  const use = assessFlowerPhiFibonacciUse({
    dimensionCount: 1,
    lowerBound: 0,
    upperBound: 1,
    objectiveObservable: true,
    evaluationCostMeaningful: true,
    unimodalityStatus: 'verified',
  });
  assert.equal(use.recommendedMethod, 'golden_section');
  assert.equal(use.runtimeUse, 'golden_section_search_candidate');
});
