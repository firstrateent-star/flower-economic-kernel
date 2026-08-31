function bool(value) {
  return value === true;
}

function named(value) {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;
}

/**
 * Shadow-only residency gate for methodology ideas/rules.
 * It does not decide truth. It decides whether a candidate deserves recurring hot attention.
 */
export function assessMethodologyResidency(candidate = {}) {
  const affectedDecision = named(candidate.affectedDecision);
  const canChangeDecision = bool(candidate.canChangeDecision);
  const newEvidence = bool(candidate.newEvidence);
  const unresolvedDecision = bool(candidate.unresolvedDecision);
  const duplicateDecisionEffect = bool(candidate.duplicateDecisionEffect);
  const distinctProvenanceWorthPreserving = candidate.distinctProvenanceWorthPreserving !== false;
  const protectedUnknown = bool(candidate.protectedUnknown);
  const recurringActivationNeeded = bool(candidate.recurringActivationNeeded);
  const internalDividendPath = bool(candidate.internalDividendPath);
  const externalDividendPath = bool(candidate.externalDividendPath);
  const centerDividendPath = bool(candidate.centerDividendPath);
  const measurableFalsifier = bool(candidate.measurableFalsifier);

  const anyDividendPath = internalDividendPath || externalDividendPath || centerDividendPath;
  const decisionRelevant = affectedDecision !== null && canChangeDecision;
  const evidencePressure = newEvidence || unresolvedDecision || protectedUnknown;

  let residency = 'REST';
  let reason = 'No decision-changing or evidence-changing pressure was demonstrated.';

  if (duplicateDecisionEffect) {
    residency = 'MERGE_CANDIDATE';
    reason = 'The candidate appears decision-equivalent to existing methodology; consolidate execution while preserving provenance if useful.';
  } else if (decisionRelevant && evidencePressure && measurableFalsifier && anyDividendPath) {
    residency = recurringActivationNeeded ? 'HOT_CANDIDATE' : 'COLD_REFERENCE';
    reason = recurringActivationNeeded
      ? 'The candidate can change a governed decision under active evidence pressure and has a falsifiable dividend path.'
      : 'The candidate is decision-relevant but does not require recurring activation; preserve it cold and wake on dependency change.';
  } else if (decisionRelevant || evidencePressure || anyDividendPath) {
    residency = 'COLD_REFERENCE';
    reason = 'The candidate may matter, but current evidence does not justify recurring hot execution.';
  }

  return {
    residency,
    reason,
    affectedDecision,
    decisionRelevant,
    evidencePressure,
    anyDividendPath,
    dividendPaths: {
      internal: internalDividendPath,
      external: externalDividendPath,
      center: centerDividendPath,
    },
    duplicateDecisionEffect,
    distinctProvenanceWorthPreserving,
    protectedUnknown,
    recurringActivationNeeded,
    measurableFalsifier,
    canonicalPromotionAuthorized: false,
    epistemicBoundary:
      'Residency is not truth. A correct or beautiful idea may remain cold if it does not need recurring execution. Merge means consolidate execution, not erase ancestry. HOT_CANDIDATE still requires canonical mutation governance before promotion.',
  };
}

/**
 * Shadow-only gate for whether another methodology recursion is justified right now.
 */
export function assessMethodologyRecursion(state = {}) {
  const materialRealityChange = bool(state.materialRealityChange);
  const newMethodEvidence = bool(state.newMethodEvidence);
  const unresolvedGovernedDecision = bool(state.unresolvedGovernedDecision);
  const expectedDecisionChange = bool(state.expectedDecisionChange);
  const centerDividendOpportunity = bool(state.centerDividendOpportunity);
  const externalDividendOpportunity = bool(state.externalDividendOpportunity);
  const internalImprovementOpportunity = bool(state.internalImprovementOpportunity);
  const actionAvailableNow = bool(state.actionAvailableNow);
  const actionExpectedValueExceedsRecursion = bool(state.actionExpectedValueExceedsRecursion);
  const conceptualNoveltyOnly = bool(state.conceptualNoveltyOnly);

  if (actionAvailableNow && actionExpectedValueExceedsRecursion) {
    return {
      recommendation: 'ACT',
      reason: 'A safe available action has greater expected terminal value than another methodology recursion.',
      authority: 'shadow_only',
    };
  }

  const pressure = materialRealityChange
    || newMethodEvidence
    || unresolvedGovernedDecision
    || expectedDecisionChange
    || centerDividendOpportunity
    || externalDividendOpportunity
    || internalImprovementOpportunity;

  if (!pressure || conceptualNoveltyOnly) {
    return {
      recommendation: 'REST',
      reason: conceptualNoveltyOnly
        ? 'Conceptual novelty without a decision/evidence/dividend path does not earn another recursive frontier.'
        : 'No material methodology pressure is present.',
      authority: 'shadow_only',
    };
  }

  return {
    recommendation: 'RECURSE',
    reason: 'At least one decision-changing, evidence-changing, or dividend-producing methodology pressure remains live.',
    authority: 'shadow_only',
  };
}

export function methodologyAttentionAudit({ candidates = [], recursion = {} } = {}) {
  const assessed = candidates.map(assessMethodologyResidency);
  return {
    recursion: assessMethodologyRecursion(recursion),
    assessed,
    counts: assessed.reduce((acc, item) => {
      acc[item.residency] = (acc[item.residency] ?? 0) + 1;
      return acc;
    }, {}),
    canonicalPromotionAuthorized: false,
  };
}
