import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { analyzeMetaLearningEpisodes } from '../src/core/meta-learning.js';

const source = JSON.parse(await fs.readFile(new URL('../methodology/meta-learning/episodes-v2.json', import.meta.url), 'utf8'));

function analysis() {
  return analyzeMetaLearningEpisodes(source.episodes);
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

test('negative controls remove naive survivor-bias clearance but not causal caution', () => {
  const result = analysis();
  assert.ok(result.selfAudit.negativeControlCount >= 2);
  assert.equal(result.selfAudit.risks.some((risk) => risk.startsWith('survivor_bias')), false);
  assert.ok(result.selfAudit.risks.some((risk) => risk.startsWith('causality_gap')));
  assert.equal(result.nextPressure.type, 'PROSPECTIVE_META_TEST');
});

test('historical recurrence may authorize one prospective test but never self-promotes canonically', () => {
  const result = analysis();
  assert.ok(result.candidateRules.some((rule) => rule.eligibleForProspectiveTest));
  assert.ok(result.candidateRules.every((rule) => rule.eligibleForCanonicalPromotion === false));
});

test('direct negative evidence is preserved as a boundary condition for a recurring mechanism', () => {
  const result = analysis();
  const differentiation = result.candidateRules.find((rule) => rule.mechanism === 'causal_differentiation');
  assert.ok(differentiation.directNegativeEpisodes.length > 0);
  assert.match(differentiation.interpretation, /boundary condition/);
});

test('flourishing remains vector-valued and cannot be manufactured from internal history', () => {
  const result = analysis();
  assert.ok(result.flourishingVectorSummary.truth);
  assert.ok(result.flourishingVectorSummary.agency);
  assert.equal('flourishingScore' in result, false);
  assert.equal(result.selfAudit.externalValueVerifiedEpisodeCount, 0);
  assert.ok(result.selfAudit.risks.some((risk) => risk.startsWith('external_value_gap')));
});

test('episodes require falsifiers and explicit causal-role evidence', () => {
  const malformed = structuredClone(source.episodes);
  delete malformed[0].falsifier;
  assert.throws(() => analyzeMetaLearningEpisodes(malformed), /requires falsifier/);

  const roleless = structuredClone(source.episodes);
  roleless[0].mechanismsApplied = [];
  roleless[0].mechanismsViolated = [];
  roleless[0].mechanismsInferred = [];
  assert.throws(() => analyzeMetaLearningEpisodes(roleless), /requires at least one applied, violated, or inferred mechanism/);
});
