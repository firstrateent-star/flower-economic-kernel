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

function highestLeverageHumanFruit(garden) {
  // Human-boundary stages compete for attention instead of blocking the Garden merely
  // because they exist. When autonomous work is exhausted, prefer the organism closest
  // to an external decision-changing return.
  const rank = {
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
  // An explicit pending approval is different from merely reaching a human membrane:
  // the Center-holder has already been asked for a consequential decision, so preserve it.
  const pendingApproval = garden.approvals.find((x) => x.status === 'pending');
  if (pendingApproval) return { type: 'HUMAN', targetId: pendingApproval.id, why: 'A consequential action awaits the Center-holder.' };

  const unprocessedEvent = garden.events.find((x) => x.status === 'new');
  if (unprocessedEvent) return { type: 'INTEGRATE', targetId: unprocessedEvent.id, why: 'Reality has produced new evidence.' };

  const readyExperiment = garden.experiments.find((x) => x.status === 'result_ready');
  if (readyExperiment) return { type: 'INTEGRATE', targetId: readyExperiment.id, why: 'An experiment result is ready.' };

  // FRUIT LOCK remains valid while the next step is machine-carried verification.
  // A private source artifact has already consumed build uncertainty, so verify it before
  // allocating another speculative build/research breath.
  const privateSourceFruit = (garden.fruits ?? []).find((x) => x.status === 'private_source_ready');
  if (privateSourceFruit) return {
    type: 'VERIFY_FRUIT',
    targetId: privateSourceFruit.id,
    why: 'Validated evidence already has private source. Verify the Fruit before spending another breath on discovery.',
  };

  // HUMAN ACTUATION PORTFOLIO:
  // Reaching KYC/deployment/publication/legal/identity boundaries does not automatically
  // make the human the next executor. Keep autonomous siblings growing around parked human
  // membranes. Only surface one mature human-boundary Fruit when no machine-carried work
  // remains. Live Fruits awaiting stranger usage are observations, not human tasks, and
  // therefore never block expansion on their own.
  if (!hasAutonomousWork(garden)) {
    const humanFruit = highestLeverageHumanFruit(garden);
    if (humanFruit?.status === 'publish_ready') return {
      type: 'HUMAN',
      targetId: humanFruit.id,
      why: 'Autonomous work is exhausted and this Fruit is technically ready for external market exposure. Pricing, legal terms, and public release require explicit Center-holder authority.',
    };

    if (humanFruit?.status === 'private_deployed') return {
      type: 'HUMAN',
      targetId: humanFruit.id,
      why: 'Autonomous work is exhausted and a private deployment is closest to decision-changing runtime evidence. The remaining acceptance/platform action requires Center-holder authority or access.',
    };

    if (humanFruit?.status === 'private_verified') return {
      type: 'HUMAN',
      targetId: humanFruit.id,
      why: `Autonomous work is exhausted and this private Fruit is verified. The next irreducible deployment boundary from ${humanFruit.sourcePath ?? 'its source path'} requires Center-holder authority or access.`,
    };
  }

  const authorizedExperiment = garden.experiments.find((x) => x.status === 'authorized');
  if (authorizedExperiment) return {
    type: 'EXECUTE_EXPERIMENT',
    targetId: authorizedExperiment.id,
    why: 'A low-risk experiment already passed the autonomy membrane and is ready for bounded execution.',
  };

  // A validated opportunity without a source artifact still earns a private build stage.
  // Fruit Forge manifests can bypass prose planning by linking real private source first.
  const validated = garden.opportunities.find((x) => x.status === 'validated' && !x.fruitId);
  if (validated) return {
    type: 'BUILD_PLAN',
    targetId: validated.id,
    why: 'Evidence has earned a private build artifact; convert validated knowledge into Fruit before allocating more speculative experiments.',
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

  const active = garden.opportunities.some((x) => !['compost', 'dormant', 'fruit', 'measurement_blocked'].includes(x.status));
  if (!active) return { type: 'EXPAND', targetId: null, why: 'No currently actionable opportunity remains; preserve blocked history and expand the search space.' };

  return { type: 'STILLNESS', targetId: null, why: 'No additional autonomous cognition is currently justified.' };
}
