function positiveInteger(value, name) {
  const n = Number(value);
  if (!Number.isInteger(n) || n < 1) throw new Error(`${name} must be a positive integer.`);
  return n;
}

export function averageSuccessfulLinearLookupTouches(itemCount) {
  const n = positiveInteger(itemCount, 'itemCount');
  return (n + 1) / 2;
}

export function estimateLinearLookupTouches({ itemCount, queryCount, lookupShape = 'uniform_success' } = {}) {
  const n = positiveInteger(itemCount, 'itemCount');
  const q = positiveInteger(queryCount, 'queryCount');
  const perQuery = lookupShape === 'worst_case_success'
    ? n
    : averageSuccessfulLinearLookupTouches(n);
  if (!['uniform_success', 'worst_case_success'].includes(lookupShape)) {
    throw new Error(`Unsupported lookupShape: ${lookupShape}`);
  }
  return {
    itemCount: n,
    queryCount: q,
    lookupShape,
    touches: perQuery * q,
    perQueryTouches: perQuery,
  };
}

export function estimateIndexedLookupTouches({ itemCount, queryCount, rebuildCount = 1 } = {}) {
  const n = positiveInteger(itemCount, 'itemCount');
  const q = positiveInteger(queryCount, 'queryCount');
  const rebuilds = positiveInteger(rebuildCount, 'rebuildCount');
  if (rebuilds > q) throw new Error('rebuildCount may not exceed queryCount for this model.');
  return {
    itemCount: n,
    queryCount: q,
    rebuildCount: rebuilds,
    touches: n * rebuilds + q,
    buildTouches: n * rebuilds,
    lookupTouches: q,
  };
}

export function assessSemanticIndexTransfer({
  itemCount,
  queryCount,
  rebuildCount = 1,
  lookupShape = 'uniform_success',
  stableStructureWitness = false,
} = {}) {
  const linear = estimateLinearLookupTouches({ itemCount, queryCount, lookupShape });
  const indexed = estimateIndexedLookupTouches({ itemCount, queryCount, rebuildCount });
  const delta = linear.touches - indexed.touches;
  const stableEnoughToClaimAmortization = stableStructureWitness === true && rebuildCount < queryCount;
  const workProxyImproves = delta > 0;
  return {
    linear,
    indexed,
    deltaTouches: delta,
    relativeReduction: linear.touches > 0 ? delta / linear.touches : null,
    stableStructureWitness: stableStructureWitness === true,
    workProxyImproves,
    transferState: workProxyImproves && stableEnoughToClaimAmortization
      ? 'amortized_work_reduction_candidate'
      : workProxyImproves
        ? 'mathematical_gain_without_stability_witness'
        : 'no_work_proxy_gain',
    externalValueVerified: false,
    caveat: 'Record-touch reduction is a deterministic work proxy. It is not physical energy, end-to-end latency, user value, or permission to patch another system.',
  };
}

export function minimumQueriesForAmortizedGain({ itemCount, lookupShape = 'uniform_success' } = {}) {
  const n = positiveInteger(itemCount, 'itemCount');
  for (let q = 1; q <= Math.max(10_000, n * 4); q += 1) {
    const result = assessSemanticIndexTransfer({
      itemCount: n,
      queryCount: q,
      rebuildCount: 1,
      lookupShape,
      stableStructureWitness: true,
    });
    if (result.workProxyImproves) return q;
  }
  return null;
}
