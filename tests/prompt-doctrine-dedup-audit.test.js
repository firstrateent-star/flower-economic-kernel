import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { auditDoctrineDuplication } from '../research/methodology/prompt-doctrine-dedup-audit.js';

test('current Flower reasoner contains duplicated doctrine across methodology and prompt layers', () => {
  const methodologySource = fs.readFileSync('src/core/methodology-core.js', 'utf8');
  const reasonerSource = fs.readFileSync('src/reasoners/openai.js', 'utf8');
  const result = auditDoctrineDuplication({ methodologySource, reasonerSource });

  assert.ok(result.duplicatedConceptCount >= 3);
  assert.equal(result.recommendation, 'paired_replay_dedup_candidate');
  assert.equal(result.runtimeAuthority, false);
  assert.equal(result.canonicalPromotionAuthorized, false);
});

test('duplication signal disappears when reasoner doctrine is absent', () => {
  const result = auditDoctrineDuplication({
    methodologySource: 'Evidence outranks elegance. Human attention is scarce capital.',
    reasonerSource: 'Return strict JSON for the requested operation.',
  });
  assert.equal(result.duplicatedConceptCount, 0);
  assert.equal(result.recommendation, 'insufficient_duplication_signal');
});
