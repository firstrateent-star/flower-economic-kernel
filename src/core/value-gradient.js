import { evaluateValueField } from './value-field.js';

function finiteNonNegative(value) {
  if (value === undefined || value === null || value === '') return null;
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) return null;
  return n;
}

function finiteUnit(value) {
  const n = finiteNonNegative(value);
  if (n === null || n > 1) return null;
  return n;
}

function summedKnownCost(action = {}) {
  const direct = finiteNonNegative(action.incrementalCost ?? action.marginalCost);
  if (direct !== null) return direct;

  const parts = [
    action.humanCost,
    action.computeCost,
    action.capitalCost,
    action.latencyCost,
    action.irreversibilityCost,
    action.otherCost,
  ];
  const normalized = parts.map(finiteNonNegative);
  const supplied = parts.map((value) => value !== undefined && value !== null && value !== '');
  if (!supplied.some(Boolean)) return null;
  if (normalized.some((value, index) => supplied[index] && value === null)) return null;
  return normalized.reduce((sum, value) => sum + (value ?? 0), 0);
}

/**
 * Inspect the next incremental action rather than rescoring the whole organism.
 * This is an evidence witness, not a universal utility function.
 *
 * Direct-value density and value-of-information density remain separate because an
 * information-gathering probe may have little direct terminal value while still being
 * the best next move if it can cheaply change allocation on a high-stakes decision.
 */
export function assessMarginalAction(action = {}) {
  const expectedValueDelta = finiteNonNegative(
    action.expectedValueDelta ?? action.expectedTerminalValueDelta,
  );
  const decisionChangeProbability = finiteUnit(
    action.decisionChangeProbability ?? action.probabilityOfChangingDecision,
  );
  const decisionStakes = finiteNonNegative(
    action.decisionStakes ?? action.valueAtStake,
  );
  const incrementalCost = summedKnownCost(action);
  const valueField = evaluateValueField(action);

  const directComparable = expectedValueDelta !== null
    && incrementalCost !== null
    && incrementalCost > 0;
  const informationComparable = decisionChangeProbability !== null
    && decisionStakes !== null
    && incrementalCost !== null
    && incrementalCost > 0;

  const marginalValueDensity = directComparable
    ? expectedValueDelta / incrementalCost
    : null;
  const marginalInformationDensity = informationComparable
    ? (decisionChangeProbability * decisionStakes) / incrementalCost
    : null;

  return {
    expectedValueDelta,
    decisionChangeProbability,
    decisionStakes,
    incrementalCost,
    marginalValueDensity: marginalValueDensity === null ? null : Number(marginalValueDensity.toFixed(6)),
    marginalInformationDensity: marginalInformationDensity === null ? null : Number(marginalInformationDensity.toFixed(6)),
    directComparable,
    informationComparable,
    valueField,
    promotionSafe: valueField.noVerifiedMaterialRegression,
    unknowns: {
      expectedValueDelta: expectedValueDelta === null,
      decisionChangeProbability: decisionChangeProbability === null,
      decisionStakes: decisionStakes === null,
      incrementalCost: incrementalCost === null,
    },
    epistemicBoundary:
      'Marginal densities rank only evidenced comparable next actions. Unknowns are not replaced with neutral priors, and the densities cannot average away verified material regressions in the broader value field.',
  };
}

export function compareMarginalActions(actions = []) {
  const assessed = actions.map((action) => ({
    id: action?.id ?? null,
    ...assessMarginalAction(action),
  }));

  const safe = assessed.filter((item) => item.promotionSafe);
  const informationRanked = safe
    .filter((item) => item.informationComparable)
    .sort((a, b) => b.marginalInformationDensity - a.marginalInformationDensity);
  const directRanked = safe
    .filter((item) => item.directComparable)
    .sort((a, b) => b.marginalValueDensity - a.marginalValueDensity);

  return {
    assessed,
    bestInformationActionId: informationRanked[0]?.id ?? null,
    bestDirectValueActionId: directRanked[0]?.id ?? null,
    rankingCoverage: {
      information: informationRanked.length,
      directValue: directRanked.length,
      total: assessed.length,
    },
    deterministicChoiceAuthorized: false,
    whyNoAutomaticChoice:
      'Direct value and information value are distinct local charts. A higher-level objective or action type must decide which chart governs this breath; this helper only exposes comparable gradients.',
  };
}
