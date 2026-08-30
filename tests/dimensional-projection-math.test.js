import test from 'node:test';
import assert from 'node:assert/strict';
import {
  a2Point2D,
  a2PointEmbeddedR3,
  coordinateProjectionKernelDimension,
  liftObserved2D,
  projectA2R3ToIntrinsic,
  projectFirstTwo,
  projectionAmbiguityWitness,
  squaredDistance,
} from '../research/dimensional/projection-ambiguity.js';

function close(a, b, epsilon = 1e-12) {
  assert.ok(Math.abs(a - b) <= epsilon, `${a} !~= ${b}`);
}

function vectorClose(a, b, epsilon = 1e-12) {
  assert.equal(a.length, b.length);
  a.forEach((value, index) => close(value, b[index], epsilon));
}

test('A2 intrinsic coordinates survive an isometric embedding in the zero-sum plane of R3', () => {
  for (const [i, j] of [[0, 0], [1, 0], [0, 1], [2, -3], [-4, 5]]) {
    const intrinsic = a2Point2D(i, j);
    const embedded = a2PointEmbeddedR3(i, j);
    vectorClose(projectA2R3ToIntrinsic(embedded), intrinsic);
    close(embedded[0] + embedded[1] + embedded[2], 0);
  }
});

test('embedding A2 in R3 does not change its intrinsic pairwise metric', () => {
  const pairs = [
    [[0, 0], [1, 0]],
    [[0, 0], [0, 1]],
    [[1, -2], [4, 3]],
  ];
  for (const [[i1, j1], [i2, j2]] of pairs) {
    const d2Intrinsic = squaredDistance(a2Point2D(i1, j1), a2Point2D(i2, j2));
    const d2Embedded = squaredDistance(a2PointEmbeddedR3(i1, j1), a2PointEmbeddedR3(i2, j2));
    close(d2Intrinsic, d2Embedded);
  }
});

test('a higher embedding dimension does not imply a higher intrinsic dimension', () => {
  const observed = a2Point2D(3, -1);
  const embedded4 = liftObserved2D(observed, [8, -13]);
  assert.deepEqual(projectFirstTwo(embedded4), observed);
  assert.equal(embedded4.length, 4);
  assert.equal(observed.length, 2);
});

test('coordinate projection from higher dimension has a non-trivial kernel when source dimension exceeds target dimension', () => {
  assert.equal(coordinateProjectionKernelDimension(3, 2), 1);
  assert.equal(coordinateProjectionKernelDimension(8, 2), 6);
  assert.equal(coordinateProjectionKernelDimension(2, 2), 0);
});

test('distinct higher-dimensional source states can cast the same 2D shadow', () => {
  const witness = projectionAmbiguityWitness([2.5, -7]);
  assert.equal(witness.sourceStatesDistinct, true);
  assert.equal(witness.allProjectIdentically, true);
  assert.deepEqual(witness.projections, [[2.5, -7], [2.5, -7], [2.5, -7]]);
  assert.match(witness.epistemicConsequence, /does not identify a unique/);
});
