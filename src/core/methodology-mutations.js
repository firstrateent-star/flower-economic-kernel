const PROTECTED_DOMAINS = new Set([
  'center_orientation',
  'love_orientation',
  'reality_contact',
  'ethics',
  'sovereignty',
  'legal_authority',
  'public_authority',
  'human_identity',
]);

function list(value) {
  return Array.isArray(value) ? value : [];
}

function nonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function requiredProposalGaps(proposal = {}) {
  const gaps = [];
  if (!nonEmptyString(proposal.id)) gaps.push('id');
  if (!nonEmptyString(proposal.thesis)) gaps.push('thesis');
  if (!nonEmptyString(proposal.changeType)) gaps.push('changeType');
  if (list(proposal.affectedDecisions).length === 0) gaps.push('affectedDecisions');
  if (list(proposal.causalInputs).length === 0) gaps.push('causalInputs');
  if (list(proposal.preservedComplexity).length === 0) gaps.push('preservedComplexity');
  if (!nonEmptyString(proposal.falsifier)) gaps.push('falsifier');
  if (!nonEmptyString(proposal.rollback)) gaps.push('rollback');
  if (!nonEmptyString(proposal.stoppingCondition)) gaps.push('stoppingCondition');
  return gaps;
}

export function methodologyMutationTouchesProtectedDomain(proposal = {}) {
  return list(proposal.domains).some((domain) => PROTECTED_DOMAINS.has(domain));
}

function evidenceRoute(evidence = {}) {
  const invariantSafe = list(evidence.protectedInvariantRegressions).length === 0;
  const complexitySafe = list(evidence.decisionCapabilityRegressions).length === 0;
  if (!evidence.ciPass || !invariantSafe || !complexitySafe) return null;

  const equivalenceRoute = evidence.formalEquivalence === true
    && evidence.measuredEfficiencyImprovement === true;
  if (equivalenceRoute) return 'equivalence_plus_efficiency';

  const capabilityRoute = evidence.measuredDecisionImprovement === true
    && evidence.noMaterialEfficiencyRegression === true;
  if (capabilityRoute) return 'capability_plus_efficiency_safety';

  return null;
}

export function assessMethodologyMutation(proposal = {}, evidence = {}) {
  const gaps = requiredProposalGaps(proposal);
  const protectedDomain = methodologyMutationTouchesProtectedDomain(proposal);
  const route = evidenceRoute(evidence);
  const humanAuthorizationRequired = protectedDomain;
  const humanAuthorized = evidence.humanAuthorization === true;

  let state = 'candidate_incomplete';
  let eligibleForCanonical = false;
  let reason = gaps.length > 0
    ? `Proposal is missing required methodology-mutation fields: ${gaps.join(', ')}.`
    : 'Proposal is complete but has not earned promotion evidence.';

  if (gaps.length === 0) {
    state = 'candidate';
    if (route) {
      state = protectedDomain && !humanAuthorized ? 'supported_requires_human_authority' : 'supported';
      eligibleForCanonical = !protectedDomain || humanAuthorized;
      reason = eligibleForCanonical
        ? `Mutation earned canonical eligibility through ${route}.`
        : `Mutation earned technical support through ${route}, but touches protected methodology domains and requires explicit human authority.`;
    }
  }

  return {
    id: proposal.id ?? null,
    state,
    eligibleForCanonical,
    evidenceRoute: route,
    missingFields: gaps,
    protectedDomain,
    humanAuthorizationRequired,
    humanAuthorized,
    reason,
  };
}

export function methodologyMutationTemplate(overrides = {}) {
  return {
    id: null,
    thesis: null,
    changeType: 'execution_optimization',
    domains: [],
    affectedDecisions: [],
    causalInputs: [],
    preservedComplexity: [],
    falsifier: null,
    rollback: null,
    stoppingCondition: null,
    ...overrides,
  };
}
