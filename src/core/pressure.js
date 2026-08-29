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

  const needsTest = garden.opportunities.find((x) => x.status === 'needs_test' && !x.experimentId);
  if (needsTest) return { type: 'EXPERIMENT', targetId: needsTest.id, why: 'The idea is plausible but lacks external evidence; design the cheapest discriminating reality test.' };

  const supported = garden.opportunities.find((x) => x.status === 'supported' && !x.experimentId);
  if (supported) return { type: 'EXPERIMENT', targetId: supported.id, why: 'External evidence supports the seed, but the remaining uncertainty should be pushed into reality.' };

  const validated = garden.opportunities.find((x) => x.status === 'validated' && !x.fruitId);
  if (validated) return { type: 'BUILD_PLAN', targetId: validated.id, why: 'Evidence has earned a private build plan.' };

  const active = garden.opportunities.some((x) => !['compost', 'dormant', 'fruit'].includes(x.status));
  if (!active) return { type: 'EXPAND', targetId: null, why: 'No living opportunity remains; expand the search space.' };

  return { type: 'STILLNESS', targetId: null, why: 'No additional autonomous cognition is currently justified.' };
}
