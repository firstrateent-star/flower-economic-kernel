import assert from 'node:assert/strict';
import { scorePressureSurface, classifySurface } from '../src/core/field-score.js';

const strong = {
  valueAtStakeUsd: 1000000,
  urgency: .9,
  reroutability: .9,
  observability: .9,
  machineAddressability: .95,
  dependencyMultiplier: 1.5,
  compensationAttachment: .8,
  returnQuality: .9,
  overlapDensity: 1.5,
  humanBurden: .1,
  capitalBurden: 0,
  regulatoryFriction: .2,
  competition: .25,
  latency: .2,
  extractionRisk: .1,
};

const hugeButLocked = {
  ...strong,
  valueAtStakeUsd: 1_000_000_000,
  reroutability: .05,
  machineAddressability: .1,
};

const manual = {
  ...strong,
  humanBurden: .9,
};

assert.equal(scorePressureSurface(strong).gate.observable, true);
assert.equal(classifySurface(strong).state, 'nursery_priority');
assert.equal(classifySurface(hugeButLocked).state, 'observe_or_prune');
assert.equal(classifySurface(manual).state, 'observe_or_prune');
assert.ok(scorePressureSurface(strong).score > scorePressureSurface(hugeButLocked).score);
console.log('field-score tests passed');
