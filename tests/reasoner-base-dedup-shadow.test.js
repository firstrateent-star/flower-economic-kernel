import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { assessReasonerBaseDedup, MINIMAL_REASONER_BASE } from '../research/methodology/reasoner-base-dedup-shadow.js';

function currentBaseFromSource() {
  const source = fs.readFileSync('src/reasoners/openai.js', 'utf8');
  const match = source.match(/const instructions = `([\s\S]*?)`;/);
  assert.ok(match, 'current reasoner base instructions must be discoverable');
  return match[1];
}

test('minimal base is materially smaller while projected methodology retains required doctrine', () => {
  const currentBase = currentBaseFromSource();
  for (const operation of ['EXPAND', 'SELECT', 'FALSIFY', 'INTEGRATE', 'TRANSFER', 'IMPROVE']) {
    const result = assessReasonerBaseDedup({ operation, currentBase });
    assert.equal(result.allRequiredConceptsCovered, true, operation);
    assert.equal(result.originLineageCovered, true, operation);
    assert.ok(result.candidateBaseBytes < result.currentBaseBytes, operation);
    assert.ok(result.baseBytesSaved > 0, operation);
    assert.equal(result.runtimeAuthority, false);
    assert.equal(result.decisionEquivalenceVerified, false);
  }
});

test('minimal base retains only role, authority boundary, methodology delegation, and output contract', () => {
  assert.match(MINIMAL_REASONER_BASE, /cognition substrate/i);
  assert.match(MINIMAL_REASONER_BASE, /methodology projection governs/i);
  assert.match(MINIMAL_REASONER_BASE, /Do not decide human values/i);
  assert.match(MINIMAL_REASONER_BASE, /Return only output valid/i);
  assert.doesNotMatch(MINIMAL_REASONER_BASE, /regenerative-value loop/i);
  assert.doesNotMatch(MINIMAL_REASONER_BASE, /Passivity and autonomy/i);
  assert.doesNotMatch(MINIMAL_REASONER_BASE, /Sacred-geometry language/i);
});

test('static coverage cannot self-authorize runtime deduplication', () => {
  const result = assessReasonerBaseDedup({ operation: 'SELECT', currentBase: currentBaseFromSource() });
  assert.equal(result.recommendation, 'paired_replay_base_dedup_candidate');
  assert.equal(result.decisionEquivalenceVerified, false);
  assert.equal(result.runtimeAuthority, false);
});
