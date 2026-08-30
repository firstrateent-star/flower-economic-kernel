import crypto from 'node:crypto';
import { nowIso } from './utils.js';
import { classifyGardenTimeProvenance } from './time-provenance.js';

function stableSort(value) {
  if (Array.isArray(value)) return value.map(stableSort);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.keys(value).sort().map((key) => [key, stableSort(value[key])]));
  }
  return value;
}

function stableHash(value) {
  return crypto.createHash('sha256').update(JSON.stringify(stableSort(value))).digest('hex');
}

function validTime(value) {
  return typeof value === 'string' && Number.isFinite(Date.parse(value));
}

export function createStateAvailabilityWitness({ garden, clock = nowIso } = {}) {
  if (!garden || typeof garden !== 'object') throw new Error('State availability witness requires a Garden.');
  if (typeof clock !== 'function') throw new Error('State availability witness clock must be a function.');
  const witnessedAt = clock();
  if (!validTime(witnessedAt)) throw new Error('State availability witness clock returned an invalid timestamp.');

  const sourceChronology = classifyGardenTimeProvenance(garden);
  const snapshotHash = stableHash(garden);
  const identity = {
    schemaVersion: 1,
    witnessedAt,
    witnessClock: 'runtime_wall_clock',
    snapshotHash,
    sourceChronologyClass: sourceChronology.class,
    claim: 'This exact Garden snapshot was available to the runtime no later than witnessedAt; this does not certify when its legacy/imported facts first became true or were first observed.',
  };
  const witnessHash = stableHash(identity);
  return {
    ...identity,
    id: `state_availability_witness_${witnessHash.slice(0, 24)}`,
    witnessHash,
  };
}

export function verifyStateAvailabilityWitness({ witness, garden } = {}) {
  if (!witness || !garden) return { ok: false, reason: 'missing_witness_material' };
  if (!validTime(witness.witnessedAt)) return { ok: false, reason: 'invalid_witness_time' };
  const snapshotHash = stableHash(garden);
  if (snapshotHash !== witness.snapshotHash) return { ok: false, reason: 'snapshot_hash_mismatch' };
  const identity = {
    schemaVersion: witness.schemaVersion,
    witnessedAt: witness.witnessedAt,
    witnessClock: witness.witnessClock,
    snapshotHash: witness.snapshotHash,
    sourceChronologyClass: witness.sourceChronologyClass,
    claim: witness.claim,
  };
  if (stableHash(identity) !== witness.witnessHash) return { ok: false, reason: 'witness_hash_mismatch' };
  return { ok: true, reason: 'verified' };
}
