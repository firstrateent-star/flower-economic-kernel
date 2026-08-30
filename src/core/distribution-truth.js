function queueLooksLikeAgenticEligibility(item) {
  const text = `${item?.action ?? ''} ${item?.why ?? ''}`.toLowerCase();
  return text.includes('kyc') || text.includes('agentic eligib');
}

export function reconcileDistributionTruth(garden) {
  const changes = [];

  for (const fruit of garden.fruits ?? []) {
    const state = fruit.distributionState;
    if (!state) continue;

    const agentic = state.rails?.apifyAgenticPayments;
    if (agentic?.state === 'eligible') {
      if (fruit.agenticPaymentEligible !== true) {
        fruit.agenticPaymentEligible = true;
        changes.push(`${fruit.id}:agentic_payment_eligible`);
      }

      fruit.distributionRails = {
        ...(fruit.distributionRails ?? {}),
        apifyAgenticPayments: 'eligible',
      };

      if ((fruit.unresolvedAgenticTruth ?? []).length > 0) {
        fruit.unresolvedAgenticTruth = [];
        changes.push(`${fruit.id}:agentic_uncertainty_cleared`);
      }

      if (state.truthLadder?.creatorRevenueTruth === '0_confirmed' && fruit.creatorRevenueUsd == null) {
        fruit.creatorRevenueUsd = 0;
      }

      fruit.nextPressure = 'Observe attributable independent use, charged events, creator revenue, or repeat demand before product mutation.';

      for (const item of garden.humanActuationQueue ?? []) {
        if (
          item.organismId === fruit.id
          && queueLooksLikeAgenticEligibility(item)
          && ['parked_pending_more_platform_truth', 'awaiting_explicit_authorization'].includes(item.state)
        ) {
          item.state = 'resolved_by_platform_truth';
          item.resolvedBecause = 'Verified distribution sidecar reports Apify agentic payment eligibility active without further Center-holder actuation.';
          changes.push(`${fruit.id}:agentic_human_action_resolved`);
        }
      }
    }

    const ladder = state.truthLadder;
    if (!ladder) continue;

    // Projection is deliberately conservative: unresolved platform observations never
    // become market truth simply because the sidecar exists.
    if (ladder.independentUserTruth === true || ladder.independentUserTruth === 'confirmed') {
      if (fruit.externalUsage !== 'independent_confirmed') {
        fruit.externalUsage = 'independent_confirmed';
        changes.push(`${fruit.id}:independent_usage_confirmed`);
      }
    }

    if (typeof ladder.creatorRevenueTruth === 'number' && ladder.creatorRevenueTruth > 0) {
      fruit.creatorRevenueUsd = ladder.creatorRevenueTruth;
      changes.push(`${fruit.id}:creator_revenue_projected`);
    }

    if (ladder.repeatDemandTruth === true || ladder.repeatDemandTruth === 'confirmed') {
      fruit.repeatDemand = true;
      changes.push(`${fruit.id}:repeat_demand_confirmed`);
    }
  }

  return { changes };
}
