function signature(trace = {}) {
  const pressureType = trace?.pressure?.type ?? trace?.pressureType ?? 'UNKNOWN';
  const action = trace?.action ?? 'UNKNOWN';
  return `${pressureType}->${action}`;
}

function boundaryKind(trace = {}) {
  const pressureType = trace?.pressure?.type ?? trace?.pressureType ?? null;
  if (pressureType === 'HUMAN') return 'human_sovereignty';
  if (['TRANSFER', 'SELECT', 'FALSIFY', 'EXPAND', 'BUILD_PLAN'].includes(pressureType)) return 'semantic_reasoning';
  if (pressureType === 'EXECUTE_EXPERIMENT') {
    const action = String(trace?.action ?? '').toUpperCase();
    if (action.includes('SPEND') || action.includes('PUBLIC') || action.includes('CONTACT')) return 'irreversible_or_external';
  }
  return null;
}

function windowSignature(window = []) {
  return window.map(signature).join('|');
}

/**
 * Detect repeated normalized breath subsequences in hot trace history.
 * Repetition is only a crystallization candidate signal; it is not proof that semantic
 * decisions can be removed or that compilation would improve the system.
 */
export function detectCrystallizationCandidates(traces = [], {
  minLength = 2,
  maxLength = 5,
  minRepeats = 2,
} = {}) {
  if (!Array.isArray(traces)) return [];
  const groups = new Map();

  for (let length = minLength; length <= maxLength; length += 1) {
    for (let start = 0; start + length <= traces.length; start += 1) {
      const window = traces.slice(start, start + length);
      const key = windowSignature(window);
      const group = groups.get(key) ?? {
        signature: key,
        length,
        occurrences: [],
      };
      group.occurrences.push({
        start,
        traceIds: window.map((trace) => trace?.id ?? null),
        changedPattern: window.map((trace) => trace?.changed === true),
        methodologyVersions: [...new Set(window.map((trace) => trace?.methodologyVersion ?? null).filter(Boolean))],
        boundaries: [...new Set(window.map(boundaryKind).filter(Boolean))],
      });
      groups.set(key, group);
    }
  }

  return [...groups.values()]
    .filter((group) => group.occurrences.length >= minRepeats)
    .map((group) => {
      const changedPatterns = new Set(group.occurrences.map((x) => JSON.stringify(x.changedPattern)));
      const boundaryKinds = [...new Set(group.occurrences.flatMap((x) => x.boundaries))];
      const semanticBoundary = boundaryKinds.includes('semantic_reasoning');
      const sovereigntyBoundary = boundaryKinds.includes('human_sovereignty')
        || boundaryKinds.includes('irreversible_or_external');
      return {
        ...group,
        repeatCount: group.occurrences.length,
        changedPatternStable: changedPatterns.size === 1,
        boundaryKinds,
        purelyProceduralCandidate: !semanticBoundary && !sovereigntyBoundary,
        compilationAuthorized: false,
        requiredNextEvidence: [
          'input-shape stability',
          'output/result fingerprint stability',
          'baseline resource/latency witness',
          'validity and invalidation boundary',
          'safe fallback path',
        ],
      };
    })
    .sort((a, b) => {
      if (a.purelyProceduralCandidate !== b.purelyProceduralCandidate) return a.purelyProceduralCandidate ? -1 : 1;
      if (b.repeatCount !== a.repeatCount) return b.repeatCount - a.repeatCount;
      return b.length - a.length;
    });
}

export function crystallizationShadowReport(garden = {}, options = {}) {
  const traces = Array.isArray(garden.traces) ? garden.traces : [];
  const candidates = detectCrystallizationCandidates(traces, options);
  return {
    traceCount: traces.length,
    candidateCount: candidates.length,
    proceduralCandidateCount: candidates.filter((x) => x.purelyProceduralCandidate).length,
    candidates,
    authority: 'shadow_only',
    externalValueVerified: false,
    epistemicBoundary:
      'Repeated traces demonstrate recurrence only. Compilation requires stable causal input/output semantics, measurable savings, invalidation rules, rollback, and same-workload Observatory evidence.',
  };
}
