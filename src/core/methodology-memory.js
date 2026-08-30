import crypto from 'node:crypto';
import { assessMethodologyMutation } from './methodology-mutations.js';
import { FLOWER_METHODOLOGY_VERSION } from './methodology-core.js';

function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.keys(value).sort().map((key) => [key, stable(value[key])]));
  }
  return value;
}

function digest(value) {
  return crypto.createHash('sha256').update(JSON.stringify(stable(value))).digest('hex');
}

export function methodologyProposalFingerprint(proposal = {}) {
  const semanticProposal = {
    thesis: proposal.thesis ?? null,
    changeType: proposal.changeType ?? null,
    domains: [...(proposal.domains ?? [])].sort(),
    affectedDecisions: [...(proposal.affectedDecisions ?? [])].sort(),
    causalInputs: [...(proposal.causalInputs ?? [])].sort(),
    preservedComplexity: [...(proposal.preservedComplexity ?? [])].sort(),
    falsifier: proposal.falsifier ?? null,
    rollback: proposal.rollback ?? null,
    stoppingCondition: proposal.stoppingCondition ?? null,
  };
  return digest(semanticProposal);
}

export function methodologyEvidenceFingerprint(evidence = {}) {
  return digest(evidence);
}

export function createMethodologyMutationRecord({ proposal, evidence = {}, previousRecordHash = null, observedAt = null } = {}) {
  const assessment = assessMethodologyMutation(proposal, evidence);
  const recordBody = {
    schemaVersion: 1,
    methodologyVersion: FLOWER_METHODOLOGY_VERSION,
    proposalId: proposal?.id ?? null,
    proposalFingerprint: methodologyProposalFingerprint(proposal),
    evidenceFingerprint: methodologyEvidenceFingerprint(evidence),
    assessment,
    proposal: stable(proposal ?? {}),
    evidence: stable(evidence ?? {}),
    observedAt,
    previousRecordHash,
  };
  return { ...recordBody, recordHash: digest(recordBody) };
}

export function verifyMethodologyMutationChain(records = []) {
  let previous = null;
  for (const record of records) {
    const { recordHash, ...body } = record;
    if (body.previousRecordHash !== previous) return { ok: false, reason: 'previous_record_hash_mismatch' };
    if (digest(body) !== recordHash) return { ok: false, reason: 'record_hash_mismatch' };
    previous = recordHash;
  }
  return { ok: true, latestRecordHash: previous };
}

export function methodologyMutationReuseDecision({ proposal, evidence = {}, priorRecords = [] } = {}) {
  const proposalFingerprint = methodologyProposalFingerprint(proposal);
  const evidenceFingerprint = methodologyEvidenceFingerprint(evidence);
  const matches = priorRecords.filter((record) => record.proposalFingerprint === proposalFingerprint);
  if (matches.length === 0) {
    return { action: 'evaluate', reason: 'novel_semantic_proposal', priorRecord: null };
  }

  const latest = matches.at(-1);
  if (latest.evidenceFingerprint === evidenceFingerprint) {
    return {
      action: 'reuse_prior_assessment',
      reason: 'same_proposal_same_evidence',
      priorRecord: latest,
    };
  }

  return {
    action: 'reevaluate',
    reason: 'same_proposal_new_evidence',
    priorRecord: latest,
  };
}
