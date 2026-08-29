const HARD_DENY = new Set([
  'create_debt',
  'sign_contract',
  'transfer_ownership',
  'use_human_identity',
  'access_harvest',
]);

export function authorizeAction(garden, action) {
  const p = garden.center.autonomy;
  const result = { allowed: false, requiresApproval: false, reason: 'Unclassified action.' };

  if (!action?.type) return result;
  if (HARD_DENY.has(action.type)) {
    return { allowed: false, requiresApproval: true, reason: `Constitutional boundary: ${action.type}.` };
  }

  if (action.type === 'observe' || action.type === 'web_search') {
    return { allowed: !!p.observe, requiresApproval: false, reason: 'Observation capability.' };
  }
  if (action.type === 'create_private') {
    return { allowed: !!p.createPrivate, requiresApproval: false, reason: 'Private creation capability.' };
  }
  if (action.type === 'sandbox') {
    return { allowed: !!p.sandbox, requiresApproval: false, reason: 'Sandbox capability.' };
  }
  if (action.type === 'public_deploy') {
    return { allowed: false, requiresApproval: true, reason: 'Public deployment always requires Center-holder approval in v0.' };
  }
  if (action.type === 'human_contact') {
    return { allowed: false, requiresApproval: true, reason: 'Human contact is outside autonomous v0 authority.' };
  }
  if (action.type === 'spend') {
    const amount = Number(action.amountUsd ?? Infinity);
    const recurring = Number(action.recurringUsd ?? 0);
    if (recurring > p.maxRecurringUsd) {
      return { allowed: false, requiresApproval: true, reason: 'Recurring obligation exceeds autonomous ceiling.' };
    }
    if (amount > p.maxExperimentUsd) {
      return { allowed: false, requiresApproval: true, reason: 'Experiment cost exceeds autonomous ceiling.' };
    }
    return { allowed: true, requiresApproval: false, reason: 'Within one-time experiment ceiling.' };
  }

  return result;
}
