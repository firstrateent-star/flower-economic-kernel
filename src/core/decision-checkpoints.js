import crypto from 'node:crypto';
import { FLOWER_METHODOLOGY_VERSION } from './methodology-core.js';

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
  asOf,
  methodologyVersion = FLOWER_METHODOLOGY_VERSION,
  reason = null,
} = {}) {
  if (!garden || typeof garden !== 'object') throw new Error('Decision checkpoint requires a Garden snapshot.');
  if (!pressure?.type) throw new Error('Decision checkpoint requires the pressure being decided.');
  if (!asOf || Number.isNaN(Date.parse(asOf))) throw new Error('Decision checkpoint requires an explicit valid asOf timestamp.');

  const snapshot = clone(garden);
  const snapshotHash = sha256(stableJson(snapshot));
  const identity = {
    schemaVersion: 1,
    asOf,
    methodologyVersion,
    pressure: clone(pressure),
    costClass,
    reason,
    snapshotHash,
  };
  const checkpointHash = sha256(stableJson(identity));

  return {
    ...identity,
    id: `decision_checkpoint_${checkpointHash.slice(0, 24)}`,
    checkpointHash,
    snapshot,
  };
}

export function verifyDecisionCheckpoint(checkpoint) {
  if (!checkpoint?.snapshot || !checkpoint?.checkpointHash) return { ok: false, reason: 'missing_checkpoint_material' };
  const snapshotHash = sha256(stableJson(checkpoint.snapshot));
  if (snapshotHash !== checkpoint.snapshotHash) return { ok: false, reason: 'snapshot_hash_mismatch' };

  const identity = {
    schemaVersion: checkpoint.schemaVersion,
    asOf: checkpoint.asOf,
    methodologyVersion: checkpoint.methodologyVersion,
    pressure: checkpoint.pressure,
    costClass: checkpoint.costClass,
    reason: checkpoint.reason ?? null,
    snapshotHash: checkpoint.snapshotHash,
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
  };
}
