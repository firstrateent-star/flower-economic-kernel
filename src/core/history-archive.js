import { createHash } from 'node:crypto';

function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.keys(value).sort().map((key) => [key, stable(value[key])]));
  }
  return value;
}

function sha256(value) {
  return createHash('sha256').update(JSON.stringify(stable(value))).digest('hex');
}

export function planTraceArchive(garden, {
  maxActiveTraces = 256,
  retainActiveTraces = 128,
  previousArchiveHash = null,
} = {}) {
  if (!garden) throw new Error('planTraceArchive requires a Garden.');
  if (!Number.isInteger(maxActiveTraces) || maxActiveTraces < 1) {
    throw new Error('maxActiveTraces must be a positive integer.');
  }
  if (!Number.isInteger(retainActiveTraces) || retainActiveTraces < 1 || retainActiveTraces >= maxActiveTraces) {
    throw new Error('retainActiveTraces must be a positive integer below maxActiveTraces.');
  }

  const traces = garden.traces ?? [];
  if (traces.length <= maxActiveTraces) {
    return {
      needed: false,
      archiveBlock: null,
      archivedCount: 0,
      retainedCount: traces.length,
      nextActiveTraces: traces,
    };
  }

  // Hysteresis: crossing the high-water mark compacts down to a lower hot-memory
  // target. This prevents one tiny archive block per new trace after the threshold.
  const archived = traces.slice(0, traces.length - retainActiveTraces);
  const retained = traces.slice(-retainActiveTraces);
  const payload = {
    version: 1,
    gardenId: garden.id ?? null,
    previousArchiveHash,
    traceCount: archived.length,
    firstTraceId: archived[0]?.id ?? null,
    lastTraceId: archived.at(-1)?.id ?? null,
    traces: archived,
  };
  const blockHash = sha256(payload);

  return {
    needed: true,
    archiveBlock: {
      ...payload,
      blockHash,
    },
    archivedCount: archived.length,
    retainedCount: retained.length,
    nextActiveTraces: retained,
  };
}

export function commitTraceArchivePlan(garden, plan) {
  if (!plan?.needed) return { changed: false, archivedCount: 0 };
  if (!plan.archiveBlock?.blockHash) throw new Error('Archive plan is missing blockHash.');

  garden.traces = plan.nextActiveTraces;
  garden.historyArchive ??= {};
  garden.historyArchive.traceBlocks ??= [];
  garden.historyArchive.traceBlocks.push({
    blockHash: plan.archiveBlock.blockHash,
    previousArchiveHash: plan.archiveBlock.previousArchiveHash ?? null,
    traceCount: plan.archiveBlock.traceCount,
    firstTraceId: plan.archiveBlock.firstTraceId,
    lastTraceId: plan.archiveBlock.lastTraceId,
  });
  garden.historyArchive.latestTraceBlockHash = plan.archiveBlock.blockHash;
  garden.historyArchive.archivedTraceCount = Number(garden.historyArchive.archivedTraceCount ?? 0) + plan.archivedCount;

  return {
    changed: true,
    archivedCount: plan.archivedCount,
    blockHash: plan.archiveBlock.blockHash,
  };
}

export async function archiveTraceHistory(garden, {
  maxActiveTraces = 256,
  retainActiveTraces = 128,
  persistBlock,
} = {}) {
  if (typeof persistBlock !== 'function') {
    throw new Error('archiveTraceHistory requires persistBlock(block).');
  }

  const previousArchiveHash = garden.historyArchive?.latestTraceBlockHash ?? null;
  const plan = planTraceArchive(garden, {
    maxActiveTraces,
    retainActiveTraces,
    previousArchiveHash,
  });
  if (!plan.needed) return { changed: false, archivedCount: 0, blockHash: null };

  // Transaction boundary: no active-state mutation happens until the external archive
  // sink has durably accepted the complete content-addressed block.
  await persistBlock(plan.archiveBlock);
  return commitTraceArchivePlan(garden, plan);
}

export function verifyTraceArchiveChain(blocks = []) {
  let previous = null;
  for (const block of blocks) {
    const { blockHash, ...payload } = block;
    if (payload.previousArchiveHash !== previous) {
      return { ok: false, reason: 'archive_chain_link_mismatch', blockHash: blockHash ?? null };
    }
    const expected = sha256(payload);
    if (expected !== blockHash) {
      return { ok: false, reason: 'archive_block_hash_mismatch', blockHash: blockHash ?? null };
    }
    previous = blockHash;
  }
  return { ok: true, latestBlockHash: previous };
}
