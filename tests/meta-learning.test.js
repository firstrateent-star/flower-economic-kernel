import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { analyzeMetaLearningEpisodes } from '../src/core/meta-learning.js';

const historical = JSON.parse(await fs.readFile(new URL('../methodology/meta-learning/episodes-v2.json', import.meta.url), 'utf8'));
const prospective = JSON.parse(await fs.readFile(new URL('../methodology/meta-learning/prospective-episodes-v1.json', import.meta.url), 'utf8'));
const episodes = [...historical.episodes, ...prospective.episodes];

function analysis() {
  return analyzeMetaLearningEpisodes(episodes);
}

test('meta-learning distinguishes applied mechanisms from violated or inferred mechanisms', () => {
  const result = analysis();
  assert.equal(result.selfAudit.explicitMechanismRoleCoverage, 1);
  assert.ok(result.violationStats.some((item) => item.mechanism === 'verified_provenance_gate'));
  const differentiation = result.mechanismStats.find((item) => item.mechanism === 'causal_differentiation');
  assert.ok(differentiation);
  assert.ok(differentiation.negativeEpisodeIds.includes('meta_negative_v4_split_without_provenance'));
});

test('differentiation and equivalence remain complementary rather than universal opposites', () => {
  const result = analysis();
  const mechanisms = new Set(result.mechanismStats.map((item) => item.mechanism));
  assert.ok(mechanisms.has('causal_differentiation'));
  assert.ok(mechanisms.has('semantic_equivalence_compression'));
  assert.match(result.coreHypothesis, /differentiates only causal states/);
  assert.match(result.coreHypothesis, /semantically equivalent states/);
});

test('prospective internal evidence removes the causality-gap pressure but preserves external-value caution', () => {
  const result = analysis();
  assert.ok(result.selfAudit.negativeControlCount >= 2);
  assert.equal(result.selfAudit.risks.some((risk) => risk.startsWith('survivor_bias')), false);
  assert.equal(result.selfAudit.prospectiveCausalEpisodeCount, 1);
  assert.equal(result.selfAudit.risks.some((risk) => risk.startsWith('causality_gap')), false);
  assert.ok(result.selfAudit.risks.some((risk) => risk.startsWith('external_value_gap')));
  assert.equal(result.selfAudit.externalValueVerifiedEpisodeCount, 0);
  assert.equal(result.selfAudit.metaLearningMaturity, 'prospective_internal_evidence_ready_for_cross_domain_transfer');
  assert.equal(result.nextPressure.type, 'CROSS_DOMAIN_TRANSFER_TEST');
});

test('historical recurrence plus one prospective win still never self-promotes canonically', () => {
  const result = analysis();
  assert.ok(result.candidateRules.some((rule) => rule.eligibleForProspectiveTest));
  assert.ok(result.candidateRules.every((rule) => rule.eligibleForCanonicalPromotion === false));
});

test('direct negative evidence remains a boundary condition after a prospective success', () => {
  const result = analysis();
  const differentiation = result.candidateRules.find((rule) => rule.mechanism === 'causal_differentiation');
  assert.ok(differentiation.directNegativeEpisodes.length > 0);
  assert.match(differentiation.interpretation, /boundary condition/);
});

test('prospective episode preserves the scope and boundary conditions of the measured improvement', () => {
  const episode = prospective.episodes.find((item) => item.id === 'meta_prospective_indexed_activation_v1');
  assert.equal(episode.causalEvidence, 'prospective_comparable_intervention');
  assert.equal(episode.outcomeState, 'measured_improvement');
  assert.equal(episode.externalValueVerified, false);
  assert.ok(episode.boundaryConditions.some((item) => /amortized/i.test(item)));
  assert.ok(episode.boundaryConditions.some((item) => /External usefulness is unverified/i.test(item)));
});

test('flourishing remains vector-valued and cannot be manufactured from internal success', () => {
  const result = analysis();
  assert.ok(result.flourishingVectorSummary.truth);
  assert.ok(result.flourishingVectorSummary.agency);
  assert.equal('flourishingScore' in result, false);
  assert.equal(result.selfAudit.externalValueVerifiedEpisodeCount, 0);
  assert.ok(result.selfAudit.risks.some((risk) => risk.startsWith('external_value_gap')));
});

test('episodes require falsifiers and explicit causal-role evidence', () => {
  const malformed = structuredClone(episodes);
  delete malformed[0].falsifier;
  assert.throws(() => analyzeMetaLearningEpisodes(malformed), /requires falsifier/);

  const roleless = structuredClone(episodes);
  roleless[0].mechanismsApplied = [];
  roleless[0].mechanismsViolated = [];
  roleless[0].mechanismsInferred = [];
  assert.throws(() => analyzeMetaLearningEpisodes(roleless), /requires at least one applied, violated, or inferred mechanism/);
});
