export const SIX_OPERATOR_KERNEL = Object.freeze([
  'LOCK',
  'PROJECT',
  'PROBE',
  'ACT',
  'VERIFY',
  'CRYSTALLIZE_REST',
]);

export const ORIGIN_STRESSED_KERNEL = Object.freeze([
  'LOCK',
  'OPEN',
  'PROJECT',
  'PROBE',
  'ACT',
  'VERIFY',
  'CRYSTALLIZE_REST',
]);

const CAPABILITIES = Object.freeze({
  objectiveIntegrity: ['LOCK'],
  localActivation: ['PROJECT'],
  discriminatingInquiry: ['PROBE'],
  intervention: ['ACT'],
  realitySelection: ['VERIFY'],
  retentionOrStopping: ['CRYSTALLIZE_REST'],
  representationOpening: ['OPEN'],
});

function present(kernel, required) {
  const set = new Set(kernel ?? []);
  return required.every((x) => set.has(x));
}

/**
 * Structural origin-continuity witness only. It asks whether an operator set has an
 * explicit place for the capability that generated Flower historically: detecting
 * inadequacy of the current representation and opening an alternate chart/center.
 * It does not prove that an OPEN implementation improves decisions.
 */
export function assessOriginContinuity(kernel = []) {
  const rows = Object.entries(CAPABILITIES).map(([capability, required]) => ({
    capability,
    required,
    structurallyRepresented: present(kernel, required),
  }));
  const missing = rows.filter((x) => !x.structurallyRepresented).map((x) => x.capability);
  return {
    kernel: [...kernel],
    rows,
    missingCapabilities: missing,
    originContinuityStructurallyRepresented: missing.length === 0,
    empiricalValueVerified: false,
    canonicalPromotionAuthorized: false,
    semanticGuard: 'LOCK OBJECTIVE / PROTECTED BOUNDARIES, NOT THE CURRENT ONTOLOGY OR COORDINATE SYSTEM.',
    epistemicBoundary:
      'Structural coverage is not evidence that OPEN is irreducible or useful. Promotion requires a paired task where representation-opening changes a governed outcome relative to a six-operator baseline and survives reality verification.',
  };
}

/**
 * Deeper descriptive factorization. This is intentionally not an executable router.
 */
export function factorKernelMotions(kernel = ORIGIN_STRESSED_KERNEL) {
  const mapping = {
    LOCK: 'PRESERVE',
    OPEN: 'GENERATE',
    PROJECT: 'PRESERVE',
    PROBE: 'GENERATE',
    ACT: 'GENERATE',
    VERIFY: 'REALITY_SELECT',
    CRYSTALLIZE_REST: 'PRESERVE',
  };
  return [...kernel].map((operator) => ({ operator, motion: mapping[operator] ?? 'UNMAPPED' }));
}
