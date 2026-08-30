import crypto from 'node:crypto';

const FORBIDDEN_ACTION_KINDS = new Set([
  'spend',
  'publish',
  'public_release',
  'accept_agreement',
  'legal_acceptance',
  'identity_change',
  'contract',
  'financial_commitment',
]);

function stableHash(value) {
  return crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex');
}

function deepFreeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  Object.freeze(value);
  for (const child of Object.values(value)) deepFreeze(child);
  return value;
}

function normalizeDecision(result = {}) {
  const action = result.action ?? result.pressure ?? result.decision ?? null;
  const actionKind = typeof action === 'string'
    ? action.toLowerCase()
    : String(action?.type ?? action?.kind ?? '').toLowerCase();
  return {
    action,
    actionKind,
    targetId: result.targetId ?? action?.targetId ?? null,
    rationale: result.rationale ?? result.reason ?? result.summary ?? null,
    evidenceIds: Array.isArray(result.evidenceIds) ? [...result.evidenceIds].sort() : [],
    metadata: result.metadata ?? null,
  };
}

function assertShadowSafe(decision, label) {
  if (FORBIDDEN_ACTION_KINDS.has(decision.actionKind)) {
    throw new Error(`${label} shadow evaluator attempted forbidden authority action: ${decision.actionKind}`);
  }
  const metadata = decision.metadata ?? {};
  if (metadata.authorize === true || metadata.execute === true || metadata.persist === true || metadata.externalWrite === true) {
    throw new Error(`${label} shadow evaluator attempted side-effectful authority metadata.`);
  }
}

function sameSet(a = [], b = []) {
  if (a.length !== b.length) return false;
  return a.every((value, index) => value === b[index]);
}

export function classifyDecisionDelta({ canonicalDecision, candidateDecision } = {}) {
  if (!canonicalDecision || !candidateDecision) {
    throw new Error('Decision delta classification requires canonical and candidate decisions.');
  }

  const changedAction = canonicalDecision.actionKind !== candidateDecision.actionKind;
  const changedTarget = canonicalDecision.targetId !== candidateDecision.targetId;
  const changedEvidenceUse = !sameSet(canonicalDecision.evidenceIds ?? [], candidateDecision.evidenceIds ?? []);
  const discriminating = changedAction || changedTarget || changedEvidenceUse;

  return {
    discriminating,
    disposition: discriminating ? 'OUTCOME_COMPARISON_ELIGIBLE' : 'NO_DISCRIMINATING_REPLAY',
    changedAction,
    changedTarget,
    changedEvidenceUse,
    affectedDimensions: [
      ...(changedAction ? ['action'] : []),
      ...(changedTarget ? ['target'] : []),
      ...(changedEvidenceUse ? ['evidence_use'] : []),
    ],
  };
}

export function validateHistoricalSnapshot(snapshot = {}) {
  if (!snapshot || typeof snapshot !== 'object') throw new Error('Historical shadow snapshot must be an object.');
  if (!snapshot.asOf) throw new Error('Historical shadow snapshot requires an explicit asOf cutoff.');
  if (!snapshot.garden || typeof snapshot.garden !== 'object') throw new Error('Historical shadow snapshot requires a frozen Garden payload.');

  const cutoff = Date.parse(snapshot.asOf);
  if (!Number.isFinite(cutoff)) throw new Error('Historical shadow snapshot asOf must be a valid timestamp.');

  for (const item of snapshot.evidence ?? []) {
    const observedAt = item?.observedAt ?? item?.at ?? item?.createdAt ?? null;
    if (!observedAt) continue;
    const observedMs = Date.parse(observedAt);
    if (Number.isFinite(observedMs) && observedMs > cutoff) {
      throw new Error(`Historical snapshot contains evidence observed after cutoff: ${item.id ?? item.url ?? 'unknown evidence'}`);
    }
  }

  return true;
}

export async function compareMethodologiesInShadow({
  snapshot,
  canonicalEvaluator,
  candidateEvaluator,
}) {
  validateHistoricalSnapshot(snapshot);
  if (typeof canonicalEvaluator !== 'function' || typeof candidateEvaluator !== 'function') {
    throw new Error('Shadow comparison requires canonicalEvaluator and candidateEvaluator functions.');
  }

  const sourceHashBefore = stableHash(snapshot);
  const canonicalInput = deepFreeze(structuredClone(snapshot));
  const candidateInput = deepFreeze(structuredClone(snapshot));

  const canonicalRaw = await canonicalEvaluator(canonicalInput);
  const candidateRaw = await candidateEvaluator(candidateInput);

  const canonicalDecision = normalizeDecision(canonicalRaw);
  const candidateDecision = normalizeDecision(candidateRaw);
  assertShadowSafe(canonicalDecision, 'Canonical');
  assertShadowSafe(candidateDecision, 'Candidate');

  const sourceHashAfter = stableHash(snapshot);
  if (sourceHashAfter !== sourceHashBefore) {
    throw new Error('Shadow comparison mutated the source snapshot.');
  }

  const exactSameDecision = stableHash(canonicalDecision) === stableHash(candidateDecision);
  const decisionDelta = classifyDecisionDelta({ canonicalDecision, candidateDecision });

  return {
    asOf: snapshot.asOf,
    snapshotHash: sourceHashBefore,
    canonicalDecision,
    candidateDecision,
    sameDecision: exactSameDecision,
    decisionDelta,
    changedAction: decisionDelta.changedAction,
    changedTarget: decisionDelta.changedTarget,
    changedEvidenceUse: decisionDelta.changedEvidenceUse,
    outcomeComparisonEligible: decisionDelta.discriminating,
    authorityExecuted: false,
    liveStateMutated: false,
  };
}
