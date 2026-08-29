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

export function classifyPressure(garden) {
  const pendingApproval = garden.approvals.find((x) => x.status === 'pending');
  if (pendingApproval) return { type: 'HUMAN', targetId: pendingApproval.id, why: 'A consequential action awaits the Center-holder.' };

  const unprocessedEvent = garden.events.find((x) => x.status === 'new');
  if (unprocessedEvent) return { type: 'INTEGRATE', targetId: unprocessedEvent.id, why: 'Reality has produced new evidence.' };

  const readyExperiment = garden.experiments.find((x) => x.status === 'result_ready');
  if (readyExperiment) return { type: 'INTEGRATE', targetId: readyExperiment.id, why: 'An experiment result is ready.' };

  const authorizedExperiment = garden.experiments.find((x) => x.status === 'authorized');
  if (authorizedExperiment) return {
    type: 'EXECUTE_EXPERIMENT',
    targetId: authorizedExperiment.id,
    why: 'A low-risk experiment already passed the autonomy membrane and is ready for bounded execution.',
  };

  const seed = garden.opportunities.find((x) => x.status === 'seed');
  if (seed) return { type: 'FALSIFY', targetId: seed.id, why: 'A living seed has not earned attention yet.' };

  const testable = garden.opportunities.filter((x) => ['needs_test', 'supported'].includes(x.status) && !x.experimentId);
  const selected = testable.find((x) => x.selectedForExperiment === true);

  if (selected && selectionIsStale(garden, selected) && testable.length > 1) {
    return {
      type: 'SELECT',
      targetId: null,
      why: 'The selected sibling just received non-supporting external evidence; reselect before allocating another experiment breath.',
    };
  }

  if (selected) {
    return {
      type: 'EXPERIMENT',
      targetId: selected.id,
      why: selected.status === 'supported'
        ? 'This sibling won the current selection round and has external support; push its remaining uncertainty into reality.'
        : 'This sibling won the current selection round; design its cheapest discriminating reality test.',
    };
  }

  if (testable.length > 1) {
    return {
      type: 'SELECT',
      targetId: null,
      why: 'Multiple siblings survived falsification; compare them before allocating the next experiment breath.',
    };
  }

  const needsTest = testable.find((x) => x.status === 'needs_test');
  if (needsTest) return { type: 'EXPERIMENT', targetId: needsTest.id, why: 'The idea is plausible but lacks external evidence; design the cheapest discriminating reality test.' };

  const supported = testable.find((x) => x.status === 'supported');
  if (supported) return { type: 'EXPERIMENT', targetId: supported.id, why: 'External evidence supports the seed, but the remaining uncertainty should be pushed into reality.' };

  const validated = garden.opportunities.find((x) => x.status === 'validated' && !x.fruitId);
  if (validated) return { type: 'BUILD_PLAN', targetId: validated.id, why: 'Evidence has earned a private build plan.' };

  // measurement_blocked branches remain preserved in the Garden for future capabilities,
  // but they should not prevent Flower from exploring new actionable soil today.
  const active = garden.opportunities.some((x) => !['compost', 'dormant', 'fruit', 'measurement_blocked'].includes(x.status));
  if (!active) return { type: 'EXPAND', targetId: null, why: 'No currently actionable opportunity remains; preserve blocked history and expand the search space.' };

  return { type: 'STILLNESS', targetId: null, why: 'No additional autonomous cognition is currently justified.' };
}
