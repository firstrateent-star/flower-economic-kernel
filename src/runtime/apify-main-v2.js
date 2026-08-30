import { Actor, log } from 'apify';
import { pulse } from '../core/kernel.js';
import { classifyPressure } from '../core/pressure.js';
import { refreshGeometry } from '../core/geometry.js';
import { classifyWake } from '../core/wake.js';
import { ingestFruitObservation } from '../core/observations.js';
import { reconcileCanonicalControlPlane } from '../core/state-reconcile.js';
import { migrateLegacyRuntimeState } from '../core/legacy-state-migrations.js';
import { syncFruitManifests } from '../core/fruit-forge.js';
import { OpenAIReasoner } from '../reasoners/openai.js';
import seed from '../../garden/seed.json' with { type: 'json' };

const STORE_NAME = 'flower-economic-kernel-v0-state';
const STORE_KEY = 'FLOWER_GARDEN';

function clampBreaths(value) {
  const parsed = Number(value ?? 12);
  if (!Number.isFinite(parsed)) return 12;
  return Math.max(1, Math.min(12, Math.trunc(parsed)));
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

async function writeOutput(output) {
  await Actor.setValue('OUTPUT', output);
  await Actor.pushData(output);
}

await Actor.main(async () => {
  const input = (await Actor.getInput()) ?? {};
  const maxBreaths = clampBreaths(input.maxBreaths);
  const maxCostlyBreaths = 1;

  const stateStore = await Actor.openKeyValueStore(STORE_NAME);
  const existing = await stateStore.getValue(STORE_KEY);
  const canonical = reconcileCanonicalControlPlane(existing, seed);
  const garden = canonical.garden;
  const legacy = migrateLegacyRuntimeState(garden);
  const manifestSync = await syncFruitManifests(garden);

  let observationIngest = null;
  if (input.observation) {
    observationIngest = ingestFruitObservation(garden, input.observation);
  }

  const geometryBefore = geometrySnapshot(garden);
  const startingPressure = classifyPressure(garden);
  const wake = classifyWake({
    pressure: startingPressure,
    event: observationIngest?.event ?? null,
  });

  garden.status ??= {};
  garden.status.lastWakeDecision = {
    ...wake,
    at: new Date().toISOString(),
    pressure: startingPressure,
  };

  log.info('Flower wake decision', {
    wake,
    pressure: startingPressure,
    canonicalReconciliation: canonical.changes,
    legacyMigrations: legacy.stateMigrations,
    manifestChanges: manifestSync.changes,
    observationChanged: observationIngest?.changed ?? false,
  });

  if (!wake.wake) {
    await stateStore.setValue(STORE_KEY, garden);
    const output = {
      ok: true,
      skipped: true,
      wake,
      pressure: startingPressure,
      reasonerConstructed: false,
      pulseCount: Number(garden.status.pulseCount ?? 0),
      persistentStore: STORE_NAME,
      canonicalReconciliation: canonical.changes,
      legacyMigrations: legacy.stateMigrations,
      epistemicRepairs: legacy.repaired,
      manifestChanges: manifestSync.changes,
      observationIngest: observationIngest
        ? { changed: observationIngest.changed, reason: observationIngest.reason }
        : null,
      activeOpportunities: activeOpportunitySnapshot(garden),
      geometry: geometryBefore,
    };
    await writeOutput(output);
    log.info('Flower pulse skipped', output);
    return;
  }

  const reasoner = new OpenAIReasoner();
  let result;
  try {
    result = await pulse({
      garden,
      reasoner,
      maxBreaths,
      maxCostlyBreaths,
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
      pulseCount: Number(garden.status.pulseCount ?? 0),
      persistentStore: STORE_NAME,
      canonicalReconciliation: canonical.changes,
      legacyMigrations: legacy.stateMigrations,
      epistemicRepairs: legacy.repaired,
      manifestChanges: manifestSync.changes,
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
    breaths: result.breaths.map((x) => ({
      pressure: x.pressure,
      costClass: x.costClass,
      summary: x.result.summary,
    })),
    microBreaths: result.breaths.length,
    runBudget: result.runBudget,
    stoppedByCostFrontier: result.stoppedByCostFrontier,
    nextPressure: classifyPressure(garden),
    activeOpportunities: activeOpportunitySnapshot(garden),
    geometry: geometryAfter,
    growthYield: yieldSnapshot,
    pendingApprovals: (garden.approvals ?? []).filter((x) => x.status === 'pending'),
    generation: garden.status.generation,
    pulseCount: garden.status.pulseCount,
    persistentStore: STORE_NAME,
    canonicalReconciliation: canonical.changes,
    legacyMigrations: legacy.stateMigrations,
    epistemicRepairs: legacy.repaired,
    manifestChanges: manifestSync.changes,
    observationIngest: observationIngest
      ? { changed: observationIngest.changed, reason: observationIngest.reason }
      : null,
  };

  await writeOutput(output);
  log.info('Flower pulse complete', {
    microBreaths: output.microBreaths,
    runBudget: output.runBudget,
    nextPressure: output.nextPressure,
    growthYield: output.growthYield,
  });
});
