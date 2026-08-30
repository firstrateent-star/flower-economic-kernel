import crypto from 'node:crypto';
import { FLOWER_METHODOLOGY_VERSION } from './methodology-core.js';
import { buildDecisionEvidenceManifest } from './evidence-admissibility.js';
import { verifyStateAvailabilityWitness } from './state-availability-witness.js';
import { nowIso } from './utils.js';

const CONSEQUENTIAL_PRESSURES = new Set([
  'HUMAN',
  'EXPAND',
  'FALSIFY',
  'SELECT',
  'BUILD_PLAN',
  'EXECUTE_EXPERIMENT',
]);

function stableSort(value) {
  if (Array.isArray(value)) return value.map(stableSort);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.keys(value).sort().map((key) => [key, stableSort(value[key])]));
  }
  return value;
}

function stableJson(value) {
  return JSON.stringify(stableSort(value));
}

function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function clone(value) {
  return structuredClone(value);
}

function validTime(value) {
  return typeof value === 'string' && Number.isFinite(Date.parse(value));
}

export function shouldCaptureDecisionCheckpoint({ pressure, costClass = 'free' } = {}) {
  if (!pressure?.type) return false;
  if (pressure.type === 'HUMAN') return true;
  if (costClass !== 'free') return true;
  return CONSEQUENTIAL_PRESSURES.has(pressure.type) && ['BUILD_PLAN'].includes(pressure.type);
}

export function createDecisionCheckpoint({
  garden,
  pressure,
  costClass = 'free',
  asOf = null,
  methodologyVersion = FLOWER_METHODOLOGY_VERSION,
  reason = null,
  availabilityWitness = null,
  clock = nowIso,
} = {}) {
  if (!garden || typeof garden !== 'object') throw new Error('Decision checkpoint requires a Garden snapshot.');
  if (!pressure?.type) throw new Error('Decision checkpoint requires the pressure being decided.');
  if (typeof clock !== 'function') throw new Error('Decision checkpoint clock must be a function.');

  const capturedAt = clock();
  if (!validTime(capturedAt)) throw new Error('Decision checkpoint clock returned an invalid timestamp.');
  const evidenceCutoff = asOf ?? capturedAt;
  if (!validTime(evidenceCutoff)) throw new Error('Decision checkpoint requires a valid asOf evidence cutoff.');
  if (Date.parse(evidenceCutoff) > Date.parse(capturedAt)) {
    throw new Error('Decision checkpoint asOf cannot be later than trusted capturedAt.');
  }

  const snapshot = clone(garden);
  const snapshotHash = sha256(stableJson(snapshot));
  let witness = null;
  if (availabilityWitness) {
    const verified = verifyStateAvailabilityWitness({ witness: availabilityWitness, garden: snapshot });
    if (!verified.ok) throw new Error(`Decision checkpoint received invalid availability witness: ${verified.reason}`);
    if (Date.parse(availabilityWitness.witnessedAt) > Date.parse(evidenceCutoff)) {
      throw new Error('Decision checkpoint availability witness cannot be later than its evidence cutoff.');
    }
    witness = clone(availabilityWitness);
  }

  const evidenceManifest = buildDecisionEvidenceManifest({
    garden: snapshot,
    asOf: evidenceCutoff,
    availabilityWitness: witness,
  });
  const evidenceManifestHash = sha256(stableJson(evidenceManifest));
  const availabilityWitnessHash = witness?.witnessHash ?? null;
  const identity = {
    schemaVersion: 4,
    capturedAt,
    captureClock: 'runtime_wall_clock',
    asOf: evidenceCutoff,
    methodologyVersion,
    pressure: clone(pressure),
    costClass,
    reason,
    snapshotHash,
    availabilityWitnessHash,
    evidenceManifestHash,
  };
  const checkpointHash = sha256(stableJson(identity));

  return {
    ...identity,
    id: `decision_checkpoint_${checkpointHash.slice(0, 24)}`,
    checkpointHash,
    availabilityWitness: witness,
    evidenceManifest,
    snapshot,
  };
}

