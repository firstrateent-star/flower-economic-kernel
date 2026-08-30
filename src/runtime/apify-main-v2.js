import { Actor, log } from 'apify';
import { pulse } from '../core/kernel.js';
import { classifyPressure } from '../core/pressure.js';
import { refreshGeometry } from '../core/geometry.js';
import { reconcileCanonicalControlPlane } from '../core/state-reconcile.js';
import { prepareRuntimeState } from '../core/runtime-preparation.js';
import { EfficientOpenAIReasoner } from '../reasoners/efficient-openai.js';
import seed from '../../garden/seed.json' with { type: 'json' };

const STORE_NAME = 'flower-economic-kernel-v0-state';
const STORE_KEY = 'FLOWER_GARDEN';

function clampBreaths(value) {
  const parsed = Number(value ?? 64);
  if (!Number.isFinite(parsed)) return 64;
  return Math.max(1, Math.min(64, Math.trunc(parsed)));
}

function activeOpportunitySnapshot(garden) {
  return (garden.opportunities ?? [])
    .filter((opp) => !['dormant', 'compost', 'fruit', 'measurement_blocked'].includes(opp.status))
    .slice(0, 8)
    .map((opp) => ({
      id: opp.id,
      name: opp.name,
      status: opp.status,
      experimentId: opp.experimentId ?? null,
      selectedForExperiment: opp.selectedForExperiment ?? false,
    }));
}

function geometrySnapshot(garden) {
  const geometry = refreshGeometry(garden);
  return {
    stage: geometry.stage,
    metrics: { ...geometry.metrics },
  };
}

function growthYield(before, after, costlyBreathsUsed) {
  const delta = {
    centers: Number(after.metrics.centerCount ?? 0) - Number(before.metrics.centerCount ?? 0),
    edges: Number(after.metrics.edgeCount ?? 0) - Number(before.metrics.edgeCount ?? 0),
    earnedEvidenceCenters: Number(after.metrics.earnedEvidenceCenterCount ?? 0) - Number(before.metrics.earnedEvidenceCenterCount ?? 0),
    validatedOpportunities: Number(after.metrics.validatedOpportunityCount ?? 0) - Number(before.metrics.validatedOpportunityCount ?? 0),
    buildReadyOpportunities: Number(after.metrics.buildReadyOpportunityCount ?? 0) - Number(before.metrics.buildReadyOpportunityCount ?? 0),
  };
  const functionalGeometryGain = Math.max(0, delta.edges)
    + Math.max(0, delta.earnedEvidenceCenters)
    + Math.max(0, delta.validatedOpportunities)
    + Math.max(0, delta.buildReadyOpportunities);

  return {
    delta,
    costlyFrontiers: Number(costlyBreathsUsed ?? 0),
    functionalGeometryGain,
    functionalGeometryPerCostlyFrontier: costlyBreathsUsed > 0
      ? Number((functionalGeometryGain / costlyBreathsUsed).toFixed(2))
      : null,
  };
}

async function writeOutput(output, { pushDataset = true } = {}) {
  await Actor.setValue('OUTPUT', output);
  if (pushDataset) await Actor.pushData(output);
}

