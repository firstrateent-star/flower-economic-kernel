import { id, nowIso } from './utils.js';
import { materialObservationChanged } from './wake.js';

function clone(value) {
  return value == null ? value : structuredClone(value);
}

const DIRECT_FRUIT_TRUTH_KEYS = new Set([
  'independentUser',
  'chargedEvent',
  'creatorRevenue',
  'creatorRevenueUsd',
  'settledValue',
  'settledValueUsd',
  'repeatDemand',
  'agenticPaymentEligible',
  'marketTruth',
  'externalUsage',
]);

const IMPACT_DOMAIN_BY_KEY = {
  independentUser: 'market_return',
  chargedEvent: 'market_return',
  creatorRevenue: 'market_return',
  creatorRevenueUsd: 'market_return',
  settledValue: 'market_return',
  settledValueUsd: 'market_return',
  repeatDemand: 'market_return',
  marketTruth: 'market_return',
  externalUsage: 'market_return',
  agenticPaymentEligible: 'distribution_access',
  status: 'lifecycle_observation',
};

function changedObservationKeys(previousTruth, truth) {
  return [...new Set([
    ...Object.keys(previousTruth ?? {}),
    ...Object.keys(truth ?? {}),
  ])].filter((key) => JSON.stringify(previousTruth?.[key]) !== JSON.stringify(truth?.[key]));
}

function projectDirectFruitTruth(fruit, truth, changedKeys) {
  const projectedKeys = [];
  for (const key of changedKeys) {
    if (!DIRECT_FRUIT_TRUTH_KEYS.has(key)) continue;
    if (truth[key] === undefined) continue;
    fruit[key] = clone(truth[key]);
    projectedKeys.push(key);
  }
  return projectedKeys;
}

function impactFromChangedKeys(fruitId, changedKeys) {
  const domains = [...new Set(changedKeys.map((key) => IMPACT_DOMAIN_BY_KEY[key]).filter(Boolean))];
  return {
    directlyAffectedOrganismIds: [fruitId],
    domains,
    changedKeys: [...changedKeys],
  };
}

export function ingestFruitObservation(garden, observation) {
  if (!observation) return {
    changed: false,
    stateChanged: false,
    event: null,
    reason: 'no_observation',
  };
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

  // Establish exactly one baseline even when it contains only non-material metrics.
  // After that, unchanged truth must not churn Garden timestamps/metrics merely because
  // a sensor polled again. Wake-relevant truth changes create a fresh stored record.
  const shouldStoreRecord = previousRecord == null || material;
  const record = {
    fruitId: observation.fruitId,
    source,
    observedAt,
    truth,
    metrics,
  };

  if (shouldStoreRecord) {
    garden.observations[observation.fruitId] = record;
    fruit.lastObservation = record;
  }

  if (!material) {
    return {
      changed: false,
      stateChanged: shouldStoreRecord,
      event: null,
      reason: previousRecord == null ? 'baseline_observation' : 'non_material_observation',
      previousTruth: clone(previousTruth),
      currentTruth: clone(truth),
    };
  }

  fruit.observedTruth = {
    ...(fruit.observedTruth ?? {}),
    ...truth,
  };
  fruit.lastMaterialObservationAt = observedAt;

  const changedKeys = changedObservationKeys(previousTruth, truth);
  const projectedKeys = projectDirectFruitTruth(fruit, truth, changedKeys);
  const impact = impactFromChangedKeys(observation.fruitId, changedKeys);

  // Sensor status is intentionally not projected into fruit.status. Lifecycle promotion
  // remains governed by Flower transitions; an external observation may inform that
  // decision without silently becoming authority over the organism lifecycle.
  const event = {
    id: id('event'),
    status: 'new',
    at: observedAt,
    type: 'FRUIT_MATERIAL_OBSERVATION',
    fruitId: observation.fruitId,
    source,
    changedKeys,
    projectedKeys,
    impact,
    previousTruth: clone(previousTruth),
    currentTruth: clone(truth),
    summary: `${fruit.name} changed on decision-relevant observation field(s): ${changedKeys.join(', ') || 'initial material truth'}.`,
  };
  garden.events ??= [];
  garden.events.push(event);

  return {
    changed: true,
    stateChanged: true,
    event,
    impact,
    projectedKeys,
    reason: 'material_observation',
    previousTruth: clone(previousTruth),
    currentTruth: clone(truth),
  };
}
