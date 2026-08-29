import { Actor, log } from 'apify';
import { pulse } from '../core/kernel.js';
import { classifyPressure } from '../core/pressure.js';
import { OpenAIReasoner } from '../reasoners/openai.js';
import seed from '../../garden/seed.json' with { type: 'json' };

const STORE_KEY = 'FLOWER_GARDEN';
await Actor.init();
try {
  await Actor.getInput(); // Input currently carries only the one-breath UI guard.
  const existing = await Actor.getValue(STORE_KEY);
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
  const result = await pulse({ garden, reasoner: new OpenAIReasoner(), maxBreaths });
  await Actor.setValue(STORE_KEY, garden);

  const output = {
    breaths: result.breaths.map((x) => ({ pressure: x.pressure, summary: x.result.summary })),
    nextPressure: classifyPressure(garden),
    pendingApprovals: garden.approvals.filter((x) => x.status === 'pending'),
    generation: garden.status.generation,
    epistemicRepairs: repaired,
  };
  await Actor.setValue('OUTPUT', output);
  await Actor.pushData(output);
  log.info('Flower pulse complete', output);
} finally {
  await Actor.exit();
}
