import test from 'node:test';
import assert from 'node:assert/strict';
import {
  anBallCount,
  anGrowthAsymptotic,
  anShellCount,
  anShellCountFromGeneratingFunction,
  frontierToFieldRatio,
  a2ClosedFormBall,
  a2ClosedFormShell,
  DIMENSIONAL_GROWTH_INTERPRETATION,
} from '../research/dimensional/an-growth.js';

test('A2 exact shell counts recover 1, 6, 12, 18, ...', () => {
  const observed = Array.from({ length: 7 }, (_, radius) => anShellCount(2, radius));
  assert.deepEqual(observed, [1, 6, 12, 18, 24, 30, 36]);
  for (let radius = 0; radius <= 20; radius += 1) {
    assert.equal(anShellCount(2, radius), a2ClosedFormShell(radius));
  }
});

test('A2 radius-two ball contains 19 lattice centers', () => {
  assert.equal(anBallCount(2, 2), 19);
  assert.equal(a2ClosedFormBall(2), 19);
  for (let radius = 0; radius <= 20; radius += 1) {
    assert.equal(anBallCount(2, radius), a2ClosedFormBall(radius));
  }
});

test('A1 is a line with two new lattice points per nonzero shell', () => {
  assert.deepEqual(
    Array.from({ length: 6 }, (_, radius) => anShellCount(1, radius)),
    [1, 2, 2, 2, 2, 2],
  );
  assert.equal(anBallCount(1, 5), 11);
});

test('A3 growth begins with 12 nearest neighbors and 42 second-shell points', () => {
  assert.equal(anShellCount(3, 1), 12);
  assert.equal(anShellCount(3, 2), 42);
  assert.equal(anBallCount(3, 2), 55);
});

test('first nonzero A_n shell matches n(n+1) roots', () => {
  for (let n = 1; n <= 10; n += 1) {
    assert.equal(anShellCount(n, 1), n * (n + 1));
  }
});

test('independent composition derivation matches the known A_n coordination generating function', () => {
  for (let n = 1; n <= 8; n += 1) {
    for (let radius = 0; radius <= 12; radius += 1) {
      assert.equal(
        anShellCount(n, radius),
        anShellCountFromGeneratingFunction(n, radius),
        `A_${n} shell ${radius}`,
      );
    }
  }
});

test('Vandermonde numerator determines shell and ball leading coefficients', () => {
  const a2 = anGrowthAsymptotic(2);
  assert.equal(a2.numeratorAtOne, 6);
  assert.equal(a2.shellLeadingCoefficient, 6);
  assert.equal(a2.ballLeadingCoefficient, 3);
  assert.equal(a2.shellDegree, 1);
  assert.equal(a2.ballDegree, 2);

  const a3 = anGrowthAsymptotic(3);
  assert.equal(a3.numeratorAtOne, 20);
  assert.equal(a3.shellLeadingCoefficient, 10);
  assert.equal(a3.ballLeadingCoefficient, 20 / 6);
  assert.equal(a3.shellDegree, 2);
  assert.equal(a3.ballDegree, 3);
});

test('exact frontier-to-field ratios converge toward n/radius', () => {
  const radius = 200;
  for (const n of [1, 2, 3, 4]) {
    const exact = frontierToFieldRatio(n, radius);
    const predicted = n / radius;
    const relativeError = Math.abs(exact - predicted) / predicted;
    assert.ok(relativeError < 0.03, `A_${n} relative error ${relativeError}`);
  }
});

test('growth interpretation inherits known coordination-sequence mathematics and keeps domain claims bounded', () => {
  assert.match(DIMENSIONAL_GROWTH_INTERPRETATION.exact, /established coordination sequences/);
  assert.match(DIMENSIONAL_GROWTH_INTERPRETATION.knownGeneratingFunction, /binomial/);
  assert.match(DIMENSIONAL_GROWTH_INTERPRETATION.frontierLaw, /shell\/ball ~ n\/k/);
  assert.match(DIMENSIONAL_GROWTH_INTERPRETATION.implication, /incremental frontier processing/);
  assert.match(DIMENSIONAL_GROWTH_INTERPRETATION.epistemicBoundary, /does not establish/);
  assert.ok(DIMENSIONAL_GROWTH_INTERPRETATION.sources.some((source) => /Conway and Sloane/.test(source)));
});
