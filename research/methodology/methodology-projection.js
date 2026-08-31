import { FLOWER_METHODOLOGY } from '../../src/core/methodology-core.js';

const OPERATION_SECTIONS = Object.freeze({
  EXPAND: ['fieldGovernance', 'terminalGovernance', 'efficiency', 'selfImprovementValueGovernance'],
  SELECT: ['terminalGovernance', 'regenerativeValueGovernance', 'fieldGovernance', 'efficiency'],
  FALSIFY: ['terminalGovernance', 'fieldGovernance', 'efficiency'],
  INTEGRATE: ['terminalGovernance', 'regenerativeValueGovernance', 'selfImprovementValueGovernance', 'mutationGovernance'],
  TRANSFER: ['selfImprovementValueGovernance', 'efficiency', 'mutationGovernance'],
  IMPROVE: ['selfImprovementValueGovernance', 'dualCultivation', 'mutationGovernance', 'efficiency'],
});

function clone(value) {
  return value == null ? value : structuredClone(value);
}

function bytes(value) {
  return Buffer.byteLength(JSON.stringify(value), 'utf8');
}

/**
 * Shadow-only methodology projection. Unknown operations deliberately fall back to full canon.
 * Center + invariants are always retained because they contain the protected orientation and
 * global epistemic/sovereignty boundaries.
 */
export function projectMethodologyForOperation(operation, methodology = FLOWER_METHODOLOGY) {
  const sections = OPERATION_SECTIONS[operation] ?? null;
  if (!sections) {
    return {
      projection: clone(methodology),
      mode: 'full_fallback',
      operation: operation ?? null,
      includedSections: Object.keys(methodology),
      omittedSections: [],
      runtimeAuthority: false,
    };
  }

  const projection = {
    version: methodology.version,
    center: clone(methodology.center),
    invariants: clone(methodology.invariants),
  };

  for (const section of sections) {
    if (methodology[section] !== undefined) projection[section] = clone(methodology[section]);
  }

  const includedSections = Object.keys(projection);
  const omittedSections = Object.keys(methodology).filter((key) => !includedSections.includes(key));

  return {
    projection,
    mode: 'operation_projection',
    operation,
    includedSections,
    omittedSections,
    runtimeAuthority: false,
  };
}

export function diagnoseMethodologyProjection(operation, methodology = FLOWER_METHODOLOGY) {
  const projected = projectMethodologyForOperation(operation, methodology);
  const fullBytes = bytes(methodology);
  const projectedBytes = bytes(projected.projection);
  return {
    ...projected,
    fullBytes,
    projectedBytes,
    bytesSaved: fullBytes - projectedBytes,
    reductionFraction: fullBytes > 0 ? Number(((fullBytes - projectedBytes) / fullBytes).toFixed(6)) : 0,
    protectedSpinePresent: Boolean(
      projected.projection?.center
      && Array.isArray(projected.projection?.invariants)
      && projected.projection.invariants.length > 0
    ),
    epistemicBoundary:
      'Payload reduction is only a structural efficiency hypothesis. It does not prove decision equivalence. Runtime promotion requires same-workload reasoner comparisons showing equivalent-or-better governed decisions, with full-canon fallback when operation scope is uncertain.',
  };
}

export function methodologyProjectionMatrix(operations = Object.keys(OPERATION_SECTIONS)) {
  return operations.map((operation) => diagnoseMethodologyProjection(operation));
}
