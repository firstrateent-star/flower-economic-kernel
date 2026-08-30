import fs from 'node:fs/promises';
import { analyzeMetaLearningEpisodes } from '../../src/core/meta-learning.js';
import { auditDerivationIndependence } from './derivation-independence.js';

const historical = JSON.parse(await fs.readFile('methodology/meta-learning/episodes-v2.json', 'utf8'));
const prospective = JSON.parse(await fs.readFile('methodology/meta-learning/prospective-episodes-v1.json', 'utf8'));
const origin = JSON.parse(await fs.readFile('methodology/meta-learning/origin-episodes-v1.json', 'utf8'));
const overlay = JSON.parse(await fs.readFile('methodology/meta-learning/derivation-families-v1.json', 'utf8'));

const episodes = [...historical.episodes, ...prospective.episodes, ...origin.episodes]
  .map((episode) => ({ ...episode, derivationFamily: overlay.families[episode.id] ?? null }));

const raw = analyzeMetaLearningEpisodes(episodes);
const independence = auditDerivationIndependence(episodes);
const independenceByMechanism = new Map(independence.map((row) => [row.mechanism, row]));

const currentEligible = raw.candidateRules.filter((rule) => rule.eligibleForProspectiveTest);
const eligibilityAudit = currentEligible.map((rule) => {
  const lineage = independenceByMechanism.get(rule.mechanism) ?? null;
  return {
    mechanism: rule.mechanism,
    rawEligible: true,
    explicitIndependentDerivationCount: lineage?.explicitIndependentDerivationCount ?? 0,
    unresolvedDerivationEpisodeIds: lineage?.unresolvedDerivationEpisodeIds ?? [],
    wouldLoseEligibilityUnderTwoFamilyMinimum: (lineage?.explicitIndependentDerivationCount ?? 0) < 2,
  };
});

const decisionChanged = eligibilityAudit.some((row) => row.wouldLoseEligibilityUnderTwoFamilyMinimum);
const report = {
  schemaVersion: 1,
  epistemicStatus: 'curated_real_history_ancestry_audit_not_independence_proof',
  overlayBoundary: overlay.boundary,
  rawEligibleMechanisms: currentEligible.map((rule) => rule.mechanism),
  eligibilityAudit,
  decisionChanged,
  candidateDisposition: decisionChanged
    ? 'KEEP_CANDIDATE_FOR_REAL_META_LEARNER_INTERVENTION_TEST'
    : 'NO_CURRENT_ALLOCATION_GAIN_KEEP_COLD_OR_COMPOST',
  interpretation: decisionChanged
    ? 'At least one current prospective-test allocation depends on raw recurrence that lacks two explicit derivation families. The candidate has a decision consequence worth a bounded intervention test.'
    : 'All currently eligible prospective-test mechanisms already have at least two explicit derivation families under this defended overlay. The new bookkeeping does not change current allocation and should not enter the hot canonical method merely for conceptual neatness.',
};

await fs.mkdir('reports', { recursive: true });
await fs.writeFile('reports/meta-learning-derivation-audit-latest.json', `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify(report, null, 2));
