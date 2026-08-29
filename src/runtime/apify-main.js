import { Actor, log } from 'apify';
import { pulse } from '../core/kernel.js';
import { classifyPressure } from '../core/pressure.js';
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
  };

  // Per-run output remains easy to inspect; durable Garden state lives above.
  await Actor.setValue('OUTPUT', output);
  await Actor.pushData(output);
  log.info('Flower pulse complete', output);
});
