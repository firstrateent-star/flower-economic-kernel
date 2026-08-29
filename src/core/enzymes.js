import { authorizeAction } from './autonomy.js';
import { id, nowIso } from './utils.js';
import { validateStatusPromotion } from './transitions.js';

function byId(items, targetId) {
  return items.find((x) => x.id === targetId);
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
        evidence: [], counterEvidence: [], sources: result.sources ?? [], ancestry: ['EXPAND'],
      });
    }
    return { changed: (result.data.candidates ?? []).length > 0, summary: `Expanded with ${(result.data.candidates ?? []).length} candidate(s).`, action: 'EXPAND', sources: result.sources };
  }

  if (pressure.type === 'FALSIFY') {
    const opp = byId(garden.opportunities, pressure.targetId);
    if (!opp) throw new Error('FALSIFY target not found.');
    const result = await reasoner.reason({
      operation: 'FALSIFY', garden, target: opp,
      prompt: `Attack this opportunity. Search for existing solutions, evidence that the pain is rare, weak passive distribution, trivial resolution complexity, poor autonomy compatibility, or lack of money flow. Prefer killing it cheaply.\nReturn {"verdict":"compost|continue|needs_test","rationale":"...","evidence":["..."],"counterEvidence":["..."],"cheapestFalsifier":{"question":"...","action":"...","estimatedCostUsd":0},"principles":[]}`,
    });
    const before = opp.status;
    const evidenceDelta = [...(result.data.evidence ?? []), ...(result.sources ?? []).map((s) => s.url)];
    opp.evidence.push(...(result.data.evidence ?? []));
    opp.counterEvidence.push(...(result.data.counterEvidence ?? []));
    opp.sources = [...new Map([...(opp.sources ?? []), ...(result.sources ?? [])].map((s) => [s.url ?? JSON.stringify(s), s])).values()];
    opp.cheapestFalsifier = result.data.cheapestFalsifier ?? opp.cheapestFalsifier;
    opp.lastRationale = result.data.rationale ?? null;

    if (result.data.verdict === 'compost') {
      opp.status = 'compost';
      opp.failedBecause = result.data.rationale ?? 'Failed falsification.';
    } else {
      const promotion = validateStatusPromotion(before, 'supported', evidenceDelta);
      if (!promotion.ok) throw new Error(promotion.reason);
      opp.status = 'supported';
    }

    for (const principle of result.data.principles ?? []) {
      garden.soil.push({ id: id('soil'), principle, scope: 'economic', status: 'candidate', derivedFrom: [opp.id], createdAt: nowIso() });
    }
    return { changed: true, summary: `${opp.name}: ${opp.status}. ${opp.lastRationale ?? ''}`.trim(), action: 'FALSIFY', sources: result.sources };
  }

  if (pressure.type === 'EXPERIMENT') {
    const opp = byId(garden.opportunities, pressure.targetId);
    if (!opp) throw new Error('EXPERIMENT target not found.');
    const result = await reasoner.reason({
      operation: 'EXPERIMENT', garden, target: opp,
      prompt: `Design the cheapest discriminating experiment that can materially change whether we pursue this. It must avoid recurring obligations, contracts, Sean's identity, cold outreach, and public deployment unless separately approved.\nReturn {"experiment":{"name":"...","tests":"...","actionType":"observe|web_search|create_private|sandbox|spend|public_deploy|human_contact","oneTimeCostUsd":0,"recurringUsd":0,"successCondition":"...","killCondition":"..."}}`,
    });
    const e = result.data.experiment;
    if (!e) return { changed: false, summary: 'No experiment proposed.', action: 'EXPERIMENT' };
    const auth = authorizeAction(garden, { type: e.actionType, amountUsd: e.oneTimeCostUsd, recurringUsd: e.recurringUsd });
    const exp = { id: id('exp'), opportunityId: opp.id, status: auth.allowed ? 'authorized' : 'awaiting_approval', createdAt: nowIso(), authorization: auth, ...e };
    garden.experiments.push(exp);
    opp.experimentId = exp.id;
    if (auth.requiresApproval) garden.approvals.push({ id: id('approval'), status: 'pending', createdAt: nowIso(), action: exp, reason: auth.reason });
    return { changed: true, summary: auth.allowed ? `Experiment authorized: ${exp.name}` : `Experiment requires approval: ${exp.name}`, action: 'EXPERIMENT' };
  }

  if (pressure.type === 'BUILD_PLAN') {
    const opp = byId(garden.opportunities, pressure.targetId);
    const result = await reasoner.reason({
      operation: 'BUILD_PLAN', garden, target: opp,
      prompt: `Produce a minimal PRIVATE build plan only. Do not publish or spend. Identify inherited infrastructure from existing Fruit and the passive nutrient channel.\nReturn {"buildPlan":{"artifact":"...","privateSteps":[],"inherited":[],"publicBoundary":"...","estimatedMaintenance":"..."}}`,
    });
    opp.buildPlan = result.data.buildPlan ?? null;
    opp.status = 'build_ready';
    return { changed: true, summary: `Private build plan prepared for ${opp.name}.`, action: 'BUILD_PLAN' };
  }

  if (pressure.type === 'INTEGRATE') {
    const event = byId(garden.events, pressure.targetId);
    if (event) event.status = 'processed';
    const exp = byId(garden.experiments, pressure.targetId);
    if (exp) exp.status = 'integrated';
    return { changed: true, summary: 'Reality event marked integrated; domain-specific integration is intentionally minimal in v0.', action: 'INTEGRATE' };
  }

  return { changed: false, summary: `No enzyme for ${pressure.type}.`, action: pressure.type };
}
