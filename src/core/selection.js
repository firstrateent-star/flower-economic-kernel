import { id, nowIso } from './utils.js';

function latestIntegratedExperiment(garden, opportunityId) {
  return (garden.experiments ?? [])
    .filter((x) => x.opportunityId === opportunityId && x.status === 'integrated')
    .sort((a, b) => String(b.integratedAt ?? b.executedAt ?? b.createdAt ?? '').localeCompare(String(a.integratedAt ?? a.executedAt ?? a.createdAt ?? '')))[0] ?? null;
}

function hasFreshNonSupportingResult(garden, opportunity) {
  if (opportunity.selectionCooldown === true) return true;
  const latest = latestIntegratedExperiment(garden, opportunity.id);
  if (!latest || latest.result?.verdict === 'supports') return false;

  const selectedAt = Date.parse(opportunity.lastSelectionAt ?? 0);
  const integratedAt = Date.parse(latest.integratedAt ?? latest.executedAt ?? latest.createdAt ?? 0);
  return Number.isFinite(integratedAt) && integratedAt >= selectedAt;
}

function selectionState(garden) {
  const candidates = (garden.opportunities ?? []).filter((x) =>
    ['needs_test', 'supported'].includes(x.status) && !x.experimentId
  );
  const freshCandidates = candidates.filter((x) => !hasFreshNonSupportingResult(garden, x));
  const eligible = freshCandidates.length > 0 ? freshCandidates : candidates;
  return { candidates, eligible };
}

// The kernel uses this only to decide whether SELECT crosses a paid cognition frontier.
// A one-eligible-candidate breadth-first selection is deterministic and therefore free.
export function selectionRequiresReasoner(garden) {
  const { candidates, eligible } = selectionState(garden);
  return candidates.length >= 2 && eligible.length > 1;
}

export async function runSelection({ garden, reasoner }) {
  const { candidates, eligible } = selectionState(garden);

  if (candidates.length < 2) {
    return {
      changed: false,
      summary: 'Selection skipped because fewer than two testable siblings remain.',
      action: 'SELECT',
    };
  }

  if (eligible.length === 1) {
    const chosen = eligible[0];
    for (const candidate of candidates) {
      candidate.selectedForExperiment = candidate.id === chosen.id;
      candidate.selectionState = candidate.id === chosen.id ? 'selected' : 'reserve';
      candidate.lastSelectionAt = nowIso();
      if (candidate.id === chosen.id) {
        candidate.selectionCooldown = false;
        candidate.selectionCooldownReason = null;
      }
    }

    garden.selections ??= [];
    garden.selections.push({
      id: id('select'),
      createdAt: nowIso(),
      chosenOpportunityId: chosen.id,
      reserveOpportunityIds: candidates.filter((x) => x.id !== chosen.id).map((x) => x.id),
      rationale: 'Deterministic breadth-first allocation: another surviving sibling has newer non-supporting external evidence and must yield the next test slot.',
      candidateIds: candidates.map((x) => x.id),
      responseId: null,
      usage: null,
    });

    return {
      changed: true,
      summary: `Selected ${chosen.name} deterministically while a sibling yields after a non-supporting experiment.`,
      action: 'SELECT',
    };
  }

  const target = eligible.map((x) => ({
    id: x.id,
    name: x.name,
    status: x.status,
    thesis: x.thesis,
    nutrientChannel: x.nutrientChannel,
    passivity: x.passivity,
    autonomyCompatibility: x.autonomyCompatibility,
    reproductivePotential: x.reproductivePotential,
    realityAccess: x.realityAccess,
    cheapestRealityTest: x.cheapestRealityTest,
    inheritedInfrastructure: x.inheritedInfrastructure,
    cheapestFalsifier: x.cheapestFalsifier ?? null,
    lastRationale: x.lastRationale ?? null,
    lastExperimentFinding: x.lastExperimentFinding ?? null,
    validationGate: x.validationGate ?? null,
    integratedExperiments: (garden.experiments ?? [])
      .filter((exp) => exp.opportunityId === x.id && exp.status === 'integrated')
      .map((exp) => ({
        name: exp.name,
        validationDimension: exp.validationDimension ?? null,
        verdict: exp.result?.verdict ?? null,
        finding: exp.result?.finding ?? null,
        sourceCount: exp.result?.sourceCount ?? exp.result?.sources?.length ?? 0,
      })),
  }));

  const result = await reasoner.reason({
    operation: 'SELECT',
    garden,
    target,
    prompt: `Allocate the next external experiment breath among these surviving siblings. Compare only the supplied candidates and their recorded evidence. The reserve candidate remains alive and may be tested later. Choose the candidate whose next materially different reality test has the best expected information value per dollar while preserving Flower's passivity, autonomy, and reproductive-inheritance goals.\nCURRENT V0 EXECUTORS: generic experiments can autonomously execute only public web_search. A deterministic direct Maps→website sampler exists only for the Google Maps Website Identity Guard, and a deterministic SPF/DMARC DNS sampler exists only for the current Transactional Email Authentication Preflight branch. Candidate prose claiming unavailable DNS/GitHub/API/package sampling is cheap does not make it executable. Discount any benefit that depends on an unavailable executor, and prefer a sibling whose next discriminating evidence can actually be obtained with current capability. Penalize repeating a method or validation dimension that already returned weak or inconclusive evidence unless a genuinely different executable measurement method exists. Return the exact chosen opportunity id.`,
  });

  const chosenId = result.data?.chosenOpportunityId;
  const chosen = eligible.find((x) => x.id === chosenId);
  if (!chosen) {
    throw new Error(`SELECT returned unknown opportunity id: ${chosenId ?? 'null'}`);
  }

  for (const candidate of candidates) {
    candidate.selectedForExperiment = candidate.id === chosen.id;
    candidate.selectionState = candidate.id === chosen.id ? 'selected' : 'reserve';
    candidate.lastSelectionAt = nowIso();
    if (candidate.id === chosen.id) {
      candidate.selectionCooldown = false;
      candidate.selectionCooldownReason = null;
    }
  }

  garden.selections ??= [];
  garden.selections.push({
    id: id('select'),
    createdAt: nowIso(),
    chosenOpportunityId: chosen.id,
    reserveOpportunityIds: candidates.filter((x) => x.id !== chosen.id).map((x) => x.id),
    rationale: result.data?.rationale ?? null,
    candidateIds: candidates.map((x) => x.id),
    responseId: result.rawId ?? null,
    usage: result.usage ?? null,
  });

  return {
    changed: true,
    summary: `Selected ${chosen.name} for the next external experiment; ${candidates.length - 1} sibling(s) remain in reserve.`,
    action: 'SELECT',
  };
}
