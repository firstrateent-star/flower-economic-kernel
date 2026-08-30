import fs from 'node:fs/promises';
import path from 'node:path';
import { clone, nowIso } from './utils.js';
import { reconcileCanonicalControlPlane } from './state-reconcile.js';

const CURRENT_SCHEMA_VERSION = 2;
const LEGACY_SCHEMA_VERSIONS = new Set([1, CURRENT_SCHEMA_VERSION]);

export function validateGarden(garden, { allowLegacy = false } = {}) {
  if (!garden || typeof garden !== 'object') throw new Error('Garden must be an object.');
  const supported = allowLegacy
    ? LEGACY_SCHEMA_VERSIONS.has(garden.schemaVersion)
    : garden.schemaVersion === CURRENT_SCHEMA_VERSION;
  if (!supported) throw new Error(`Unsupported Garden schemaVersion: ${garden.schemaVersion ?? 'missing'}.`);
  if (!garden.center?.rootGoal) throw new Error('Garden center.rootGoal is required.');
  for (const key of ['soil', 'fruits', 'opportunities', 'experiments', 'events', 'approvals', 'traces']) {
    if (!Array.isArray(garden[key])) throw new Error(`Garden ${key} must be an array.`);
  }
  return garden;
}

export async function loadJson(file) {
  return JSON.parse(await fs.readFile(file, 'utf8'));
}

export async function saveJson(file, value) {
  await fs.mkdir(path.dirname(file), { recursive: true });
  const tmp = `${file}.tmp`;
  await fs.writeFile(tmp, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
  await fs.rename(tmp, file);
}

export async function loadGarden({ stateFile, seedFile }) {
  const canonical = validateGarden(await loadJson(seedFile));

  try {
    const existing = validateGarden(await loadJson(stateFile), { allowLegacy: true });
    return reconcileCanonicalControlPlane(existing, canonical).garden;
  } catch (error) {
    if (error?.code !== 'ENOENT') throw error;
    return clone(canonical);
  }
}

export async function saveGarden(stateFile, garden) {
  garden.updatedAt = nowIso();
  validateGarden(garden);
  await saveJson(stateFile, garden);
}
