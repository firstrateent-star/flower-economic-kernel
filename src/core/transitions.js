import { id, nowIso } from './utils.js';
import { FLOWER_METHODOLOGY_VERSION } from './methodology-core.js';
import { resolveMethodologyArtifactOrigin } from './methodology-lineage.js';

const STATUS_RANK = {
  seed: 0,
  supported: 1,
  validated: 2,
  fruit: 3,
};

export function validateStatusPromotion(before, after, evidenceDelta = []) {
  const b = STATUS_RANK[before];
  const a = STATUS_RANK[after];
  if (b === undefined || a === undefined || a <= b) return { ok: true };
  if (!Array.isArray(evidenceDelta) || evidenceDelta.length === 0) {
    return { ok: false, reason: `Epistemic promotion ${before} -> ${after} requires accountable evidence.` };
  }
  return { ok: true };
}

export function addTrace(garden, trace) {
  const targetId = trace?.pressure?.targetId ?? trace?.targetId ?? null;
  const targetOrigin = resolveMethodologyArtifactOrigin(garden, targetId);
  garden.traces.push({
    id: id('trace'),
    at: nowIso(),
    ...trace,
    methodologyVersion: FLOWER_METHODOLOGY_VERSION,
    targetOriginMethodologyVersion: targetOrigin?.originMethodologyVersion ?? null,
  });
}
