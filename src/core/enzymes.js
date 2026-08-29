import { authorizeAction } from './autonomy.js';
import { id, nowIso } from './utils.js';
import { executeMapsWebsiteSample } from '../experiments/maps-website-sample.js';
import { executeEmailAuthDnsSample } from '../experiments/email-auth-dns-sample.js';

const MAPS_WEBSITE_OPPORTUNITY_ID = 'opp_maps_website_pointer_guard';
const EMAIL_AUTH_PREFLIGHT_OPPORTUNITY_ID = 'opp_a179f5e22952';

function byId(items, targetId) {
  return items.find((x) => x.id === targetId);
}

function supportingExperiments(garden, opportunityId) {
  return (garden.experiments ?? []).filter((exp) =>
    exp.opportunityId === opportunityId
    && exp.status === 'integrated'
    && exp.result?.verdict === 'supports'
    && (exp.result?.sources ?? []).some((s) => s?.url)
  );
}

function validationGateSnapshot(garden, opportunityId) {
  const supporting = supportingExperiments(garden, opportunityId);
  const dimensions = [...new Set(supporting.map((exp) => exp.validationDimension).filter(Boolean))];
  const sourceUrls = [...new Set(supporting.flatMap((exp) => (exp.result?.sources ?? []).map((s) => s?.url).filter(Boolean)))];
  const sourceHosts = [...new Set(sourceUrls.map((url) => {
    try { return new URL(url).hostname.replace(/^www\./, ''); } catch { return null; }
  }).filter(Boolean))];

  const requirements = {
    supportingExperiments: supporting.length >= 2,
    buyerDemand: dimensions.includes('buyer_demand'),
    failureReality: dimensions.includes('failure_reality'),
    uniqueExternalSources: sourceUrls.length >= 3,
    independentSourceHosts: sourceHosts.length >= 2,
  };

  return {
    pass: Object.values(requirements).every(Boolean),
    requirements,
    supportingExperimentIds: supporting.map((exp) => exp.id),
    dimensions,
    uniqueSourceCount: sourceUrls.length,
    independentHostCount: sourceHosts.length,
  };
}

function requiredValidationDimension(garden, opportunityId) {
  const dimensions = validationGateSnapshot(garden, opportunityId).dimensions;
  if (!dimensions.includes('buyer_demand')) return 'buyer_demand';
  if (!dimensions.includes('failure_reality')) return 'failure_reality';
  return null;
}

function supplementalValidationDimension(garden, opportunityId) {
  const dimensions = validationGateSnapshot(garden, opportunityId).dimensions;
  for (const dimension of ['willingness_to_pay', 'distribution_access', 'resolution_complexity']) {
    if (!dimensions.includes(dimension)) return dimension;
  }
  return 'willingness_to_pay';
}

function authorizeExperiment(garden, opp, e) {
  const auth = authorizeAction(garden, {
    type: e.actionType,
    amountUsd: e.oneTimeCostUsd,
    recurringUsd: e.recurringUsd,
  });
  const exp = {
    id: id('exp'),
    opportunityId: opp.id,
    status: auth.allowed ? 'authorized' : 'awaiting_approval',
    createdAt: nowIso(),
    authorization: auth,
    ...e,
  };
  garden.experiments.push(exp);
  opp.experimentId = exp.id;
  if (auth.requiresApproval) {
    garden.approvals.push({
      id: id('approval'),
      status: 'pending',
      createdAt: nowIso(),
      action: exp,
      reason: auth.reason,
    });
  }
  return { exp, auth };
}

function predeclaredKillConditionMet(exp) {
  if (
    exp?.method === 'maps_website_sample'
    && exp?.validationDimension === 'failure_reality'
    && exp?.result?.verdict === 'weakens'
  ) {
    const evaluable = Number(exp.result?.sample?.evaluable ?? 0);
    const mismatches = Number(exp.result?.sample?.mismatchCandidates ?? Infinity);
    return evaluable >= 5 && mismatches === 0;
  }

  if (
    exp?.method === 'email_auth_dns_sample'
    && exp?.validationDimension === 'failure_reality'
    && exp?.result?.verdict === 'weakens'
  ) {
    const espSignaled = Number(exp.result?.sample?.espSignaled ?? 0);
    const hardFailures = Number(exp.result?.sample?.hardFailureDomains ?? Infinity);
    return espSignaled >= 8 && hardFailures === 0;
  }

  return false;
}

