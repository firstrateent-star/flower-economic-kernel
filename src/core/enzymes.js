import { authorizeAction } from './autonomy.js';
import { id, nowIso } from './utils.js';
import { executeMapsWebsiteSample } from '../experiments/maps-website-sample.js';
import { executeEmailAuthDnsSample } from '../experiments/email-auth-dns-sample.js';

const MAPS_WEBSITE_OPPORTUNITY_ID = 'opp_maps_website_pointer_guard';
const EMAIL_AUTH_PREFLIGHT_OPPORTUNITY_ID = 'opp_a179f5e22952';

function byId(items, targetId) {
  return items.find((x) => x.id === targetId);
}

function uniqueExternalSources(sources = []) {
  return [...new Map(sources.filter((s) => s?.url).map((s) => [s.url, s])).values()];
}

function sourceHosts(sources = []) {
  return [...new Set(sources.map((s) => {
    try { return new URL(s.url).hostname.replace(/^www\./, ''); } catch { return null; }
  }).filter(Boolean))];
}

function canonicalEvidenceUrl(value) {
  try {
    const url = new URL(value);
    url.hash = '';
    for (const key of [...url.searchParams.keys()]) {
      if (/^utm_/i.test(key) || ['ref', 'source'].includes(key.toLowerCase())) url.searchParams.delete(key);
    }
    const pathname = url.pathname.length > 1 ? url.pathname.replace(/\/+$/, '') : url.pathname;
    const search = url.searchParams.toString();
    return `${url.protocol}//${url.hostname.toLowerCase()}${url.port ? `:${url.port}` : ''}${pathname}${search ? `?${search}` : ''}`;
  } catch {
    return null;
  }
}

function mapEvidenceToRetrieved(evidence = [], retrieved = []) {
  const byCanonical = new Map();
  for (const source of uniqueExternalSources(retrieved)) {
    const key = canonicalEvidenceUrl(source.url);
    if (key) byCanonical.set(key, source);
  }

  const mapped = [];
  for (const item of evidence ?? []) {
    const key = canonicalEvidenceUrl(item?.url);
    const source = key ? byCanonical.get(key) : null;
    if (!source) continue;
    mapped.push({
      title: source.title ?? null,
      url: source.url,
      claim: item?.claim ?? null,
    });
  }
  return uniqueExternalSources(mapped);
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
  const sources = uniqueExternalSources(supporting.flatMap((exp) => exp.result?.sources ?? []));
  const hosts = sourceHosts(sources);
  const requirements = {
    evidenceDimensions: dimensions.length >= 2,
    buyerDemand: dimensions.includes('buyer_demand'),
    failureReality: dimensions.includes('failure_reality'),
    uniqueExternalSources: sources.length >= 3,
    independentSourceHosts: hosts.length >= 2,
  };
  return {
    pass: Object.values(requirements).every(Boolean),
    requirements,
    supportingExperimentIds: supporting.map((exp) => exp.id),
    dimensions,
    uniqueSourceCount: sources.length,
    independentHostCount: hosts.length,
  };
}

function requiredValidationDimension(garden, opportunityId) {
  const dimensions = validationGateSnapshot(garden, opportunityId).dimensions;
  if (!dimensions.includes('failure_reality')) return 'failure_reality';
  if (!dimensions.includes('buyer_demand')) return 'buyer_demand';
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
}