await Actor.main(async () => {
  const input = (await Actor.getInput()) ?? {};
  const maxBreaths = clampBreaths(input.maxBreaths);
  const maxCostlyBreaths = 1;

  const stateStore = await Actor.openKeyValueStore(STORE_NAME);
  const existing = await stateStore.getValue(STORE_KEY);
  const persistedBefore = existing == null ? null : JSON.stringify(existing);
  const canonical = reconcileCanonicalControlPlane(existing, seed);
  const garden = canonical.garden;
  const prepared = await prepareRuntimeState({
    garden,
    observation: input.observation ?? null,
  });
  const { pressure: startingPressure, wake, observationIngest } = prepared;

  const geometryBefore = geometrySnapshot(garden);
  const stateChangedBeforeWake = persistedBefore == null || persistedBefore !== JSON.stringify(garden);

  log.info('Flower wake decision', {
    wake,
    pressure: startingPressure,
    stateChangedBeforeWake,
    canonicalReconciliation: canonical.changes,
    legacyMigrations: prepared.legacy.stateMigrations,
    manifestChanges: prepared.manifestSync.changes,
    distributionTruthChanges: prepared.distributionTruth.changes,
    observationChanged: observationIngest?.changed ?? false,
    observationStateChanged: observationIngest?.stateChanged ?? false,
  });

  if (!wake.wake) {
    let statePersisted = false;
    if (stateChangedBeforeWake) {
      await stateStore.setValue(STORE_KEY, garden);
      statePersisted = true;
    }
    const output = {
      ok: true,
      skipped: true,
      wake,
      pressure: startingPressure,
      reasonerConstructed: false,
      stateChanged: stateChangedBeforeWake,
      statePersisted,
      pulseCount: Number(garden.status.pulseCount ?? 0),
      persistentStore: STORE_NAME,
      canonicalReconciliation: canonical.changes,
      legacyMigrations: prepared.legacy.stateMigrations,
      epistemicRepairs: prepared.legacy.repaired,
      manifestChanges: prepared.manifestSync.changes,
      distributionTruthChanges: prepared.distributionTruth.changes,
      observationIngest: observationIngest
        ? {
          changed: observationIngest.changed,
          stateChanged: observationIngest.stateChanged,
          reason: observationIngest.reason,
        }
        : null,
      activeOpportunities: activeOpportunitySnapshot(garden),
      geometry: geometryBefore,
    };
    // OUTPUT remains useful invocation telemetry. Dataset history is reserved for
    // actual state transitions so repeated sleep checks do not manufacture activity.
    await writeOutput(output, { pushDataset: stateChangedBeforeWake });
    log.info('Flower pulse skipped', output);
    return;
  }

  const reasoner = new EfficientOpenAIReasoner();
  let result;
  try {
    result = await pulse({
      garden,
      reasoner,
      maxBreaths,
      maxCostlyBreaths,
      syncManifests: false,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const output = {
      ok: false,
      skipped: false,
      wake,
      pressure: startingPressure,
      error: message,
      reasonerConstructed: true,
      stateChanged: stateChangedBeforeWake,
      statePersisted: false,
      pulseCount: Number(garden.status.pulseCount ?? 0),
      persistentStore: STORE_NAME,
      canonicalReconciliation: canonical.changes,
      legacyMigrations: prepared.legacy.stateMigrations,
      epistemicRepairs: prepared.legacy.repaired,
      manifestChanges: prepared.manifestSync.changes,
      distributionTruthChanges: prepared.distributionTruth.changes,
      activeOpportunities: activeOpportunitySnapshot(garden),
      geometry: geometryBefore,
    };
    await writeOutput(output);
    log.error('Flower pulse failed', output);
    throw error;
  }

  const geometryAfter = geometrySnapshot(garden);
  const yieldSnapshot = growthYield(geometryBefore, geometryAfter, result.runBudget.costlyBreathsUsed);
  garden.status.lastGrowthYield = yieldSnapshot;
  await stateStore.setValue(STORE_KEY, garden);

  const output = {
    ok: true,
    skipped: false,
    wake,
    reasonerConstructed: true,
    stateChanged: true,
    statePersisted: true,
    breaths: result.breaths.map((x) => ({
      pressure: x.pressure,
      costClass: x.costClass,
      summary: x.result.summary,
    })),
    microBreaths: result.breaths.length,
    runBudget: result.runBudget,
    stoppedByCostFrontier: result.stoppedByCostFrontier,
    stoppedBySafetyCeiling: result.stoppedBySafetyCeiling,
    nextPressure: classifyPressure(garden),
    activeOpportunities: activeOpportunitySnapshot(garden),
    geometry: geometryAfter,
    growthYield: yieldSnapshot,
    pendingApprovals: (garden.approvals ?? []).filter((x) => x.status === 'pending'),
    generation: garden.status.generation,
    pulseCount: garden.status.pulseCount,
    persistentStore: STORE_NAME,
    canonicalReconciliation: canonical.changes,
    legacyMigrations: prepared.legacy.stateMigrations,
    epistemicRepairs: prepared.legacy.repaired,
    manifestChanges: prepared.manifestSync.changes,
    distributionTruthChanges: prepared.distributionTruth.changes,
    observationIngest: observationIngest
      ? {
        changed: observationIngest.changed,
        stateChanged: observationIngest.stateChanged,
        reason: observationIngest.reason,
      }
      : null,
  };

  await writeOutput(output);
  log.info('Flower pulse complete', {
    microBreaths: output.microBreaths,
    runBudget: output.runBudget,
    stoppedBySafetyCeiling: output.stoppedBySafetyCeiling,
    nextPressure: output.nextPressure,
    growthYield: output.growthYield,
  });
});
