import { Actor, log } from 'apify';
import { pulse } from '../core/kernel.js';
import { classifyPressure } from '../core/pressure.js';
import { authorizeAction } from '../core/autonomy.js';
import { OpenAIReasoner } from '../reasoners/openai.js';
import seed from '../../garden/seed.json' with { type: 'json' };

const STORE_NAME = 'flower-economic-kernel-v0-state';
const STORE_KEY = 'FLOWER_GARDEN';

function activeOpportunitySnapshot(garden) {
  return (garden.opportunities ?? [])
    .filter((opp) => !['dormant', 'compost', 'fruit'].includes(opp.status))
    .slice(0, 8)
    .map((opp) => ({
      id: opp.id,
      name: opp.name,
      status: opp.status,
      nutrientChannel: opp.nutrientChannel ?? null,
      realityAccess: opp.realityAccess ?? null,
      cheapestRealityTest: opp.cheapestRealityTest ?? null,
      experimentId: opp.experimentId ?? null,
    }));
}

function logOpportunitySnapshot(phase, opportunities) {
  log.info('Flower garden snapshot', { phase, opportunityCount: opportunities.length });
  for (const opp of opportunities) {
    log.info('Flower opportunity', {
      phase,
      id: opp.id,
      name: opp.name,
      status: opp.status,
      nutrientChannel: opp.nutrientChannel,
      realityAccess: opp.realityAccess,
      cheapestRealityTest: opp.cheapestRealityTest,
      experimentId: opp.experimentId,
    });
  }
}

function declaresCoreMeasurementBlocked(opp) {
  const text = `${opp?.realityAccess ?? ''} ${opp?.cheapestRealityTest ?? ''}`.toLowerCase();
  return text.includes('evidence-blocked')
    || /core failure.{0,120}(?:cannot|unavailable|blocked)/i.test(text)
    || /(?:cannot|unavailable|blocked).{0,120}core failure/i.test(text);
}