function nonSupportingIntegratedWebSearch(experiments, validationDimension) {
  return experiments.find((exp) =>
    exp.status === 'integrated'
    && exp.actionType === 'web_search'
    && exp.validationDimension === validationDimension
    && ['weakens', 'inconclusive'].includes(exp.result?.verdict)
  ) ?? null;
}

function hasMethod(experiments, method) {
  return experiments.some((exp) => exp.method === method);
}

function hasUnusedBranchSpecificAlternateMeasurement(opp, validationDimension, experiments) {
  if (validationDimension !== 'failure_reality') return false;
  if (opp?.id === MAPS_WEBSITE_OPPORTUNITY_ID) return !hasMethod(experiments, 'maps_website_sample');
  if (opp?.id === EMAIL_AUTH_PREFLIGHT_OPPORTUNITY_ID) return !hasMethod(experiments, 'email_auth_dns_sample');
  return false;
}

function markMeasurementBlocked(garden, opp, exp, validationDimension) {
  opp.status = 'measurement_blocked';
  opp.selectedForExperiment = false;
  opp.selectionState = 'measurement_blocked';
  opp.selectionCooldown = false;
  opp.measurementBlockedAt = nowIso();
  opp.measurementBlockedDimension = validationDimension ?? null;
  opp.measurementBlockedExperimentId = exp?.id ?? null;
  opp.validationGate = validationGateSnapshot(garden, opp.id);
  opp.measurementBlockedReason = `A bounded public web search returned ${exp?.result?.verdict ?? 'non-supporting'} evidence for ${validationDimension ?? 'the required dimension'}, and v0 has no unused materially different bounded executor for this opportunity.`;
  opp.epistemicNote = 'Preserved, not disproven: required reality contact is currently inaccessible with unused Flower v0 execution methods. Do not repeat the same measurement; revisit only when a materially different method exists.';

  const principle = 'Measurement methods are opportunity-specific: when a required validation dimension cannot be tested by a materially different bounded executor, preserve the branch as measurement-blocked and redirect capital instead of repeating the same search.';
  if (!(garden.soil ?? []).some((x) => x.principle === principle)) {
    garden.soil.push({
      id: id('soil'),
      principle,
      scope: 'experiment governance',
      status: 'supported',
      derivedFrom: [opp.id, ...(exp?.id ? [exp.id] : [])],
      createdAt: nowIso(),
    });
  }
}

function authorizeEmailDnsFailureReality(garden, opp) {
  const e = {
    name: 'Direct ESP-Signaled SPF/DMARC DNS Sample',
    tests: 'Resolve a bounded deterministic set of public domains, retain domains whose SPF names a recognized transactional ESP, and inspect those domains for hard SPF/DMARC DNS failures. Missing DMARC or p=none is recorded only as softer risk; unknown DKIM selectors and inbox placement are explicitly out of scope.',
    actionType: 'observe',
    method: 'email_auth_dns_sample',
    oneTimeCostUsd: 0,
    recurringUsd: 0,
    successCondition: 'At least eight domains expose a recognized transactional-ESP marker in SPF and at least two of those domains expose a hard SPF/DMARC DNS failure such as multiple SPF records, multiple DMARC records, or a malformed DMARC record.',
    killCondition: 'If at least eight ESP-signaled domains are evaluable and none exposes a hard SPF/DMARC DNS failure, the direct failure-rate thesis is weakened enough to make this branch dormant until materially new evidence or a different population changes the context.',
    validationDimension: 'failure_reality',
  };
  const { exp, auth } = authorizeExperiment(garden, opp, e);
  return {
    changed: true,
    summary: auth.allowed
      ? `Experiment authorized: ${exp.name} [failure_reality; direct_dns; $0]`
      : `Experiment requires approval: ${exp.name}`,
    action: 'EXPERIMENT',
  };
}

