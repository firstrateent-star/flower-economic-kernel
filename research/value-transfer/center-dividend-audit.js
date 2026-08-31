function finite(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function normalizeEvidence(item = {}) {
  return {
    dimension: typeof item.dimension === 'string' ? item.dimension : null,
    before: finite(item.before),
    after: finite(item.after),
    direction: item.direction === 'lower' || item.direction === 'higher' ? item.direction : null,
    unit: typeof item.unit === 'string' ? item.unit : null,
    verified: item.verified === true,
    source: typeof item.source === 'string' ? item.source : null,
    note: typeof item.note === 'string' ? item.note : null,
  };
}

function assessNumericChange(item) {
  if (!item.verified || item.before === null || item.after === null || !item.direction) return 'unverified';
  if (item.before === item.after) return 'unchanged';
  if (item.direction === 'lower') return item.after < item.before ? 'improved' : 'regressed';
  return item.after > item.before ? 'improved' : 'regressed';
}

/**
 * Shadow-only audit of whether Flower is nourishing the human Center-holder.
 * It intentionally refuses a single life score. Evidence remains dimension-specific.
 */
export function assessCenterDividend(observation = {}) {
  const numeric = (observation.numericEvidence ?? []).map(normalizeEvidence).map((item) => ({
    ...item,
    state: assessNumericChange(item),
  }));

  const selfReported = (observation.selfReportedEvidence ?? []).map((item = {}) => ({
    dimension: typeof item.dimension === 'string' ? item.dimension : null,
    state: ['improved', 'regressed', 'unchanged', 'mixed'].includes(item.state) ? item.state : 'unverified',
    verifiedByCenterHolder: item.verifiedByCenterHolder === true,
    note: typeof item.note === 'string' ? item.note : null,
  }));

  const verifiedNumeric = numeric.filter((item) => item.state !== 'unverified');
  const verifiedSelfReported = selfReported.filter((item) => item.verifiedByCenterHolder && item.state !== 'unverified');
  const allVerified = [...verifiedNumeric, ...verifiedSelfReported];

  const improvedDimensions = allVerified.filter((item) => item.state === 'improved').map((item) => item.dimension);
  const regressedDimensions = allVerified.filter((item) => item.state === 'regressed').map((item) => item.dimension);
  const mixedDimensions = allVerified.filter((item) => item.state === 'mixed').map((item) => item.dimension);

  let state = 'center_dividend_unverified';
  if (allVerified.length > 0 && improvedDimensions.length === 0 && regressedDimensions.length === 0 && mixedDimensions.length === 0) {
    state = 'center_dividend_no_observed_change';
  }
  if (improvedDimensions.length > 0 && regressedDimensions.length === 0 && mixedDimensions.length === 0) {
    state = 'center_dividend_evidenced';
  }
  if (regressedDimensions.length > 0 || mixedDimensions.length > 0) {
    state = improvedDimensions.length > 0 ? 'center_dividend_tradeoff_evidenced' : 'center_burden_evidenced';
  }

  return {
    state,
    dimensions: {
      humanAttention: 'time, prompting, interruptions, coordination, or cognitive load borne by the Center-holder',
      decisionQuality: 'clarity, correctness, prioritization, or avoidance of bad commitments',
      completionClosure: 'movement from unresolved obligations toward finished or intentionally killed/rested states',
      financialUtility: 'settled money, costs avoided, financially useful decisions, or protected downside; projected value is not settled value',
      capabilityOptionality: 'new reusable capability, freedom, leverage, or preserved future choices',
      meaningWellbeing: 'self-reported meaning, confidence, calm, connection, motivation, or other lived experience; never inferred from system activity',
    },
    numericEvidence: numeric,
    selfReportedEvidence: selfReported,
    improvedDimensions,
    regressedDimensions,
    mixedDimensions,
    score: null,
    authority: 'shadow_only',
    epistemicBoundary:
      'Flower may measure observable burden and outcomes, but it may not infer a person\'s wellbeing, identity, love, meaning, or fulfillment from proxy activity. Those dimensions require explicit Center-holder testimony. No single life score is authorized.',
  };
}

export function compareCenterDividendSnapshots(before = {}, after = {}) {
  return {
    comparable: before?.observationKey != null && before.observationKey === after?.observationKey,
    sameObservationKey: before?.observationKey ?? null,
    before: assessCenterDividend(before),
    after: assessCenterDividend(after),
    canonicalPromotionAuthorized: false,
  };
}