export function verifyDecisionCheckpoint(checkpoint) {
  if (!checkpoint?.snapshot || !checkpoint?.checkpointHash) return { ok: false, reason: 'missing_checkpoint_material' };
  if (!validTime(checkpoint.capturedAt)) return { ok: false, reason: 'missing_trusted_capture_time' };
  if (!validTime(checkpoint.asOf)) return { ok: false, reason: 'invalid_evidence_cutoff' };
  if (Date.parse(checkpoint.asOf) > Date.parse(checkpoint.capturedAt)) return { ok: false, reason: 'future_evidence_cutoff' };

  const snapshotHash = sha256(stableJson(checkpoint.snapshot));
  if (snapshotHash !== checkpoint.snapshotHash) return { ok: false, reason: 'snapshot_hash_mismatch' };

  if (checkpoint.availabilityWitness) {
    const verified = verifyStateAvailabilityWitness({ witness: checkpoint.availabilityWitness, garden: checkpoint.snapshot });
    if (!verified.ok) return { ok: false, reason: `availability_witness_${verified.reason}` };
    if (checkpoint.availabilityWitness.witnessHash !== checkpoint.availabilityWitnessHash) {
      return { ok: false, reason: 'availability_witness_hash_mismatch' };
    }
    if (Date.parse(checkpoint.availabilityWitness.witnessedAt) > Date.parse(checkpoint.asOf)) {
      return { ok: false, reason: 'availability_witness_after_cutoff' };
    }
  } else if (checkpoint.availabilityWitnessHash) {
    return { ok: false, reason: 'missing_availability_witness' };
  }

  const rebuiltManifest = buildDecisionEvidenceManifest({
    garden: checkpoint.snapshot,
    asOf: checkpoint.asOf,
    availabilityWitness: checkpoint.availabilityWitness ?? null,
  });
  const evidenceManifestHash = sha256(stableJson(rebuiltManifest));
  if (evidenceManifestHash !== checkpoint.evidenceManifestHash) return { ok: false, reason: 'evidence_manifest_hash_mismatch' };
  if (stableJson(rebuiltManifest) !== stableJson(checkpoint.evidenceManifest)) return { ok: false, reason: 'evidence_manifest_mismatch' };

  const identity = {
    schemaVersion: checkpoint.schemaVersion,
    capturedAt: checkpoint.capturedAt,
    captureClock: checkpoint.captureClock,
    asOf: checkpoint.asOf,
    methodologyVersion: checkpoint.methodologyVersion,
    pressure: checkpoint.pressure,
    costClass: checkpoint.costClass,
    reason: checkpoint.reason ?? null,
    snapshotHash: checkpoint.snapshotHash,
    availabilityWitnessHash: checkpoint.availabilityWitnessHash ?? null,
    evidenceManifestHash: checkpoint.evidenceManifestHash,
  };
  const checkpointHash = sha256(stableJson(identity));
  if (checkpointHash !== checkpoint.checkpointHash) return { ok: false, reason: 'checkpoint_hash_mismatch' };
  return { ok: true, reason: 'verified' };
}

export async function persistDecisionCheckpoint({ checkpoint, sink } = {}) {
  const verification = verifyDecisionCheckpoint(checkpoint);
  if (!verification.ok) throw new Error(`Refusing invalid decision checkpoint: ${verification.reason}`);
  if (typeof sink !== 'function') throw new Error('Decision checkpoint persistence requires an explicit cold-storage sink.');
  await sink(checkpoint);
  return {
    persisted: true,
    id: checkpoint.id,
    checkpointHash: checkpoint.checkpointHash,
    snapshotHash: checkpoint.snapshotHash,
    availabilityWitnessHash: checkpoint.availabilityWitnessHash ?? null,
    evidenceManifestHash: checkpoint.evidenceManifestHash,
  };
}
