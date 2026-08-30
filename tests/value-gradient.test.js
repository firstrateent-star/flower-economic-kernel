import test from 'node:test';
import assert from 'node:assert/strict';
import { assessMarginalAction, compareMarginalActions } from '../src/core/value-gradient.js';

test('marginal value density requires evidenced value delta and incremental cost', () => {
  const assessed = assessMarginalAction({
    expectedValueDelta: 100,
    incrementalCost: 20,
  });
  assert.equal(assessed.directComparable, true);
  assert.equal(assessed.marginalValueDensity, 5);
  assert.equal(assessed.informationComparable, false);
});

test('value of information remains separate from direct terminal value', () => {
  const assessed = assessMarginalAction({
    decisionChangeProbability: 0.25,
    decisionStakes: 1000,
    incrementalCost: 10,
  });
  assert.equal(assessed.informationComparable, true);
  assert.equal(assessed.marginalInformationDensity, 25);
  assert.equal(assessed.directComparable, false);
});

test('unknowns never receive neutral priors for marginal ranking', () => {
  const compared = compareMarginalActions([
    { id: 'known', decisionChangeProbability: 0.5, decisionStakes: 100, incrementalCost: 10 },
    { id: 'unknown_stakes', decisionChangeProbability: 0.9, incrementalCost: 1 },
  ]);
  assert.equal(compared.bestInformationActionId, 'known');
  assert.equal(compared.rankingCoverage.information, 1);
  const unknown = compared.assessed.find((item) => item.id === 'unknown_stakes');
  assert.equal(unknown.informationComparable, false);
  assert.equal(unknown.unknowns.decisionStakes, true);
});

test('verified material regression excludes an action from marginal promotion ranking', () => {
  const compared = compareMarginalActions([
    {
      id: 'harmful_fast',
      expectedValueDelta: 1000,
      incrementalCost: 1,
      valueEffects: {
        agency: { state: 'negative', evidenceVerified: true, material: true },
      },
    },
    { id: 'safe', expectedValueDelta: 50, incrementalCost: 10 },
  ]);
  assert.equal(compared.bestDirectValueActionId, 'safe');
  assert.equal(compared.assessed.find((item) => item.id === 'harmful_fast').promotionSafe, false);
});

test('direct-value and information-value winners remain separate and do not collapse into one score', () => {
  const compared = compareMarginalActions([
    { id: 'act', expectedValueDelta: 100, incrementalCost: 10 },
    { id: 'probe', decisionChangeProbability: 0.8, decisionStakes: 1000, incrementalCost: 10 },
  ]);
  assert.equal(compared.bestDirectValueActionId, 'act');
  assert.equal(compared.bestInformationActionId, 'probe');
  assert.equal(compared.deterministicChoiceAuthorized, false);
  assert.equal('score' in compared, false);
});