function authorizeMapsFailureReality(garden, opp) {
  const e = {
    name: 'Direct Stratified Maps→Website Identity Sample',
    tests: 'Observe a small stratified sample of live Google Maps business records, fetch each linked website, and compare business-name/phone/location identity signals instead of searching for discussions about the failure.',
    actionType: 'spend',
    method: 'maps_website_sample',
    oneTimeCostUsd: 0.50,
    recurringUsd: 0,
    successCondition: 'At least one mismatch candidate appears among at least four evaluable live Maps→website pairs.',
    killCondition: 'At least five evaluable pairs show no mismatch candidate, weakening the failure-rate thesis enough to avoid a private build for now.',
    validationDimension: 'failure_reality',
  };
  const { exp, auth } = authorizeExperiment(garden, opp, e);
  return {
    changed: true,
    summary: auth.allowed
      ? `Experiment authorized: ${exp.name} [failure_reality; direct_sample; max $0.50]`
      : `Experiment requires approval: ${exp.name}`,
    action: 'EXPERIMENT',
  };
}

function genericWebExperiment(opp, validationDimension) {
  const context = `${opp.name}: ${opp.thesis ?? ''}`;

  if (validationDimension === 'buyer_demand') {
    return {
      name: `Buyer-Demand Evidence Search — ${opp.name}`,
      tests: `Search public marketplaces, product/pricing pages, developer or operator discussions, docs, and workflow evidence for concrete signals that buyers seek, install, compare, request, or pay for a solution to ${context}. Distinguish direct buyer/action signals from generic informational content.`,
      actionType: 'web_search',
      method: 'bounded_public_web_search_v1',
      oneTimeCostUsd: 0,
      recurringUsd: 0,
      successCondition: 'Independent sources include concrete buyer/action signals such as paid products, pricing, installs/adoption, explicit requests for a solution, or workflow pain tied to spending or tool selection.',
      killCondition: 'Results are dominated by generic education, free/native substitutes, or commentary without concrete buyer/action signals.',
      validationDimension,
    };
  }

  if (validationDimension === 'failure_reality') {
    return {
      name: `Failure-Reality Evidence Search — ${opp.name}`,
      tests: `Search public issue trackers, incident reports, user problem reports, documentation, and concrete workflow examples for independent evidence that the specific failure claimed by ${context} actually occurs in practice. Prefer reproducible cases over generic risk descriptions.`,
      actionType: 'web_search',
      method: 'bounded_public_web_search_v1',
      oneTimeCostUsd: 0,
      recurringUsd: 0,
      successCondition: 'Multiple independent concrete cases show the claimed failure occurring in real workflows and being material enough to require resolution.',
      killCondition: 'Evidence remains hypothetical, generic, or is largely covered by native/free mechanisms with no concrete unresolved cases.',
      validationDimension,
    };
  }

  if (validationDimension === 'willingness_to_pay') {
    return {
      name: `Willingness-to-Pay Evidence Search — ${opp.name}`,
      tests: `Search current product pages, marketplaces, pricing, paid tiers, purchase-oriented comparisons, and buyer discussions for evidence that money changes hands for the resolution represented by ${context}.`,
      actionType: 'web_search',
      method: 'bounded_public_web_search_v1',
      oneTimeCostUsd: 0,
      recurringUsd: 0,
      successCondition: 'Independent sources show active paid offerings or explicit purchase/pricing behavior for materially comparable resolution.',
      killCondition: 'Comparable resolution is overwhelmingly free, bundled, or lacks credible paid purchase behavior.',
      validationDimension,
    };
  }

  if (validationDimension === 'distribution_access') {
    return {
      name: `Passive-Distribution Evidence Search — ${opp.name}`,
      tests: `Search the stated nutrient channels for comparable tools that are discoverable and self-serve without cold outreach, and verify whether ${context} could plausibly enter those channels without ongoing human selling.`,
      actionType: 'web_search',
      method: 'bounded_public_web_search_v1',
      oneTimeCostUsd: 0,
      recurringUsd: 0,
      successCondition: 'At least one existing channel demonstrates passive discovery plus self-serve adoption for materially comparable tools.',
      killCondition: 'Distribution appears to depend mainly on outbound sales, services, relationships, or ongoing manual acquisition.',
      validationDimension,
    };
  }

  return {
    name: `Resolution-Complexity Evidence Search — ${opp.name}`,
    tests: `Search documentation, issue threads, competing tools, and workflow examples to determine whether resolving ${context} requires enough non-trivial logic or evidence to justify a product rather than a simple rule or native setting.`,
    actionType: 'web_search',
    method: 'bounded_public_web_search_v1',
    oneTimeCostUsd: 0,
    recurringUsd: 0,
    successCondition: 'Concrete workflows show recurring ambiguity, reconciliation, or multi-signal logic that is not adequately solved by a trivial filter or native feature.',
    killCondition: 'The resolution reduces to a stable trivial rule, native setting, or already-free commodity check.',
    validationDimension: 'resolution_complexity',
  };
}

