import fs from 'node:fs/promises';
import path from 'node:path';
import { classifyPressure } from '../src/core/pressure.js';
import { createStateAvailabilityWitness } from '../src/core/state-availability-witness.js';
import { createDecisionCheckpoint, verifyDecisionCheckpoint } from '../src/core/decision-checkpoints.js';

const gardenPath = process.argv[2] ?? 'garden/seed.json';
const outputPath = process.argv[3] ?? 'artifacts/current-decision-checkpoint.json';
const garden = JSON.parse(await fs.readFile(gardenPath, 'utf8'));
const pressure = classifyPressure(garden);

if (pressure.type !== 'HUMAN') {
  throw new Error(`Current capture script is intentionally scoped to a HUMAN sovereignty boundary; got ${pressure.type}.`);
}

const witness = createStateAvailabilityWitness({ garden });
const checkpoint = createDecisionCheckpoint({
  garden,
  pressure,
  asOf: witness.witnessedAt,
  availabilityWitness: witness,
  reason: 'Prospective runtime-generated checkpoint at the current highest-ranked sovereignty boundary.',
});
const verified = verifyDecisionCheckpoint(checkpoint);
if (!verified.ok) throw new Error(`Generated checkpoint failed verification: ${verified.reason}`);

await fs.mkdir(path.dirname(outputPath), { recursive: true });
await fs.writeFile(outputPath, `${JSON.stringify(checkpoint, null, 2)}\n`, 'utf8');

console.log(JSON.stringify({
  id: checkpoint.id,
  checkpointHash: checkpoint.checkpointHash,
  snapshotHash: checkpoint.snapshotHash,
  availabilityWitnessHash: checkpoint.availabilityWitnessHash,
  evidenceManifestHash: checkpoint.evidenceManifestHash,
  witnessedAt: witness.witnessedAt,
  capturedAt: checkpoint.capturedAt,
  asOf: checkpoint.asOf,
  methodologyVersion: checkpoint.methodologyVersion,
  pressure: checkpoint.pressure,
  evidenceCounts: checkpoint.evidenceManifest.counts,
  verified: true,
}));
