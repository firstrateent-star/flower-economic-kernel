import test from 'node:test';
import assert from 'node:assert/strict';
import {
  compareMethodologiesInShadow,
  validateHistoricalSnapshot,
} from '../src/core/methodology-shadow.js';

function snapshot() {
  return {
    asOf: '2026-08-29T12:00:00.000Z',
    garden: {
      status: { lastPressure: null },
      opportunities: [{ id: 'opp_a', status: 'supported' }],
      experiments: [],
      fruits: [],
    },
    evidence: [
      { id: 'ev_1', observedAt: '2026-08-29T11:00:00.000Z', claim: 'Known before cutoff.' },
    ],
  };
}

test('historical snapshot rejects evidence from after its cutoff', () => {
  const value = snapshot();
  value.evidence.push({ id: 'future', observedAt: '2026-08-29T13:00:00.000Z' });
  assert.throws(() => validateHistoricalSnapshot(value), /after cutoff/i);
});

test('shadow comparison preserves source snapshot and exposes candidate decision delta', async () => {
  const value = snapshot();
  const before = JSON.stringify(value);
  const result = await compareMethodologiesInShadow({
    snapshot: value,
    canonicalEvaluator: async () => ({ action: 'FALSIFY', targetId: 'opp_a', rationale: 'Test first.' }),
    candidateEvaluator: async () => ({ action: 'EXPERIMENT', targetId: 'opp_a', rationale: 'Evidence already earns bounded probe.' }),
  });

  assert.equal(JSON.stringify(value), before);
  assert.equal(result.liveStateMutated, false);
  assert.equal(result.authorityExecuted, false);
  assert.equal(result.changedAction, true);
  assert.equal(result.changedTarget, false);
  assert.equal(result.sameDecision, false);
});

test('shadow evaluators receive frozen clones rather than writable live state', async () => {
  const value = snapshot();
  await assert.rejects(
    compareMethodologiesInShadow({
      snapshot: value,
      canonicalEvaluator: async (input) => {
        input.garden.opportunities[0].status = 'fruit';
        return { action: 'STILLNESS' };
      },
      candidateEvaluator: async () => ({ action: 'STILLNESS' }),
    }),
    /read only|Cannot assign|object is not extensible|read-only/i,
  );
  assert.equal(value.garden.opportunities[0].status, 'supported');
});

test('shadow evaluator cannot cross publication, spend, or legal authority', async () => {
  const value = snapshot();
  await assert.rejects(
    compareMethodologiesInShadow({
      snapshot: value,
      canonicalEvaluator: async () => ({ action: 'STILLNESS' }),
      candidateEvaluator: async () => ({ action: 'publish', targetId: 'fruit_x' }),
    }),
    /forbidden authority action/i,
  );

  await assert.rejects(
    compareMethodologiesInShadow({
      snapshot: value,
      canonicalEvaluator: async () => ({ action: 'STILLNESS' }),
      candidateEvaluator: async () => ({ action: 'observe', metadata: { externalWrite: true } }),
    }),
    /side-effectful authority metadata/i,
  );
});

test('identical decisions are recognized without manufacturing a difference', async () => {
  const value = snapshot();
  const evaluator = async () => ({ action: 'HUMAN', targetId: 'fruit_changed_method_navigator', rationale: 'Sovereignty boundary.' });
  const result = await compareMethodologiesInShadow({
    snapshot: value,
    canonicalEvaluator: evaluator,
    candidateEvaluator: evaluator,
  });
  assert.equal(result.sameDecision, true);
  assert.equal(result.changedAction, false);
  assert.equal(result.changedTarget, false);
});
