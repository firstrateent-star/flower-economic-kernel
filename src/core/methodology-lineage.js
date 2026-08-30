import { FLOWER_METHODOLOGY_VERSION } from './methodology-core.js';

const ARTIFACT_COLLECTIONS = ['opportunities', 'experiments', 'fruits'];

export function captureMethodologyArtifactIds(garden = {}) {
  return Object.fromEntries(ARTIFACT_COLLECTIONS.map((key) => [
    key,
    new Set((garden[key] ?? []).map((item) => item?.id).filter(Boolean)),
  ]));
}

export function stampNewMethodologyArtifactOrigins(garden = {}, before = {}, methodologyVersion = FLOWER_METHODOLOGY_VERSION) {
  const stamped = [];
  for (const key of ARTIFACT_COLLECTIONS) {
    const previousIds = before[key] instanceof Set ? before[key] : new Set(before[key] ?? []);
    for (const item of garden[key] ?? []) {
      if (!item?.id || previousIds.has(item.id) || item.originMethodologyVersion) continue;
      item.originMethodologyVersion = methodologyVersion;
      stamped.push({ collection: key, id: item.id, originMethodologyVersion: methodologyVersion });
    }
  }
  return stamped;
}

export function resolveMethodologyArtifactOrigin(garden = {}, targetId = null) {
  if (!targetId) return null;
  for (const key of ARTIFACT_COLLECTIONS) {
    const item = (garden[key] ?? []).find((candidate) => candidate?.id === targetId);
    if (item) {
      return {
        collection: key,
        id: targetId,
        originMethodologyVersion: item.originMethodologyVersion ?? null,
      };
    }
  }
  return null;
}
