import path from 'node:path';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs/promises';
import { loadGarden, saveGarden, loadJson } from '../core/garden.js';
import { classifyPressure } from '../core/pressure.js';
import { pulse } from '../core/kernel.js';
import { prepareRuntimeState } from '../core/runtime-preparation.js';
import { archiveTraceHistory } from '../core/history-archive.js';
import { EfficientOpenAIReasoner } from '../reasoners/efficient-openai.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '../..');
const seedFile = path.join(root, 'garden/seed.json');
const stateFile = path.join(root, 'garden/state.json');
const traceArchiveDir = path.join(root, 'garden/history/trace-blocks');
const command = process.argv[2] || 'status';

if (command === 'reset') {
  await fs.rm(stateFile, { force: true });
  console.log('Garden active state reset to seed on next load; historical archive is preserved.');
  process.exit(0);
}

let persistedBefore = null;
try {
  persistedBefore = JSON.stringify(await loadJson(stateFile));
} catch (error) {
  if (error?.code !== 'ENOENT') throw error;
}

const garden = await loadGarden({ stateFile, seedFile });

function observationSummary(observationIngest) {
  if (!observationIngest) return null;
  return {
    changed: observationIngest.changed,
    stateChanged: observationIngest.stateChanged,
    reason: observationIngest.reason,
    projectedKeys: observationIngest.projectedKeys ?? [],
    impact: observationIngest.impact ?? null,
  };
}

async function persistTraceArchiveBlock(block) {
  await fs.mkdir(traceArchiveDir, { recursive: true });
  const file = path.join(traceArchiveDir, `${block.blockHash}.json`);
  const serialized = `${JSON.stringify(block, null, 2)}\n`;
  try {
    await fs.writeFile(file, serialized, { encoding: 'utf8', flag: 'wx' });
  } catch (error) {
    if (error?.code !== 'EEXIST') throw error;
    // Crash-safe retry: a block written before active-state commit is success only if
    // the content-addressed file is exactly the same block.
    const existing = await fs.readFile(file, 'utf8');
    if (existing !== serialized) throw new Error(`Trace archive hash collision or corruption at ${file}`);
  }
}

async function archiveHotTraces() {
  return archiveTraceHistory(garden, {
    maxActiveTraces: 256,
    persistBlock: persistTraceArchiveBlock,
  });
}

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
    actuationGateChanges: prepared.actuationGates.changes,
    activeTraceCount: garden.traces.length,
    archivedTraceCount: Number(garden.historyArchive?.archivedTraceCount ?? 0),
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
  const archiveBeforeWake = await archiveHotTraces();
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
      traceArchive: archiveBeforeWake,
      observationIngest: observationSummary(observationIngest),
      legacyMigrations: prepared.legacy.stateMigrations,
      epistemicRepairs: prepared.legacy.repaired,
      manifestChanges: prepared.manifestSync.changes,
      distributionTruthChanges: prepared.distributionTruth.changes,
      actuationGateChanges: prepared.actuationGates.changes,
      pulseCount: garden.status.pulseCount,
      stateFile,
    }, null, 2));
    process.exit(0);
  }

  const reasoner = new EfficientOpenAIReasoner();
  const maxBreaths = Math.max(1, Math.min(64, Number(process.env.FLOWER_MAX_BREATHS_PER_PULSE ?? 64)));
  const result = await pulse({ garden, reasoner, maxBreaths, syncManifests: false });
  const archiveAfterPulse = await archiveHotTraces();
  await saveGarden(stateFile, garden);
  console.log(JSON.stringify({
    skipped: false,
    wake,
    stateChanged: true,
    statePersisted: true,
    traceArchive: archiveAfterPulse.changed ? archiveAfterPulse : archiveBeforeWake,
    observationIngest: observationSummary(observationIngest),
    breaths: result.breaths.map((x) => ({ pressure: x.pressure.type, summary: x.result.summary })),
    stoppedByCostFrontier: result.stoppedByCostFrontier,
    stoppedBySafetyCeiling: result.stoppedBySafetyCeiling,
    nextPressure: classifyPressure(garden),
    legacyMigrations: prepared.legacy.stateMigrations,
    epistemicRepairs: prepared.legacy.repaired,
    manifestChanges: prepared.manifestSync.changes,
    distributionTruthChanges: prepared.distributionTruth.changes,
    actuationGateChanges: prepared.actuationGates.changes,
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
