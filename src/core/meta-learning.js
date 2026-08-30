const POSITIVE_OUTCOMES = new Set([
  'supported',
  'measured_improvement',
  'baseline_problem_confirmed',
]);

const NON_PROMOTED_OUTCOMES = new Set([
  'candidate_not_promoted',
  'rejected',
  'no_gain',
  'regressed',
]);

const STRONG_EVIDENCE = new Set([
  'measured',
  'tested',
  'observed_plus_tested',
  'measured_baseline',
]);

function unique(values = []) {
  return [...new Set(values.filter(Boolean))];
}

function ratio(numerator, denominator) {
  return denominator > 0 ? numerator / denominator : null;
}

function classifyFlourishing(episodes) {
  const dimensions = new Map();
  for (const episode of episodes) {
    for (const [dimension, state] of Object.entries(episode.flourishingEffects ?? {})) {
      const bucket = dimensions.get(dimension) ?? {};
      bucket[state] = Number(bucket[state] ?? 0) + 1;
      dimensions.set(dimension, bucket);
    }
  }
  return Object.fromEntries([...dimensions.entries()].sort(([a], [b]) => a.localeCompare(b)));
}

function mechanismStats(episodes) {
  const stats = new Map();
  for (const episode of episodes) {
    for (const mechanism of unique(episode.mechanisms)) {
      const current = stats.get(mechanism) ?? {
        mechanism,
        episodeIds: [],
        positiveEpisodeIds: [],
        nonPromotedEpisodeIds: [],
        domains: new Set(),
        evidenceStrengths: new Set(),
        externalValueVerifiedCount: 0,
      };
      current.episodeIds.push(episode.id);
      if (POSITIVE_OUTCOMES.has(episode.outcomeState)) current.positiveEpisodeIds.push(episode.id);
      if (NON_PROMOTED_OUTCOMES.has(episode.outcomeState)) current.nonPromotedEpisodeIds.push(episode.id);
      for (const domain of episode.domains ?? []) current.domains.add(domain);
      if (episode.evidenceStrength) current.evidenceStrengths.add(episode.evidenceStrength);
      if (episode.externalValueVerified === true) current.externalValueVerifiedCount += 1;
      stats.set(mechanism, current);
    }
  }

  return [...stats.values()]
    .map((item) => ({
      mechanism: item.mechanism,
      episodeCount: item.episodeIds.length,
      positiveEpisodeCount: item.positiveEpisodeIds.length,
      nonPromotedEpisodeCount: item.nonPromotedEpisodeIds.length,
      domainBreadth: item.domains.size,
      domains: [...item.domains].sort(),
      evidenceStrengths: [...item.evidenceStrengths].sort(),
      strongEvidenceEpisodeCount: item.episodeIds.filter((id) => {
        const episode = episodes.find((candidate) => candidate.id === id);
        return STRONG_EVIDENCE.has(episode?.evidenceStrength);
      }).length,
      externalValueVerifiedCount: item.externalValueVerifiedCount,
      episodeIds: item.episodeIds,
    }))
    .sort((a, b) => b.positiveEpisodeCount - a.positiveEpisodeCount
      || b.domainBreadth - a.domainBreadth
      || a.mechanism.localeCompare(b.mechanism));
}

function candidateRules(stats) {
  return stats
    .filter((item) => item.positiveEpisodeCount >= 2 && item.domainBreadth >= 2)
    .map((item) => {
      const crossDomain = item.domainBreadth >= 3;
      const recurrence = item.positiveEpisodeCount >= 3;
      const hasCounterPressure = item.nonPromotedEpisodeCount > 0;
      const strongEvidence = item.strongEvidenceEpisodeCount >= 2;
      const eligibleForFurtherTesting = recurrence && crossDomain && strongEvidence;
      return {
        id: `meta_rule_${item.mechanism}`,
        mechanism: item.mechanism,
        supportEpisodes: item.positiveEpisodeIds,
        domainBreadth: item.domainBreadth,
        hasCounterPressure,
        strongEvidenceEpisodeCount: item.strongEvidenceEpisodeCount,
        eligibleForFurtherTesting,
        eligibleForCanonicalPromotion: false,
        whyNotCanonical: item.externalValueVerifiedCount === 0
          ? 'Historical recurrence may justify a methodology experiment, but it does not establish broad external flourishing or universal causality.'
          : 'Historical recurrence is still observational and must survive prospective tests and complexity tax before canonical promotion.',
      };
    });
}

