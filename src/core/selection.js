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
    economicHabitat: x.economicHabitat ?? null,
    moneyFlow: x.moneyFlow ?? null,
    buyer: x.buyer ?? null,
    nutrientChannel: x.nutrientChannel,

    // integrated-v4 regenerative-loop hypotheses. These fields describe the proposed
    // path but do not self-verify value, ownership, attribution, costs, or surplus.
    externalValueHypothesis: x.externalValueHypothesis ?? null,
    externalValueMeasure: x.externalValueMeasure ?? null,
    valueCapturePath: x.valueCapturePath ?? null,
    ownershipPath: x.ownershipPath ?? null,
    lifecycleCostModel: x.lifecycleCostModel ?? null,
    reinvestmentPath: x.reinvestmentPath ?? null,
    timeToFirstTruth: x.timeToFirstTruth ?? null,
    humanBoundary: x.humanBoundary ?? null,
    downstreamObligation: x.downstreamObligation ?? null,
    antiGoodhartRisk: x.antiGoodhartRisk ?? null,
    alternativesConsidered: x.alternativesConsidered ?? [],

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
    prompt: `Allocate the next reality-test breath among these surviving siblings. The current champion has no ownership right over future attention; every selection is champion-versus-challenger allocation under the Center-holder's terminal objective. Choose the candidate whose next materially different executable probe has the highest expected terminal-value or decision-changing yield per scarce resource. Preserve longer-horizon exploration, but do not let novelty, passivity, automation purity, capture potential, or prior sunk cost substitute for evidence.

TERMINAL + REGENERATIVE LAWS:
1. TERMINAL OBJECTIVE LOCK. Identify what external evidence would actually count as success. Code, tests, deployment, listing, traffic, platform eligibility, gross usage, and methodological sophistication remain intermediate unless explicitly terminal.
2. VALUE / RETURN SEPARATION. Ask what useful external state change the branch could create and how that change could later be measured. Separately ask how attributable return could come back. A payment does not by itself verify useful value; useful value does not by itself prove capture.
3. DEMAND / ACCESS / FULFILLMENT / CAPTURE ARE SEPARATE. Demand without reachable distribution is not a transaction path. Reach without truthful fulfillment is invalid. A useful artifact without a legitimate return rail is not yet a self-nourishing economic organism. Unknown is not pass.
4. GROW BACKWARD FROM REGENERATIVE FRUIT. Reason from repeat regenerative return <- positive full-cost surplus <- attributable return <- capture/settlement rail <- useful external value <- external action <- trust <- access/distribution <- need/demand <- truthful fulfillment.
5. FULL-COST DISCIPLINE. Gross return is not surplus. Prefer branches whose compute, APIs, hosting, support, maintenance, settlement, human burden, and downstream obligations can be bounded and measured. Unknown material costs remain unknown.
6. OWNERSHIP REALITY. A named ownershipPath is a hypothesis until independently grounded. Do not infer legal/economic entitlement merely because Flower or the Center-holder originated an idea or artifact.
7. REGENERATION. Prefer returns that can nourish reusable capability, distribution, knowledge, reserve, compute, or another resource that makes later useful transformation cheaper/better. Owner nourishment is also a legitimate destination for realized surplus when ownership/settlement is real; no allocation percentage is autonomously assumed.
8. ANTI-EXTRACTION / ANTI-GOODHART. Ask how optimizing price, capture ratio, first-dollar speed, usage, automation, or another metric could reduce useful value, trust, agency, fulfillment, adoption, or long-run regeneration. Capture without value is a warning, not a victory.
9. CHAMPION / CHALLENGER. Compare opportunity cost, not merely local improvability. A branch may deserve to rest even if improvable when another sibling has a shorter or stronger loop to terminal evidence.
10. BRANCH METABOLISM. Attention, capital, compute, latency, and human actuation are budgets. Additional depth must be earned by terminal movement or decision-changing evidence.
11. AUTONOMY LADDER. Validate need/value first, then repeat, crystallize reusable structure, compress, and automate. Low ongoing human burden is valuable, but it must not veto a much faster truthful first-value path merely because bounded initial human work is required.
12. TWO-TEMPERATURE SEARCH. Exploit the strongest evidenced short path while preserving bounded exploration. Do not let short-horizon pressure erase materially different long-horizon value, and do not use exploration to avoid action.
13. FUTURE-STATE INTEGRITY. If the next probe succeeds, verify that the resulting state remains fulfillable without hidden obligation, deceptive promise, unauthorized identity use, debt, or unsustainable human burden.
14. ACTION MEMBRANE. If a safe available action has higher expected value than another analysis pass, prefer action. Another recursive cycle must earn itself.
15. CRYSTALLIZATION. When a useful transformation repeats, prefer converting it into a reusable artifact, rule, test, cache, skill, schema, or tool when that lowers future cost without erasing uncertainty.

EXISTING FLOWER LAWS STILL APPLY:
16. CORPUS-FIRST. A verified capability already present in the corpus that matches observed demand should normally outrank rebuilding equivalent capability.
17. BUYER-CONTEXT. Do not transfer willingness-to-pay across buyer types without evidence. Human SaaS, enterprise procurement, developer marketplaces, and agent micropayments are distinct contexts.
18. DEMAND HEALTH. Raw transactions, inventory, listings, downloads, or claims are weak alone. Prefer independent payer/user breadth, repeat paid use, settled value, recent activity, and source-of-truth reconciliation.
19. HUMAN ACTUATION PORTFOLIO. Identity, KYC, legal terms, irreversible publication, outreach, ownership allocation, and similar acts are scarce sovereignty actions. Reaching such a membrane does not automatically earn crossing it.
20. DISTRIBUTION RAILS ARE SEPARATE STATES. Public/listed, discoverable, runnable, payable, settled, attributable, profitable, and repeatedly used are not synonyms.
21. ARTIFACT TRUTH OUTRANKS STALE PLANNING STATE. Executable code, CI, settlement receipts, verified ownership records, and concrete observations outrank older narrative.

CURRENT V0 EXECUTORS: generic experiments can autonomously execute only public web_search. A deterministic direct Maps→website sampler exists only for the Google Maps Website Identity Guard, and a deterministic SPF/DMARC DNS sampler exists only for the current Transactional Email Authentication Preflight branch. Candidate prose claiming unavailable DNS/GitHub/API/package sampling is cheap does not make it executable. Discount benefits that depend on an unavailable executor. Penalize repeating a method or validation dimension that already returned weak or inconclusive evidence unless a genuinely different executable measurement exists.

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
