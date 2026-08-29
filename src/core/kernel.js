import { classifyPressure } from './pressure.js';
import { runEnzyme } from './enzymes.js';
import { runSelection, selectionRequiresReasoner } from './selection.js';
import { addTrace } from './transitions.js';
import { nowIso } from './utils.js';
import { refreshGeometry } from './geometry.js';

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

export function pressureCostClass(garden, pressure) {
  if (!pressure) return 'free';
  if (['EXPAND', 'FALSIFY', 'BUILD_PLAN'].includes(pressure.type)) return 'reasoner';
  if (pressure.type === 'SELECT') return selectionRequiresReasoner(garden) ? 'reasoner' : 'free';
  if (pressure.type === 'EXPERIMENT') return 'free';

  if (pressure.type === 'EXECUTE_EXPERIMENT') {
    const exp = (garden.experiments ?? []).find((x) => x.id === pressure.targetId);
    if (!exp) return 'free';
    if (exp.method === 'email_auth_dns_sample') return 'free';
    if (exp.actionType === 'web_search') return 'web_search';
    if (exp.actionType === 'spend') return 'spend';
    return 'free';
  }

  return 'free';
}

export async function breathe({ garden, reasoner, pressure = classifyPressure(garden) }) {
  const before = JSON.stringify(garden);
  const result = pressure.type === 'SELECT'
    ? await runSelection({ garden, reasoner })
    : await runEnzyme({ garden, pressure, reasoner });

  const cooled = applyPostIntegrationSelectionPolicy(garden, pressure);
  if (cooled) {
    result.summary = `${result.summary} Selection released ${cooled.name} into cooldown so another surviving sibling can receive comparable reality contact.`;
  }

  garden.status.lastPressure = pressure;
  garden.status.lastBreathAt = nowIso();
  refreshGeometry(garden);

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

// A pulse crosses at most one costly frontier, then automatically carries the
// Garden through every safe deterministic transition that follows. Sacred-geometry
// language informs the reuse graph, but does not increase permissions or evidence.
export async function pulse({ garden, reasoner, maxBreaths = 12, maxCostlyBreaths = 1 }) {
  const breaths = [];
  let costlyBreaths = 0;
  let stoppedByCostFrontier = false;

  refreshGeometry(garden);

  for (let i = 0; i < maxBreaths; i += 1) {
    const pressure = classifyPressure(garden);
    const costClass = pressureCostClass(garden, pressure);
    const costly = costClass !== 'free';

    if (costly && costlyBreaths >= maxCostlyBreaths) {
      stoppedByCostFrontier = true;
      break;
    }

    const step = await breathe({ garden, reasoner, pressure });
    step.costClass = costClass;
    breaths.push(step);
    if (costly) costlyBreaths += 1;

    if (['HUMAN', 'STILLNESS'].includes(step.pressure.type)) break;
    if (!step.result.changed) break;
  }

  refreshGeometry(garden);
  garden.status.lastPulseAt = nowIso();
  garden.status.pulseCount = Number(garden.status.pulseCount ?? 0) + 1;
  return {
    garden,
    breaths,
    stoppedByCostFrontier,
    runBudget: {
      costlyBreathsUsed: costlyBreaths,
      maxCostlyBreaths,
      maxBreaths,
    },
  };
}
