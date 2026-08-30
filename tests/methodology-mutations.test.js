import test from 'node:test';
import assert from 'node:assert/strict';
import { assessMethodologyMutation, methodologyMutationTemplate } from '../src/core/methodology-mutations.js';

function completeProposal(overrides = {}) {
  return methodologyMutationTemplate({
    id: 'mutation_sparse_projection_v2',
    thesis: 'A narrower projection can reduce cognition cost without changing the governed decision.',
    changeType: 'execution_optimization',
    domains: ['execution_efficiency'],
    affectedDecisions: ['FALSIFY'],
    causalInputs: ['target geometry neighborhood'],
    preservedComplexity: ['all fields capable of changing FALSIFY outcome', 'global fallback'],
    falsifier: 'Candidate and baseline produce different governed decisions on the equivalence fixture.',
    rollback: 'Restore prior reasoner-view projection.',
    stoppingCondition: 'Stop if equivalence fails or measured payload/cost does not improve.',
    ...overrides,
  });
}

test('incomplete methodology mutations cannot earn promotion', () => {
  const result = assessMethodologyMutation({ id: 'thin' }, { ciPass: true });
  assert.equal(result.eligibleForCanonical, false);
  assert.equal(result.state, 'candidate_incomplete');
  assert.ok(result.missingFields.length > 0);
});

test('semantic equivalence plus measured efficiency can earn an execution mutation', () => {
  const result = assessMethodologyMutation(completeProposal(), {
    ciPass: true,
    formalEquivalence: true,
    measuredEfficiencyImprovement: true,
    protectedInvariantRegressions: [],
    decisionCapabilityRegressions: [],
  });
  assert.equal(result.evidenceRoute, 'equivalence_plus_efficiency');
  assert.equal(result.eligibleForCanonical, true);
  assert.equal(result.state, 'supported');
});

test('decision improvement can earn promotion only when material efficiency regression is absent', () => {
  const proposal = completeProposal({
    id: 'mutation_better_causal_selection',
    thesis: 'New causal selection improves intervention quality.',
    changeType: 'decision_capability',
  });
  const result = assessMethodologyMutation(proposal, {
    ciPass: true,
    measuredDecisionImprovement: true,
    noMaterialEfficiencyRegression: true,
    protectedInvariantRegressions: [],
    decisionCapabilityRegressions: [],
  });
  assert.equal(result.evidenceRoute, 'capability_plus_efficiency_safety');
  assert.equal(result.eligibleForCanonical, true);
});

test('protected methodology domains cannot self-promote without explicit human authority', () => {
  const proposal = completeProposal({
    id: 'mutation_sovereignty_change',
    domains: ['sovereignty'],
    thesis: 'Change how sovereignty boundaries are classified.',
  });
  const evidence = {
    ciPass: true,
    formalEquivalence: true,
    measuredEfficiencyImprovement: true,
    protectedInvariantRegressions: [],
    decisionCapabilityRegressions: [],
  };
  const blocked = assessMethodologyMutation(proposal, evidence);
  assert.equal(blocked.state, 'supported_requires_human_authority');
  assert.equal(blocked.eligibleForCanonical, false);
  assert.equal(blocked.humanAuthorizationRequired, true);

  const authorized = assessMethodologyMutation(proposal, { ...evidence, humanAuthorization: true });
  assert.equal(authorized.eligibleForCanonical, true);
  assert.equal(authorized.state, 'supported');
});

test('ownership and surplus-allocation authority are protected human domains', () => {
  const evidence = {
    ciPass: true,
    formalEquivalence: true,
    measuredEfficiencyImprovement: true,
    protectedInvariantRegressions: [],
    decisionCapabilityRegressions: [],
  };

  for (const domain of ['ownership_authority', 'surplus_allocation_authority']) {
    const result = assessMethodologyMutation(completeProposal({
      id: `mutation_${domain}`,
      domains: [domain],
      thesis: `Attempt to change ${domain}.`,
    }), evidence);
    assert.equal(result.protectedDomain, true);
    assert.equal(result.humanAuthorizationRequired, true);
    assert.equal(result.eligibleForCanonical, false);
    assert.equal(result.state, 'supported_requires_human_authority');
  }
});

test('any protected-invariant or decision-capability regression blocks evidence routes', () => {
  const proposal = completeProposal();
  const result = assessMethodologyMutation(proposal, {
    ciPass: true,
    formalEquivalence: true,
    measuredEfficiencyImprovement: true,
    protectedInvariantRegressions: ['reality_contact'],
    decisionCapabilityRegressions: [],
  });
  assert.equal(result.evidenceRoute, null);
  assert.equal(result.eligibleForCanonical, false);
});