function selfAudit(episodes, stats) {
  const negativeControls = episodes.filter((episode) => ['rejected', 'no_gain', 'regressed'].includes(episode.outcomeState));
  const candidateOnly = episodes.filter((episode) => episode.outcomeState === 'candidate_not_promoted');
  const strongEvidence = episodes.filter((episode) => STRONG_EVIDENCE.has(episode.evidenceStrength));
  const humanCorrections = episodes.filter((episode) => episode.humanEpistemicCorrection === true);
  const externallyVerified = episodes.filter((episode) => episode.externalValueVerified === true);
  const topMechanism = stats[0] ?? null;
  const labels = unique(episodes.flatMap((episode) => episode.mechanisms ?? []));

  const risks = [];
  if (negativeControls.length < 2) risks.push('survivor_bias: too few rejected/no-gain/regression episodes are represented.');
  if (candidateOnly.length === 0) risks.push('premature_universalization: no preserved non-promoted candidate is represented.');
  if (ratio(strongEvidence.length, episodes.length) < 0.6) risks.push('weak_evidence_mix: too much of the lineage relies on observation or inference rather than measured/tested evidence.');
  if (externallyVerified.length === 0) risks.push('external_value_gap: the lineage can explain internal methodology improvement but cannot yet claim broad external flourishing impact.');
  if (topMechanism && ratio(topMechanism.episodeCount, episodes.length) > 0.8) risks.push('ontology_lock: one mechanism explains more than 80% of episodes and may be an overfit label.');
  if (labels.length < 4) risks.push('ontology_underfit: mechanism vocabulary is too small to represent materially different learning moves.');

  return {
    episodeCount: episodes.length,
    negativeControlCount: negativeControls.length,
    nonPromotedCandidateCount: candidateOnly.length,
    strongEvidenceEpisodeCount: strongEvidence.length,
    strongEvidenceCoverage: ratio(strongEvidence.length, episodes.length),
    humanEpistemicCorrectionCount: humanCorrections.length,
    humanEpistemicCorrectionShare: ratio(humanCorrections.length, episodes.length),
    externalValueVerifiedEpisodeCount: externallyVerified.length,
    mechanismLabelCount: labels.length,
    risks,
    metaLearningMaturity: risks.some((risk) => risk.startsWith('survivor_bias'))
      ? 'historical_pattern_candidate_needs_negative_controls'
      : 'historical_pattern_candidate_ready_for_prospective_tests',
  };
}

export function analyzeMetaLearningEpisodes(episodes = []) {
  if (!Array.isArray(episodes) || episodes.length === 0) {
    throw new Error('analyzeMetaLearningEpisodes requires at least one episode.');
  }

  const ids = new Set();
  for (const episode of episodes) {
    if (!episode?.id) throw new Error('Every meta-learning episode requires id.');
    if (ids.has(episode.id)) throw new Error(`Duplicate meta-learning episode id: ${episode.id}`);
    ids.add(episode.id);
    if (!episode.observedTrigger) throw new Error(`Episode ${episode.id} requires observedTrigger.`);
    if (!episode.decisionRelevantMove) throw new Error(`Episode ${episode.id} requires decisionRelevantMove.`);
    if (!Array.isArray(episode.mechanisms) || episode.mechanisms.length === 0) throw new Error(`Episode ${episode.id} requires mechanisms.`);
    if (!Array.isArray(episode.domains) || episode.domains.length === 0) throw new Error(`Episode ${episode.id} requires domains.`);
    if (!episode.falsifier) throw new Error(`Episode ${episode.id} requires falsifier.`);
  }

  const stats = mechanismStats(episodes);
  const audit = selfAudit(episodes, stats);
  const rules = candidateRules(stats);

  return {
    schemaVersion: 1,
    epistemicStatus: 'historical_meta_learning_candidate_not_causal_proof',
    episodeCount: episodes.length,
    coreHypothesis: 'Flower improves when it separates causal states that can change a decision, recognizes semantic equivalence where distinctions cannot change a decision, instruments the difference, tests it against reality, preserves counterevidence, and reconciles the result into executable behavior.',
    operatingCandidate: [
      'OBSERVE: preserve the actual contradiction, surprise, repeated waste, or equivalence before explaining it.',
      'DIFFERENTIATE_OR_COMPRESS: split states only when the distinction can change a decision; collapse/reuse states when they are semantically equivalent for that decision.',
      'INSTRUMENT: create the cheapest witness that can tell the candidate explanations apart.',
      'TEST: prefer comparable prospective evidence over narrative confidence.',
      'RECONCILE: make code, tests, runtime cognition, documentation, memory, and authority boundaries agree with the evidence.',
      'GENERALIZE: infer a reusable transformation only to the breadth supported by structurally different episodes.',
      'TRANSFER: test possible usefulness elsewhere without promoting internal value into external value.',
      'META_AUDIT: search for survivor bias, ontology lock, proxy drift, complexity growth, displaced costs, and missing negative controls in the learning process itself.',
    ],
    mechanismStats: stats,
    candidateRules: rules,
    flourishingVectorSummary: classifyFlourishing(episodes),
    selfAudit: audit,
    nextPressure: audit.negativeControlCount < 2
      ? {
          type: 'ADD_NEGATIVE_CONTROLS',
          why: 'The current historical sample is dominated by retained/supported mutations. Meta-learning should not infer a universal recipe until rejected, no-gain, or regression episodes are represented and allowed to falsify the ontology.',
        }
      : {
          type: 'PROSPECTIVE_META_TEST',
          why: 'The historical pattern has enough counterpressure to justify a bounded prospective test, not canonical promotion.',
        },
  };
}
