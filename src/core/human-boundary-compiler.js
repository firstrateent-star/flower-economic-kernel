const HUMAN_AUTHORITY_KINDS = new Set([
  'publication_authority',
  'identity_choice',
  'legal_status',
  'agreement_acceptance',
  'license_eula',
  'contract',
  'financial_commitment',
]);

function list(value) {
  return Array.isArray(value) ? value : [];
}

export function compileHumanBoundary(packet = {}, resolved = {}) {
  const decisions = list(packet.decisions);
  const machineActions = list(packet.machineActions);

  const normalized = decisions.map((decision) => {
    const hasResolution = Object.prototype.hasOwnProperty.call(resolved, decision.id);
    const authorityRequired = decision.authority === 'human' || HUMAN_AUTHORITY_KINDS.has(decision.kind);
    return {
      ...decision,
      authorityRequired,
      resolved: hasResolution,
      resolution: hasResolution ? resolved[decision.id] : null,
    };
  });

  const humanChoices = normalized.filter((decision) => decision.required !== false && decision.authorityRequired && !decision.resolved);
  const unresolvedDecisionIds = new Set(humanChoices.map((decision) => decision.id));

  const executableMachineActions = [];
  const blockedMachineActions = [];
  for (const action of machineActions) {
    const blockers = list(action.dependsOn).filter((id) => unresolvedDecisionIds.has(id));
    if (blockers.length === 0) executableMachineActions.push({ ...action, blockers: [] });
    else blockedMachineActions.push({ ...action, blockers });
  }

  const downstreamCount = machineActions.length;
  const humanCount = humanChoices.length;
  return {
    id: packet.id ?? null,
    targetId: packet.targetId ?? null,
    goal: packet.goal ?? null,
    humanChoices,
    resolvedHumanChoices: normalized.filter((decision) => decision.authorityRequired && decision.resolved),
    executableMachineActions,
    blockedMachineActions,
    minimumHumanDecisionCount: humanCount,
    downstreamMachineActionCount: downstreamCount,
    activationGainProxy: humanCount === 0 ? downstreamCount : Number((downstreamCount / humanCount).toFixed(2)),
    readyForMachineContinuation: humanChoices.length === 0,
  };
}
