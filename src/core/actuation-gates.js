function independentReturnSignals(fruit) {
  const signals = [];
  if (fruit?.independentUser === true || fruit?.externalUsage === 'independent_confirmed') signals.push('independent_user');
  if (fruit?.chargedEvent === true) signals.push('charged_event');
  if (Number(fruit?.creatorRevenueUsd ?? 0) > 0) signals.push('creator_revenue');
  if (Number(fruit?.settledValueUsd ?? 0) > 0) signals.push('settled_value');
  if (fruit?.repeatDemand === true || fruit?.repeatDemand === 'confirmed') signals.push('repeat_demand');
  if (['confirmed', 'positive', 'validated'].includes(String(fruit?.marketTruth ?? '').toLowerCase())) signals.push('market_truth');
  return signals;
}

export function reconcileHumanActuationGates(garden) {
  const changes = [];

  for (const item of garden.humanActuationQueue ?? []) {
    const fruit = (garden.fruits ?? []).find((candidate) => candidate.id === item.organismId);
    if (!fruit) continue;

    if (item.state === 'staged_not_earned_over_rank_1') {
      const signals = independentReturnSignals(fruit);
      if (signals.length === 0) continue;

      item.state = 'awaiting_explicit_authorization';
      item.evidenceGate = 'independent_return_observed';
      item.evidenceGateSignals = signals;
      item.evidenceGateReason = 'Independent market/return evidence now exists, so this previously staged human actuation has earned eligibility. Static rank still controls whether it interrupts the Center-holder.';
      changes.push(`${fruit.id}:staged_human_action_earned`);
    }
  }

  return { changes };
}
