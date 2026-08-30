import path from 'node:path';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs/promises';
import { loadGarden, saveGarden, loadJson } from '../core/garden.js';
import { classifyPressure } from '../core/pressure.js';
import { pulse } from '../core/kernel.js';
import { prepareRuntimeState } from '../core/runtime-preparation.js';
import { OpenAIReasoner } from '../reasoners/openai.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '../..');
const seedFile = path.join(root, 'garden/seed.json');
const stateFile = path.join(root, 'garden/state.json');
const command = process.argv[2] || 'status';

if (command === 'reset') {
  await fs.rm(stateFile, { force: true });
  console.log('Garden reset to seed on next load.');
  process.exit(0);
}

let persistedBefore = null;
try {
  persistedBefore = JSON.stringify(await loadJson(stateFile));
} catch (error) {
  if (error?.code !== 'ENOENT') throw error;
}

const garden = await loadGarden({ stateFile, seedFile });

if (command === 'status') {
  const prepared = await prepareRuntimeState({ garden, rootDir: root });
  console.log(JSON.stringify({
    rootGoal: garden.center.rootGoal,
    generation: garden.status.generation,
    pressure: prepared.pressure,
    wake: prepared.wake,
    opportunities: garden.opportunities.map(({ id, name, status }) => ({ id, name, status })),
    fruits: garden.fruits.map(({ id, name, status, monthlyRevenueUsd, creatorRevenueUsd, agenticPaymentEligible, externalUsage }) => ({
      id, name, status, monthlyRevenueUsd, creatorRevenueUsd, agenticPaymentEligible, externalUsage,
    })),
    legacyMigrations: prepared.legacy.stateMigrations,
    epistemicRepairs: prepared.legacy.repaired,
    manifestChanges: prepared.manifestSync.changes,
    distributionTruthChanges: prepared.distributionTruth.changes,
    pendingApprovals: garden.approvals.filter((x) => x.status === 'pending').length,
    pulseCount: garden.status.pulseCount,
  }, null, 2));
  process.exit(0);
}

if (command === 'pulse') {
  const observationJson = process.env.FLOWER_OBSERVATION_JSON;
  const prepared = await prepareRuntimeState({
    garden,
    rootDir: root,
    observation: observationJson ? JSON.parse(observationJson) : null,
  });
  const { pressure, wake, observationIngest } = prepared;
  const stateChangedBeforeWake = persistedBefore == null || persistedBefore !== JSON.stringify(garden);

  if (!wake.wake) {
    let statePersisted = false;
    if (stateChangedBeforeWake) {
      await saveGarden(stateFile, garden);
      statePersisted = true;
    }
    console.log(JSON.stringify({
      skipped: true,
      wake,
      pressure,
      stateChanged: stateChangedBeforeWake,
      statePersisted,
      observationIngest: observationIngest ? {
        changed: observationIngest.changed,
        stateChanged: observationIngest.stateChanged,
        reason: observationIngest.reason,
      } : null,
      legacyMigrations: prepared.legacy.stateMigrations,
      epistemicRepairs: prepared.legacy.repaired,
      manifestChanges: prepared.manifestSync.changes,
      distributionTruthChanges: prepared.distributionTruth.changes,
      pulseCount: garden.status.pulseCount,
      stateFile,
    }, null, 2));
    process.exit(0);
  }

  const reasoner = new OpenAIReasoner();
  const maxBreaths = Math.max(1, Math.min(64, Number(process.env.FLOWER_MAX_BREATHS_PER_PULSE ?? 64)));
  const result = await pulse({ garden, reasoner, maxBreaths, syncManifests: false });
  await saveGarden(stateFile, garden);
  console.log(JSON.stringify({
    skipped: false,
    wake,
    stateChanged: true,
    statePersisted: true,
    observationIngest: observationIngest ? {
      changed: observationIngest.changed,
      stateChanged: observationIngest.stateChanged,
      reason: observationIngest.reason,
    } : null,
    breaths: result.breaths.map((x) => ({ pressure: x.pressure.type, summary: x.result.summary })),
    stoppedByCostFrontier: result.stoppedByCostFrontier,
    stoppedBySafetyCeiling: result.stoppedBySafetyCeiling,
    nextPressure: classifyPressure(garden),
    legacyMigrations: prepared.legacy.stateMigrations,
    epistemicRepairs: prepared.legacy.repaired,
    manifestChanges: prepared.manifestSync.changes,
    distributionTruthChanges: prepared.distributionTruth.changes,
    pulseCount: garden.status.pulseCount,
    stateFile,
  }, null, 2));
  process.exit(0);
}

if (command === 'seed') {
  console.log(JSON.stringify(await loadJson(seedFile), null, 2));
  process.exit(0);
}

throw new Error(`Unknown command: ${command}`);
