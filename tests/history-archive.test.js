import test from 'node:test';
import assert from 'node:assert/strict';
import seed from './fixtures/test-seed.js';
import {
  planTraceArchive,
  commitTraceArchivePlan,
  archiveTraceHistory,
  verifyTraceArchiveChain,
} from '../src/core/history-archive.js';

function trace(i) {
  return { id: `trace_${String(i).padStart(4, '0')}`, at: `2026-08-30T00:${String(i % 60).padStart(2, '0')}:00.000Z`, kind: 'test', summary: `trace ${i}` };
}

test('archive planning is non-destructive until explicitly committed', () => {
  const garden = structuredClone(seed);
  garden.traces = Array.from({ length: 300 }, (_, i) => trace(i));
  const before = JSON.stringify(garden);

  const plan = planTraceArchive(garden, { maxActiveTraces: 256 });

  assert.equal(plan.needed, true);
  assert.equal(plan.archivedCount, 44);
  assert.equal(plan.retainedCount, 256);
  assert.equal(JSON.stringify(garden), before);
  assert.equal(plan.archiveBlock.traces[0].id, 'trace_0000');
  assert.equal(plan.nextActiveTraces[0].id, 'trace_0044');
});

test('committing a successfully persisted archive plan bounds active traces without deleting provenance metadata', () => {
  const garden = structuredClone(seed);
  garden.traces = Array.from({ length: 300 }, (_, i) => trace(i));
  const plan = planTraceArchive(garden, { maxActiveTraces: 256 });
  const result = commitTraceArchivePlan(garden, plan);

  assert.equal(result.changed, true);
  assert.equal(garden.traces.length, 256);
  assert.equal(garden.historyArchive.archivedTraceCount, 44);
  assert.equal(garden.historyArchive.latestTraceBlockHash, plan.archiveBlock.blockHash);
  assert.equal(garden.historyArchive.traceBlocks.length, 1);
  assert.equal(garden.historyArchive.traceBlocks[0].firstTraceId, 'trace_0000');
  assert.equal(garden.historyArchive.traceBlocks[0].lastTraceId, 'trace_0043');
});

test('transactional archive mutates active state only after the sink accepts the block', async () => {
  const garden = structuredClone(seed);
  garden.traces = Array.from({ length: 300 }, (_, i) => trace(i));
  const before = JSON.stringify(garden);
  let received = null;

  const result = await archiveTraceHistory(garden, {
    maxActiveTraces: 256,
    persistBlock: async (block) => { received = structuredClone(block); },
  });

  assert.ok(received?.blockHash);
  assert.equal(result.changed, true);
  assert.equal(garden.traces.length, 256);
  assert.equal(garden.historyArchive.latestTraceBlockHash, received.blockHash);
  assert.notEqual(JSON.stringify(garden), before);
});

test('failed archive persistence leaves the Garden byte-for-byte unchanged', async () => {
  const garden = structuredClone(seed);
  garden.traces = Array.from({ length: 300 }, (_, i) => trace(i));
  const before = JSON.stringify(garden);

  await assert.rejects(
    archiveTraceHistory(garden, {
      maxActiveTraces: 256,
      persistBlock: async () => { throw new Error('archive sink unavailable'); },
    }),
    /archive sink unavailable/,
  );

  assert.equal(JSON.stringify(garden), before);
});

test('hash-linked archive blocks verify as an append-only provenance chain', () => {
  const garden = structuredClone(seed);
  garden.traces = Array.from({ length: 300 }, (_, i) => trace(i));
  const first = planTraceArchive(garden, { maxActiveTraces: 256 });
  commitTraceArchivePlan(garden, first);

  garden.traces.push(...Array.from({ length: 40 }, (_, i) => trace(300 + i)));
  const second = planTraceArchive(garden, {
    maxActiveTraces: 256,
    previousArchiveHash: garden.historyArchive.latestTraceBlockHash,
  });

  assert.equal(second.archiveBlock.previousArchiveHash, first.archiveBlock.blockHash);
  const chain = [first.archiveBlock, second.archiveBlock];
  assert.equal(verifyTraceArchiveChain(chain).ok, true);

  const tampered = structuredClone(chain);
  tampered[0].traces[0].summary = 'tampered';
  assert.equal(verifyTraceArchiveChain(tampered).ok, false);
});

test('no archive block is produced while active history remains below the bound', () => {
  const garden = structuredClone(seed);
  garden.traces = Array.from({ length: 25 }, (_, i) => trace(i));
  const plan = planTraceArchive(garden, { maxActiveTraces: 256 });
  assert.equal(plan.needed, false);
  assert.equal(plan.archiveBlock, null);
  assert.equal(plan.nextActiveTraces, garden.traces);
});
