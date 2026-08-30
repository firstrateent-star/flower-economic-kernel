import { shouldChallengeHumanBoundaryWithExploration } from './terminal-governance.js';

function latestIntegratedExperiment(garden, opportunityId) {
  return (garden.experiments ?? [])
    .filter((x) => x.opportunityId === opportunityId && x.status === 'integrated')
    .sort((a, b) => String(b.integratedAt ?? b.executedAt ?? b.createdAt ?? '').localeCompare(String(a.integratedAt ?? a.executedAt ?? a.createdAt ?? '')))[0] ?? null;
}

function selectionIsStale(garden, opportunity) {
  if (!opportunity?.selectedForExperiment) return false;
  const latest = latestIntegratedExperiment(garden, opportunity.id);
  if (!latest || latest.result?.verdict === 'supports') return false;

  const selectedAt = Date.parse(opportunity.lastSelectionAt ?? 0);
  const integratedAt = Date.parse(latest.integratedAt ?? latest.executedAt ?? latest.createdAt ?? 0);
  return Number.isFinite(integratedAt) && integratedAt >= selectedAt;
}

function hasAutonomousWork(garden) {
  if ((garden.experiments ?? []).some((x) => x.status === 'authorized')) return true;
  if ((garden.opportunities ?? []).some((x) => x.status === 'validated' && !x.fruitId)) return true;
  if ((garden.opportunities ?? []).some((x) => x.status === 'seed')) return true;
  if ((garden.opportunities ?? []).some((x) => ['needs_test', 'supported'].includes(x.status) && !x.experimentId)) return true;
  return false;
}

function humanActuationEvidenceTier(garden, item) {
  const fruit = (garden.fruits ?? []).find((x) => x.id === item?.organismId);
  if (!fruit) return 2;
  if (
    Number(fruit.creatorRevenueUsd ?? 0) > 0
    || Number(fruit.settledValueUsd ?? 0) > 0
    || fruit.repeatDemand === true
    || fruit.repeatDemand === 'confirmed'
    || fruit.chargedEvent === true
  ) return 0;

  if (
    fruit.independentUser === true
    || fruit.externalUsage === 'independent_confirmed'
    || ['confirmed', 'positive', 'validated'].includes(String(fruit.marketTruth ?? '').toLowerCase())
  ) return 1;

  return 2;
}

function rankedHumanActuation(garden) {
  return (garden.humanActuationQueue ?? [])
    .filter((x) => x?.state === 'awaiting_explicit_authorization')
    .sort((a, b) => {
      const evidenceDelta = humanActuationEvidenceTier(garden, a) - humanActuationEvidenceTier(garden, b);
      if (evidenceDelta !== 0) return evidenceDelta;
      return Number(a.rank ?? Infinity) - Number(b.rank ?? Infinity);
    })[0] ?? null;
}

function highestLeverageHumanFruit(garden) {
  const rank = {
    market_ready_private: 4,
    publish_ready: 3,
    private_deployed: 2,
    private_verified: 1,
  };

  return (garden.fruits ?? [])
    .filter((x) => rank[x.status])
    .sort((a, b) => {
      const stageDelta = rank[b.status] - rank[a.status];
      if (stageDelta !== 0) return stageDelta;
      return String(a.id ?? '').localeCompare(String(b.id ?? ''));
    })[0] ?? null;
}

