import { FLOWER_ORIGIN_POINTER } from './origin-pointer.js';

const LEGACY_BASE_DOCTRINE = `You are the cognition substrate inside Flower Economic Kernel v0.\n\nROOT: {{ROOT}}\nDIRECTION: {{DIRECTION}}\n\nThe canonical Flower methodology supplied in the input governs your reasoning. You do not decide human values, ownership, or permissions; you create candidate reasoning and bounded tests. Preserve uncertainty. Prefer falsification and external reality over enthusiasm. The economic target is the shortest truthful reachable regenerative-value loop: useful external transformation -> legitimate attributable return -> measurable full-cost surplus -> repeat/regeneration. Passivity and autonomy are downstream compression advantages, not purity gates for first value. Never optimize capture at the expense of useful value, trust, fulfillment, or agency. Sacred-geometry language is a functional design metaphor for centers, overlaps, and reusable relationships; it is never evidence by itself. Never claim economic validation, value, ownership, attribution, surplus, or regeneration without accountable evidence appropriate to that claim. Return ONLY valid JSON.`;

export function buildMinimalReasonerDoctrine({ root = '{{ROOT}}', direction = '{{DIRECTION}}' } = {}) {
  const origin = FLOWER_ORIGIN_POINTER;
  return `You are the cognition substrate inside Flower Economic Kernel v0.\n\nROOT: ${root}\nDIRECTION: ${direction}\n\nThe supplied projected canonical Flower methodology is authoritative for policy, evidence, sovereignty, value, efficiency, and stopping behavior. Treat this runtime view as a projection of a richer preserved lineage (${origin.lineageId}); it is not the whole ontology. Do not decide human values, ownership, or permissions. Create only candidate reasoning or bounded tests within the supplied authority. Preserve unknowns. Return ONLY valid JSON.`;
}

export function diagnoseMinimalReasonerDoctrine() {
  const minimal = buildMinimalReasonerDoctrine();
  const legacyBytes = Buffer.byteLength(LEGACY_BASE_DOCTRINE, 'utf8');
  const minimalBytes = Buffer.byteLength(minimal, 'utf8');
  return {
    legacyBytes,
    minimalBytes,
    bytesSaved: legacyBytes - minimalBytes,
    reductionFraction: legacyBytes ? Number(((legacyBytes - minimalBytes) / legacyBytes).toFixed(6)) : 0,
    preservesMechanics: {
      role: /cognition substrate/i.test(minimal),
      projectedCanonAuthority: /projected canonical Flower methodology is authoritative/i.test(minimal),
      humanAuthorityBoundary: /Do not decide human values, ownership, or permissions/i.test(minimal),
      uncertaintyBoundary: /Preserve unknowns/i.test(minimal),
      jsonOnly: /Return ONLY valid JSON/i.test(minimal),
      originPointer: minimal.includes(origin.lineageId) && /richer preserved lineage/i.test(minimal),
    },
    runtimeAuthority: false,
    decisionEquivalenceVerified: false,
    epistemicBoundary:
      'This shadow removes duplicated doctrine from the base reasoner instructions by delegating policy to the projected canonical methodology. Structural byte reduction does not establish behavioral equivalence; paired same-workload replay remains required before live use.',
  };
}

export { LEGACY_BASE_DOCTRINE };
