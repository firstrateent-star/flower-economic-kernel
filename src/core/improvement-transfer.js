function finiteNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function named(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function list(value) {
  return Array.isArray(value) ? value : [];
}

const LOWER_IS_BETTER = new Set([
  'energy',
  'energyCost',
  'compute',
  'computeCost',
  'latency',
  'time',
  'humanAttention',
  'errorRate',
  'stateChurn',
  'recomputation',
]);

const HIGHER_IS_BETTER = new Set([
  'speed',
  'accuracy',
  'decisionAccuracy',
  'complexityCapacity',
  'decisionCapability',
  'reuse',
  'coverage',
]);

function inferredDirection(name, dimension = {}) {
  if (dimension.direction === 'lower' || dimension.direction === 'higher') return dimension.direction;
  if (LOWER_IS_BETTER.has(name)) return 'lower';
  if (HIGHER_IS_BETTER.has(name)) return 'higher';
  return null;
}

function assessDimension(name, dimension = {}) {
  const baseline = finiteNumber(dimension.baseline);
  const after = finiteNumber(dimension.after);
  const direction = inferredDirection(name, dimension);
  const evidenceVerified = dimension.evidenceVerified === true;

  if (baseline === null || after === null || !direction) {
    return {
      name,
      state: 'unknown',
      direction,
      baseline,
      after,
      unit: dimension.unit ?? null,
      evidenceVerified,
      relativeDelta: null,
    };
  }

  if (!evidenceVerified) {
    return {
      name,
      state: 'unverified',
      direction,
      baseline,
      after,
      unit: dimension.unit ?? null,
      evidenceVerified,
      relativeDelta: baseline === 0 ? null : (after - baseline) / Math.abs(baseline),
    };
  }

  const improved = direction === 'lower' ? after < baseline : after > baseline;
  const regressed = direction === 'lower' ? after > baseline : after < baseline;
  return {
    name,
    state: improved ? 'improved' : regressed ? 'regressed' : 'unchanged',
    direction,
    baseline,
    after,
    unit: dimension.unit ?? null,
    evidenceVerified,
    relativeDelta: baseline === 0 ? null : (after - baseline) / Math.abs(baseline),
  };
}

export function assessImprovementDividend(improvement = {}) {
  const dimensions = Object.entries(improvement.dimensions ?? {})
    .map(([name, dimension]) => assessDimension(name, dimension));
  const improvedDimensions = dimensions.filter((item) => item.state === 'improved');
  const regressedDimensions = dimensions.filter((item) => item.state === 'regressed');
  const verifiedDimensions = dimensions.filter((item) => ['improved', 'regressed', 'unchanged'].includes(item.state));

  let internalState = 'internal_improvement_unverified';
  if (verifiedDimensions.length > 0 && improvedDimensions.length === 0 && regressedDimensions.length === 0) {
    internalState = 'internal_change_no_verified_gain';
  }
  if (improvedDimensions.length > 0 && regressedDimensions.length > 0) {
    internalState = 'internal_tradeoff_evidenced';
  }
  if (improvedDimensions.length > 0 && regressedDimensions.length === 0) {
    internalState = 'internal_improvement_evidenced';
  }

  const beneficiaryClasses = list(improvement.beneficiaryClasses).filter(named);
  const deliveryForms = list(improvement.deliveryForms).filter(named);
  const verifiedExternalProblemEvidence = list(improvement.externalProblemEvidence)
    .filter((item) => item?.verified === true && named(item?.claim) && named(item?.source));

  const transferShapeComplete = named(improvement.transformation)
    && beneficiaryClasses.length > 0
    && named(improvement.externalValueMeasure);
  const transferHypothesisReady = internalState === 'internal_improvement_evidenced'
    && transferShapeComplete;
  const shadowProbeReady = transferHypothesisReady
    && verifiedExternalProblemEvidence.length > 0
    && improvement.outwardMaintenanceBounded !== false
    && improvement.truthfulExternalClaim !== false;
  const externalValueEvidenced = shadowProbeReady && improvement.externalValueVerified === true;
  const repeatExternalValueEvidenced = externalValueEvidenced && improvement.repeatExternalValueVerified === true;

  let state = internalState;
  if (transferHypothesisReady) state = 'transfer_hypothesis';
  if (shadowProbeReady) state = 'external_shadow_probe_ready';
  if (externalValueEvidenced) state = 'external_value_evidenced';
  if (repeatExternalValueEvidenced) state = 'repeat_external_value_evidenced';

  return {
    id: improvement.id ?? null,
    name: improvement.name ?? null,
    state,
    internalState,
    dimensions,
    improvedDimensions: improvedDimensions.map((item) => item.name),
    regressedDimensions: regressedDimensions.map((item) => item.name),
    transferShapeComplete,
    transferHypothesisReady,
    shadowProbeReady,
    externalValueEvidenced,
    repeatExternalValueEvidenced,
    verifiedExternalProblemEvidenceCount: verifiedExternalProblemEvidence.length,
    antiGoodhartRisk: improvement.antiGoodhartRisk ?? null,
    outwardMaintenanceBounded: improvement.outwardMaintenanceBounded !== false,
  };
}

export function createTransferSeed(improvement = {}) {
  const assessment = assessImprovementDividend(improvement);
  if (!assessment.transferHypothesisReady) return null;

  return {
    id: improvement.transferSeedId ?? `transfer_${improvement.id ?? 'unnamed'}`,
    improvementId: improvement.id ?? null,
    name: improvement.transferName ?? improvement.name ?? improvement.id ?? 'Unnamed transfer seed',
    status: assessment.externalValueEvidenced
      ? 'external_value_evidenced'
      : assessment.shadowProbeReady
        ? 'shadow_probe_ready'
        : 'hypothesis',
    transformation: improvement.transformation,
    beneficiaryClasses: list(improvement.beneficiaryClasses).filter(named),
    externalValueMeasure: improvement.externalValueMeasure,
    deliveryForms: list(improvement.deliveryForms).filter(named),
    externalProblemEvidence: list(improvement.externalProblemEvidence)
      .filter((item) => item?.verified === true && named(item?.claim) && named(item?.source)),
    nextProbe: improvement.nextExternalProbe ?? null,
    internalDividend: {
      improvedDimensions: assessment.improvedDimensions,
      regressedDimensions: assessment.regressedDimensions,
      evidenceState: assessment.internalState,
    },
    antiGoodhartRisk: improvement.antiGoodhartRisk ?? null,
    externalValueVerified: assessment.externalValueEvidenced,
    repeatExternalValueVerified: assessment.repeatExternalValueEvidenced,
    outwardMaintenanceBounded: assessment.outwardMaintenanceBounded,
    epistemicNote: 'Internal improvement demonstrates reusable capability inside Flower, not external value. External usefulness remains a hypothesis until independently evidenced.',
  };
}

export function reconcileImprovementTransferSeeds(garden = {}) {
  garden.internalImprovements ??= [];
  garden.transferSeeds ??= [];

  const byId = new Map(garden.transferSeeds.filter((seed) => seed?.id).map((seed) => [seed.id, seed]));
  const created = [];
  const updated = [];

  for (const improvement of garden.internalImprovements) {
    const seed = createTransferSeed(improvement);
    if (!seed) continue;
    const previous = byId.get(seed.id);
    if (!previous) {
      garden.transferSeeds.push(seed);
      byId.set(seed.id, seed);
      created.push(seed.id);
      continue;
    }
    if (JSON.stringify(previous) !== JSON.stringify(seed)) {
      Object.assign(previous, seed);
      updated.push(seed.id);
    }
  }

  return {
    changed: created.length > 0 || updated.length > 0,
    created,
    updated,
    transferSeedCount: garden.transferSeeds.length,
  };
}
