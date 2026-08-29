import { classifyPressure } from './pressure.js';
import { runEnzyme } from './enzymes.js';
import { runSelection } from './selection.js';
import { addTrace } from './transitions.js';
import { nowIso } from './utils.js';

function applyPostIntegrationSelectionPolicy(garden, pressure) {
  if (pressure.type !== 'INTEGRATE') return null;
  const exp = (garden.experiments ?? []).find((x) => x.id === pressure.targetId);
  if (!exp || exp.status !== 'integrated' || exp.result?.verdict === 'supports') return null;

  const opp = (garden.opportunities ?? []).find((x) => x.id === exp.opportunityId);
  if (!opp || opp.selectedForExperiment !== true) return null;
  if (!['needs_test', 'supported'].includes(opp.status)) return null;

  opp.selectedForExperiment = false;
  opp.selectionState = 'cooldown';
  opp.selectionCooldown = true;
  opp.selectionCooldownAt = nowIso();
  opp.selectionCooldownReason = `Experiment ${exp.id} returned ${exp.result?.verdict ?? 'non-supporting'} evidence in ${exp.validationDimension ?? 'an unknown dimension'}.`;
  return opp;
}

export async function breathe({ garden, reasoner }) {
  const before = JSON.stringify(garden);
  const pressure = classifyPressure(garden);
  const result = pressure.type === 'SELECT'
    ? await runSelection({ garden, reasoner })
    : await runEnzyme({ garden, pressure, reasoner });

  const cooled = applyPostIntegrationSelectionPolicy(garden, pressure);
  if (cooled) {
    result.summary = `${result.summary} Selection released ${cooled.name} into cooldown so another surviving sibling can receive comparable reality contact.`;
  }

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
