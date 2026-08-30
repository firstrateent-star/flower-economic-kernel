import test from 'node:test';
import assert from 'node:assert/strict';
import seed from './fixtures/test-seed.js';
import {
  createDecisionCheckpoint,
  persistDecisionCheckpoint,
  shouldCaptureDecisionCheckpoint,
  verifyDecisionCheckpoint,
} from '../src/core/decision-checkpoints.js';

const FIXED_CAPTURE = '2026-08-30T18:30:00.000Z';
const fixedClock = () => FIXED_CAPTURE;

test('checkpoint capture is sparse: HUMAN and costly frontiers qualify, ordinary free integration does not', () => {
  assert.equal(shouldCaptureDecisionCheckpoint({ pressure: { type: 'HUMAN' }, costClass: 'free' }), true);
  assert.equal(shouldCaptureDecisionCheckpoint({ pressure: { type: 'FALSIFY' }, costClass: 'reasoner' }), true);
  assert.equal(shouldCaptureDecisionCheckpoint({ pressure: { type: 'INTEGRATE' }, costClass: 'free' }), false);
  assert.equal(shouldCaptureDecisionCheckpoint({ pressure: { type: 'STILLNESS' }, costClass: 'free' }), false);
});

test('decision checkpoint is content-addressed, reproducible, and does not mutate the source Garden', () => {
  const garden = structuredClone(seed);
  const before = JSON.stringify(garden);
  const input = {
    garden,
    pressure: { type: 'HUMAN', targetId: 'fruit_changed_method_navigator', why: 'Sovereignty boundary.' },
    costClass: 'free',
    asOf: '2026-08-30T18:29:00.000Z',
    reason: 'Before a human publication/legal boundary.',
    clock: fixedClock,
  };
  const a = createDecisionCheckpoint(input);
  const b = createDecisionCheckpoint(input);
  assert.equal(a.checkpointHash, b.checkpointHash);
  assert.equal(a.snapshotHash, b.snapshotHash);
  assert.equal(a.id, b.id);
  assert.equal(a.capturedAt, FIXED_CAPTURE);
  assert.equal(a.captureClock, 'runtime_wall_clock');
  assert.equal(JSON.stringify(garden), before);
  assert.equal(verifyDecisionCheckpoint(a).ok, true);
});

test('checkpoint refuses an evidence cutoff later than its trusted capture clock', () => {
  assert.throws(() => createDecisionCheckpoint({
    garden: structuredClone(seed),
    pressure: { type: 'HUMAN', targetId: 'fruit_changed_method_navigator' },
    asOf: '2026-08-30T18:31:00.000Z',
    clock: fixedClock,
  }), /asOf cannot be later than trusted capturedAt/);
});

test('omitted asOf defaults to trusted capturedAt rather than caller-authored chronology', () => {
  const checkpoint = createDecisionCheckpoint({
    garden: structuredClone(seed),
    pressure: { type: 'HUMAN', targetId: 'fruit_changed_method_navigator' },
    clock: fixedClock,
  });
  assert.equal(checkpoint.asOf, FIXED_CAPTURE);
  assert.equal(checkpoint.capturedAt, FIXED_CAPTURE);
});

test('tampering with a checkpoint snapshot is detected', () => {
  const checkpoint = createDecisionCheckpoint({
    garden: structuredClone(seed),
    pressure: { type: 'BUILD_PLAN', targetId: seed.opportunities[0].id },
    costClass: 'reasoner',
    asOf: '2026-08-30T18:29:00.000Z',
    clock: fixedClock,
  });
  checkpoint.snapshot.status.pulseCount = 999;
  assert.deepEqual(verifyDecisionCheckpoint(checkpoint), { ok: false, reason: 'snapshot_hash_mismatch' });
});

test('persistence is cold-storage-first and checkpoint itself remains outside the Garden', async () => {
  const garden = structuredClone(seed);
  const before = JSON.stringify(garden);
  const checkpoint = createDecisionCheckpoint({
    garden,
    pressure: { type: 'HUMAN', targetId: 'fruit_changed_method_navigator' },
    asOf: '2026-08-30T18:29:00.000Z',
    clock: fixedClock,
  });
  const saved = new Map();
  const result = await persistDecisionCheckpoint({
    checkpoint,
    sink: async (value) => saved.set(value.checkpointHash, structuredClone(value)),
  });
  assert.equal(result.persisted, true);
  assert.equal(saved.size, 1);
  assert.equal(JSON.stringify(garden), before);
  assert.equal(garden.decisionCheckpoints, undefined);
});

test('identical checkpoint persistence can deduplicate by content hash at the sink', async () => {
  const checkpoint = createDecisionCheckpoint({
    garden: structuredClone(seed),
    pressure: { type: 'HUMAN', targetId: 'fruit_changed_method_navigator' },
    asOf: '2026-08-30T18:29:00.000Z',
    clock: fixedClock,
  });
  const saved = new Map();
  const sink = async (value) => saved.set(value.checkpointHash, structuredClone(value));
  await persistDecisionCheckpoint({ checkpoint, sink });
  await persistDecisionCheckpoint({ checkpoint, sink });
  assert.equal(saved.size, 1);
});
