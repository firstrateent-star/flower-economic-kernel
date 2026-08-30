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

    // integrated-v3 terminal-governance fields. Missing values remain unknown; they are
    // not silently inferred from older passivity/autonomy prose.
    terminalEvidence: x.terminalEvidence ?? x.successSignal ?? null,
    demandEvidence: x.demandEvidence ?? null,
    demandAccess: x.demandAccess ?? null,
    needIntensity: x.needIntensity ?? null,
    trustAvailability: x.trustAvailability ?? null,
    fulfillmentConfidence: x.fulfillmentConfidence ?? null,
    distributionReachability: x.distributionReachability ?? null,
    expectedNetValueUsd: x.expectedNetValueUsd ?? null,
    shortHorizonValue: x.shortHorizonValue ?? null,
    mediumHorizonValue: x.mediumHorizonValue ?? null,
    longHorizonValue: x.longHorizonValue ?? null,
    repeatability: x.repeatability ?? null,
    offerIntegrity: x.offerIntegrity ?? null,
    branchBudget: x.branchBudget ?? null,
    killCondition: x.killCondition ?? null,

    buyerType: x.buyerType ?? null,
    buyerContextEvidence: x.buyerContextEvidence ?? null,
    independentPayerBreadth: x.independentPayerBreadth ?? null,
    repeatPaidUse: x.repeatPaidUse ?? null,
    settledValueEvidence: x.settledValueEvidence ?? null,
    corpusMatch: x.corpusMatch ?? null,
    reusableCapability: x.reusableCapability ?? null,
    distributionRails: x.distributionRails ?? null,
    humanBoundaryRequired: x.humanBoundaryRequired ?? null,
    humanActuationBurden: x.humanActuationBurden ?? null,
    freeEvidenceSaturated: x.freeEvidenceSaturated ?? null,

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
    prompt: `Allocate the next reality-test breath among these surviving siblings. The current champion has no ownership right over future attention; every selection is champion-versus-challenger allocation under the Center-holder's terminal objective. Choose the candidate whose next materially different executable probe has the highest expected terminal-value or decision-changing yield per scarce resource. Preserve longer-horizon exploration, but do not let novelty, passivity, automation purity, or prior sunk cost substitute for evidence.

TERMINAL-VALUE LAWS:
1. TERMINAL OBJECTIVE LOCK. First identify what external evidence would actually count as success for this Garden. Code written, tests passed, deployment, listing, traffic, platform eligibility, and methodological sophistication are intermediate states unless the Center explicitly names them as the objective.
2. DEMAND / ACCESS / FULFILLMENT ARE SEPARATE. Demand without reachable distribution is not a transaction path. Reach without truthful fulfillment is invalid. Unknown is not pass. Before heavy construction, prefer probes that establish or falsify these states.
3. GROW BACKWARD FROM FRUIT. Reason from terminal outcome <- external action <- trust <- access/distribution <- need/demand <- fulfillment. Prefer the shortest truthful reachable chain rather than the most elegant organism.
4. CHAMPION / CHALLENGER. Compare opportunity cost, not merely local improvability. A branch that can be improved may still deserve to rest if another sibling has a shorter or stronger path to terminal evidence.
5. BRANCH METABOLISM. Attention, capital, compute, latency, and human actuation are budgets. Additional depth must be earned by terminal movement or decision-changing evidence. Penalize branches consuming repeated probes without materially changing probability or action.
6. AUTONOMY LADDER. Validate need/value first, then repeat, compress, and automate. Low human burden remains valuable, especially for mature recurring operation, but it must not veto a much faster truthful first-Fruit path merely because that path initially requires bounded human work.
7. ANTI-GOODHART. Explicitly ask how the metric currently favoring a branch could be gamed or could damage the actual objective. Do not optimize first-dollar speed into deceptive or non-repeatable transactions; do not optimize automation into zero-demand products.
8. TWO-TEMPERATURE SEARCH. Exploit the strongest evidenced short path while preserving bounded exploratory value. Do not let short-horizon pressure permanently erase a materially different long-horizon branch, but do not use exploration as an excuse to avoid action.
9. FUTURE-STATE INTEGRITY. If the probe succeeds, verify that the next state remains fulfillable without hidden obligation, deceptive promise, unauthorized identity use, debt, or unsustainable human burden.
10. ACTION MEMBRANE. If a safe available action has higher expected value than another analysis pass, prefer action. Another recursive cycle must earn itself.

EXISTING FLOWER LAWS STILL APPLY:
11. CORPUS-FIRST. A verified capability already present in the corpus that matches observed demand should normally outrank rebuilding equivalent capability. A new habitat or payment rail is not itself evidence that a new product should be built.
12. BUYER-CONTEXT. Do not transfer willingness-to-pay across buyer types without evidence. Human SaaS demand, enterprise procurement, developer marketplace demand, and autonomous-agent micropayment demand are different economic contexts.
13. DEMAND HEALTH. Raw transaction counts, advertised inventory, listings, downloads, or claims are weak alone. Prefer independent payer/user breadth, repeat paid use, real settled value, recent economic activity, and source-of-truth reconciliation.
14. REGENERATION. Small monetary returns can be valuable if they validate a reusable settlement/distribution path, trust signal, capability, or information that materially lowers future cycle cost. Conversely, a symbolic first dollar that consumes disproportionate human attention and regenerates nothing is weak.
15. HUMAN ACTUATION PORTFOLIO. Identity, KYC, legal terms, irreversible publication, outreach, and similar acts are scarce sovereignty actions. Reaching such a membrane does not automatically earn crossing it; compare it with the best challenger and fresh-search pressure first unless the Center-holder already chose the boundary.
16. DISTRIBUTION RAILS ARE SEPARATE STATES. Public/listed, discoverable, runnable, payable, settled, and repeatedly used are not synonyms.
17. ARTIFACT TRUTH OUTRANKS STALE PLANNING STATE. Executable code, CI, settlement receipts, and concrete observations outrank older manifests or narrative.

CURRENT V0 EXECUTORS: generic experiments can autonomously execute only public web_search. A deterministic direct Maps→website sampler exists only for the Google Maps Website Identity Guard, and a deterministic SPF/DMARC DNS sampler exists only for the current Transactional Email Authentication Preflight branch. Candidate prose claiming unavailable DNS/GitHub/API/package sampling is cheap does not make it executable. Discount benefits that depend on an unavailable executor. Penalize repeating a method or validation dimension that already returned weak or inconclusive evidence unless a genuinely different executable measurement method exists.

Return the exact chosen opportunity id.`,
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
