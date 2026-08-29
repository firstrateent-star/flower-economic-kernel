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
  };
  await Actor.setValue('OUTPUT', output);
  await Actor.pushData(output);
  log.info('Flower pulse complete', output);
} finally {
  await Actor.exit();
}
