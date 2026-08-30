const SQRT2 = Math.sqrt(2);
const SQRT3 = Math.sqrt(3);
const SQRT6 = Math.sqrt(6);

const U = [1 / SQRT2, -1 / SQRT2, 0];
const V = [1 / SQRT6, 1 / SQRT6, -2 / SQRT6];

function dot(a, b) {
  return a.reduce((sum, value, index) => sum + value * b[index], 0);
}

function norm2(a) {
  return dot(a, a);
}

function subtract(a, b) {
  return a.map((value, index) => value - b[index]);
}

/**
 * A triangular/A2 lattice coordinate model with nearest-neighbor spacing `scale`.
 * The basis vectors meet at 60 degrees.
 */
export function a2Point2D(i, j, scale = 1) {
  return [
    scale * (i + j / 2),
    scale * ((SQRT3 / 2) * j),
  ];
}

/**
 * Isometric embedding of the same intrinsic A2 point into the zero-sum plane of R3.
 * U,V are an orthonormal basis for x+y+z=0.
 */
export function a2PointEmbeddedR3(i, j, scale = 1) {
  const [x, y] = a2Point2D(i, j, scale);
  return U.map((value, index) => x * value + y * V[index]);
}

/** Recover intrinsic chart coordinates from the R3 zero-sum embedding. */
export function projectA2R3ToIntrinsic(point) {
  if (!Array.isArray(point) || point.length !== 3) throw new Error('Expected an R3 point.');
  return [dot(point, U), dot(point, V)];
}

export function squaredDistance(a, b) {
  if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) {
    throw new Error('Distance requires equal-dimensional vectors.');
  }
  return norm2(subtract(a, b));
}

/**
 * Lift the same observed 2D point into arbitrarily many higher-dimensional source states.
 * Coordinate projection back to the first two axes erases every hidden coordinate.
 */
export function liftObserved2D(observed, hidden = []) {
  if (!Array.isArray(observed) || observed.length !== 2) throw new Error('Expected a 2D observation.');
  return [...observed, ...hidden];
}

export function projectFirstTwo(source) {
  if (!Array.isArray(source) || source.length < 2) throw new Error('Projection source must have at least two coordinates.');
  return source.slice(0, 2);
}

export function coordinateProjectionKernelDimension(sourceDimension, targetDimension = 2) {
  const source = Number(sourceDimension);
  const target = Number(targetDimension);
  if (!Number.isInteger(source) || !Number.isInteger(target) || source < target || target < 0) {
    throw new Error('Require integer dimensions with sourceDimension >= targetDimension >= 0.');
  }
  return source - target;
}

export function projectionAmbiguityWitness(observed = [0, 0]) {
  const sourceA = liftObserved2D(observed, [0]);
  const sourceB = liftObserved2D(observed, [1]);
  const sourceC = liftObserved2D(observed, [Math.PI, -17, 42]);
  return {
    observed: [...observed],
    distinctSources: [sourceA, sourceB, sourceC],
    projections: [sourceA, sourceB, sourceC].map(projectFirstTwo),
    sourceStatesDistinct: JSON.stringify(sourceA) !== JSON.stringify(sourceB)
      && JSON.stringify(sourceB) !== JSON.stringify(sourceC),
    allProjectIdentically: [sourceA, sourceB, sourceC]
      .every((source) => JSON.stringify(projectFirstTwo(source)) === JSON.stringify(observed)),
    epistemicConsequence: 'A lower-dimensional projection alone does not identify a unique higher-dimensional source state.',
  };
}
