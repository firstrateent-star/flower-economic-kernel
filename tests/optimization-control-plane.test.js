import test from 'node:test';
import assert from 'node:assert/strict';
import {
  assessAdaptiveHeadroom,
  assessTerminalProgressRoute,
  classifyExecutionShape,
  compareTerminalProgressRoutes,
  detectSharedConstraints,
  shadowOptimizationControlPlane,
} from '../research/value-transfer/optimization-control-plane.js';

test('short semantic dependency stays with direct tooling in shadow mode', () => {
  const result = classifyExecutionShape({
    deterministicChainLength: 2,
    repeatedCalls: 2,
    intermediateBytes: 4000,
    toolCatalogSize: 10,
    semanticDependency: true,
    deterministicReductionAvailable: true,
  });
  assert.equal(result.recommendation, 'direct_semantic_tooling');
  assert.equal(result.runtimeAuthority, false);
});

test('large deterministic fanout recommends local reduction before model exposure', () => {
  const result = classifyExecutionShape({
    deterministicChainLength: 12,
    repeatedCalls: 30,
    intermediateBytes: 200000,
    toolCatalogSize: 80,
    semanticDependency: false,
    deterministicReductionAvailable: true,
  });
  assert.equal(result.recommendation, 'local_deterministic_reduction');
});

test('semantic decision after large deterministic stage recommends hybrid shape', () => {
  const result = classifyExecutionShape({
    deterministicChainLength: 10,
    repeatedCalls: 20,
    intermediateBytes: 100000,
    toolCatalogSize: 60,
    semanticDependency: true,
    deterministicReductionAvailable: true,
  });
  assert.equal(result.recommendation, 'hybrid_reduce_then_semantic');
});

test('missing task-shape evidence does not manufacture an execution recommendation', () => {
  const result = classifyExecutionShape({ semanticDependency: false });
  assert.equal(result.recommendation, 'insufficient_evidence');
  assert.ok(result.evidenceCoverage < 1);
});

test('terminal progress requires a named scale, verified evidence, and protected outcome', () => {
  const missing = assessTerminalProgressRoute({
    id: 'route-a',
    expectedProgressDelta: 0.4,
    incrementalCost: 2,
  });
  assert.equal(missing.comparable, false);
  assert.equal(missing.terminalProgressDensity, null);

  const valid = assessTerminalProgressRoute({
    id: 'route-b',
    progressScale: 'external-evidence-gate-closure',
    expectedProgressDelta: 0.4,
    incrementalCost: 2,
    progressEvidenceVerified: true,
    outcomeProtected: true,
  });
  assert.equal(valid.comparable, true);
  assert.equal(valid.terminalProgressDensity, 0.2);
});

test('terminal progress routes rank only inside the same named scale', () => {
  const result = compareTerminalProgressRoutes([
    { id: 'cheap', progressScale: 'gate-closure', expectedProgressDelta: 0.4, incrementalCost: 2, progressEvidenceVerified: true, outcomeProtected: true },
    { id: 'costly', progressScale: 'gate-closure', expectedProgressDelta: 0.6, incrementalCost: 6, progressEvidenceVerified: true, outcomeProtected: true },
    { id: 'other-chart', progressScale: 'prediction-quality', expectedProgressDelta: 0.9, incrementalCost: 1, progressEvidenceVerified: true, outcomeProtected: true },
  ]);
  assert.equal(result.frontiers.length, 2);
  assert.equal(result.frontiers.find((x) => x.progressScale === 'gate-closure').bestRouteId, 'cheap');
  assert.equal(result.deterministicCrossScaleChoiceAuthorized, false);
});

test('stable equivalent policy suppresses unnecessary adaptive cognition in shadow mode', () => {
  const result = assessAdaptiveHeadroom({
    policyStable: true,
    decisionEquivalentWitness: true,
    nonStationarityDetected: false,
    unresolvedConflict: false,
    materialUncertainty: false,
  });
  assert.equal(result.recommendation, 'preserve_stable_policy');
  assert.equal(result.runtimeAuthority, false);
});

test('non-stationarity creates an adaptive cognition challenger without authorizing it', () => {
  const result = assessAdaptiveHeadroom({
    policyStable: true,
    decisionEquivalentWitness: true,
    nonStationarityDetected: true,
    expectedAdaptationGain: 20,
    adaptiveCost: 5,
  });
  assert.equal(result.recommendation, 'adaptive_cognition_candidate');
  assert.equal(result.expectedGainDensity, 4);
  assert.equal(result.runtimeAuthority, false);
});

test('shared constraint detector finds overlap but does not claim leverage', () => {
  const result = detectSharedConstraints([
    { id: 'a', constraints: ['distribution access', 'dns executor'] },
    { id: 'b', constraints: ['distribution access'] },
    { id: 'c', constraints: ['DNS EXECUTOR', 'human authority'] },
  ]);

  assert.deepEqual(result.map((x) => x.constraint), ['distribution access', 'dns executor']);
  assert.ok(result.every((x) => x.leverageVerified === false));
});

test('control plane keeps action and progress charts separate and remains shadow-only', () => {
  const result = shadowOptimizationControlPlane({
    actions: [
      { id: 'probe', decisionChangeProbability: 0.5, decisionStakes: 1000, incrementalCost: 10 },
      { id: 'act', expectedValueDelta: 100, incrementalCost: 10 },
    ],
    progressRoutes: [
      { id: 'route', progressScale: 'external-evidence-gate-closure', expectedProgressDelta: 0.5, incrementalCost: 2, progressEvidenceVerified: true, outcomeProtected: true },
    ],
    stage: {
      deterministicChainLength: 2,
      repeatedCalls: 1,
      intermediateBytes: 2000,
      toolCatalogSize: 5,
      semanticDependency: true,
      deterministicReductionAvailable: true,
    },
    headroom: {
      policyStable: true,
      decisionEquivalentWitness: true,
    },
    branches: [
      { id: 'a', constraints: ['distribution access'] },
      { id: 'b', constraints: ['distribution access'] },
    ],
  });

  assert.equal(result.marginalFrontier.bestInformationActionId, 'probe');
  assert.equal(result.marginalFrontier.bestDirectValueActionId, 'act');
  assert.equal(result.terminalProgressFrontier.frontiers[0].bestRouteId, 'route');
  assert.equal(result.adaptiveHeadroom.recommendation, 'preserve_stable_policy');
  assert.equal(result.authority, 'shadow_only');
  assert.equal(result.externalValueVerified, false);
  assert.equal(result.canonicalPromotionAuthorized, false);
});