function authorizeEmailDnsFailureReality(garden, opp) {
  const e = {
    name: 'Direct ESP-Signaled SPF/DMARC DNS Sample',
    tests: 'Resolve a bounded deterministic set of public domains, retain domains whose SPF names a recognized transactional ESP, and inspect those domains for hard SPF/DMARC DNS failures.',
    actionType: 'observe',
    method: 'email_auth_dns_sample',
    oneTimeCostUsd: 0,
    recurringUsd: 0,
    successCondition: 'At least eight ESP-signaled domains are evaluable and at least two expose a hard SPF/DMARC DNS failure.',
    killCondition: 'At least eight ESP-signaled domains are evaluable and none exposes a hard SPF/DMARC DNS failure.',
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
    tests: 'Observe a small stratified sample of live Google Maps business records, fetch each linked website, and compare identity signals.',
    actionType: 'spend',
    method: 'maps_website_sample',
    oneTimeCostUsd: 0.50,
    recurringUsd: 0,
    successCondition: 'At least one mismatch candidate appears among at least four evaluable live Maps→website pairs.',
    killCondition: 'At least five evaluable pairs show no mismatch candidate.',
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
      tests: `Search marketplaces, product/pricing pages, operator discussions, docs, and workflows for concrete signals that buyers seek, install, compare, request, or pay for a solution to ${context}.`,
      actionType: 'web_search',
      method: 'bounded_public_web_search_v1',
      oneTimeCostUsd: 0,
      recurringUsd: 0,
      successCondition: 'Independent sources include concrete buyer/action signals such as paid products, pricing, installs/adoption, explicit requests, or workflow pain tied to spending or tool selection.',
      killCondition: 'Results are dominated by generic education, free/native substitutes, or commentary without concrete buyer/action signals.',
      validationDimension,
    };
  }

  if (validationDimension === 'failure_reality') {
    return {
      name: `Failure-Reality Evidence Search — ${opp.name}`,
      tests: `Search issue trackers, incident reports, user problem reports, documentation, and concrete workflows for independent evidence that the specific failure claimed by ${context} actually occurs.`,
      actionType: 'web_search',
      method: 'bounded_public_web_search_v1',
      oneTimeCostUsd: 0,
      recurringUsd: 0,
      successCondition: 'Multiple independent concrete cases show the claimed failure occurring in real workflows and requiring resolution.',
      killCondition: 'Evidence remains hypothetical, generic, or largely covered by native/free mechanisms.',
      validationDimension,
    };
  }

  if (validationDimension === 'willingness_to_pay') {
    return {
      name: `Willingness-to-Pay Evidence Search — ${opp.name}`,
      tests: `Search product pages, marketplaces, pricing, paid tiers, purchase comparisons, and buyer discussions for evidence that money changes hands for materially comparable resolution of ${context}.`,
      actionType: 'web_search',
      method: 'bounded_public_web_search_v1',
      oneTimeCostUsd: 0,
      recurringUsd: 0,
      successCondition: 'Independent sources show active paid offerings or explicit purchase/pricing behavior.',
      killCondition: 'Comparable resolution is overwhelmingly free, bundled, or lacks credible paid purchase behavior.',
      validationDimension,
    };
  }

  if (validationDimension === 'distribution_access') {
    return {
      name: `Passive-Distribution Evidence Search — ${opp.name}`,
      tests: `Search the stated nutrient channels for comparable self-serve tools and verify whether ${context} could plausibly enter those channels without ongoing human selling.`,
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
    tests: `Search documentation, issue threads, competing tools, and workflows to determine whether resolving ${context} needs non-trivial logic rather than a simple rule or native setting.`,
    actionType: 'web_search',
    method: 'bounded_public_web_search_v1',
    oneTimeCostUsd: 0,
    recurringUsd: 0,
    successCondition: 'Concrete workflows show recurring ambiguity or multi-signal logic not adequately solved by a trivial filter or native feature.',
    killCondition: 'The resolution reduces to a stable trivial rule, native setting, or already-free commodity check.',
    validationDimension: 'resolution_complexity',
  };
}

function authorizeGenericWebExperiment(garden, opp, validationDimension) {
  const { exp, auth } = authorizeExperiment(garden, opp, genericWebExperiment(opp, validationDimension));
  return {
    changed: true,
    summary: auth.allowed
      ? `Experiment authorized deterministically: ${exp.name} [${exp.validationDimension}]`
      : `Experiment requires approval: ${exp.name}`,
    action: 'EXPERIMENT',
  };
}

function selfDeclaresMissingMeasurement(candidate) {
  const text = `${candidate?.realityAccess ?? ''} ${candidate?.cheapestRealityTest ?? ''}`.toLowerCase();
  return [
    'evidence-blocked', 'measurement-blocked', 'cannot execute', 'cannot access', 'unavailable',
    'requires private', 'requires authenticated', 'direct sampling is unavailable',
    'direct feed or page sampling is unavailable', 'requires github', 'requires package-registry',
    'requires package registry', 'requires arbitrary http', 'requires api enumeration',
  ].some((needle) => text.includes(needle));
}

