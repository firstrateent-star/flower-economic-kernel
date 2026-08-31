import test from 'node:test';
import assert from 'node:assert/strict';
import {
  classifyExecutionShape,
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

test('shared constraint detector finds overlap but does not claim leverage', () => {
  const result = detectSharedConstraints([
    { id: 'a', constraints: ['distribution access', 'dns executor'] },
    { id: 'b', constraints: ['distribution access'] },
    { id: 'c', constraints: ['DNS EXECUTOR', 'human authority'] },
  ]);

  assert.deepEqual(result.map((x) => x.constraint), ['distribution access', 'dns executor']);
  assert.ok(result.every((x) => x.leverageVerified === false));
});

test('control plane keeps action charts separate and remains shadow-only', () => {
  const result = shadowOptimizationControlPlane({
    actions: [
      { id: 'probe', decisionChangeProbability: 0.5, decisionStakes: 1000, incrementalCost: 10 },
      { id: 'act', expectedValueDelta: 100, incrementalCost: 10 },
    ],
    stage: {
      deterministicChainLength: 2,
      repeatedCalls: 1,
      intermediateBytes: 2000,
      toolCatalogSize: 5,
      semanticDependency: true,
      deterministicReductionAvailable: true,
    },
    branches: [
      { id: 'a', constraints: ['distribution access'] },
      { id: 'b', constraints: ['distribution access'] },
    ],
  });

  assert.equal(result.marginalFrontier.bestInformationActionId, 'probe');
  assert.equal(result.marginalFrontier.bestDirectValueActionId, 'act');
  assert.equal(result.authority, 'shadow_only');
  assert.equal(result.externalValueVerified, false);
  assert.equal(result.canonicalPromotionAuthorized, false);
});