function authorizeGenericWebExperiment(garden, opp, validationDimension) {
  const e = genericWebExperiment(opp, validationDimension);
  const { exp, auth } = authorizeExperiment(garden, opp, e);
  return {
    changed: true,
    summary: auth.allowed
      ? `Experiment authorized deterministically: ${exp.name} [${exp.validationDimension}]`
      : `Experiment requires approval: ${exp.name}`,
    action: 'EXPERIMENT',
  };
}

function rankExpansionCandidates(garden, candidates, result) {
  if (candidates.length === 0) return;
  const selectedAt = nowIso();
  for (let i = 0; i < candidates.length; i += 1) {
    const opp = candidates[i];
    opp.selectedForExperiment = i === 0;
    opp.selectionState = i === 0 ? 'selected' : 'reserve';
    opp.lastSelectionAt = selectedAt;
    opp.selectionCooldown = false;
  }

  garden.selections ??= [];
  garden.selections.push({
    id: id('select'),
    createdAt: selectedAt,
    chosenOpportunityId: candidates[0].id,
    reserveOpportunityIds: candidates.slice(1).map((x) => x.id),
    rationale: 'Initial allocation follows EXPAND rank. Candidate generation already returns descending expected usefulness, so a second model call is not justified before any external evidence exists.',
    candidateIds: candidates.map((x) => x.id),
    responseId: result.rawId ?? null,
    usage: result.usage ?? null,
  });
}

