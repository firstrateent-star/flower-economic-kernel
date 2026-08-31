import { FLOWER_METHODOLOGY } from '../../src/core/methodology-core.js';
import { FLOWER_ORIGIN_POINTER, originPointerIntegrity } from './origin-pointer.js';

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

function operatingSafeguards(methodology) {
  const loop = methodology.operatingLoop ?? [];
  return loop.filter((step) => /^(ACT|REST|RECURSE):/.test(step));
}

/**
 * Shadow-only methodology projection. Unknown operations deliberately fall back to full canon.
 * Center + invariants + stop conditions + a compact origin pointer are always retained.
 * The origin pointer does not make historical symbolism operational doctrine; it preserves a cheap,
 * reconstructible distinction between the current executable projection and the generative lineage.
 * The full operating loop is compressed to ACT/REST/RECURSE safeguards unless an operation later
 * proves it needs more of the loop.
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
      originPointer: clone(FLOWER_ORIGIN_POINTER),
      runtimeAuthority: false,
    };
  }

  const projection = {
    version: methodology.version,
    originPointer: clone(FLOWER_ORIGIN_POINTER),
    center: clone(methodology.center),
    invariants: clone(methodology.invariants),
    operatingSafeguards: clone(operatingSafeguards(methodology)),
    stopConditions: clone(methodology.stopConditions ?? []),
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
    originPointer: clone(FLOWER_ORIGIN_POINTER),
    runtimeAuthority: false,
  };
}

export function diagnoseMethodologyProjection(operation, methodology = FLOWER_METHODOLOGY) {
  const projected = projectMethodologyForOperation(operation, methodology);
  const fullBytes = bytes(methodology);
  const projectedBytes = bytes(projected.projection);
  const originIntegrity = originPointerIntegrity(projected.originPointer);
  return {
    ...projected,
    fullBytes,
    projectedBytes,
    bytesSaved: fullBytes - projectedBytes,
    reductionFraction: fullBytes > 0 ? Number(((fullBytes - projectedBytes) / fullBytes).toFixed(6)) : 0,
    originIntegrity,
    protectedSpinePresent: Boolean(
      originIntegrity.present
      && originIntegrity.preservesUnverifiedBoundary
      && originIntegrity.preservesProjectionBoundary
      && projected.projection?.center
      && Array.isArray(projected.projection?.invariants)
      && projected.projection.invariants.length > 0
      && Array.isArray(projected.projection?.stopConditions)
      && projected.projection.stopConditions.length > 0
      && Array.isArray(projected.projection?.operatingSafeguards)
      && projected.projection.operatingSafeguards.some((step) => step.startsWith('ACT:'))
      && projected.projection.operatingSafeguards.some((step) => step.startsWith('REST:'))
      && projected.projection.operatingSafeguards.some((step) => step.startsWith('RECURSE:'))
    ),
    epistemicBoundary:
      'Payload reduction is only a structural efficiency hypothesis. It does not prove decision equivalence. Origin preservation means the generative lineage remains reconstructible and explicitly distinct from the executable projection; it does not grant origin symbolism decision authority or scientific status. Runtime promotion requires same-workload reasoner comparisons showing equivalent-or-better governed decisions, with full-canon fallback when operation scope is uncertain.',
  };
}

export function methodologyProjectionMatrix(operations = Object.keys(OPERATION_SECTIONS)) {
  return operations.map((operation) => diagnoseMethodologyProjection(operation));
}
