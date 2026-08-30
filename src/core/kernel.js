import { classifyPressure } from './pressure.js';
import { runEnzyme } from './enzymes.js';
import { runSelection, selectionRequiresReasoner } from './selection.js';
import { addTrace } from './transitions.js';
import { nowIso } from './utils.js';
import { refreshGeometry } from './geometry.js';
import { syncFruitManifests, verifyPrivateFruit } from './fruit-forge.js';
import { reconcileDistributionTruth } from './distribution-truth.js';

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
  if (pressure.type === 'EXPERIMENT' || pressure.type === 'VERIFY_FRUIT') return 'free';

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

async function verifyFruitBreath(garden, pressure) {
  const fruit = (garden.fruits ?? []).find((x) => x.id === pressure.targetId);
  if (!fruit) return { changed: false, summary: 'Fruit verification target not found.', action: 'VERIFY_FRUIT' };

  const verification = await verifyPrivateFruit(fruit);
  fruit.lastVerification = { ...verification, at: nowIso() };
  if (verification.pass) {
    fruit.status = 'private_verified';
    fruit.verifiedAt = nowIso();
    const opp = (garden.opportunities ?? []).find((x) => x.id === fruit.opportunityId);
    if (opp) opp.productizationState = 'private_verified';
  } else {
    fruit.status = 'private_source_ready';
  }

  return {
    changed: true,
    summary: verification.pass
      ? `${fruit.name} private source verified across ${verification.checks.length} deterministic checks; next boundary is one real private Apify deployment/run.`
      : `${fruit.name} private verification failed: ${verification.reason}`,
    action: 'VERIFY_FRUIT',
  };
}

export async function breathe({ garden, reasoner, pressure = classifyPressure(garden) }) {
  const before = JSON.stringify(garden);
  let result;

  if (pressure.type === 'VERIFY_FRUIT') {
    result = await verifyFruitBreath(garden, pressure);
  } else if (pressure.type === 'SELECT') {
    result = await runSelection({ garden, reasoner });
  } else {
    result = await runEnzyme({ garden, pressure, reasoner });
  }

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

// A pulse crosses at most one costly frontier, then automatically carries the Garden
// through the deterministic closure that follows. The breath ceiling is only a cycle /
// runaway safety bound; it should be high enough that ordinary free complexity is not
// serialized into repeated invocations. Terminal HUMAN / STILLNESS pressure remains a
// boundary, not a ceremonial breath: stop before executing it.
export async function pulse({
  garden,
  reasoner,
  maxBreaths = 64,
  maxCostlyBreaths = 1,
  syncManifests = true,
}) {
  const breaths = [];
  let costlyBreaths = 0;
  let stoppedByCostFrontier = false;
  let stoppedBySafetyCeiling = false;

  if (syncManifests) {
    await syncFruitManifests(garden);
    reconcileDistributionTruth(garden);
  }
  refreshGeometry(garden);

  for (let i = 0; i < maxBreaths; i += 1) {
    const pressure = classifyPressure(garden);

    if (['HUMAN', 'STILLNESS'].includes(pressure.type)) break;

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

    if (!step.result.changed) break;
  }

  if (breaths.length >= maxBreaths) {
    const nextPressure = classifyPressure(garden);
    if (!['HUMAN', 'STILLNESS'].includes(nextPressure.type)) {
      const nextCostClass = pressureCostClass(garden, nextPressure);
      if (nextCostClass === 'free') stoppedBySafetyCeiling = true;
      else if (costlyBreaths >= maxCostlyBreaths) stoppedByCostFrontier = true;
    }
  }

  refreshGeometry(garden);
  if (breaths.length > 0) {
    garden.status.lastPulseAt = nowIso();
    garden.status.pulseCount = Number(garden.status.pulseCount ?? 0) + 1;
  }
  return {
    garden,
    breaths,
    stoppedByCostFrontier,
    stoppedBySafetyCeiling,
    runBudget: {
      costlyBreathsUsed: costlyBreaths,
      maxCostlyBreaths,
      maxBreaths,
    },
  };
}