export async function runEnzyme({ garden, pressure, reasoner }) {
  if (pressure.type === 'HUMAN' || pressure.type === 'STILLNESS') {
    return { changed: false, summary: pressure.why, action: pressure.type };
  }

  if (pressure.type === 'EXPAND') {
    const result = await reasoner.reason({
      operation: 'EXPAND', garden, target: null,
      prompt: `Find at most 2 genuinely distinct candidate economic Fruit. Start from existing high-intent nutrient channels where buyers or machines already spend money. Avoid consulting, cold outreach, physical fulfillment, and ideas requiring Sean's ongoing labor. Return candidates in descending expected usefulness.`,
    });

    const created = [];
    for (const c of result.data.candidates ?? []) {
      const opp = {
        id: id('opp'),
        status: 'needs_test',
        createdAt: nowIso(),
        ...c,
        reasoningEvidence: [],
        externalEvidence: [],
        counterEvidence: [],
        sources: result.sources ?? [],
        ancestry: ['EXPAND'],
        provisionalVerdict: 'needs_test',
        epistemicNote: 'Generated hypothesis only. Internal falsification is not external evidence, so the seed proceeds directly to the cheapest bounded reality test.',
      };
      garden.opportunities.push(opp);
      created.push(opp);
    }
    rankExpansionCandidates(garden, created, result);

    return {
      changed: created.length > 0,
      summary: created.length > 0
        ? `Expanded with ${created.length} candidate(s); ranked ${created[0].name} first for direct reality testing without a separate FALSIFY or SELECT call.`
        : 'Expansion produced no candidates.',
      action: 'EXPAND',
      sources: result.sources,
    };
  }

  // Legacy path only. New EXPAND candidates skip this model-only stage because with web
  // disabled it cannot earn evidence; it merely duplicated the generation critique.
  if (pressure.type === 'FALSIFY') {
    const opp = byId(garden.opportunities, pressure.targetId);
    if (!opp) throw new Error('FALSIFY target not found.');
    const result = await reasoner.reason({
      operation: 'FALSIFY', garden, target: opp,
      prompt: `Attack this legacy seed. Distinguish model reasoning from externally observed evidence and prefer killing it cheaply.`,
    });

    const externalSources = (result.sources ?? []).filter((s) => s?.url);
    opp.reasoningEvidence = [...(opp.reasoningEvidence ?? []), ...(result.data.evidence ?? [])];
    opp.counterEvidence = [...(opp.counterEvidence ?? []), ...(result.data.counterEvidence ?? [])];
    opp.sources = [...new Map([...(opp.sources ?? []), ...externalSources].map((s) => [s.url, s])).values()];
    opp.externalEvidence = [...new Set([...(opp.externalEvidence ?? []), ...externalSources.map((s) => s.url)])];
    opp.cheapestFalsifier = result.data.cheapestFalsifier ?? opp.cheapestFalsifier;
    opp.lastRationale = result.data.rationale ?? null;
    opp.provisionalVerdict = result.data.verdict ?? null;

    if (externalSources.length === 0) {
      opp.status = 'needs_test';
      opp.epistemicNote = 'No external evidence was retrieved; model reasoning remains provisional.';
    } else if (result.data.verdict === 'compost') {
      opp.status = 'compost';
      opp.failedBecause = result.data.rationale ?? 'Failed falsification with external evidence.';
    } else {
      opp.status = 'supported';
      opp.epistemicNote = `Supported by ${externalSources.length} externally retrieved source(s); still not economically validated.`;
    }

    return {
      changed: true,
      summary: `${opp.name}: ${opp.status}. ${opp.lastRationale ?? ''}`.trim(),
      action: 'FALSIFY',
      sources: externalSources,
    };
  }

  if (pressure.type === 'EXPERIMENT') {
    const opp = byId(garden.opportunities, pressure.targetId);
    if (!opp) throw new Error('EXPERIMENT target not found.');
    const previous = garden.experiments.filter((x) => x.opportunityId === opp.id);
    const requiredDimension = requiredValidationDimension(garden, opp.id);
    const targetDimension = requiredDimension ?? supplementalValidationDimension(garden, opp.id);
    const priorNonSupportingRequiredWebSearch = nonSupportingIntegratedWebSearch(previous, targetDimension);

    // Prefer a real branch-specific sensor before semantic search when one exists.
    if (
      opp.id === EMAIL_AUTH_PREFLIGHT_OPPORTUNITY_ID
      && targetDimension === 'failure_reality'
      && !hasMethod(previous, 'email_auth_dns_sample')
    ) {
      return authorizeEmailDnsFailureReality(garden, opp);
    }

    if (
      opp.id === MAPS_WEBSITE_OPPORTUNITY_ID
      && targetDimension === 'failure_reality'
      && priorNonSupportingRequiredWebSearch
      && !hasMethod(previous, 'maps_website_sample')
    ) {
      return authorizeMapsFailureReality(garden, opp);
    }

    if (
      priorNonSupportingRequiredWebSearch
      && !hasUnusedBranchSpecificAlternateMeasurement(opp, targetDimension, previous)
    ) {
      markMeasurementBlocked(garden, opp, priorNonSupportingRequiredWebSearch, targetDimension);
      return {
        changed: true,
        summary: `Measurement blocked: ${opp.name} cannot justify another ${targetDimension} search until a materially different bounded measurement method exists.`,
        action: 'EXPERIMENT',
      };
    }

    // Normal experiment design is deterministic policy. Save the model call for the
    // actual evidence search instead of asking cognition to invent a wrapper for it.
    return authorizeGenericWebExperiment(garden, opp, targetDimension);
  }

  if (pressure.type === 'EXECUTE_EXPERIMENT') {
    const exp = byId(garden.experiments, pressure.targetId);
    if (!exp) throw new Error('EXECUTE_EXPERIMENT target not found.');
    if (!exp.authorization?.allowed || exp.status !== 'authorized') {
      throw new Error('Experiment execution requested without valid authorization.');
    }

    const opp = byId(garden.opportunities, exp.opportunityId);
    if (!opp) throw new Error('Experiment opportunity not found.');

    if (exp.method === 'maps_website_sample') {
      if (opp.id !== MAPS_WEBSITE_OPPORTUNITY_ID) {
        throw new Error('Maps→website direct sampler cannot execute for an unrelated opportunity.');
      }
      if (exp.actionType !== 'spend' || Number(exp.oneTimeCostUsd ?? Infinity) > 0.50 || Number(exp.recurringUsd ?? 0) !== 0) {
        throw new Error('Direct Maps sample crossed its deterministic cost membrane.');
      }
      const direct = await executeMapsWebsiteSample({ maxChargeUsd: Number(exp.oneTimeCostUsd) });
      exp.status = 'result_ready';
      exp.executedAt = nowIso();
      exp.result = {
        verdict: direct.verdict,
        finding: direct.finding,
        observations: direct.observations,
        sources: direct.sources,
        sourceCount: direct.sources.length,
        sample: direct.sample,
        upstream: direct.upstream,
        responseId: null,
        usage: null,
      };
      return {
        changed: true,
        summary: `${exp.name}: ${direct.verdict}; ${direct.finding}`,
        action: 'EXECUTE_EXPERIMENT',
        sources: direct.sources,
      };
    }

    if (exp.method === 'email_auth_dns_sample') {
      if (opp.id !== EMAIL_AUTH_PREFLIGHT_OPPORTUNITY_ID) {
        throw new Error('Email-auth DNS sampler cannot execute for an unrelated opportunity.');
      }
      if (exp.actionType !== 'observe' || Number(exp.oneTimeCostUsd ?? 0) !== 0 || Number(exp.recurringUsd ?? 0) !== 0) {
        throw new Error('Email-auth DNS sampler crossed its zero-spend observation membrane.');
      }
      const direct = await executeEmailAuthDnsSample();
      exp.status = 'result_ready';
      exp.executedAt = nowIso();
      exp.result = {
        verdict: direct.verdict,
        finding: direct.finding,
        observations: direct.observations,
        sources: direct.sources,
        sourceCount: direct.sources.length,
        sample: direct.sample,
        limitations: direct.limitations,
        responseId: null,
        usage: null,
      };
      return {
        changed: true,
        summary: `${exp.name}: ${direct.verdict}; ${direct.finding}`,
        action: 'EXECUTE_EXPERIMENT',
        sources: direct.sources,
      };
    }

    if (exp.actionType !== 'web_search') {
      exp.status = 'blocked_capability';
      exp.blockedReason = `v0 has no autonomous executor for actionType=${exp.actionType}, method=${exp.method ?? 'none'}.`;
      return {
        changed: true,
        summary: `Experiment stopped at capability membrane: ${exp.name}`,
        action: 'EXECUTE_EXPERIMENT',
      };
    }

    const result = await reasoner.reason({
      operation: 'EXECUTE_EXPERIMENT',
      garden,
      target: { opportunity: opp, experiment: exp },
      allowWebSearch: true,
      prompt: `Execute only the authorized public-web evidence search described by this experiment. Search for concrete evidence relevant to the stated test, success condition, kill condition, and validation dimension (${exp.validationDimension ?? 'unspecified'}). Prefer primary sources, marketplace/product evidence, user problem reports, documentation, and concrete workflow evidence over generic commentary. Do not take any external write action. Do not contact people. Return a conservative verdict: supports only when the external evidence actually meets the success condition; weakens when it materially meets the kill condition; otherwise inconclusive.`,
    });
    const sources = (result.sources ?? []).filter((s) => s?.url);
    exp.status = 'result_ready';
    exp.executedAt = nowIso();
    exp.result = {
      verdict: result.data.verdict ?? 'inconclusive',
      finding: result.data.finding ?? null,
      observations: result.data.observations ?? [],
      sources,
      sourceCount: sources.length,
      responseId: result.rawId ?? null,
      usage: result.usage ?? null,
    };
    return {
      changed: true,
      summary: `${exp.name}: ${exp.result.verdict} with ${sources.length} external source(s).`,
      action: 'EXECUTE_EXPERIMENT',
      sources,
    };
  }

  if (pressure.type === 'BUILD_PLAN') {
    const opp = byId(garden.opportunities, pressure.targetId);
    const result = await reasoner.reason({
      operation: 'BUILD_PLAN', garden, target: opp,
      prompt: `Produce a minimal PRIVATE build plan only. Do not publish or spend. Identify inherited infrastructure from existing Fruit and the passive nutrient channel. The status validated means only that evidence has earned a private build plan; it does not mean the business is proven. Return the smallest build that can create a real measurable Fruit.`,
    });
    opp.buildPlan = result.data.buildPlan ?? null;
    opp.status = 'build_ready';
    return { changed: true, summary: `Private build plan prepared for ${opp.name}.`, action: 'BUILD_PLAN' };
  }

  if (pressure.type === 'INTEGRATE') {
    const event = byId(garden.events, pressure.targetId);
    if (event) {
      event.status = 'processed';
      return { changed: true, summary: 'Reality event integrated.', action: 'INTEGRATE' };
    }

    const exp = byId(garden.experiments, pressure.targetId);
    if (!exp || exp.status !== 'result_ready') {
      return { changed: false, summary: 'No result ready for integration.', action: 'INTEGRATE' };
    }
    const opp = byId(garden.opportunities, exp.opportunityId);
    if (!opp) throw new Error('Integrated experiment opportunity not found.');

    const sources = exp.result?.sources ?? [];
    opp.sources = [...new Map([...(opp.sources ?? []), ...sources].map((s) => [s.url, s])).values()];
    opp.externalEvidence = [...new Set([...(opp.externalEvidence ?? []), ...sources.map((s) => s.url)])];
    opp.lastExperimentFinding = exp.result?.finding ?? null;

    exp.status = 'integrated';
    exp.integratedAt = nowIso();
    opp.experimentId = null;

    if (predeclaredKillConditionMet(exp)) {
      opp.status = 'dormant';
      opp.selectedForExperiment = false;
      opp.selectionState = 'dormant';
      opp.selectionCooldown = false;
      opp.dormantAt = nowIso();
      opp.validationGate = validationGateSnapshot(garden, opp.id);
      opp.failedBecause = `Predeclared kill condition met by ${exp.id}: ${exp.killCondition}`;
      opp.epistemicNote = 'Dormant, not disproven: the bounded direct sample met its predeclared kill condition, so further testing is not justified unless materially new evidence, a different population, or a new measurement capability changes the context.';

      const principle = 'Predeclared kill conditions outrank curiosity: when a bounded reality test meets its kill condition, stop spending on that branch unless materially new evidence changes the context.';
      if (!(garden.soil ?? []).some((x) => x.principle === principle)) {
        garden.soil.push({
          id: id('soil'),
          principle,
          scope: 'experiment governance',
          status: 'supported',
          derivedFrom: [opp.id, exp.id],
          createdAt: nowIso(),
        });
      }
    } else if (sources.length > 0 && exp.result?.verdict === 'supports') {
      opp.status = 'supported';
      const gate = validationGateSnapshot(garden, opp.id);
      opp.validationGate = gate;
      if (gate.pass) {
        opp.status = 'validated';
        opp.validatedAt = nowIso();
        opp.epistemicNote = exp.method === 'email_auth_dns_sample'
          ? 'Validated only for a PRIVATE build plan: buyer-demand evidence plus directly observed hard SPF/DMARC failure states on ESP-signaled domains satisfy the current gate. Unknown DKIM selectors, inbox placement, prevalence, and revenue impact remain unproven.'
          : 'Validated only for a PRIVATE build plan: independent external evidence covers buyer demand and failure reality. Public deployment and economic claims remain unearned.';
      } else {
        opp.epistemicNote = `Externally supported by experiment ${exp.id}; private-build gate remains incomplete.`;
      }
    } else if (
      sources.length > 0
      && exp.actionType === 'web_search'
      && ['weakens', 'inconclusive'].includes(exp.result?.verdict)
      && !hasUnusedBranchSpecificAlternateMeasurement(
        opp,
        exp.validationDimension,
        garden.experiments.filter((x) => x.opportunityId === opp.id),
      )
    ) {
      markMeasurementBlocked(garden, opp, exp, exp.validationDimension);
    } else {
      opp.status = 'needs_test';
      opp.validationGate = validationGateSnapshot(garden, opp.id);
      opp.epistemicNote = `Experiment ${exp.id} did not justify promotion; further reality contact requires a materially different method.`;
    }

    return {
      changed: true,
      summary: `${exp.name} integrated: ${opp.name} is ${opp.status} with ${sources.length} external source(s).`,
      action: 'INTEGRATE',
      sources,
    };
  }

  return { changed: false, summary: `No enzyme for ${pressure.type}.`, action: pressure.type };
}
