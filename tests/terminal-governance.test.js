import test from 'node:test';
import assert from 'node:assert/strict';
import { classifyTerminalCandidate, recursionShouldYieldToAction, scoreTerminalCandidate, shouldChallengeHumanBoundaryWithExploration } from '../src/core/terminal-governance.js';

test('strong terminal path requires witnessed demand, access, fulfillment, distribution, and a legitimate capture path', () => {
  const candidate = {
    demandEvidence: 0.9,
    demandAccess: 0.9,
    needIntensity: 0.8,
    trustAvailability: 0.8,
    fulfillmentConfidence: 0.95,
    distributionReachability: 0.9,
    expectedNetValueUsd: 2500,
    repeatability: 0.7,
    humanBurden: 0.3,
    capitalBurden: 0,
    latency: 0.1,
    terminalEvidence: 'settled_payment',
    externalValueEvidence: 'buyer receives verified useful transformation',
    valueCapturePath: 'owned platform settlement rail',
    reinvestmentPath: 'surplus may fund the next bounded experiment after settlement',
    offerIntegrity: true,
  };

  const result = classifyTerminalCandidate(candidate);
  assert.equal(result.gate.buildEligible, true);
  assert.ok(['terminal_priority', 'terminal_eligible'].includes(result.state));
  assert.ok(result.fruitVelocity > 0);
});

test('unknown distribution cannot be laundered into build eligibility by a high score', () => {
  const result = classifyTerminalCandidate({
    demandEvidence: 0.95,
    demandAccess: 0.95,
    needIntensity: 0.95,
    trustAvailability: 0.95,
    fulfillmentConfidence: 0.95,
    expectedNetValueUsd: 100000,
    repeatability: 0.95,
    terminalEvidence: 'settled_payment',
    valueCapturePath: 'owned settlement rail',
  });

  assert.equal(result.gate.buildEligible, false);
  assert.equal(result.unknowns.distribution, true);
  assert.equal(result.state, 'probe_missing_evidence');
});

test('unknown capture path cannot be laundered into build eligibility by demand and distribution', () => {
  const result = classifyTerminalCandidate({
    demandEvidence: 0.95,
    demandAccess: 0.95,
    needIntensity: 0.95,
    trustAvailability: 0.95,
    fulfillmentConfidence: 0.95,
    distributionReachability: 0.95,
    expectedNetValueUsd: 100000,
    repeatability: 0.95,
    terminalEvidence: 'settled_payment',
  });

  assert.equal(result.gate.buildEligible, false);
  assert.equal(result.unknowns.capturePath, true);
  assert.equal(result.state, 'probe_missing_evidence');
});

test('capture without evidence of external value is treated as an extraction-risk reframe', () => {
  const result = classifyTerminalCandidate({
    demandEvidence: 0.9,
    demandAccess: 0.9,
    needIntensity: 0.9,
    trustAvailability: 0.9,
    fulfillmentConfidence: 0.9,
    distributionReachability: 0.9,
    expectedNetValueUsd: 1000,
    valueCapturePath: 'settlement rail',
    capturedReturnUsd: 10,
    returnAttribution: 'owned settlement receipt',
  });

  assert.equal(result.gate.buildEligible, false);
  assert.equal(result.regenerativeValue.antiExtractionRisk, true);
  assert.equal(result.state, 'reframe_capture_value_relationship');
});

test('low human burden improves a validated path but is not itself a demand or fulfillment gate', () => {
  const passiveUnknown = scoreTerminalCandidate({
    humanBurden: 0,
    capitalBurden: 0,
    latency: 0,
    expectedNetValueUsd: 1000,
  });
  assert.equal(passiveUnknown.gate.buildEligible, false);
  assert.ok(passiveUnknown.evidenceCompleteness < 1);
});

test('one fresh field challenge may precede an unchosen human boundary without looping forever', () => {
  const base = {
    center: { searchPolicy: { challengeHumanBoundaryWithFreshSearch: true } },
    opportunities: [],
    approvals: [],
    events: [],
    experiments: [],
    status: { lastPressure: 'STILLNESS' },
  };
  assert.equal(shouldChallengeHumanBoundaryWithExploration(base), true);
  assert.equal(shouldChallengeHumanBoundaryWithExploration({ ...base, status: { lastPressure: { type: 'EXPAND' } } }), false);
});

test('safe action outranks ceremonial recursion when its expected value is higher', () => {
  assert.equal(recursionShouldYieldToAction({ expectedActionValue: 0.7, expectedAnalysisValue: 0.2, actionSafe: true }), true);
  assert.equal(recursionShouldYieldToAction({ expectedActionValue: 0.7, expectedAnalysisValue: 0.2, actionSafe: false }), false);
});