function recordScoutMiss(garden, { candidate = null, reason, result }) {
  garden.scoutMisses ??= [];
  garden.scoutMisses.push({
    id: id('scout_miss'),
    createdAt: nowIso(),
    candidateName: candidate?.name ?? null,
    failureArchetype: candidate?.failureArchetype ?? null,
    reason,
    retrievedSourceCount: uniqueExternalSources(result?.sources ?? []).length,
  });
  if (garden.scoutMisses.length > 20) garden.scoutMisses.splice(0, garden.scoutMisses.length - 20);
}

function addOverlapPrinciple(garden, derivedFrom) {
  const principle = 'Harvest overlapping evidence in one costly frontier when reality provides it, but preserve source-level provenance for each validation dimension instead of serializing evidence into unnecessary separate searches.';
  if (!(garden.soil ?? []).some((x) => x.principle === principle)) {
    garden.soil.push({
      id: id('soil'),
      principle,
      scope: 'experiment efficiency',
      status: 'supported',
      derivedFrom,
      createdAt: nowIso(),
    });
  }
}

function createIntegratedScoutExperiment({ garden, opp, dimension, sources, evidence, result, sharedFrontierId }) {
  const exp = {
    id: id('exp'),
    opportunityId: opp.id,
    status: 'integrated',
    createdAt: nowIso(),
    executedAt: nowIso(),
    integratedAt: nowIso(),
    authorization: { allowed: true, requiresApproval: false, reason: 'Evidence-bearing expansion observation.' },
    name: `${dimension === 'failure_reality' ? 'Failure-Reality' : 'Buyer-Demand'} Scout — ${opp.name}`,
    tests: dimension === 'failure_reality'
      ? 'During opportunity discovery, map exact consulted sources to concrete public cases of the claimed failure.'
      : 'During the same opportunity-discovery frontier, map exact consulted sources to concrete buyer/action or paid-market demand.',
    actionType: 'web_search',
    method: 'evidence_bearing_expand_v2',
    oneTimeCostUsd: 0,
    recurringUsd: 0,
    successCondition: dimension === 'failure_reality'
      ? 'At least three mapped sources across at least two independent hosts support concrete failure reality.'
      : 'At least two mapped sources across at least two independent hosts support concrete buyer/action demand.',
    killCondition: 'Insufficient mapped evidence means this dimension remains unearned.',
    validationDimension: dimension,
    sharedFrontierId,
    result: {
      verdict: 'supports',
      finding: `${dimension} earned from ${sources.length} explicitly mapped source(s) across ${sourceHosts(sources).length} independent host(s) during one evidence-bearing expansion frontier.`,
      observations: (evidence ?? []).map((x) => x.claim).filter(Boolean).slice(0, 4),
      sources,
      sourceCount: sources.length,
      evidenceMap: evidence ?? [],
      responseId: result.rawId ?? null,
      usage: dimension === 'failure_reality' ? (result.usage ?? null) : null,
    },
  };
  garden.experiments.push(exp);
  return exp;
}

