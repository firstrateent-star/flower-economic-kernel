import test from 'node:test';
import assert from 'node:assert/strict';
import seed from '../garden/seed.json' with { type: 'json' };
import { authorizeAction } from '../src/core/autonomy.js';

test('allows observation', () => {
  assert.equal(authorizeAction(seed, { type: 'web_search' }).allowed, true);
});

test('blocks public deployment pending approval', () => {
  const r = authorizeAction(seed, { type: 'public_deploy' });
  assert.equal(r.allowed, false);
  assert.equal(r.requiresApproval, true);
});

test('blocks recurring obligations', () => {
  const r = authorizeAction(seed, { type: 'spend', amountUsd: 1, recurringUsd: 1 });
  assert.equal(r.allowed, false);
  assert.equal(r.requiresApproval, true);
});

test('allows bounded one-time experiment spend', () => {
  const r = authorizeAction(seed, { type: 'spend', amountUsd: 3, recurringUsd: 0 });
  assert.equal(r.allowed, true);
});
