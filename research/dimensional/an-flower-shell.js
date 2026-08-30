function unitVector(length, index, value = 1) {
  const vector = Array(length).fill(0);
  vector[index] = value;
  return vector;
}

function subtract(a, b) {
  return a.map((value, index) => value - b[index]);
}

export function dot(a, b) {
  if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) {
    throw new Error('dot requires equal-dimensional vectors.');
  }
  return a.reduce((sum, value, index) => sum + value * b[index], 0);
}

export function squaredNorm(vector) {
  return dot(vector, vector);
}

/**
 * The A_n root shell in its standard R^(n+1) zero-sum embedding:
 * { e_i - e_j | i != j }.
 * The intrinsic rank is n even though the coordinate embedding uses n+1 entries.
 */
export function anRoots(n) {
  if (!Number.isInteger(n) || n < 1) throw new Error('A_n requires integer n >= 1.');
  const dimension = n + 1;
  const basis = Array.from({ length: dimension }, (_, index) => unitVector(dimension, index));
  const roots = [];
  for (let i = 0; i < dimension; i += 1) {
    for (let j = 0; j < dimension; j += 1) {
      if (i === j) continue;
      roots.push({
        id: `e${i + 1}-e${j + 1}`,
        from: i,
        to: j,
        vector: subtract(basis[i], basis[j]),
      });
    }
  }
  return roots;
}

/**
 * Root-polytope adjacency using the A2-like 60-degree relation.
 * A_n roots have norm^2=2, so dot=1 corresponds to cos(theta)=1/2.
 */
export function anSixtyDegreeEdges(n) {
  const roots = anRoots(n);
  const edges = [];
  for (let i = 0; i < roots.length; i += 1) {
    for (let j = i + 1; j < roots.length; j += 1) {
      if (dot(roots[i].vector, roots[j].vector) === 1) {
        edges.push([roots[i].id, roots[j].id]);
      }
    }
  }
  return { roots, edges };
}

export function anFlowerShellSummary(n) {
  const { roots, edges } = anSixtyDegreeEdges(n);
  const degree = new Map(roots.map((root) => [root.id, 0]));
  for (const [a, b] of edges) {
    degree.set(a, degree.get(a) + 1);
    degree.set(b, degree.get(b) + 1);
  }
  const degrees = [...degree.values()];
  return {
    n,
    intrinsicDimension: n,
    embeddingDimension: n + 1,
    centerCountIncludingOrigin: roots.length + 1,
    shellRootCount: roots.length,
    expectedShellRootCount: n * (n + 1),
    sixtyDegreeEdgeCount: edges.length,
    expectedSixtyDegreeEdgeCount: n * (n + 1) * (n - 1),
    degreeMin: Math.min(...degrees),
    degreeMax: Math.max(...degrees),
    expectedDegree: 2 * (n - 1),
    asymptoticCenterGrowth: 'O(n^2)',
    asymptoticRelationGrowth: 'O(n^3)',
    epistemicNote: 'This is a mathematical A_n root-shell analogue of the six-direction A2 center field. It is not evidence that the historical Flower of Life encodes literal physical dimensions.',
  };
}
