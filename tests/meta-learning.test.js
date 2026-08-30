import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { analyzeMetaLearningEpisodes } from '../src/core/meta-learning.js';

const source = JSON.parse(await fs.readFile(new URL('../methodology/meta-learning/episodes-v1.json', import.meta.url), 'utf8'));

function analysis() {
  return analyzeMetaLearningEpisodes(source.episodes);
}

test('meta-learning preserves differentiation and equivalence as complementary moves', () => {
  const result = analysis();
  const mechanisms = new Set(result.mechanismStats.map((item) => item.mechanism));
  assert.ok(mechanisms.has('causal_differentiation'));
  assert.ok(mechanisms.has('semantic_equivalence_compression'));
  assert.match(result.coreHypothesis, /separates causal states/);
  assert.match(result.coreHypothesis, /semantic equivalence/);
});

test('historical recurrence may propose a test but never promotes itself canonically', () => {
  const result = analysis();
  assert.ok(result.candidateRules.length > 0);
  assert.ok(result.candidateRules.every((rule) => rule.eligibleForCanonicalPromotion === false));
});

test('meta-learning detects survivor bias when negative controls are missing', () => {
  const result = analysis();
  assert.equal(result.selfAudit.negativeControlCount, 0);
  assert.ok(result.selfAudit.risks.some((risk) => risk.startsWith('survivor_bias')));
  assert.equal(result.nextPressure.type, 'ADD_NEGATIVE_CONTROLS');
});

test('flourishing remains a vector and is not collapsed into one scalar score', () => {
  const result = analysis();
  assert.equal(typeof result.flourishingVectorSummary, 'object');
  assert.ok(result.flourishingVectorSummary.truth);
  assert.ok(result.flourishingVectorSummary.agency);
  assert.equal('flourishingScore' in result, false);
});

test('internal lineage does not manufacture external flourishing evidence', () => {
  const result = analysis();
  assert.equal(result.selfAudit.externalValueVerifiedEpisodeCount, 0);
  assert.ok(result.selfAudit.risks.some((risk) => risk.startsWith('external_value_gap')));
});

test('episodes require a falsifier so meta-learning remains corrigible', () => {
  const malformed = structuredClone(source.episodes);
  delete malformed[0].falsifier;
  assert.throws(() => analyzeMetaLearningEpisodes(malformed), /requires falsifier/);
});
