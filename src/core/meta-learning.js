const POSITIVE_OUTCOMES = new Set(['supported', 'measured_improvement']);
const NEGATIVE_OUTCOMES = new Set(['rejected', 'no_gain', 'regressed']);
const STRONG_EVIDENCE = new Set(['measured', 'tested', 'observed_plus_tested', 'measured_baseline']);

function unique(values = []) {
  return [...new Set((values ?? []).filter(Boolean))];
}

function ratio(numerator, denominator) {
  return denominator > 0 ? numerator / denominator : null;
}

function appliedMechanisms(episode) {
  return unique(episode.mechanismsApplied ?? episode.mechanisms ?? []);
}

function violatedMechanisms(episode) {
  return unique(episode.mechanismsViolated ?? []);
}

function inferredMechanisms(episode) {
  return unique(episode.mechanismsInferred ?? []);
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
    for (const mechanism of appliedMechanisms(episode)) {
      const current = stats.get(mechanism) ?? {
        mechanism,
        appliedEpisodeIds: [],
        positiveEpisodeIds: [],
        negativeEpisodeIds: [],
        candidateEpisodeIds: [],
        domains: new Set(),
        evidenceStrengths: new Set(),
        strongEvidenceEpisodeIds: [],
        externallyVerifiedEpisodeIds: [],
      };
      current.appliedEpisodeIds.push(episode.id);
      if (POSITIVE_OUTCOMES.has(episode.outcomeState)) current.positiveEpisodeIds.push(episode.id);
      if (NEGATIVE_OUTCOMES.has(episode.outcomeState)) current.negativeEpisodeIds.push(episode.id);
      if (episode.outcomeState === 'candidate_not_promoted') current.candidateEpisodeIds.push(episode.id);
      for (const domain of episode.domains ?? []) current.domains.add(domain);
      if (episode.evidenceStrength) current.evidenceStrengths.add(episode.evidenceStrength);
      if (STRONG_EVIDENCE.has(episode.evidenceStrength)) current.strongEvidenceEpisodeIds.push(episode.id);
      if (episode.externalValueVerified === true) current.externallyVerifiedEpisodeIds.push(episode.id);
      stats.set(mechanism, current);
    }
  }

  return [...stats.values()]
    .map((item) => ({
      mechanism: item.mechanism,
      appliedEpisodeCount: item.appliedEpisodeIds.length,
      positiveEpisodeCount: item.positiveEpisodeIds.length,
      negativeEpisodeCount: item.negativeEpisodeIds.length,
      candidateEpisodeCount: item.candidateEpisodeIds.length,
      domainBreadth: item.domains.size,
      domains: [...item.domains].sort(),
      evidenceStrengths: [...item.evidenceStrengths].sort(),
      strongEvidenceEpisodeCount: item.strongEvidenceEpisodeIds.length,
      externalValueVerifiedCount: item.externallyVerifiedEpisodeIds.length,
      appliedEpisodeIds: item.appliedEpisodeIds,
      positiveEpisodeIds: item.positiveEpisodeIds,
      negativeEpisodeIds: item.negativeEpisodeIds,
    }))
    .sort((a, b) => b.positiveEpisodeCount - a.positiveEpisodeCount
      || b.domainBreadth - a.domainBreadth
      || a.mechanism.localeCompare(b.mechanism));
}

function violationStats(episodes) {
  const stats = new Map();
  for (const episode of episodes) {
    for (const mechanism of violatedMechanisms(episode)) {
      const current = stats.get(mechanism) ?? { mechanism, episodeIds: [], domains: new Set() };
      current.episodeIds.push(episode.id);
      for (const domain of episode.domains ?? []) current.domains.add(domain);
      stats.set(mechanism, current);
    }
  }
  return [...stats.values()]
    .map((item) => ({
      mechanism: item.mechanism,
      violationEpisodeCount: item.episodeIds.length,
      domainBreadth: item.domains.size,
      domains: [...item.domains].sort(),
      episodeIds: item.episodeIds,
    }))
    .sort((a, b) => b.violationEpisodeCount - a.violationEpisodeCount || a.mechanism.localeCompare(b.mechanism));
}

