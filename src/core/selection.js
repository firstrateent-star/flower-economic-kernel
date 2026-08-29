import { id, nowIso } from './utils.js';

export async function runSelection({ garden, reasoner }) {
  const candidates = (garden.opportunities ?? []).filter((x) =>
    ['needs_test', 'supported'].includes(x.status) && !x.experimentId
  );

  if (candidates.length < 2) {
    return {
      changed: false,
      summary: 'Selection skipped because fewer than two testable siblings remain.',
      action: 'SELECT',
    };
  }

  const target = candidates.map((x) => ({
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
  }));

  const result = await reasoner.reason({
    operation: 'SELECT',
    garden,
    target,
    prompt: `Allocate the next external experiment breath among these surviving siblings. Compare only the supplied candidates. The reserve candidate remains alive and may be tested later. Choose the candidate whose next reality test has the best expected information value per dollar while preserving Flower's passivity, autonomy, and reproductive-inheritance goals. Return the exact chosen opportunity id.`,
  });

  const chosenId = result.data?.chosenOpportunityId;
  const chosen = candidates.find((x) => x.id === chosenId);
  if (!chosen) {
    throw new Error(`SELECT returned unknown opportunity id: ${chosenId ?? 'null'}`);
  }

  for (const candidate of candidates) {
    candidate.selectedForExperiment = candidate.id === chosen.id;
    candidate.selectionState = candidate.id === chosen.id ? 'selected' : 'reserve';
    candidate.lastSelectionAt = nowIso();
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
