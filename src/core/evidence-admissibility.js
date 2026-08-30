const TRUSTED_PROVENANCE = new Set(['observed_external', 'runtime_written']);

function parseTime(value) {
  if (!value) return null;
  const ms = Date.parse(value);
  return Number.isFinite(ms) ? ms : null;
}

export function assessEvidenceAdmissibility({
  observedAt = null,
  provenance = 'imported_unverified',
  asOf,
  decisionRelevant = true,
} = {}) {
  const cutoffMs = parseTime(asOf);
  if (cutoffMs == null) throw new Error('Evidence admissibility requires a valid asOf cutoff.');

  const observedMs = parseTime(observedAt);
  if (!decisionRelevant) {
    return {
      admissible: false,
      reason: 'not_decision_relevant',
      observedAt,
      provenance,
    };
  }
  if (!TRUSTED_PROVENANCE.has(provenance)) {
    return {
      admissible: false,
      reason: 'untrusted_time_provenance',
      observedAt,
      provenance,
    };
  }
  if (observedMs == null) {
    return {
      admissible: false,
      reason: 'observation_time_unknown',
      observedAt,
      provenance,
    };
  }
  if (observedMs > cutoffMs) {
    return {
      admissible: false,
      reason: 'observed_after_cutoff',
      observedAt,
      provenance,
    };
  }
  return {
    admissible: true,
    reason: 'admissible_at_cutoff',
    observedAt,
    provenance,
  };
}

function experimentEvidence(garden) {
  return (garden.experiments ?? [])
    .filter((exp) => exp.status === 'integrated' && exp.result)
    .map((exp) => ({
      id: `experiment:${exp.id}`,
      kind: 'experiment_result',
      targetId: exp.opportunityId ?? null,
      dimension: exp.validationDimension ?? null,
      verdict: exp.result?.verdict ?? null,
      observedAt: exp.result?.observedAt ?? exp.integratedAt ?? exp.executedAt ?? null,
      provenance: exp.result?.timeProvenance ?? exp.timeProvenance ?? 'imported_unverified',
      sourceArtifactId: exp.id,
      decisionRelevant: true,
    }));
}

function eventEvidence(garden) {
  return (garden.events ?? [])
    .filter((event) => event.status === 'processed' || event.status == null)
    .map((event, index) => ({
      id: `event:${event.id ?? index}`,
      kind: 'garden_event',
      targetId: event.targetId ?? null,
      dimension: event.dimension ?? event.type ?? null,
      verdict: null,
      observedAt: event.observedAt ?? event.at ?? null,
      provenance: event.timeProvenance ?? 'imported_unverified',
      sourceArtifactId: event.id ?? null,
      decisionRelevant: event.decisionRelevant !== false,
    }));
}

function fruitObservationEvidence(garden) {
  return (garden.fruits ?? [])
    .filter((fruit) => fruit.observedTruth && typeof fruit.observedTruth === 'object')
    .map((fruit) => ({
      id: `fruit_observation:${fruit.id}`,
      kind: 'fruit_observation',
      targetId: fruit.id,
      dimension: 'fruit_market_truth',
      verdict: null,
      observedAt: fruit.observedTruth.observedAt ?? fruit.lastObservation?.observedAt ?? null,
      provenance: fruit.observedTruth.timeProvenance ?? fruit.lastObservation?.timeProvenance ?? 'imported_unverified',
      sourceArtifactId: fruit.id,
      decisionRelevant: true,
    }));
}

export function buildDecisionEvidenceManifest({ garden, asOf } = {}) {
  if (!garden || typeof garden !== 'object') throw new Error('Decision evidence manifest requires a Garden.');
  if (parseTime(asOf) == null) throw new Error('Decision evidence manifest requires a valid asOf cutoff.');

  const units = [
    ...experimentEvidence(garden),
    ...eventEvidence(garden),
    ...fruitObservationEvidence(garden),
  ].map((unit) => ({
    ...unit,
    admissibility: assessEvidenceAdmissibility({
      observedAt: unit.observedAt,
      provenance: unit.provenance,
      asOf,
      decisionRelevant: unit.decisionRelevant,
    }),
  }));

  return {
    asOf,
    units,
    admissibleIds: units.filter((unit) => unit.admissibility.admissible).map((unit) => unit.id),
    inadmissibleIds: units.filter((unit) => !unit.admissibility.admissible).map((unit) => unit.id),
    counts: {
      total: units.length,
      admissible: units.filter((unit) => unit.admissibility.admissible).length,
      inadmissible: units.filter((unit) => !unit.admissibility.admissible).length,
    },
  };
}
