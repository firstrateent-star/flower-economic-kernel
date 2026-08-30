const DAY_MS = 24 * 60 * 60 * 1000;

// These are revalidation-pressure defaults, not truth-expiration dates. Structural
// claims are event-driven: age alone never deletes or invalidates them. Market/platform
// claims receive soft currentness windows only when a consequential decision depends on
// them. The evidence itself is always retained.
export const EVIDENCE_FRESHNESS_PROFILES = {
  failure_reality: {
    volatility: 'structural',
    mode: 'event_driven',
    softWindowDays: null,
  },
  resolution_complexity: {
    volatility: 'structural',
    mode: 'event_driven',
    softWindowDays: null,
  },
  buyer_demand: {
    volatility: 'market',
    mode: 'soft_window',
    softWindowDays: 90,
  },
  willingness_to_pay: {
    volatility: 'market',
    mode: 'soft_window',
    softWindowDays: 60,
  },
  distribution_access: {
    volatility: 'platform',
    mode: 'soft_window',
    softWindowDays: 30,
  },
};

function parseTime(value) {
  if (!value) return null;
  const time = Date.parse(value);
  return Number.isFinite(time) ? time : null;
}

function observationTime(exp) {
  return exp.integratedAt ?? exp.executedAt ?? exp.createdAt ?? null;
}

function uniqueSourceUrls(experiments) {
  return [...new Set(experiments.flatMap((exp) => exp.result?.sources ?? [])
    .map((source) => source?.url)
    .filter(Boolean))];
}

function latestTime(values) {
  const valid = values.map(parseTime).filter((value) => value != null);
  if (valid.length === 0) return null;
  return new Date(Math.max(...valid)).toISOString();
}

function decisionRequiresCurrentness(decisionClass) {
  return ['public_or_spend', 'human_sovereignty', 'market_commitment'].includes(decisionClass);
}

export function assessEvidenceFreshness({
  dimension,
  observedAt,
  asOf = new Date().toISOString(),
  decisionClass = 'exploration',
} = {}) {
  const profile = EVIDENCE_FRESHNESS_PROFILES[dimension] ?? {
    volatility: 'unknown',
    mode: 'unknown',
    softWindowDays: null,
  };
  const observedTime = parseTime(observedAt);
  const asOfTime = parseTime(asOf);

  if (observedTime == null || asOfTime == null) {
    return {
      dimension,
      decisionClass,
      profile,
      ageDays: null,
      status: 'age_unknown',
      action: decisionRequiresCurrentness(decisionClass) ? 'revalidate_if_decision_depends_on_currentness' : 'reuse_with_unknown_age',
      reason: 'Evidence is preserved, but its observation time is unavailable.',
    };
  }

  const ageDays = Math.max(0, (asOfTime - observedTime) / DAY_MS);

  if (profile.mode === 'event_driven') {
    return {
      dimension,
      decisionClass,
      profile,
      ageDays: Number(ageDays.toFixed(2)),
      status: 'event_fresh_unless_contradicted',
      action: 'reuse',
      reason: 'This claim is treated as structurally persistent; age alone does not erase it. Revalidate on contradictory evidence or a material domain change.',
    };
  }

  if (profile.mode === 'soft_window') {
    const ratio = ageDays / profile.softWindowDays;
    const currentnessRequired = decisionRequiresCurrentness(decisionClass);
    if (ratio <= 1) {
      return {
        dimension,
        decisionClass,
        profile,
        ageDays: Number(ageDays.toFixed(2)),
        freshnessRatio: Number(ratio.toFixed(3)),
        status: 'decision_fresh',
        action: 'reuse',
        reason: 'Time-sensitive evidence remains inside its soft currentness window.',
      };
    }

    return {
      dimension,
      decisionClass,
      profile,
      ageDays: Number(ageDays.toFixed(2)),
      freshnessRatio: Number(ratio.toFixed(3)),
      status: currentnessRequired ? 'revalidation_due_for_decision' : 'historically_useful_currentness_weak',
      action: currentnessRequired ? 'revalidate_before_decision' : 'reuse_as_history_do_not_claim_currentness',
      reason: currentnessRequired
        ? 'Evidence remains valid history, but the planned decision depends on current market/platform conditions.'
        : 'Evidence remains useful history; do not spend merely because time passed unless a currentness-sensitive decision needs it.',
    };
  }

  return {
    dimension,
    decisionClass,
    profile,
    ageDays: Number(ageDays.toFixed(2)),
    status: 'freshness_policy_unknown',
    action: 'reuse_with_uncertainty',
    reason: 'No explicit freshness profile exists for this evidence dimension.',
  };
}

export function opportunityEvidenceMemory(garden, opportunityId, {
  asOf = new Date().toISOString(),
  decisionClass = 'exploration',
} = {}) {
  const supporting = (garden.experiments ?? []).filter((exp) =>
    exp.opportunityId === opportunityId
    && exp.status === 'integrated'
    && exp.result?.verdict === 'supports'
  );

  const dimensions = [...new Set(supporting.map((exp) => exp.validationDimension).filter(Boolean))];
  return dimensions.map((dimension) => {
    const experiments = supporting.filter((exp) => exp.validationDimension === dimension);
    const latestObservedAt = latestTime(experiments.map(observationTime));
    const sources = uniqueSourceUrls(experiments);
    return {
      dimension,
      supportingExperimentIds: experiments.map((exp) => exp.id),
      sourceCount: sources.length,
      latestObservedAt,
      freshness: assessEvidenceFreshness({ dimension, observedAt: latestObservedAt, asOf, decisionClass }),
    };
  });
}

export function evidenceRevalidationNeeds(garden, opportunityId, options = {}) {
  return opportunityEvidenceMemory(garden, opportunityId, options)
    .filter((item) => item.freshness.action === 'revalidate_before_decision');
}
