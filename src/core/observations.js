import { id, nowIso } from './utils.js';
import { materialObservationChanged } from './wake.js';

function clone(value) {
  return value == null ? value : structuredClone(value);
}

export function ingestFruitObservation(garden, observation) {
  if (!observation) return { changed: false, event: null, reason: 'no_observation' };
  if (!observation.fruitId) throw new Error('Fruit observation requires fruitId.');

  const fruit = (garden.fruits ?? []).find((x) => x.id === observation.fruitId);
  if (!fruit) throw new Error(`Fruit observation target not found: ${observation.fruitId}`);

  const truth = clone(observation.truth ?? {});
  const metrics = clone(observation.metrics ?? {});
  const source = observation.source ?? 'unspecified_sensor';
  const observedAt = observation.observedAt ?? nowIso();

  garden.observations ??= {};
  const previousRecord = garden.observations[observation.fruitId] ?? null;
  const previousTruth = previousRecord?.truth ?? null;
  const material = materialObservationChanged(previousTruth, truth);

  const record = {
    fruitId: observation.fruitId,
    source,
    observedAt,
    truth,
    metrics,
  };
  garden.observations[observation.fruitId] = record;

  fruit.lastObservation = record;
  if (!material) {
    return {
      changed: false,
      event: null,
      reason: 'non_material_observation',
      previousTruth: clone(previousTruth),
      currentTruth: clone(truth),
    };
  }

  fruit.observedTruth = {
    ...(fruit.observedTruth ?? {}),
    ...truth,
  };
  fruit.lastMaterialObservationAt = observedAt;

  const changedKeys = [...new Set([
    ...Object.keys(previousTruth ?? {}),
    ...Object.keys(truth ?? {}),
  ])].filter((key) => JSON.stringify(previousTruth?.[key]) !== JSON.stringify(truth?.[key]));

  const event = {
    id: id('event'),
    status: 'new',
    at: observedAt,
    type: 'FRUIT_MATERIAL_OBSERVATION',
    fruitId: observation.fruitId,
    source,
    changedKeys,
    previousTruth: clone(previousTruth),
    currentTruth: clone(truth),
    summary: `${fruit.name} changed on decision-relevant observation field(s): ${changedKeys.join(', ') || 'initial material truth'}.`,
  };
  garden.events ??= [];
  garden.events.push(event);

  return {
    changed: true,
    event,
    reason: 'material_observation',
    previousTruth: clone(previousTruth),
    currentTruth: clone(truth),
  };
}
