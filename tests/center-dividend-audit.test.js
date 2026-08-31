import test from 'node:test';
import assert from 'node:assert/strict';
import { assessCenterDividend } from '../research/value-transfer/center-dividend-audit.js';

test('verified attention reduction can evidence a Center dividend without inventing a life score', () => {
  const result = assessCenterDividend({
    numericEvidence: [
      { dimension: 'humanAttention', before: 30, after: 5, direction: 'lower', unit: 'manual-prompts', verified: true },
    ],
  });

  assert.equal(result.state, 'center_dividend_evidenced');
  assert.deepEqual(result.improvedDimensions, ['humanAttention']);
  assert.equal(result.score, null);
  assert.equal(result.authority, 'shadow_only');
});

test('projected financial value does not become a verified personal dividend', () => {
  const result = assessCenterDividend({
    numericEvidence: [
      { dimension: 'financialUtility', before: 0, after: 1000, direction: 'higher', unit: 'projected-usd', verified: false },
    ],
  });

  assert.equal(result.state, 'center_dividend_unverified');
  assert.deepEqual(result.improvedDimensions, []);
});

test('meaning and wellbeing require explicit Center-holder testimony', () => {
  const unverified = assessCenterDividend({
    selfReportedEvidence: [
      { dimension: 'meaningWellbeing', state: 'improved', verifiedByCenterHolder: false },
    ],
  });
  assert.equal(unverified.state, 'center_dividend_unverified');

  const verified = assessCenterDividend({
    selfReportedEvidence: [
      { dimension: 'meaningWellbeing', state: 'improved', verifiedByCenterHolder: true },
    ],
  });
  assert.equal(verified.state, 'center_dividend_evidenced');
});

test('benefit plus burden remains a visible tradeoff rather than a netted score', () => {
  const result = assessCenterDividend({
    numericEvidence: [
      { dimension: 'decisionQuality', before: 0.5, after: 0.9, direction: 'higher', unit: 'task-specific-score', verified: true },
      { dimension: 'humanAttention', before: 10, after: 20, direction: 'lower', unit: 'minutes', verified: true },
    ],
  });

  assert.equal(result.state, 'center_dividend_tradeoff_evidenced');
  assert.deepEqual(result.improvedDimensions, ['decisionQuality']);
  assert.deepEqual(result.regressedDimensions, ['humanAttention']);
  assert.equal(result.score, null);
});
