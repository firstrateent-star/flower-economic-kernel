import { FLOWER_METHODOLOGY } from '../../src/core/methodology-core.js';
import { projectMethodologyForOperation } from './methodology-projection.js';

export const MINIMAL_REASONER_BASE = [
  'You are the cognition substrate inside Flower Economic Kernel v0.',
  'The supplied Flower methodology projection governs this operation.',
  'Do not decide human values, ownership, identity, publication, legal authority, or permissions.',
  'Return only output valid for the operation schema.',
].join('\n');

const REQUIRED_CONCEPTS = Object.freeze([
  { id: 'evidence_over_enthusiasm', patterns: [/Evidence outranks elegance/i, /external truth/i] },
  { id: 'value_capture_separation', patterns: [/Value creation and value capture are separate ledgers/i, /capture without evidence/i] },
  { id: 'autonomy_downstream', patterns: [/Autonomy is a direction of compression after value is evidenced/i] },
  { id: 'human_attention_burden', patterns: [/Human attention is scarce capital/i] },
  { id: 'return_not_surplus', patterns: [/Gross return is not regenerative surplus/i] },
  { id: 'compression_equivalence', patterns: [/same or better decisions remain possible/i] },
  { id: 'center_nourishment', patterns: [/organism exists to nourish the human Center-holder/i] },
  { id: 'origin_projection_boundary', patterns: [/projection of a richer generative lineage/i, /economic kernel is a local specialization/i] },
]);

function bytes(text) {
  return Buffer.byteLength(String(text ?? ''), 'utf8');
}

function methodologyText(operation) {
  return JSON.stringify(projectMethodologyForOperation(operation, FLOWER_METHODOLOGY).projection);
}

function conceptCovered(text, concept) {
  return concept.patterns.some((pattern) => pattern.test(text));
}

export function assessReasonerBaseDedup({ operation = 'SELECT', currentBase = '' } = {}) {
  const projected = methodologyText(operation);
  const candidateCombined = `${MINIMAL_REASONER_BASE}\n${projected}`;
  const coverage = REQUIRED_CONCEPTS.map((concept) => ({
    id: concept.id,
    coveredByProjectedMethodology: conceptCovered(projected, concept),
    coveredByCandidateCombined: conceptCovered(candidateCombined, concept),
  }));

  const currentBaseBytes = bytes(currentBase);
  const candidateBaseBytes = bytes(MINIMAL_REASONER_BASE);

  return {
    operation,
    currentBaseBytes,
    candidateBaseBytes,
    baseBytesSaved: Math.max(0, currentBaseBytes - candidateBaseBytes),
    baseReductionFraction: currentBaseBytes > 0
      ? Number(((currentBaseBytes - candidateBaseBytes) / currentBaseBytes).toFixed(6))
      : null,
    coverage,
    allRequiredConceptsCovered: coverage.every((row) => row.coveredByCandidateCombined),
    originLineageCovered: coverage.find((row) => row.id === 'origin_projection_boundary')?.coveredByCandidateCombined === true,
    runtimeAuthority: false,
    decisionEquivalenceVerified: false,
    recommendation: coverage.every((row) => row.coveredByCandidateCombined)
      ? 'paired_replay_base_dedup_candidate'
      : 'retain_current_base_until_coverage_gap_resolved',
    epistemicBoundary:
      'Static doctrine coverage plus byte reduction does not prove equivalent model behavior. The minimal base may only replace live duplicated wording after same-workload paired reasoner replay preserves decision, evidence use, authority boundaries, stop behavior, and origin lineage.',
  };
}

export function requiredReasonerBaseConcepts() {
  return REQUIRED_CONCEPTS.map((x) => x.id);
}