function candidateRules(stats) {
  return stats
    .filter((item) => item.positiveEpisodeCount >= 2 && item.domainBreadth >= 2)
    .map((item) => {
      const recurrence = item.positiveEpisodeCount >= 3;
      const crossDomain = item.domainBreadth >= 3;
      const strongEvidence = item.strongEvidenceEpisodeCount >= 2;
      const hasDirectNegative = item.negativeEpisodeCount > 0;
      return {
        id: `meta_rule_${item.mechanism}`,
        mechanism: item.mechanism,
        supportEpisodes: item.positiveEpisodeIds,
        directNegativeEpisodes: item.negativeEpisodeIds,
        domainBreadth: item.domainBreadth,
        strongEvidenceEpisodeCount: item.strongEvidenceEpisodeCount,
        eligibleForProspectiveTest: recurrence && crossDomain && strongEvidence,
        eligibleForCanonicalPromotion: false,
        interpretation: hasDirectNegative
          ? 'The mechanism has both support and direct negative/no-gain evidence; any prospective use must state the boundary condition that distinguishes them.'
          : 'The mechanism recurs historically but lacks direct negative evidence; treat it as a hypothesis needing prospective falsification.',
      };
    });
}

function selfAudit(episodes, stats) {
  const negativeControls = episodes.filter((episode) => NEGATIVE_OUTCOMES.has(episode.outcomeState));
  const candidateOnly = episodes.filter((episode) => episode.outcomeState === 'candidate_not_promoted');
  const strongEvidence = episodes.filter((episode) => STRONG_EVIDENCE.has(episode.evidenceStrength));
  const humanCorrections = episodes.filter((episode) => episode.humanEpistemicCorrection === true);
  const externallyVerified = episodes.filter((episode) => episode.externalValueVerified === true);
  const explicitRoles = episodes.filter((episode) => Array.isArray(episode.mechanismsApplied) && Array.isArray(episode.mechanismsViolated));
  const causalProof = episodes.filter((episode) => episode.causalEvidence === 'prospective_comparable_intervention');
  const topMechanism = stats[0] ?? null;
  const labels = unique(episodes.flatMap((episode) => [
    ...appliedMechanisms(episode),
    ...violatedMechanisms(episode),
    ...inferredMechanisms(episode),
  ]));

  const risks = [];
  if (negativeControls.length < 2) risks.push('survivor_bias: too few rejected/no-gain/regression episodes are represented.');
  if (candidateOnly.length === 0) risks.push('premature_universalization: no preserved non-promoted candidate is represented.');
  if (ratio(strongEvidence.length, episodes.length) < 0.6) risks.push('weak_evidence_mix: too much of the lineage relies on observation or inference rather than measured/tested evidence.');
  if (ratio(explicitRoles.length, episodes.length) < 1) risks.push('mechanism_role_confusion: some episodes do not distinguish mechanisms applied from mechanisms violated or merely inferred.');
  if (externallyVerified.length === 0) risks.push('external_value_gap: internal methodology history cannot establish broad external flourishing impact.');
  if (causalProof.length === 0) risks.push('causality_gap: retrospective lineage can generate hypotheses but has no prospective comparable intervention proving a meta-rule yet.');
  if (topMechanism && ratio(topMechanism.appliedEpisodeCount, episodes.length) > 0.8) risks.push('ontology_lock: one applied mechanism labels more than 80% of episodes and may be overfitting the history.');
  if (labels.length < 4) risks.push('ontology_underfit: mechanism vocabulary is too small to represent materially different learning moves.');

  let metaLearningMaturity = 'historical_candidate_needs_better_counterpressure';
  if (negativeControls.length >= 2 && explicitRoles.length === episodes.length) {
    metaLearningMaturity = causalProof.length > 0
      ? externallyVerified.length > 0
        ? 'prospective_internal_and_external_evidence_requires_replication'
        : 'prospective_internal_evidence_ready_for_cross_domain_transfer'
      : 'counterpressured_historical_candidate_ready_for_prospective_test';
  }

  return {
    episodeCount: episodes.length,
    negativeControlCount: negativeControls.length,
    nonPromotedCandidateCount: candidateOnly.length,
    strongEvidenceEpisodeCount: strongEvidence.length,
    strongEvidenceCoverage: ratio(strongEvidence.length, episodes.length),
    explicitMechanismRoleCoverage: ratio(explicitRoles.length, episodes.length),
    prospectiveCausalEpisodeCount: causalProof.length,
    humanEpistemicCorrectionCount: humanCorrections.length,
    humanEpistemicCorrectionShare: ratio(humanCorrections.length, episodes.length),
    externalValueVerifiedEpisodeCount: externallyVerified.length,
    mechanismLabelCount: labels.length,
    risks,
    metaLearningMaturity,
  };
}

