import { Actor, log } from 'apify';
import { pulse } from '../core/kernel.js';
import { classifyPressure } from '../core/pressure.js';
import { authorizeAction } from '../core/autonomy.js';
import { OpenAIReasoner } from '../reasoners/openai.js';
import seed from '../../garden/seed.json' with { type: 'json' };

const STORE_NAME = 'flower-economic-kernel-v0-state';
const STORE_KEY = 'FLOWER_GARDEN';

await Actor.main(async () => {
  await Actor.getInput(); // Input currently carries only the one-breath UI guard.

  // Each Actor run gets its own default key-value store. Use a named store so
  // the Garden survives across separate runs under LIMITED_PERMISSIONS.
  const stateStore = await Actor.openKeyValueStore(STORE_NAME);
  const existing = await stateStore.getValue(STORE_KEY);
  const garden = existing ?? structuredClone(seed);

  // Epistemic repair: older v0 builds could promote model-generated reasoning to
  // "supported" without an external source. Repair that state deterministically.
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

  // Migrations preserve earned Garden history across code improvements.
  const stateMigrations = [];

  // The first successfully integrated reality experiment searched public demand plus
  // failure signals; conservatively credit only buyer_demand so failure_reality still
  // requires an independent experiment.
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

  // Apify rejects maxTotalChargeUsd below $0.50 for the inherited Google Maps Actor.
  // Earlier code authorized the direct sample at $0.25, which the platform refused
  // before execution. Raise only the run ceiling to the platform minimum and pass it
  // back through the existing autonomy membrane. This is still far below the Garden's
  // $5 per-experiment ceiling and creates no recurring obligation.
  for (const exp of garden.experiments ?? []) {
    if (
      exp.method === 'maps_website_sample'
      && exp.status === 'authorized'
      && Number(exp.oneTimeCostUsd) < 0.50
    ) {
      const previousCap = Number(exp.oneTimeCostUsd);
      exp.oneTimeCostUsd = 0.50;
      const auth = authorizeAction(garden, { type: 'spend', amountUsd: 0.50, recurringUsd: Number(exp.recurringUsd ?? 0) });
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

  if (stateMigrations.length) log.info('Garden state migrated', { migrations: stateMigrations });

  // First-live v0 deliberately disables external event ingestion.
  // We re-enable event-driven waking only after the basic falsification loop is proven.

  // v0 safety rule: one manual run = one paid reasoning breath.
  const maxBreaths = 1;
  const startingPressure = classifyPressure(garden);
  log.info('Flower pressure selected', {
    pressure: startingPressure,
    pulseCountBefore: Number(garden.status?.pulseCount ?? 0),
    persistentStore: STORE_NAME,
  });

  let result;
  try {
    result = await pulse({ garden, reasoner: new OpenAIReasoner(), maxBreaths });
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
      stateMigrations,
    });
    throw error;
  }

  // Commit Garden only after a successful breath. A failed external call leaves the
  // previously durable Garden untouched so the authorized experiment can be retried safely.
  await stateStore.setValue(STORE_KEY, garden);

  const output = {
    ok: true,
    breaths: result.breaths.map((x) => ({ pressure: x.pressure, summary: x.result.summary })),
    nextPressure: classifyPressure(garden),
    pendingApprovals: garden.approvals.filter((x) => x.status === 'pending'),
    generation: garden.status.generation,
    pulseCount: garden.status.pulseCount,
    persistentStore: STORE_NAME,
    epistemicRepairs: repaired,
    stateMigrations,
  };

  // Per-run output remains easy to inspect; durable Garden state lives above.
  await Actor.setValue('OUTPUT', output);
  await Actor.pushData(output);
  log.info('Flower pulse complete', output);
});
