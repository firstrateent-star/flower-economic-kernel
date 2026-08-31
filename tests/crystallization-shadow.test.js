import test from 'node:test';
import assert from 'node:assert/strict';
import {
  detectCrystallizationCandidates,
  crystallizationShadowReport,
} from '../research/value-transfer/crystallization-shadow.js';

const trace = (id, type, action, changed = true) => ({
  id,
  pressure: { type },
  action,
  changed,
  methodologyVersion: '2026-08-30.integrated-v5',
});

test('detects repeated procedural subsequences but does not authorize compilation', () => {
  const traces = [
    trace('1', 'VERIFY_FRUIT', 'VERIFY_FRUIT'),
    trace('2', 'INTEGRATE', 'INTEGRATE'),
    trace('3', 'VERIFY_FRUIT', 'VERIFY_FRUIT'),
    trace('4', 'INTEGRATE', 'INTEGRATE'),
  ];
  const candidates = detectCrystallizationCandidates(traces, { minLength: 2, maxLength: 2, minRepeats: 2 });
  assert.equal(candidates.length, 1);
  assert.equal(candidates[0].purelyProceduralCandidate, true);
  assert.equal(candidates[0].compilationAuthorized, false);
  assert.equal(candidates[0].changedPatternStable, true);
});

test('semantic reasoning sequences remain boundary-bearing even when repeated', () => {
  const traces = [
    trace('1', 'FALSIFY', 'FALSIFY'),
    trace('2', 'EXPERIMENT', 'EXPERIMENT'),
    trace('3', 'FALSIFY', 'FALSIFY'),
    trace('4', 'EXPERIMENT', 'EXPERIMENT'),
  ];
  const candidates = detectCrystallizationCandidates(traces, { minLength: 2, maxLength: 2, minRepeats: 2 });
  assert.equal(candidates.length, 1);
  assert.equal(candidates[0].purelyProceduralCandidate, false);
  assert.ok(candidates[0].boundaryKinds.includes('semantic_reasoning'));
});

test('unstable changed-state behavior remains visible', () => {
  const traces = [
    trace('1', 'VERIFY_FRUIT', 'VERIFY_FRUIT', true),
    trace('2', 'INTEGRATE', 'INTEGRATE', true),
    trace('3', 'VERIFY_FRUIT', 'VERIFY_FRUIT', false),
    trace('4', 'INTEGRATE', 'INTEGRATE', true),
  ];
  const candidates = detectCrystallizationCandidates(traces, { minLength: 2, maxLength: 2, minRepeats: 2 });
  assert.equal(candidates[0].changedPatternStable, false);
});

test('report over empty Garden stays a valid negative result', () => {
  const report = crystallizationShadowReport({ traces: [] });
  assert.equal(report.traceCount, 0);
  assert.equal(report.candidateCount, 0);
  assert.equal(report.authority, 'shadow_only');
  assert.equal(report.externalValueVerified, false);
});
