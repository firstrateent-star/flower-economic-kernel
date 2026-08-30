function getPath(value, path) {
  return String(path)
    .split('.')
    .reduce((current, key) => (current == null ? undefined : current[key]), value);
}

function comparable(value) {
  if (value === undefined || value === null || value === '') return null;
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

function sameCoordinate(a, b, path) {
  const av = comparable(getPath(a, path));
  const bv = comparable(getPath(b, path));
  return av !== null && bv !== null && av === bv;
}

/**
 * Build a local chart around targetId using explicitly named state dimensions.
 * A center is adjacent when it matches the target on at least one active dimension.
 *
 * This is a diagnostic abstraction, not the runtime neighborhood implementation.
 */
export function neighborhoodByDimensions(centers = [], targetId, dimensions = []) {
  const target = centers.find((center) => center?.id === targetId) ?? null;
  if (!target) return { ids: targetId ? [targetId] : [], target: null, dimensions: [...dimensions] };

  const ids = new Set([targetId]);
  for (const center of centers) {
    if (!center?.id || center.id === targetId) continue;
    if (dimensions.some((dimension) => sameCoordinate(target, center, dimension))) ids.add(center.id);
  }

  return { ids: [...ids], target, dimensions: [...dimensions] };
}

/**
 * Compare an implemented/indexed projection against dimensions that an operation is
 * hypothesized to require. The audit deliberately does not infer operation semantics;
 * callers must name them so missing causal assumptions remain visible.
 */
export function auditActivationProjection({
  centers = [],
  targetId,
  indexedDimensions = [],
  requiredDimensions = [],
} = {}) {
  const indexed = neighborhoodByDimensions(centers, targetId, indexedDimensions);
  const required = neighborhoodByDimensions(centers, targetId, requiredDimensions);
  const indexedSet = new Set(indexed.ids);
  const requiredSet = new Set(required.ids);

  const missingRequiredIds = required.ids.filter((id) => !indexedSet.has(id));
  const extraIndexedIds = indexed.ids.filter((id) => !requiredSet.has(id));
  const missingRequiredDimensions = requiredDimensions.filter(
    (dimension) => !indexedDimensions.includes(dimension),
  );

  return {
    targetId: targetId ?? null,
    indexedDimensions: [...indexedDimensions],
    requiredDimensions: [...requiredDimensions],
    indexedIds: indexed.ids,
    requiredIds: required.ids,
    missingRequiredIds,
    extraIndexedIds,
    missingRequiredDimensions,
    dependencyComplete: missingRequiredIds.length === 0,
    minimalForDeclaredDependencies: extraIndexedIds.length === 0,
    epistemicNote:
      'A projection can be computationally sparse while omitting a decision-relevant dimension. Required dimensions are hypotheses until operation-specific decision equivalence is tested.',
  };
}

export function flowerGeometryProjectionAudit(geometry, targetId, requiredDimensions = []) {
  return auditActivationProjection({
    centers: geometry?.centers ?? [],
    targetId,
    indexedDimensions: ['archetypeFamily', 'capabilityFamily'],
    requiredDimensions,
  });
}
