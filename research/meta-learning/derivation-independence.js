function unique(values = []) {
  return [...new Set((values ?? []).filter(Boolean))];
}

function appliedMechanisms(episode = {}) {
  return unique(episode.mechanismsApplied ?? episode.mechanisms ?? []);
}

function positive(episode = {}) {
  return ['supported', 'measured_improvement'].includes(episode.outcomeState);
}

/**
 * Recurrence is not independent confirmation unless the evidence paths are known to
 * be distinct. This research audit deliberately refuses to infer independence from
 * different episode ids, wording, or domains.
 */
export function auditDerivationIndependence(episodes = []) {
  const byMechanism = new Map();

  for (const episode of episodes) {
    if (!positive(episode)) continue;
    for (const mechanism of appliedMechanisms(episode)) {
      const row = byMechanism.get(mechanism) ?? {
        mechanism,
        positiveEpisodeIds: [],
        explicitDerivationFamilies: new Map(),
        unresolvedEpisodeIds: [],
      };
      row.positiveEpisodeIds.push(episode.id);
      const family = episode.derivationFamily ?? null;
      if (family) {
        const ids = row.explicitDerivationFamilies.get(family) ?? [];
        ids.push(episode.id);
        row.explicitDerivationFamilies.set(family, ids);
      } else {
        row.unresolvedEpisodeIds.push(episode.id);
      }
      byMechanism.set(mechanism, row);
    }
  }

  return [...byMechanism.values()].map((row) => ({
    mechanism: row.mechanism,
    positiveEpisodeCount: row.positiveEpisodeIds.length,
    positiveEpisodeIds: row.positiveEpisodeIds,
    explicitIndependentDerivationCount: row.explicitDerivationFamilies.size,
    derivationFamilies: [...row.explicitDerivationFamilies.entries()]
      .map(([family, episodeIds]) => ({ family, episodeIds }))
      .sort((a, b) => a.family.localeCompare(b.family)),
    unresolvedDerivationEpisodeIds: row.unresolvedEpisodeIds,
    recurrenceWithoutIndependenceRisk:
      row.positiveEpisodeIds.length >= 2 && row.explicitDerivationFamilies.size < 2,
    interpretation:
      row.explicitDerivationFamilies.size >= 2
        ? 'At least two explicitly distinct derivation families support this mechanism; this is stronger than raw recurrence but still not proof of universal validity.'
        : 'Raw recurrence is present without two explicitly distinct derivation families; do not count episode multiplicity as independent confirmation.',
  })).sort((a, b) => b.positiveEpisodeCount - a.positiveEpisodeCount
    || a.mechanism.localeCompare(b.mechanism));
}

export const DERIVATION_INDEPENDENCE_PRINCIPLE = {
  thesis: 'Repeated observations and independent convergence are different evidence states.',
  rule: 'Do not increase confidence merely because one causal lineage is restated across multiple episodes, domains, abstractions, or representations. Count independent convergence only when distinct derivation ancestry is explicit enough to defend.',
  boundary: 'Independent derivation strengthens a hypothesis but does not override direct negative evidence, prospective falsification, scope limits, or the need for external value evidence.',
  currentStatus: 'research_candidate_not_canonical',
};
