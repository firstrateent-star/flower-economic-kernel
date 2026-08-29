import { classifyPressure } from './pressure.js';
import { runEnzyme } from './enzymes.js';
import { addTrace } from './transitions.js';
import { nowIso } from './utils.js';

export async function breathe({ garden, reasoner }) {
  const before = JSON.stringify(garden);
  const pressure = classifyPressure(garden);
  const result = await runEnzyme({ garden, pressure, reasoner });
  garden.status.lastPressure = pressure;
  garden.status.lastBreathAt = nowIso();

  addTrace(garden, {
    kind: 'breath',
    pressure,
    action: result.action,
    changed: result.changed,
    summary: result.summary,
    sources: result.sources ?? [],
  });
  return { pressure, result, changed: before !== JSON.stringify(garden) };
}

export async function pulse({ garden, reasoner, maxBreaths = 3 }) {
  const breaths = [];
  for (let i = 0; i < maxBreaths; i += 1) {
    const step = await breathe({ garden, reasoner });
    breaths.push(step);
    if (['HUMAN', 'STILLNESS'].includes(step.pressure.type)) break;
    if (!step.result.changed) break;
  }
  garden.status.lastPulseAt = nowIso();
  garden.status.pulseCount = Number(garden.status.pulseCount ?? 0) + 1;
  return { garden, breaths };
}
