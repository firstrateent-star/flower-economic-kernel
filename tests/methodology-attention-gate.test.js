import test from 'node:test';
import assert from 'node:assert/strict';
import {
  assessMethodologyRecursion,
  assessMethodologyResidency,
} from '../research/methodology/methodology-attention-gate.js';

test('conceptual novelty without decision/evidence/dividend path rests', () => {
  const result = assessMethodologyRecursion({ conceptualNoveltyOnly: true });
  assert.equal(result.recommendation, 'REST');
});

test('safe higher-value action outranks methodology recursion', () => {
  const result = assessMethodologyRecursion({
    newMethodEvidence: true,
    internalImprovementOpportunity: true,
    actionAvailableNow: true,
    actionExpectedValueExceedsRecursion: true,
  });
  assert.equal(result.recommendation, 'ACT');
});

test('live decision-changing evidence pressure can earn recursion', () => {
  const result = assessMethodologyRecursion({
    newMethodEvidence: true,
    expectedDecisionChange: true,
  });
  assert.equal(result.recommendation, 'RECURSE');
});

test('decision-equivalent candidate becomes merge candidate rather than another hot law', () => {
  const result = assessMethodologyResidency({
    affectedDecision: 'whether to revalidate an upstream constraint',
    canChangeDecision: true,
    duplicateDecisionEffect: true,
    distinctProvenanceWorthPreserving: true,
  });
  assert.equal(result.residency, 'MERGE_CANDIDATE');
  assert.equal(result.canonicalPromotionAuthorized, false);
});

test('decision-relevant rule stays cold when recurring activation is unnecessary', () => {
  const result = assessMethodologyResidency({
    affectedDecision: 'whether an external benchmark licenses promotion',
    canChangeDecision: true,
    newEvidence: true,
    measurableFalsifier: true,
    internalDividendPath: true,
    recurringActivationNeeded: false,
  });
  assert.equal(result.residency, 'COLD_REFERENCE');
});

test('hot candidate requires decision relevance, evidence pressure, falsifier, dividend, and recurring need', () => {
  const result = assessMethodologyResidency({
    affectedDecision: 'whether another methodology recursion should run',
    canChangeDecision: true,
    unresolvedDecision: true,
    measurableFalsifier: true,
    centerDividendPath: true,
    recurringActivationNeeded: true,
  });
  assert.equal(result.residency, 'HOT_CANDIDATE');
  assert.equal(result.canonicalPromotionAuthorized, false);
});
