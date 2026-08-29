import fs from 'node:fs/promises';
import path from 'node:path';
import { clone, nowIso } from './utils.js';

export function validateGarden(garden) {
  if (!garden || typeof garden !== 'object') throw new Error('Garden must be an object.');
  if (garden.schemaVersion !== 1) throw new Error('Unsupported Garden schemaVersion.');
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
  try {
    return validateGarden(await loadJson(stateFile));
  } catch (error) {
    if (error?.code !== 'ENOENT') throw error;
    const seed = validateGarden(await loadJson(seedFile));
    return clone(seed);
  }
}

export async function saveGarden(stateFile, garden) {
  garden.updatedAt = nowIso();
  validateGarden(garden);
  await saveJson(stateFile, garden);
}