export function classifyPressure(garden) {
  const pendingApproval = (garden.approvals ?? []).find((x) => x.status === 'pending');
  if (pendingApproval) return { type: 'HUMAN', targetId: pendingApproval.id, why: 'A consequential action already chosen by the Center-holder awaits resolution.' };

  const unprocessedEvent = (garden.events ?? []).find((x) => x.status === 'new');
  if (unprocessedEvent) return { type: 'INTEGRATE', targetId: unprocessedEvent.id, why: 'Reality has produced new evidence.' };

  const readyExperiment = (garden.experiments ?? []).find((x) => x.status === 'result_ready');
  if (readyExperiment) return { type: 'INTEGRATE', targetId: readyExperiment.id, why: 'An experiment result is ready.' };

  const privateSourceFruit = (garden.fruits ?? []).find((x) => x.status === 'private_source_ready');
  if (privateSourceFruit) return {
    type: 'VERIFY_FRUIT',
    targetId: privateSourceFruit.id,
    why: 'A private source artifact already exists and deterministic verification is free; close that truth gap without confusing verification with market Fruit.',
  };

  const authorizedExperiment = (garden.experiments ?? []).find((x) => x.status === 'authorized');
  if (authorizedExperiment) return {
    type: 'EXECUTE_EXPERIMENT',
    targetId: authorizedExperiment.id,
    why: 'A low-risk experiment already passed the autonomy membrane and is ready for bounded execution.',
  };

  const validated = (garden.opportunities ?? []).find((x) => x.status === 'validated' && !x.fruitId);
  if (validated) return {
    type: 'BUILD_PLAN',
    targetId: validated.id,
    why: 'This branch has earned construction evidence; convert only the smallest validated transformation into a fulfillable artifact.',
  };

  const seed = (garden.opportunities ?? []).find((x) => x.status === 'seed');
  if (seed) return { type: 'FALSIFY', targetId: seed.id, why: 'A living seed has not earned depth yet.' };

  const testable = (garden.opportunities ?? []).filter((x) => ['needs_test', 'supported'].includes(x.status) && !x.experimentId);
  const selected = testable.find((x) => x.selectedForExperiment === true);

  if (selected && selectionIsStale(garden, selected) && testable.length > 1) {
    return { type: 'SELECT', targetId: null, why: 'The current champion received non-supporting evidence; challenger comparison is required before another allocation.' };
  }

  if (selected) {
    return {
      type: 'EXPERIMENT',
      targetId: selected.id,
      why: selected.status === 'supported'
        ? 'The current champion has external support; push the cheapest remaining terminal uncertainty into reality.'
        : 'The current champion earned the next reality probe, not permanent ownership of the search.',
    };
  }

  if (testable.length > 1) {
    return { type: 'SELECT', targetId: null, why: 'Multiple siblings survived; compare terminal yield and opportunity cost before allocating the next probe.' };
  }

  const needsTest = testable.find((x) => x.status === 'needs_test');
  if (needsTest) return { type: 'EXPERIMENT', targetId: needsTest.id, why: 'The idea is plausible but lacks external evidence; design the cheapest discriminating reality test.' };

  const supported = testable.find((x) => x.status === 'supported');
  if (supported) return { type: 'EXPERIMENT', targetId: supported.id, why: 'External evidence supports the seed, but remaining terminal uncertainty should be pushed into reality.' };

  const active = (garden.opportunities ?? []).some((x) => !['compost', 'dormant', 'fruit', 'measurement_blocked'].includes(x.status));

  // integrated-v3 correction: a mature human-only boundary no longer automatically
  // monopolizes foreground attention merely because autonomous siblings are exhausted.
  // If no opportunity is active, one fresh heterogeneous search pass may challenge that
  // boundary before we spend scarce Center-holder attention. The lastPressure guard keeps
  // this from becoming an endless EXPAND loop under unchanged reality.
  if (!active && shouldChallengeHumanBoundaryWithExploration(garden)) {
    return {
      type: 'EXPAND',
      targetId: null,
      why: 'No active challenger remains. Before spending scarce human attention at a mature boundary, reopen the reachable field once for a materially better terminal-value path.',
    };
  }

  if (!hasAutonomousWork(garden)) {
    const queued = rankedHumanActuation(garden);
    if (queued) return {
      type: 'HUMAN',
      targetId: queued.organismId ?? null,
      why: queued.why
        ? `Fresh challenger pressure is exhausted. ${queued.why}`
        : 'Fresh challenger pressure is exhausted and the highest-ranked remaining action requires explicit Center-holder authority.',
    };

    const humanFruit = highestLeverageHumanFruit(garden);
    if (humanFruit?.status === 'market_ready_private') return { type: 'HUMAN', targetId: humanFruit.id, why: 'Fresh challenger pressure is exhausted; this market-ready private Fruit is closest to independent market evidence and requires explicit authority.' };
    if (humanFruit?.status === 'publish_ready') return { type: 'HUMAN', targetId: humanFruit.id, why: 'Fresh challenger pressure is exhausted; this Fruit is technically ready for external exposure and requires explicit authority.' };
    if (humanFruit?.status === 'private_deployed') return { type: 'HUMAN', targetId: humanFruit.id, why: 'Fresh challenger pressure is exhausted; a private deployment is closest to decision-changing runtime evidence and the remaining step requires authority or access.' };
    if (humanFruit?.status === 'private_verified') return { type: 'HUMAN', targetId: humanFruit.id, why: `Fresh challenger pressure is exhausted; this private Fruit is verified and the next deployment boundary from ${humanFruit.sourcePath ?? 'its source path'} requires authority or access.` };
  }

  if (!active) return { type: 'EXPAND', targetId: null, why: 'No currently actionable opportunity remains; preserve blocked history and reopen heterogeneous search.' };

  return { type: 'STILLNESS', targetId: null, why: 'No additional autonomous cognition is currently justified.' };
}
