const clamp = (value, min = 0, max = 1) => Math.min(max, Math.max(min, Number(value) || 0));

function optionalUnit(value) {
  return value === undefined || value === null ? null : clamp(value);
}

function prior(value, fallback = 0.5) {
  const normalized = optionalUnit(value);
  return normalized === null ? fallback : normalized;
}

function normalizedEconomicValue(valueUsd) {
  const value = Math.max(0, Number(valueUsd) || 0);
  return clamp(Math.log10(1 + value) / 6);
}

export function scoreTerminalCandidate(candidate = {}, {
  shortWeight = 0.65,
  mediumWeight = 0.25,
  longWeight = 0.10,
} = {}) {
  const demand = optionalUnit(candidate.demandEvidence ?? candidate.demand);
  const access = optionalUnit(candidate.demandAccess ?? candidate.access);
  const need = optionalUnit(candidate.needIntensity ?? candidate.urgency);
  const trust = optionalUnit(candidate.trustAvailability ?? candidate.trust);
  const fulfillment = optionalUnit(candidate.fulfillmentConfidence ?? candidate.fulfillment);
  const repeatability = prior(candidate.repeatability ?? candidate.reproductivePotential, 0.5);
  const distribution = optionalUnit(candidate.distributionReachability ?? candidate.distributionAccess ?? candidate.realityAccess);

  // Unknown evidence receives a neutral prior for exploratory ordering, but never passes
  // a construction/transaction gate merely because the score function needs a number.
  const probability = prior(demand) * prior(access) * prior(need) * prior(trust) * prior(fulfillment);
  const value = normalizedEconomicValue(candidate.expectedNetValueUsd ?? candidate.expectedValueUsd ?? candidate.valueAtStakeUsd);

  const shortValue = prior(candidate.shortHorizonValue, value);
  const mediumValue = prior(candidate.mediumHorizonValue, value);
  const longValue = prior(candidate.longHorizonValue, Math.max(value, repeatability));
  const horizonValue = (shortWeight * shortValue) + (mediumWeight * mediumValue) + (longWeight * longValue);

  const humanBurden = clamp(candidate.humanBurden ?? candidate.humanActuationBurden);
  const capitalBurden = clamp(candidate.capitalBurden);
  const latency = clamp(candidate.latency);
  const regulatoryFriction = clamp(candidate.regulatoryFriction);
  const irreversibleRisk = clamp(candidate.irreversibleRisk);
  const proxyRisk = clamp(candidate.proxyRisk);
  const friction = 1 + humanBurden + capitalBurden + latency + regulatoryFriction + irreversibleRisk + proxyRisk;

  const regeneration = 0.5 + (0.5 * repeatability);
  const fruitVelocity = (probability * horizonValue * regeneration) / friction;

  const requiredEvidence = [demand, access, fulfillment, distribution];
  const knownRequiredEvidence = requiredEvidence.filter((x) => x !== null).length;
  const evidenceCompleteness = knownRequiredEvidence / requiredEvidence.length;

  const gate = {
    demandWitnessed: demand !== null && demand >= 0.5,
    accessWitnessed: access !== null && access >= 0.5,
    fulfillmentVerified: fulfillment !== null && fulfillment >= 0.5,
    distributionReachable: distribution !== null && distribution >= 0.5,
    offerIntegrity: candidate.offerIntegrity !== false,
    terminalEvidenceNamed: Boolean(candidate.terminalEvidence ?? candidate.successSignal ?? candidate.validationGate),
  };
  gate.buildEligible = gate.demandWitnessed
    && gate.accessWitnessed
    && gate.fulfillmentVerified
    && gate.distributionReachable
    && gate.offerIntegrity;

  return {
    fruitVelocity: Number(fruitVelocity.toFixed(6)),
    terminalProbability: Number(probability.toFixed(6)),
    horizonValue: Number(horizonValue.toFixed(6)),
    regeneration: Number(regeneration.toFixed(6)),
    friction: Number(friction.toFixed(6)),
    evidenceCompleteness: Number(evidenceCompleteness.toFixed(3)),
    gate,
    unknowns: {
      demand: demand === null,
      access: access === null,
      fulfillment: fulfillment === null,
      distribution: distribution === null,
    },
  };
}

export function classifyTerminalCandidate(candidate = {}, options = {}) {
  const scored = scoreTerminalCandidate(candidate, options);
  if (scored.gate.buildEligible) {
    return {
      ...scored,
      state: scored.fruitVelocity >= 0.03 ? 'terminal_priority' : 'terminal_eligible',
    };
  }

  const missingCriticalEvidence = Object.values(scored.unknowns).some(Boolean);
  if (missingCriticalEvidence) return { ...scored, state: 'probe_missing_evidence' };
  return { ...scored, state: 'prune_or_reframe' };
}

export function shouldChallengeHumanBoundaryWithExploration(garden = {}) {
  const policy = garden.center?.searchPolicy ?? {};
  if (policy.challengeHumanBoundaryWithFreshSearch === false) return false;

  const opportunities = garden.opportunities ?? [];
  const activeOpportunity = opportunities.some((x) => !['compost', 'dormant', 'fruit', 'measurement_blocked'].includes(x.status));
  if (activeOpportunity) return false;

  if ((garden.approvals ?? []).some((x) => x.status === 'pending')) return false;
  if ((garden.events ?? []).some((x) => x.status === 'new')) return false;
  if ((garden.experiments ?? []).some((x) => ['authorized', 'result_ready'].includes(x.status))) return false;

  const lastPressure = garden.status?.lastPressure;
  const lastType = typeof lastPressure === 'string' ? lastPressure : lastPressure?.type;
  return lastType !== 'EXPAND';
}

export function recursionShouldYieldToAction({
  expectedActionValue = 0,
  expectedAnalysisValue = 0,
  actionSafe = true,
} = {}) {
  if (!actionSafe) return false;
  return Number(expectedActionValue) > Number(expectedAnalysisValue);
}
