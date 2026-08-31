const OPERATORS = Object.freeze({
  LOCK: Object.freeze({
    purpose: 'Preserve the named terminal objective and protected truth/agency/sovereignty boundaries so proxies cannot silently become ends.',
    implementationFamilies: ['terminal-objective-lock', 'value-field-membrane', 'authority-boundaries'],
  }),
  PROJECT: Object.freeze({
    purpose: 'Activate the smallest causally sufficient state and doctrine capable of changing the governed decision.',
    implementationFamilies: ['sparse-activation', 'methodology-projection', 'hot-cold-memory', 'semantic-indexing', 'cache-friendly-stable-spine'],
  }),
  PROBE: Object.freeze({
    purpose: 'Choose the cheapest reversible action or information that can materially change allocation or uncertainty.',
    implementationFamilies: ['marginal-value', 'marginal-information', 'headroom', 'shared-constraint-leverage', 'phi-fibonacci-bounded-search'],
  }),
  ACT: Object.freeze({
    purpose: 'Use the minimum sufficient execution surface, model, reasoning depth, scaffold, or deterministic computation for the chosen transition.',
    implementationFamilies: ['execution-mode-routing', 'model-routing', 'deterministic-reduction', 'configuration-routing'],
  }),
  VERIFY: Object.freeze({
    purpose: 'Compare outcome and resource use against an appropriate baseline or counterfactual; preserve regressions and uncertainty.',
    implementationFamilies: ['self-improvement-observatory', 'regression-memory', 'terminal-progress', 'center-dividend', 'external-value-witness'],
  }),
  CRYSTALLIZE_REST: Object.freeze({
    purpose: 'Compile validated repeated structure into cheaper reusable form, or remain still when another cycle has lower expected value.',
    implementationFamilies: ['validated-crystallization', 'fixed-point-convergence', 'attention-gate', 'stop-membrane'],
  }),
});

export function minimalCausalFlower() {
  return {
    operators: structuredClone(OPERATORS),
    sequence: Object.keys(OPERATORS),
    canonicalReplacementAuthorized: false,
    claim: 'This is a causal compression hypothesis for the current Flower surface ontology, not proof that six operators preserve every governed distinction.',
  };
}

export function assessOperatorResidency(operatorId, evidence = {}) {
  const operator = OPERATORS[operatorId];
  if (!operator) {
    return { operatorId, state: 'unknown_operator', hotResidencyAuthorized: false };
  }

  const decisionChanged = evidence.decisionChanged === true;
  const protectedOutcomeWorsenedWithout = evidence.protectedOutcomeWorsenedWithout === true;
  const scarceResourceImprovedWith = evidence.scarceResourceImprovedWith === true;
  const compensatingRegression = evidence.compensatingRegression === true;

  const earned = !compensatingRegression && (decisionChanged || protectedOutcomeWorsenedWithout || scarceResourceImprovedWith);
  return {
    operatorId,
    state: earned ? 'hot_residency_candidate' : 'residency_unverified',
    hotResidencyAuthorized: false,
    evidenceNeeded: earned ? 'paired/ablation replication before promotion' : 'same-workload ablation showing causal contribution',
  };
}

export function flowerBenchAblationPlan() {
  const sequence = Object.keys(OPERATORS);
  return {
    baselines: [
      'simple_direct_or_fixed_workflow',
      'ordinary_tool_using_or_react_style_agent',
      'minimal_integrated_flower_candidate',
    ],
    addOne: sequence.map((operator) => `baseline_plus_${operator}`),
    leaveOneOut: sequence.map((operator) => `minimal_flower_without_${operator}`),
    protectedOutcomes: [
      'terminal_success_and_objective_fidelity',
      'proxy_substitution_or_decision_error',
      'effective_cache_adjusted_inference_cost',
      'latency',
      'tool_and_model_calls',
      'human_interventions',
      'unauthorized_or_irreversible_action_rate',
      'unnecessary_recursive_cycles',
      'state_stability_under_unchanged_reality',
      'reconstructibility_when_provenance_is_decision_relevant',
    ],
    oneScoreAuthorized: false,
    canonicalPromotionAuthorized: false,
  };
}
