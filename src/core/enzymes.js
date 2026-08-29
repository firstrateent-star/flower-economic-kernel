import { authorizeAction } from './autonomy.js';
import { id, nowIso } from './utils.js';

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

export async function runEnzyme({ garden, pressure, reasoner }) {
  if (pressure.type === 'HUMAN' || pressure.type === 'STILLNESS') {
    return { changed: false, summary: pressure.why, action: pressure.type };
  }

  if (pressure.type === 'EXPAND') {
    const result = await reasoner.reason({
      operation: 'EXPAND', garden, target: null,
      prompt: `Find at most 3 genuinely distinct candidate economic Fruit. Start from existing high-intent nutrient channels where buyers or machines already spend money. Avoid consulting, cold outreach, physical fulfillment, and ideas requiring Sean's ongoing labor.\nReturn {"candidates":[{"name":"...","thesis":"...","moneyFlow":"...","buyer":"...","nutrientChannel":"...","passivity":"...","autonomyCompatibility":"...","reproductivePotential":"...","whyNow":"..."}]}`,
    });
    for (const c of result.data.candidates ?? []) {
      garden.opportunities.push({
        id: id('opp'), status: 'seed', createdAt: nowIso(),
        ...c,
        reasoningEvidence: [], externalEvidence: [], counterEvidence: [], sources: result.sources ?? [], ancestry: ['EXPAND'],
      });
    }
    return { changed: (result.data.candidates ?? []).length > 0, summary: `Expanded with ${(result.data.candidates ?? []).length} candidate(s).`, action: 'EXPAND', sources: result.sources };
  }

  if (pressure.type === 'FALSIFY') {
    const opp = byId(garden.opportunities, pressure.targetId);
    if (!opp) throw new Error('FALSIFY target not found.');
    const result = await reasoner.reason({
      operation: 'FALSIFY', garden, target: opp,
      prompt: `Attack this opportunity. Look for existing solutions, evidence that the pain is rare, weak passive distribution, trivial resolution complexity, poor autonomy compatibility, or lack of money flow. Prefer killing it cheaply. Distinguish model reasoning from externally observed evidence.\nReturn {"verdict":"compost|continue|needs_test","rationale":"...","evidence":["..."],"counterEvidence":["..."],"cheapestFalsifier":{"question":"...","action":"...","estimatedCostUsd":0},"principles":[]}`,
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
      opp.epistemicNote = 'No external evidence was retrieved in this breath; model reasoning is provisional only.';
    } else if (result.data.verdict === 'compost') {
      opp.status = 'compost';
      opp.failedBecause = result.data.rationale ?? 'Failed falsification with external evidence.';
    } else {
      opp.status = 'supported';
      opp.epistemicNote = `Supported by ${externalSources.length} externally retrieved source(s); still not economically validated.`;
    }

    for (const principle of result.data.principles ?? []) {
      garden.soil.push({ id: id('soil'), principle, scope: 'economic', status: 'candidate', derivedFrom: [opp.id], createdAt: nowIso() });
    }
    return { changed: true, summary: `${opp.name}: ${opp.status}. ${opp.lastRationale ?? ''}`.trim(), action: 'FALSIFY', sources: externalSources };
  }

  if (pressure.type === 'EXPERIMENT') {
    const opp = byId(garden.opportunities, pressure.targetId);
    if (!opp) throw new Error('EXPERIMENT target not found.');
    const previous = garden.experiments.filter((x) => x.opportunityId === opp.id);
    const gate = validationGateSnapshot(garden, opp.id);
    const requiredDimension = requiredValidationDimension(garden, opp.id);
    const result = await reasoner.reason({
      operation: 'EXPERIMENT', garden, target: opp,
      prompt: `Design the cheapest discriminating experiment that can materially change whether we pursue this. It must avoid recurring obligations, contracts, Sean's identity, cold outreach, and public deployment unless separately approved. The experiment must produce external evidence; internal reasoning alone is not a successful test. Avoid merely repeating prior experiments.\nPRIVATE-BUILD VALIDATION GATE: ${JSON.stringify(gate)}\nREQUIRED VALIDATION DIMENSION: ${requiredDimension ?? 'Choose an uncovered dimension that most cheaply reduces remaining uncertainty.'}\nVALIDATION DIMENSIONS: failure_reality = direct evidence the claimed failure actually occurs; buyer_demand = evidence buyers/workflows care enough to seek or pay for resolution; distribution_access = evidence passive discoverability/channel access; resolution_complexity = evidence resolution is not a trivial filter; willingness_to_pay = direct pricing/purchase evidence.\nV0 EXECUTION CAPABILITY: autonomous execution currently supports only public web_search. Prefer web_search when it can discriminate; choose another action type only if web search cannot answer the question, knowing it will stop at the capability membrane.\nPREVIOUS EXPERIMENTS: ${JSON.stringify(previous.map((x) => ({name:x.name,status:x.status,actionType:x.actionType,validationDimension:x.validationDimension ?? null,result:x.result ?? null})))}\nReturn one experiment with exactly one validationDimension.`,
    });
    const e = result.data.experiment;
    if (!e) return { changed: false, summary: 'No experiment proposed.', action: 'EXPERIMENT' };
    if (requiredDimension && e.validationDimension !== requiredDimension) {
      throw new Error(`Experiment targeted ${e.validationDimension}; policy requires ${requiredDimension} before additional dimensions.`);
    }
    const auth = authorizeAction(garden, { type: e.actionType, amountUsd: e.oneTimeCostUsd, recurringUsd: e.recurringUsd });
    const exp = { id: id('exp'), opportunityId: opp.id, status: auth.allowed ? 'authorized' : 'awaiting_approval', createdAt: nowIso(), authorization: auth, ...e };
    garden.experiments.push(exp);
    opp.experimentId = exp.id;
    if (auth.requiresApproval) garden.approvals.push({ id: id('approval'), status: 'pending', createdAt: nowIso(), action: exp, reason: auth.reason });
    return { changed: true, summary: auth.allowed ? `Experiment authorized: ${exp.name} [${exp.validationDimension}]` : `Experiment requires approval: ${exp.name}`, action: 'EXPERIMENT' };
  }

  if (pressure.type === 'EXECUTE_EXPERIMENT') {
    const exp = byId(garden.experiments, pressure.targetId);
    if (!exp) throw new Error('EXECUTE_EXPERIMENT target not found.');
    if (!exp.authorization?.allowed || exp.status !== 'authorized') {
      throw new Error('Experiment execution requested without valid authorization.');
    }

    // First-live execution capability is intentionally tiny: only an already-authorized
    // public web evidence search may execute autonomously. No publishing, contact, purchases,
    // account changes, code deployment, or external writes are implemented here.
    if (exp.actionType !== 'web_search') {
      exp.status = 'blocked_capability';
      exp.blockedReason = `v0 has no autonomous executor for actionType=${exp.actionType}.`;
      return { changed: true, summary: `Experiment stopped at capability membrane: ${exp.name}`, action: 'EXECUTE_EXPERIMENT' };
    }

    const opp = byId(garden.opportunities, exp.opportunityId);
    if (!opp) throw new Error('Experiment opportunity not found.');
    const result = await reasoner.reason({
      operation: 'EXECUTE_EXPERIMENT',
      garden,
      target: { opportunity: opp, experiment: exp },
      allowWebSearch: true,
      prompt: `Execute only the authorized public-web evidence search described by this experiment. Search for concrete evidence relevant to the stated test, success condition, kill condition, and validation dimension (${exp.validationDimension ?? 'unspecified'}). Prefer primary sources, marketplace/product evidence, user problem reports, documentation, and concrete workflow evidence over generic commentary. Do not take any external write action. Do not contact people.\nReturn {"verdict":"supports|weakens|inconclusive","finding":"...","observations":["..."]}. The verdict is provisional; source URLs are the external evidence.`
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
      prompt: `Produce a minimal PRIVATE build plan only. Do not publish or spend. Identify inherited infrastructure from existing Fruit and the passive nutrient channel. The status validated means only that evidence has earned a private build plan; it does not mean the business is proven.\nReturn {"buildPlan":{"artifact":"...","privateSteps":[],"inherited":[],"publicBoundary":"...","estimatedMaintenance":"..."}}`,
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
    if (!exp || exp.status !== 'result_ready') return { changed: false, summary: 'No result ready for integration.', action: 'INTEGRATE' };
    const opp = byId(garden.opportunities, exp.opportunityId);
    if (!opp) throw new Error('Integrated experiment opportunity not found.');

    const sources = exp.result?.sources ?? [];
    opp.sources = [...new Map([...(opp.sources ?? []), ...sources].map((s) => [s.url, s])).values()];
    opp.externalEvidence = [...new Set([...(opp.externalEvidence ?? []), ...sources.map((s) => s.url)])];
    opp.lastExperimentFinding = exp.result?.finding ?? null;

    exp.status = 'integrated';
    exp.integratedAt = nowIso();
    opp.experimentId = null;

    if (sources.length > 0 && exp.result?.verdict === 'supports') {
      opp.status = 'supported';
      const gate = validationGateSnapshot(garden, opp.id);
      opp.validationGate = gate;
      if (gate.pass) {
        opp.status = 'validated';
        opp.validatedAt = nowIso();
        opp.epistemicNote = 'Validated only for a PRIVATE build plan: independent external evidence covers buyer demand and failure reality. Public deployment and economic claims remain unearned.';
      } else {
        opp.epistemicNote = `Externally supported by experiment ${exp.id}; private-build gate remains incomplete.`;
      }
    } else {
      // A weak/inconclusive web search does not prove absence. Keep the idea testable rather than
      // pretending search silence is a decisive falsification.
      opp.status = 'needs_test';
      opp.validationGate = validationGateSnapshot(garden, opp.id);
      opp.epistemicNote = `Experiment ${exp.id} did not justify promotion; further reality contact is required.`;
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