await Actor.main(async () => {
  await Actor.getInput();

  const stateStore = await Actor.openKeyValueStore(STORE_NAME);
  const existing = await stateStore.getValue(STORE_KEY);
  const garden = existing ?? structuredClone(seed);

  const repaired = [];
  for (const opp of garden.opportunities ?? []) {
    const externalSources = (opp.sources ?? []).filter((s) => s?.url);
    if (opp.status === 'supported' && externalSources.length === 0) {
      opp.status = 'needs_test';
      opp.epistemicNote = 'Repaired: prior support had no external source. Model reasoning is provisional only.';
      repaired.push(opp.id);
    }
  }
  if (repaired.length) log.warning('Epistemic state repaired', { opportunities: repaired });

  const stateMigrations = [];

  for (const exp of garden.experiments ?? []) {
    if (
      exp.id === 'exp_94251fcac534'
      && exp.opportunityId === 'opp_maps_website_pointer_guard'
      && exp.status === 'integrated'
      && !exp.validationDimension
    ) {
      exp.validationDimension = 'buyer_demand';
      exp.migrationNote = 'Legacy first experiment conservatively classified as buyer_demand; failure_reality remains independently unearned.';
      stateMigrations.push(`${exp.id}:buyer_demand`);
    }
  }

  for (const exp of garden.experiments ?? []) {
    if (
      exp.method === 'maps_website_sample'
      && exp.status === 'authorized'
      && Number(exp.oneTimeCostUsd) < 0.50
    ) {
      const previousCap = Number(exp.oneTimeCostUsd);
      exp.oneTimeCostUsd = 0.50;
      const auth = authorizeAction(garden, {
        type: 'spend',
        amountUsd: 0.50,
        recurringUsd: Number(exp.recurringUsd ?? 0),
      });
      exp.authorization = auth;
      exp.migrationNote = `Platform-minimum migration: run ceiling raised from $${previousCap.toFixed(2)} to $0.50 after Apify rejected the lower cap. This is a ceiling, not a claim of actual spend.`;
      if (!auth.allowed) {
        exp.status = 'awaiting_approval';
        if (auth.requiresApproval && !garden.approvals.some((x) => x.status === 'pending' && x.action?.id === exp.id)) {
          garden.approvals.push({
            id: `approval_${exp.id}`,
            status: 'pending',
            createdAt: new Date().toISOString(),
            action: exp,
            reason: auth.reason,
          });
        }
      }
      stateMigrations.push(`${exp.id}:charge_cap_${previousCap.toFixed(2)}_to_0.50`);
    }
  }

  // The first live email DNS experiment already met its predeclared weakening threshold
  // before the dormant policy was generalized. Preserve the evidence and migrate the
  // branch instead of paying for another semantic search after stronger direct evidence.
  for (const exp of garden.experiments ?? []) {
    if (
      exp.method === 'email_auth_dns_sample'
      && exp.status === 'integrated'
      && exp.result?.verdict === 'weakens'
      && Number(exp.result?.sample?.espSignaled ?? 0) >= 8
      && Number(exp.result?.sample?.hardFailureDomains ?? Infinity) === 0
    ) {
      const opp = (garden.opportunities ?? []).find((x) => x.id === exp.opportunityId);
      if (opp && ['needs_test', 'supported'].includes(opp.status) && !opp.experimentId) {
        opp.status = 'dormant';
        opp.selectedForExperiment = false;
        opp.selectionState = 'dormant';
        opp.selectionCooldown = false;
        opp.dormantAt = new Date().toISOString();
        opp.failedBecause = `Predeclared direct-DNS kill condition met by ${exp.id}: ${exp.killCondition ?? 'sufficient ESP-signaled sample with zero hard SPF/DMARC failures'}`;
        opp.epistemicNote = 'Dormant, not disproven: direct DNS reality contact weakened the claimed hard-failure mechanism enough that another semantic search is not justified without materially new evidence or a different population.';
        stateMigrations.push(`${opp.id}:dns_kill_to_dormant`);
      }
    }
  }

  // Do not spend a buyer-demand search on a branch that already admits its decisive
  // failure-reality is inaccessible. This is a validation-path preflight, not a claim
  // that the hypothesis is false. Future EXPAND prompts reject these branches earlier;
  // this migration also protects candidates generated by older builds.
  let preflightBlocked = false;
  for (const opp of garden.opportunities ?? []) {
    if (
      ['needs_test', 'supported'].includes(opp.status)
      && !opp.experimentId
      && declaresCoreMeasurementBlocked(opp)
    ) {
      opp.status = 'measurement_blocked';
      opp.selectedForExperiment = false;
      opp.selectionState = 'measurement_blocked';
      opp.selectionCooldown = false;
      opp.measurementBlockedAt = new Date().toISOString();
      opp.measurementBlockedDimension = 'failure_reality';
      opp.measurementBlockedExperimentId = null;
      opp.measurementBlockedReason = 'Validation-path preflight: the opportunity itself declares its core failure-reality inaccessible with current Flower executors, so buyer-demand spend is not justified first.';
      opp.epistemicNote = 'Preserved, not disproven: revisit only after a materially different bounded executor makes the core failure directly testable.';
      stateMigrations.push(`${opp.id}:validation_path_preflight_block`);
      preflightBlocked = true;
    }
  }

  if (preflightBlocked) {
    const principle = 'Validation-path completeness precedes paid validation: do not pay to prove demand for a branch whose decisive failure-reality cannot be reached with current bounded executors.';
    if (!(garden.soil ?? []).some((x) => x.principle === principle)) {
      garden.soil.push({
        id: `soil_validation_path_${Date.now()}`,
        principle,
        scope: 'experiment governance',
        status: 'supported',
        derivedFrom: (garden.opportunities ?? [])
          .filter((x) => x.measurementBlockedReason?.startsWith('Validation-path preflight'))
          .map((x) => x.id),
        createdAt: new Date().toISOString(),
      });
    }
  }

  if (stateMigrations.length) log.info('Garden state migrated', { migrations: stateMigrations });

  // One manual Start may traverse many free state transitions, but it crosses at most
  // one costly cognition/search/spend frontier. This keeps the old safety envelope while
  // eliminating clicks whose only purpose was deterministic bookkeeping.
  const maxBreaths = 12;
  const maxCostlyBreaths = 1;
  const startingPressure = classifyPressure(garden);
  const activeBefore = activeOpportunitySnapshot(garden);
  logOpportunitySnapshot('before', activeBefore);
  log.info('Flower pressure selected', {
    pressure: startingPressure,
    pulseCountBefore: Number(garden.status?.pulseCount ?? 0),
    persistentStore: STORE_NAME,
    runPolicy: { maxBreaths, maxCostlyBreaths },
  });

  let result;
  try {
    result = await pulse({
      garden,
      reasoner: new OpenAIReasoner(),
      maxBreaths,
      maxCostlyBreaths,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    log.error('Flower pulse failed', {
      pressure: startingPressure,
      error: message,
      persistentStore: STORE_NAME,
    });
    await Actor.setValue('OUTPUT', {
      ok: false,
      pressure: startingPressure,
      error: message,
      pulseCount: Number(garden.status?.pulseCount ?? 0),
      persistentStore: STORE_NAME,
      activeOpportunities: activeBefore,
      stateMigrations,
    });
    throw error;
  }

  await stateStore.setValue(STORE_KEY, garden);

  const activeAfter = activeOpportunitySnapshot(garden);
  const output = {
    ok: true,
    breaths: result.breaths.map((x) => ({
      pressure: x.pressure,
      costClass: x.costClass,
      summary: x.result.summary,
    })),
    microBreaths: result.breaths.length,
    runBudget: result.runBudget,
    stoppedByCostFrontier: result.stoppedByCostFrontier,
    nextPressure: classifyPressure(garden),
    activeOpportunities: activeAfter,
    pendingApprovals: garden.approvals.filter((x) => x.status === 'pending'),
    generation: garden.status.generation,
    pulseCount: garden.status.pulseCount,
    persistentStore: STORE_NAME,
    epistemicRepairs: repaired,
    stateMigrations,
  };

  await Actor.setValue('OUTPUT', output);
  await Actor.pushData(output);
  logOpportunitySnapshot('after', activeAfter);
  log.info('Flower pulse complete', {
    ok: output.ok,
    microBreaths: output.microBreaths,
    runBudget: output.runBudget,
    stoppedByCostFrontier: output.stoppedByCostFrontier,
    nextPressure: output.nextPressure,
    pulseCount: output.pulseCount,
    breaths: output.breaths,
  });
});