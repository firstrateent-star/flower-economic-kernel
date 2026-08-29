import test from 'node:test';
import assert from 'node:assert/strict';
import { validateStatusPromotion } from '../src/core/transitions.js';

test('rejects epistemic promotion without evidence', () => {
  const r = validateStatusPromotion('seed', 'supported', []);
  assert.equal(r.ok, false);
});

test('allows epistemic promotion with accountable evidence', () => {
  const r = validateStatusPromotion('seed', 'supported', ['external evidence']);
  assert.equal(r.ok, true);
});
