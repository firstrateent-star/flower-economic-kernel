import { classifyPressure } from './pressure.js';
import { classifyWake } from './wake.js';
import { ingestFruitObservation } from './observations.js';
import { migrateLegacyRuntimeState } from './legacy-state-migrations.js';
import { syncFruitManifests } from './fruit-forge.js';
import { reconcileDistributionTruth } from './distribution-truth.js';

export async function prepareRuntimeState({
  garden,
  rootDir = process.cwd(),
  observation = null,
  applyLegacyMigrations = true,
} = {}) {
  if (!garden) throw new Error('prepareRuntimeState requires a Garden.');

  const legacy = applyLegacyMigrations
    ? migrateLegacyRuntimeState(garden)
    : { repaired: [], stateMigrations: [] };

  const manifestSync = await syncFruitManifests(garden, { rootDir });
  const distributionTruth = reconcileDistributionTruth(garden);
  const observationIngest = observation
    ? ingestFruitObservation(garden, observation)
    : null;

  const pressure = classifyPressure(garden);
  const wake = classifyWake({
    pressure,
    event: observationIngest?.event ?? null,
  });

  return {
    garden,
    pressure,
    wake,
    legacy,
    manifestSync,
    distributionTruth,
    observationIngest,
  };
}
