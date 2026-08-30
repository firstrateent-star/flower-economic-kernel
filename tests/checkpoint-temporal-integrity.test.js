import test from 'node:test';
import assert from 'node:assert/strict';
import { validateCheckpointTemporalIntegrity } from '../src/core/checkpoint-temporal-integrity.js';

test('prospective checkpoint passes when all included timestamps are at or before capture', () => {
  const result = validateCheckpointTemporalIntegrity({
    capturedAt: '2026-08-30T14:17:00-04:00',
    garden: {
      updatedAt: '2026-08-30T14:16:59-04:00',
      events: [{ at: '2026-08-30T14:10:00-04:00' }],
    },
    dependencies: [{ evidenceObservedAt: '2026-08-30T14:00:00-04:00' }],
  });
  assert.equal(result.pass, true);
  assert.equal(result.futureValues.length, 0);
});

test('checkpoint fails rather than backdating when included state is from the future', () => {
  const result = validateCheckpointTemporalIntegrity({
    capturedAt: '2026-08-30T14:17:00-04:00',
    garden: {
      updatedAt: '2026-08-30T14:42:00-04:00',
      events: [{ at: '2026-08-30T14:36:00-04:00' }],
    },
  });
  assert.equal(result.pass, false);
  assert.equal(result.futureValues.length, 2);
  assert.match(result.reason, /hindsight-contaminated/i);
});

test('invalid capture timestamp is rejected explicitly', () => {
  const result = validateCheckpointTemporalIntegrity({ capturedAt: 'not-a-time', garden: {} });
  assert.equal(result.pass, false);
  assert.match(result.reason, /capturedAt/i);
});
