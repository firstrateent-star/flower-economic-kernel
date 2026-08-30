import test from 'node:test';
import assert from 'node:assert/strict';
import { evaluateValueField } from '../src/core/value-field.js';
import { classifyTerminalCandidate } from '../src/core/terminal-governance.js';

function economicallyStrong(overrides = {}) {
  return {
    demandEvidence: 0.9,
    demandAccess: 0.9,
    needIntensity: 0.9,
    trustAvailability: 0.9,
    fulfillmentConfidence: 0.95,
    distributionReachability: 0.9,
    expectedNetValueUsd: 5000,
    repeatability: 0.8,
    terminalEvidence: 'settled_payment',
    valueCapturePath: 'owned settlement rail',
    offerIntegrity: true,
    ...overrides,
  };
}

test('value field remains vector-valued and does not manufacture a scalar flourishing score', () => {
  const result = evaluateValueField({
    valueEffects: {
      agency: { state: 'positive', evidenceVerified: true, material: true },
      truth: { state: 'preserved', evidenceVerified: true, material: true },
      wellbeing: { state: 'unknown' },
    },
  });

  assert.equal(result.scalarized, false);
  assert.equal('score' in result, false);
  assert.ok(result.verifiedMaterialImprovements.includes('agency'));
  assert.ok(result.unknowns.includes('wellbeing'));
});

test('verified material regression blocks a locally attractive economic candidate', () => {
  const result = classifyTerminalCandidate(economicallyStrong({
    valueEffects: {
      agency: {
        state: 'negative',
        evidenceVerified: true,
        material: true,
        note: 'The branch requires deceptive lock-in that materially reduces user agency.',
      },
    },
  }));

  assert.equal(result.gate.noVerifiedMaterialValueRegression, false);
  assert.equal(result.gate.buildEligible, false);
  assert.equal(result.state, 'reframe_material_value_regression');
  assert.deepEqual(result.valueField.verifiedMaterialRegressions, ['agency']);
});

test('unknown broader value effects remain visible but do not become an automatic veto', () => {
  const result = classifyTerminalCandidate(economicallyStrong());

  assert.equal(result.valueField.unknowns.length > 0, true);
  assert.equal(result.gate.noVerifiedMaterialValueRegression, true);
  assert.equal(result.gate.buildEligible, true);
  assert.ok(['terminal_priority', 'terminal_eligible'].includes(result.state));
});

test('unverified negative narrative cannot block or prove a material regression', () => {
  const result = classifyTerminalCandidate(economicallyStrong({
    valueEffects: {
      resilience: { state: 'negative', evidenceVerified: false, material: true },
    },
  }));

  assert.equal(result.valueField.verifiedMaterialRegressions.length, 0);
  assert.equal(result.gate.noVerifiedMaterialValueRegression, true);
  assert.equal(result.gate.buildEligible, true);
});

test('mixed effects remain explicit as tradeoffs rather than averaged into local value', () => {
  const field = evaluateValueField({
    valueEffects: {
      resourceEfficiency: { state: 'mixed', evidenceVerified: true, material: true },
    },
  });

  assert.deepEqual(field.tradeoffs, ['resourceEfficiency']);
  assert.equal(field.noVerifiedMaterialRegression, true);
});