function createEvidenceBearingOpportunity(garden, candidate, result) {
  if (!candidate) {
    recordScoutMiss(garden, { candidate, reason: 'The evidence-bearing search returned no candidate.', result });
    return { opp: null, reason: 'no_candidate' };
  }

  if (selfDeclaresMissingMeasurement(candidate)) {
    recordScoutMiss(garden, { candidate, reason: 'Candidate self-declared a missing decisive measurement capability.', result });
    return { opp: null, reason: 'measurement_inaccessible' };
  }

  const retrieved = uniqueExternalSources(result.sources ?? []);
  const failureSources = mapEvidenceToRetrieved(candidate.failureEvidence ?? [], retrieved);
  const buyerSources = mapEvidenceToRetrieved(candidate.buyerEvidence ?? [], retrieved);
  const failurePass = failureSources.length >= 3 && sourceHosts(failureSources).length >= 2;
  const buyerPass = buyerSources.length >= 2 && sourceHosts(buyerSources).length >= 2;

  if (!failurePass) {
    recordScoutMiss(garden, {
      candidate,
      reason: `Failure evidence mapping did not clear 3 sources / 2 hosts; mapped ${failureSources.length} source(s) across ${sourceHosts(failureSources).length} host(s).`,
      result,
    });
    return { opp: null, reason: 'failure_provenance_insufficient' };
  }

  const creditedSources = uniqueExternalSources([...failureSources, ...buyerSources]);
  const opp = {
    id: id('opp'),
    status: 'supported',
    createdAt: nowIso(),
    ...candidate,
    reasoningEvidence: [],
    externalEvidence: creditedSources.map((s) => s.url),
    counterEvidence: [],
    sources: creditedSources,
    ancestry: ['EXPAND', 'evidence_bearing_geometry_v2'],
    provisionalVerdict: 'supported',
    selectedForExperiment: true,
    selectionState: 'selected',
    selectionCooldown: false,
    lastSelectionAt: nowIso(),
    epistemicNote: buyerPass
      ? 'Evidence-bearing expansion independently mapped both failure reality and buyer demand inside one costly frontier; private-build gate still applies deterministic source-diversity checks.'
      : 'Evidence-bearing expansion mapped concrete failure reality first. Buyer demand remains independently unearned.',
  };
  garden.opportunities.push(opp);

  const sharedFrontierId = result.rawId ?? id('frontier');
  const failureExp = createIntegratedScoutExperiment({
    garden,
    opp,
    dimension: 'failure_reality',
    sources: failureSources,
    evidence: candidate.failureEvidence,
    result,
    sharedFrontierId,
  });

  let buyerExp = null;
  if (buyerPass) {
    buyerExp = createIntegratedScoutExperiment({
      garden,
      opp,
      dimension: 'buyer_demand',
      sources: buyerSources,
      evidence: candidate.buyerEvidence,
      result,
      sharedFrontierId,
    });
    addOverlapPrinciple(garden, [opp.id, failureExp.id, buyerExp.id]);
  }

  opp.validationGate = validationGateSnapshot(garden, opp.id);
  if (opp.validationGate.pass) {
    opp.status = 'validated';
    opp.validatedAt = nowIso();
    opp.selectedForExperiment = false;
    opp.selectionState = 'validated';
    opp.epistemicNote = 'Validated only for a PRIVATE build plan: separately mapped failure-reality and buyer-demand evidence cleared the source-diversity gate, even though both dimensions were harvested from one search frontier.';
  }

  garden.selections ??= [];
  garden.selections.push({
    id: id('select'),
    createdAt: nowIso(),
    chosenOpportunityId: opp.id,
    reserveOpportunityIds: [],
    rationale: 'Evidence-bearing geometry allocation: admit only a center with mapped failure reality, and credit overlapping demand only when its provenance is independently explicit.',
    candidateIds: [opp.id],
    responseId: result.rawId ?? null,
    usage: result.usage ?? null,
  });

  return {
    opp,
    failureSourceCount: failureSources.length,
    buyerSourceCount: buyerSources.length,
    buyerPass,
    gatePass: opp.validationGate.pass,
  };
}