function nextMetaPressure(audit) {
  if (audit.negativeControlCount < 2 || audit.explicitMechanismRoleCoverage < 1) {
    return {
      type: 'IMPROVE_META_EVIDENCE_MODEL',
      why: 'Learning roles or counterexamples are still underspecified; improve the episode model before trusting recurrence rankings.',
    };
  }
  if (audit.prospectiveCausalEpisodeCount === 0) {
    return {
      type: 'PROSPECTIVE_META_TEST',
      why: 'Counterpressured history is sufficient for one bounded prospective test of a candidate meta-mechanism. Success may update the meta-model but cannot by itself prove broad flourishing.',
    };
  }
  if (audit.externalValueVerifiedEpisodeCount === 0) {
    return {
      type: 'CROSS_DOMAIN_TRANSFER_TEST',
      why: 'A prospective internal intervention has improved Flower on a comparable workload. The next uncertainty is transfer: test the bounded transformation in a structurally different external system with an independent value and flourishing witness before generalizing further.',
    };
  }
  return {
    type: 'REPLICATE_AND_GENERALIZE',
    why: 'Internal and external evidence now exist, but broad flourishing requires replication across structurally different contexts, counterexamples, and displaced-cost checks before stronger generalization.',
  };
}

export function analyzeMetaLearningEpisodes(episodes = []) {
  if (!Array.isArray(episodes) || episodes.length === 0) throw new Error('analyzeMetaLearningEpisodes requires at least one episode.');

  const ids = new Set();
  for (const episode of episodes) {
    if (!episode?.id) throw new Error('Every meta-learning episode requires id.');
    if (ids.has(episode.id)) throw new Error(`Duplicate meta-learning episode id: ${episode.id}`);
    ids.add(episode.id);
    if (!episode.observedTrigger) throw new Error(`Episode ${episode.id} requires observedTrigger.`);
    if (!episode.decisionRelevantMove) throw new Error(`Episode ${episode.id} requires decisionRelevantMove.`);
    if (appliedMechanisms(episode).length === 0 && violatedMechanisms(episode).length === 0 && inferredMechanisms(episode).length === 0) {
      throw new Error(`Episode ${episode.id} requires at least one applied, violated, or inferred mechanism.`);
    }
    if (!Array.isArray(episode.domains) || episode.domains.length === 0) throw new Error(`Episode ${episode.id} requires domains.`);
    if (!episode.falsifier) throw new Error(`Episode ${episode.id} requires falsifier.`);
  }

  const stats = mechanismStats(episodes);
  const violations = violationStats(episodes);
  const audit = selfAudit(episodes, stats);
  const rules = candidateRules(stats);
  const prospective = audit.prospectiveCausalEpisodeCount > 0;

  return {
    schemaVersion: 3,
    epistemicStatus: prospective
      ? 'counterpressured_meta_learning_with_prospective_internal_evidence_not_external_proof'
      : 'counterpressured_historical_meta_learning_not_causal_proof',
    episodeCount: episodes.length,
    coreHypothesis: 'Flower tends to improve when it first preserves the real contradiction or repeated waste, then differentiates only causal states that can change a decision while compressing semantically equivalent states, builds a decision-relevant witness, tests the intervention comparably, and reconciles the result into executable behavior. Differentiation or instrumentation alone is insufficient when evidence provenance, comparability, or complexity tax is missing.',
    operatingCandidate: [
      'OBSERVE: preserve contradiction, surprise, repeated waste, successful invariance, and who supplied the correction before assigning a mechanism.',
      'ROLE: separate the mechanism actually applied from the mechanism violated/missing and from the mechanism inferred after the fact.',
      'DIFFERENTIATE_OR_COMPRESS: split states only when the distinction can change a decision; reuse/collapse states when they are equivalent for that decision.',
      'INSTRUMENT: construct the cheapest witness that can discriminate the competing causal stories, and record what it cannot measure.',
      'PROSPECTIVE_TEST: when safe, change one causal mechanism on a stable workload and preserve a comparable decision witness.',
      'RECONCILE: make code, tests, runtime cognition, documentation, memory, and authority boundaries agree with the measured result.',
      'GENERALIZE_WITH_BOUNDARY: transfer only the transformation plus its observed boundary conditions, counterexamples, and uncertainty.',
      'FLOURISHING_AUDIT: evaluate agency, truth, capability, wellbeing, resilience, optionality, regeneration, resource burden, displaced costs, and harm without collapsing them into one vanity score.',
      'META_AUDIT: pressure-test the meta-learner for survivor bias, ontology lock, causal overclaim, proxy drift, complexity growth, and missing external evidence.',
    ],
    mechanismStats: stats,
    violationStats: violations,
    candidateRules: rules,
    flourishingVectorSummary: classifyFlourishing(episodes),
    selfAudit: audit,
    nextPressure: nextMetaPressure(audit),
  };
}
