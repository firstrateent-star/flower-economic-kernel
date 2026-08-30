import { createHash } from 'node:crypto';
import { assessImprovementDividend } from './improvement-transfer.js';

function finite(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function named(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function stableHash(value) {
  return createHash('sha256').update(JSON.stringify(value)).digest('hex').slice(0, 16);
}

function normalizedDimensions(dimensions = {}) {
  const out = {};
  for (const [name, dimension] of Object.entries(dimensions ?? {})) {
    const value = finite(dimension?.value);
    if (value === null) continue;
    out[name] = {
      value,
      unit: dimension.unit ?? null,
      direction: dimension.direction ?? null,
      evidenceVerified: dimension.evidenceVerified === true,
      proxy: dimension.proxy === true,
      note: dimension.note ?? null,
    };
  }
  return out;
}

export function normalizeImprovementObservation(observation = {}) {
  if (!named(observation.workloadKey)) throw new Error('Improvement observation requires workloadKey.');
  if (!named(observation.implementationKey)) throw new Error('Improvement observation requires implementationKey.');

  const dimensions = normalizedDimensions(observation.dimensions);
  if (Object.keys(dimensions).length === 0) throw new Error('Improvement observation requires at least one finite dimension.');

  return {
    id: observation.id ?? `obs_${stableHash({
      workloadKey: observation.workloadKey,
      implementationKey: observation.implementationKey,
      dimensions,
      decisionWitness: observation.decisionWitness ?? null,
    })}`,
    workloadKey: observation.workloadKey.trim(),
    workloadVersion: observation.workloadVersion ?? 1,
    implementationKey: observation.implementationKey.trim(),
    measuredAt: observation.measuredAt ?? null,
    dimensions,
    decisionWitness: observation.decisionWitness ? {
      verified: observation.decisionWitness.verified === true,
      taskKey: observation.decisionWitness.taskKey ?? null,
      resultFingerprint: observation.decisionWitness.resultFingerprint ?? null,
      qualityScore: finite(observation.decisionWitness.qualityScore),
      qualityDirection: observation.decisionWitness.qualityDirection ?? 'higher',
      note: observation.decisionWitness.note ?? null,
    } : null,
    evidenceSources: Array.isArray(observation.evidenceSources) ? observation.evidenceSources : [],
    caveats: Array.isArray(observation.caveats) ? observation.caveats : [],
  };
}

function comparableWitness(baseline, after) {
  const a = baseline.decisionWitness;
  const b = after.decisionWitness;
  if (!a?.verified || !b?.verified) return { pass: false, mode: null };
  if (a.taskKey && b.taskKey && a.taskKey !== b.taskKey) return { pass: false, mode: null };
  if (a.resultFingerprint && b.resultFingerprint && a.resultFingerprint === b.resultFingerprint) {
    return { pass: true, mode: 'verified_decision_equivalence' };
  }

  if (a.qualityScore !== null && b.qualityScore !== null && a.qualityDirection === b.qualityDirection) {
    const improved = a.qualityDirection === 'lower'
      ? b.qualityScore < a.qualityScore
      : b.qualityScore > a.qualityScore;
    const unchanged = b.qualityScore === a.qualityScore;
    return { pass: improved || unchanged, mode: improved ? 'verified_decision_quality_improved' : 'verified_decision_quality_equal' };
  }

  return { pass: false, mode: null };
}

export function compareImprovementObservations(baselineInput, afterInput, overrides = {}) {
  const baseline = normalizeImprovementObservation(baselineInput);
  const after = normalizeImprovementObservation(afterInput);

  const sameWorkload = baseline.workloadKey === after.workloadKey
    && baseline.workloadVersion === after.workloadVersion;
  const implementationChanged = baseline.implementationKey !== after.implementationKey;
  const witness = comparableWitness(baseline, after);

  const dimensions = {};
  const unitMismatches = [];
  for (const [name, beforeDimension] of Object.entries(baseline.dimensions)) {
    const afterDimension = after.dimensions[name];
    if (!afterDimension) continue;
    if ((beforeDimension.unit ?? null) !== (afterDimension.unit ?? null)) {
      unitMismatches.push(name);
      continue;
    }
    const direction = afterDimension.direction ?? beforeDimension.direction;
    if (!direction) continue;
    dimensions[name] = {
      baseline: beforeDimension.value,
      after: afterDimension.value,
      unit: afterDimension.unit,
      direction,
      evidenceVerified: beforeDimension.evidenceVerified && afterDimension.evidenceVerified,
      proxy: beforeDimension.proxy || afterDimension.proxy,
    };
  }

  const comparisonValid = sameWorkload
    && implementationChanged
    && witness.pass
    && Object.keys(dimensions).length > 0
    && unitMismatches.length === 0;

  const improvement = {
    id: overrides.id ?? `imp_${stableHash({ baseline: baseline.id, after: after.id })}`,
    name: overrides.name ?? `${after.workloadKey} improvement`,
    description: overrides.description ?? null,
    workloadKey: after.workloadKey,
    workloadVersion: after.workloadVersion,
    baselineObservationId: baseline.id,
    afterObservationId: after.id,
    baselineImplementationKey: baseline.implementationKey,
    implementationKey: after.implementationKey,
    dimensions,
    internalEvidence: [
      `Comparable workload: ${sameWorkload}.`,
      `Implementation changed: ${implementationChanged}.`,
      `Decision witness: ${witness.mode ?? 'not comparable'}.`,
    ],
    comparisonVerified: comparisonValid,
    comparisonWitnessMode: witness.mode,
    unitMismatches,
    sourceArtifact: overrides.sourceArtifact ?? null,
  };

  const assessment = comparisonValid
    ? assessImprovementDividend(improvement)
    : {
      internalState: 'internal_improvement_unverified',
      improvedDimensions: [],
      regressedDimensions: [],
    };

  return {
    comparisonValid,
    sameWorkload,
    implementationChanged,
    witness,
    unitMismatches,
    baseline,
    after,
    improvement,
    assessment,
  };
}

function upsertById(list, item) {
  const existing = list.find((entry) => entry?.id === item.id);
  if (!existing) {
    list.push(item);
    return 'created';
  }
  if (JSON.stringify(existing) === JSON.stringify(item)) return 'unchanged';
  Object.assign(existing, item);
  return 'updated';
}

export function integrateImprovementObservation(garden = {}, observationInput, overrides = {}) {
  garden.improvementObservations ??= [];
  garden.improvementAssessments ??= [];
  garden.internalImprovements ??= [];

  const observation = normalizeImprovementObservation(observationInput);
  const priorCandidates = garden.improvementObservations
    .filter((item) => item.workloadKey === observation.workloadKey
      && item.workloadVersion === observation.workloadVersion
      && item.implementationKey !== observation.implementationKey);
  const baseline = priorCandidates.at(-1) ?? null;
  const observationState = upsertById(garden.improvementObservations, observation);

  if (!baseline) {
    return {
      changed: observationState !== 'unchanged',
      observationState,
      state: 'baseline_recorded',
      observationId: observation.id,
      comparison: null,
      internalImprovementId: null,
    };
  }

  const comparison = compareImprovementObservations(baseline, observation, overrides);
  const assessmentRecord = {
    id: `assessment_${stableHash({ baseline: baseline.id, after: observation.id })}`,
    baselineObservationId: baseline.id,
    afterObservationId: observation.id,
    comparisonValid: comparison.comparisonValid,
    internalState: comparison.assessment.internalState,
    improvedDimensions: comparison.assessment.improvedDimensions,
    regressedDimensions: comparison.assessment.regressedDimensions,
    witnessMode: comparison.witness.mode,
    unitMismatches: comparison.unitMismatches,
  };
  const assessmentState = upsertById(garden.improvementAssessments, assessmentRecord);

  let internalImprovementId = null;
  let improvementState = 'not_promoted';
  if (comparison.comparisonValid && comparison.assessment.internalState === 'internal_improvement_evidenced') {
    improvementState = upsertById(garden.internalImprovements, comparison.improvement);
    internalImprovementId = comparison.improvement.id;
  }

  return {
    changed: observationState !== 'unchanged' || assessmentState !== 'unchanged' || improvementState !== 'not_promoted' && improvementState !== 'unchanged',
    observationState,
    assessmentState,
    improvementState,
    state: comparison.assessment.internalState,
    observationId: observation.id,
    comparison,
    internalImprovementId,
  };
}
