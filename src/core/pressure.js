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

function liveFruitAwaitingDistributionEvidence(garden) {
  return (garden.fruits ?? [])
    .filter((fruit) =>
      ['live', 'public_live'].includes(fruit.status)
      && (!fruit.publicMeasurement || fruit.publicMeasurement.status === 'awaiting_external_usage')
    )
    .sort((a, b) => {
      // Explicitly launched Fruit outranks legacy/live records that do not yet carry
      // a public-release contract. This prevents an older Fruit from monopolizing
      // the Live Fruit Lock after a newly generated Fruit crosses the economic boundary.
      const aExplicit = Number(Boolean(a.publicRelease?.economicBoundaryCrossed || a.publicRelease?.storeUrl));
      const bExplicit = Number(Boolean(b.publicRelease?.economicBoundaryCrossed || b.publicRelease?.storeUrl));
      if (aExplicit !== bExplicit) return bExplicit - aExplicit;

      const aPublished = Date.parse(a.publicRelease?.publishedAt ?? a.liveAt ?? a.createdAt ?? 0);
      const bPublished = Date.parse(b.publicRelease?.publishedAt ?? b.liveAt ?? b.createdAt ?? 0);
      if (Number.isFinite(aPublished) && Number.isFinite(bPublished) && aPublished !== bPublished) {
        return bPublished - aPublished;
      }

      return String(a.id ?? '').localeCompare(String(b.id ?? ''));
    })[0] ?? null;
}

export function classifyPressure(garden) {
  const pendingApproval = garden.approvals.find((x) => x.status === 'pending');
  if (pendingApproval) return { type: 'HUMAN', targetId: pendingApproval.id, why: 'A consequential action awaits the Center-holder.' };

  const unprocessedEvent = garden.events.find((x) => x.status === 'new');
  if (unprocessedEvent) return { type: 'INTEGRATE', targetId: unprocessedEvent.id, why: 'Reality has produced new evidence.' };

  const readyExperiment = garden.experiments.find((x) => x.status === 'result_ready');
  if (readyExperiment) return { type: 'INTEGRATE', targetId: readyExperiment.id, why: 'An experiment result is ready.' };

  // FRUIT LOCK: once validated evidence has become private source, shipping outranks
  // speculative research. Keep the organism focused until the Fruit reaches a real
  // deployment/measurement boundary or is explicitly abandoned.
  const privateSourceFruit = (garden.fruits ?? []).find((x) => x.status === 'private_source_ready');
  if (privateSourceFruit) return {
    type: 'VERIFY_FRUIT',
    targetId: privateSourceFruit.id,
    why: 'Validated evidence already has private source. Verify the Fruit before spending another breath on discovery.',
  };

  const privateVerifiedFruit = (garden.fruits ?? []).find((x) => x.status === 'private_verified');
  if (privateVerifiedFruit) return {
    type: 'HUMAN',
    targetId: privateVerifiedFruit.id,
    why: `Private Fruit source is verified. The next irreducible boundary is a private Apify deployment from ${privateVerifiedFruit.sourcePath ?? 'its source path'} and one real platform run; public release remains gated.`,
  };

  const privateDeployedFruit = (garden.fruits ?? []).find((x) => x.status === 'private_deployed');
  if (privateDeployedFruit) return {
    type: 'HUMAN',
    targetId: privateDeployedFruit.id,
    why: 'Private Actor deployment exists. Run the acceptance sample and record real runtime cost/output before monetization or publication.',
  };

  const publishReadyFruit = (garden.fruits ?? []).find((x) => x.status === 'publish_ready');
  if (publishReadyFruit) return {
    type: 'HUMAN',
    targetId: publishReadyFruit.id,
    why: 'Fruit is technically ready for Store publication. Pricing and public exposure require explicit Center-holder approval.',
  };

  // LIVE FRUIT LOCK: publication opens the distribution experiment; it does not end it.
  // Until the live Fruit receives outside usage/revenue/feedback evidence, learning from
  // the existing asset outranks spending cognition on a new speculative branch.
  // When multiple Fruits are live, prioritize an explicitly launched/newly launched Fruit
  // rather than whichever legacy record happens to appear first in the Garden array.
  const liveFruitAwaitingEvidence = liveFruitAwaitingDistributionEvidence(garden);
  if (liveFruitAwaitingEvidence) return {
    type: 'HUMAN',
    targetId: liveFruitAwaitingEvidence.id,
    why: `Fruit is live at ${liveFruitAwaitingEvidence.publicRelease?.storeUrl ?? liveFruitAwaitingEvidence.platform ?? 'its public channel'}. The next reality frontier is stranger usage, paid events, repeat use, and public feedback; distribution evidence outranks speculative expansion until this Fruit has real outside contact.`,
  };

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
