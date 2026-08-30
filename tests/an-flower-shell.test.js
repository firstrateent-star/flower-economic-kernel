import test from 'node:test';
import assert from 'node:assert/strict';
import {
  anFlowerShellSummary,
  anRoots,
  anSixtyDegreeEdges,
  dot,
  squaredNorm,
} from '../research/dimensional/an-flower-shell.js';

for (const n of [1, 2, 3, 4, 5, 8]) {
  test(`A_${n} root shell has n(n+1) zero-sum norm-2 roots`, () => {
    const roots = anRoots(n);
    assert.equal(roots.length, n * (n + 1));
    for (const root of roots) {
      assert.equal(root.vector.reduce((sum, x) => sum + x, 0), 0);
      assert.equal(squaredNorm(root.vector), 2);
    }
  });
}

test('A2 recovers the six-direction first ring', () => {
  const summary = anFlowerShellSummary(2);
  assert.equal(summary.intrinsicDimension, 2);
  assert.equal(summary.embeddingDimension, 3);
  assert.equal(summary.shellRootCount, 6);
  assert.equal(summary.centerCountIncludingOrigin, 7);
  assert.equal(summary.degreeMin, 2);
  assert.equal(summary.degreeMax, 2);
  assert.equal(summary.sixtyDegreeEdgeCount, 6);
});

test('A3 produces a 12-direction shell with cuboctahedral 60-degree adjacency counts', () => {
  const summary = anFlowerShellSummary(3);
  assert.equal(summary.shellRootCount, 12);
  assert.equal(summary.centerCountIncludingOrigin, 13);
  assert.equal(summary.expectedDegree, 4);
  assert.equal(summary.degreeMin, 4);
  assert.equal(summary.degreeMax, 4);
  assert.equal(summary.sixtyDegreeEdgeCount, 24);
});

test('A_n 60-degree shell degree and edge formulas hold across tested ranks', () => {
  for (const n of [2, 3, 4, 5, 8]) {
    const summary = anFlowerShellSummary(n);
    assert.equal(summary.degreeMin, 2 * (n - 1));
    assert.equal(summary.degreeMax, 2 * (n - 1));
    assert.equal(summary.sixtyDegreeEdgeCount, n * (n + 1) * (n - 1));
  }
});

test('60-degree adjacency really corresponds to root inner product 1', () => {
  const { roots, edges } = anSixtyDegreeEdges(4);
  const byId = new Map(roots.map((root) => [root.id, root]));
  for (const [a, b] of edges) {
    assert.equal(dot(byId.get(a).vector, byId.get(b).vector), 1);
  }
});

test('higher-dimensional analogue remains explicitly mathematical rather than physical evidence', () => {
  const summary = anFlowerShellSummary(4);
  assert.match(summary.epistemicNote, /mathematical/);
  assert.match(summary.epistemicNote, /not evidence/);
});