export async function runEnzyme({ garden, pressure, reasoner }) {
  if (pressure.type === 'HUMAN' || pressure.type === 'STILLNESS') {
    return { changed: false, summary: pressure.why, action: pressure.type };
  }

  if (pressure.type === 'EXPAND') {
    const result = await reasoner.reason({
      operation: 'EXPAND',
      garden,
      target: null,
      allowWebSearch: true,
      prompt: 'Search current public reality first. Return at most one narrow machine-mediated economic center whose concrete failure is externally observable. Harvest buyer evidence in the same search when reality genuinely supplies it, and map every credited claim to exact consulted URLs.',
    });
    const candidate = (result.data.candidates ?? [])[0] ?? null;
    const created = createEvidenceBearingOpportunity(garden, candidate, result);

    if (!created.opp) {
      return {
        changed: true,
        summary: `Expansion scout admitted no candidate (${created.reason}); the miss was preserved so the next scout can explore different soil rather than repeat the same search.`,
        action: 'EXPAND',
        sources: uniqueExternalSources(result.sources ?? []),
      };
    }

    return {
      changed: true,
      summary: created.gatePass
        ? `Evidence-bearing expansion validated ${created.opp.name} for a PRIVATE build plan in one frontier: failure=${created.failureSourceCount} mapped source(s), buyer=${created.buyerSourceCount} mapped source(s).`
        : `Evidence-bearing expansion admitted ${created.opp.name}: failure reality earned from ${created.failureSourceCount} mapped source(s); buyer demand remains the next uncertainty.`,
      action: 'EXPAND',
      sources: uniqueExternalSources(result.sources ?? []),
    };
  }

  if (pressure.type === 'FALSIFY') {
    const opp = byId(garden.opportunities, pressure.targetId);
    if (!opp) throw new Error('FALSIFY target not found.');
    const result = await reasoner.reason({
      operation: 'FALSIFY',
      garden,
      target: opp,
      prompt: 'Attack this legacy seed and preserve uncertainty.',
    });
    const externalSources = uniqueExternalSources(result.sources ?? []);
    opp.reasoningEvidence = [...(opp.reasoningEvidence ?? []), ...(result.data.evidence ?? [])];
    opp.counterEvidence = [...(opp.counterEvidence ?? []), ...(result.data.counterEvidence ?? [])];
    opp.sources = uniqueExternalSources([...(opp.sources ?? []), ...externalSources]);
    opp.externalEvidence = [...new Set([...(opp.externalEvidence ?? []), ...externalSources.map((s) => s.url)])];
    opp.lastRationale = result.data.rationale ?? null;
    opp.status = externalSources.length === 0 ? 'needs_test' : result.data.verdict === 'compost' ? 'compost' : 'supported';
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
    const targetDimension = requiredValidationDimension(garden, opp.id) ?? supplementalValidationDimension(garden, opp.id);
    const priorNonSupporting = nonSupportingIntegratedWebSearch(previous, targetDimension);

    if (
      opp.id === EMAIL_AUTH_PREFLIGHT_OPPORTUNITY_ID
      && targetDimension === 'failure_reality'
      && !hasMethod(previous, 'email_auth_dns_sample')
    ) return authorizeEmailDnsFailureReality(garden, opp);

    if (
      opp.id === MAPS_WEBSITE_OPPORTUNITY_ID
      && targetDimension === 'failure_reality'
      && priorNonSupporting
      && !hasMethod(previous, 'maps_website_sample')
    ) return authorizeMapsFailureReality(garden, opp);

    if (priorNonSupporting && !hasUnusedBranchSpecificAlternateMeasurement(opp, targetDimension, previous)) {
      markMeasurementBlocked(garden, opp, priorNonSupporting, targetDimension);
      return {
        changed: true,
        summary: `Measurement blocked: ${opp.name} cannot justify another ${targetDimension} search until a materially different bounded measurement method exists.`,
        action: 'EXPERIMENT',
      };
    }

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
      prompt: 'Execute only the authorized public-web evidence search. Prefer primary sources, marketplace/product evidence, user problem reports, documentation, and concrete workflows. Return supports only when the success condition is met; weakens when the kill condition is materially met; otherwise inconclusive.',
    });
    const sources = uniqueExternalSources(result.sources ?? []);
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
      operation: 'BUILD_PLAN',
      garden,
      target: opp,
      prompt: 'Produce the smallest PRIVATE build plan that can create a measurable Fruit. Do not publish or spend. Explicitly identify which reusable capability and failure archetype this Fruit adds to the geometry for future generations.',
    });
    opp.buildPlan = result.data.buildPlan ?? null;
    opp.status = 'build_ready';
    return {
      changed: true,
      summary: `Private build plan prepared for ${opp.name}.`,
      action: 'BUILD_PLAN',
    };
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

    const sources = uniqueExternalSources(exp.result?.sources ?? []);
    opp.sources = uniqueExternalSources([...(opp.sources ?? []), ...sources]);
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
      opp.epistemicNote = 'Dormant, not disproven: the bounded direct sample met its predeclared kill condition.';
    } else if (sources.length > 0 && exp.result?.verdict === 'supports') {
      opp.status = 'supported';
      const gate = validationGateSnapshot(garden, opp.id);
      opp.validationGate = gate;
      if (gate.pass) {
        opp.status = 'validated';
        opp.validatedAt = nowIso();
        opp.epistemicNote = 'Validated only for a PRIVATE build plan: accountable external evidence covers failure reality and buyer demand.';
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
