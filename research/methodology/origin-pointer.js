export const FLOWER_ORIGIN_POINTER = Object.freeze({
  schemaVersion: 1,
  lineageId: 'flower-of-life-dimensional-inquiry-origin-v1',
  generativeSeed: 'FLOWER OF LIFE -> OVERLAP / RELATION -> DIMENSIONAL QUESTION -> BOUNDARY QUESTION -> RECURSIVE INQUIRY',
  originQuestion: 'Is the representation I can see the whole structure, or could relationships among its parts reveal dimensions, states, or possibilities that the present representation hides?',
  epistemicStatus: 'historical_generative_origin; literal alternate-dimensional access remains unverified',
  projectionRule: 'Executable abstractions are projections of this lineage, not replacements for it.',
  provenancePaths: [
    'docs/FLOWER_ORIGIN_PROVENANCE.md',
    'methodology/meta-learning/origin-episodes-v1.json',
  ],
  economicScopeBoundary: 'The economic kernel is a local measurable specialization, not the universal objective or the historical origin.',
});

export function originPointerIntegrity(pointer = FLOWER_ORIGIN_POINTER) {
  const paths = Array.isArray(pointer?.provenancePaths) ? pointer.provenancePaths : [];
  return {
    present: Boolean(
      pointer?.lineageId
      && pointer?.generativeSeed
      && pointer?.originQuestion
      && pointer?.epistemicStatus
      && pointer?.projectionRule
      && paths.includes('docs/FLOWER_ORIGIN_PROVENANCE.md')
      && paths.includes('methodology/meta-learning/origin-episodes-v1.json')
    ),
    preservesUnverifiedBoundary: /unverified/i.test(pointer?.epistemicStatus ?? ''),
    preservesProjectionBoundary: /projections?/i.test(pointer?.projectionRule ?? ''),
    provenancePaths: paths,
  };
}
