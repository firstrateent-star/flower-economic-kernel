export const PHI = (1 + Math.sqrt(5)) / 2;
export const TAU = 1 / PHI;

function finite(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

export function fibonacci(n) {
  const k = Math.trunc(Number(n));
  if (!Number.isFinite(k) || k < 0) return null;
  let a = 0;
  let b = 1;
  for (let i = 0; i < k; i += 1) [a, b] = [b, a + b];
  return a;
}

/**
 * Eligibility membrane for invoking phi/Fibonacci as optimization authority.
 * Geometry alone is never sufficient. These methods earn authority only for a
 * bounded 1-D search whose objective is evidenced/assumed unimodal over the bracket.
 */
export function assessPhiSearchEligibility(problem = {}) {
  const dimensionCount = finite(problem.dimensionCount);
  const bounded = finite(problem.lowerBound) !== null && finite(problem.upperBound) !== null
    && Number(problem.upperBound) > Number(problem.lowerBound);
  const objectiveObservable = problem.objectiveObservable === true;
  const unimodalityStatus = ['verified', 'supported'].includes(problem.unimodalityStatus)
    ? problem.unimodalityStatus
    : (problem.unimodalityStatus === 'assumed' ? 'assumed' : 'unknown');
  const evaluationCostMeaningful = problem.evaluationCostMeaningful === true;
  const eligible = dimensionCount === 1
    && bounded
    && objectiveObservable
    && evaluationCostMeaningful
    && ['verified', 'supported'].includes(unimodalityStatus);

  return {
    eligible,
    dimensionCount,
    bounded,
    objectiveObservable,
    unimodalityStatus,
    evaluationCostMeaningful,
    authority: eligible ? 'bounded_search_candidate' : 'no_optimization_authority',
    originBoundary: 'Phi/Fibonacci may generate or structure a probe, but sacred geometry is not evidence and the golden ratio is not a universal allocation constant.',
  };
}

export function goldenSectionBracket({ lowerBound, upperBound } = {}) {
  const a = finite(lowerBound);
  const b = finite(upperBound);
  if (a === null || b === null || !(b > a)) return null;
  const width = b - a;
  return {
    lowerBound: a,
    upperBound: b,
    leftProbe: b - TAU * width,
    rightProbe: a + TAU * width,
    retainedFractionPerStep: TAU,
    discardedFractionPerStep: 1 - TAU,
    reusableEvaluationProperty: true,
  };
}

/**
 * Finite-budget Fibonacci schedule. The theoretical finite-horizon advantage only
 * applies when the number of evaluations is fixed in advance and the 1-D objective
 * satisfies the same bracketing/unimodality assumptions.
 */
export function fibonacciSearchPlan({ lowerBound, upperBound, maxEvaluations } = {}) {
  const a = finite(lowerBound);
  const b = finite(upperBound);
  const n = Math.trunc(Number(maxEvaluations));
  if (a === null || b === null || !(b > a) || !Number.isFinite(n) || n < 3) return null;

  const fN = fibonacci(n);
  const fNm1 = fibonacci(n - 1);
  const fNm2 = fibonacci(n - 2);
  const width = b - a;
  return {
    lowerBound: a,
    upperBound: b,
    maxEvaluations: n,
    fibonacciN: fN,
    firstProbe: a + (fNm2 / fN) * width,
    secondProbe: a + (fNm1 / fN) * width,
    worstCaseFinalIntervalFractionApprox: 1 / fN,
    finiteBudget: true,
  };
}

/**
 * Maps mathematically earned phi/Fibonacci uses into the two active Flower layers.
 */
export function assessFlowerPhiFibonacciUse(problem = {}) {
  const eligibility = assessPhiSearchEligibility(problem);
  const fixedBudget = Number.isFinite(Number(problem.maxEvaluations)) && Number(problem.maxEvaluations) >= 3;

  if (!eligibility.eligible) {
    return {
      eligibility,
      methodologyUse: 'provenance_or_heuristic_only',
      runtimeUse: 'do_not_route_by_phi_or_fibonacci',
      recommendedMethod: 'ordinary_evidence_gated_search_or_other_optimizer',
      canonicalPromotionAuthorized: false,
    };
  }

  return {
    eligibility,
    methodologyUse: 'reuse_preserving_interval_narrowing_for_bounded_scalar_questions',
    runtimeUse: fixedBudget ? 'fibonacci_search_candidate' : 'golden_section_search_candidate',
    recommendedMethod: fixedBudget ? 'fibonacci' : 'golden_section',
    canonicalPromotionAuthorized: false,
    examplesWorthTesting: [
      'reasoning-effort or threshold tuning on a fixed replay suite when a scalar protected objective is unimodal',
      'cache/projection split-point tuning when effective cost is observable and quality is held above a protected floor',
      'single-parameter timeout, payload, or confidence threshold tuning with expensive evaluations',
    ],
    antiUses: [
      'portfolio weights',
      'human-value tradeoffs',
      'multi-objective flourishing scalarization',
      'breadth/depth ratios without measured unimodality',
      'economic allocation merely because 0.618 is aesthetically linked to Flower of Life',
    ],
  };
}
