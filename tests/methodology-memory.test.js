import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createMethodologyMutationRecord,
  methodologyMutationReuseDecision,
  verifyMethodologyMutationChain,
} from '../src/core/methodology-memory.js';

const proposal = {
  id: 'mut_sparse_prompt_projection',
  thesis: 'Project only decision-relevant state across costly cognition boundaries.',
  changeType: 'execution_optimization',
  domains: ['execution'],
  affectedDecisions: ['FALSIFY'],
  causalInputs: ['target geometry neighborhood'],
  preservedComplexity: ['all decision-capable fields', 'global fallback'],
  falsifier: 'Projected view changes the governed decision relative to full state.',
  rollback: 'Use full Garden view.',
  stoppingCondition: 'Stop if no measured payload reduction or any decision regression appears.',
};

const evidenceA = {
  ciPass: true,
  formalEquivalence: true,
  measuredEfficiencyImprovement: true,
  measuredDecisionImprovement: false,
  noMaterialEfficiencyRegression: true,
  protectedInvariantRegressions: [],
  decisionCapabilityRegressions: [],
};

test('identical methodology proposal and evidence reuses prior assessment instead of reevaluating', () => {
  const first = createMethodologyMutationRecord({ proposal, evidence: evidenceA, observedAt: '2026-08-30T00:00:00.000Z' });
  const decision = methodologyMutationReuseDecision({ proposal, evidence: evidenceA, priorRecords: [first] });
  assert.equal(decision.action, 'reuse_prior_assessment');
  assert.equal(decision.priorRecord.recordHash, first.recordHash);
});

test('same semantic proposal with reordered set-like fields has the same fingerprint', () => {
  const first = createMethodologyMutationRecord({ proposal, evidence: evidenceA });
  const reordered = structuredClone(proposal);
  reordered.affectedDecisions = [...proposal.affectedDecisions].reverse();
  reordered.causalInputs = [...proposal.causalInputs].reverse();
  reordered.preservedComplexity = [...proposal.preservedComplexity].reverse();
  reordered.domains = [...proposal.domains].reverse();
  const decision = methodologyMutationReuseDecision({ proposal: reordered, evidence: evidenceA, priorRecords: [first] });
  assert.equal(decision.action, 'reuse_prior_assessment');
});

test('new evidence reopens the same methodology proposal without treating it as a novel idea', () => {
  const first = createMethodologyMutationRecord({ proposal, evidence: evidenceA });
  const evidenceB = { ...evidenceA, measuredEfficiencyImprovement: false, measuredDecisionImprovement: true };
  const decision = methodologyMutationReuseDecision({ proposal, evidence: evidenceB, priorRecords: [first] });
  assert.equal(decision.action, 'reevaluate');
  assert.equal(decision.reason, 'same_proposal_new_evidence');
});

test('hash-linked methodology records preserve assessment ancestry and detect tampering', () => {
  const first = createMethodologyMutationRecord({ proposal, evidence: evidenceA });
  const second = createMethodologyMutationRecord({
    proposal,
    evidence: { ...evidenceA, measuredDecisionImprovement: true },
    previousRecordHash: first.recordHash,
  });
  assert.equal(verifyMethodologyMutationChain([first, second]).ok, true);

  const tampered = structuredClone([first, second]);
  tampered[0].proposal.thesis = 'tampered';
  assert.equal(verifyMethodologyMutationChain(tampered).ok, false);
});
