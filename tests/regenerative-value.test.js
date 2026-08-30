import test from 'node:test';
import assert from 'node:assert/strict';
import { allocateRealizedSurplus, evaluateRegenerativeValue } from '../src/core/regenerative-value.js';

test('paid return without verified external value is not healthy regenerative Fruit', () => {
  const result = evaluateRegenerativeValue({
    capturedReturnUsd: 25,
    lifecycleCostUsd: 5,
    lifecycleCostComplete: true,
    valueCapturePath: 'owned settlement rail',
    returnAttribution: 'settlement receipt',
    returnAttributionVerified: true,
    reinvestmentPath: 'bounded next experiment',
    ownershipPath: 'creator-owned account',
    ownershipVerified: true,
  });

  assert.equal(result.antiExtractionRisk, true);
  assert.equal(result.state, 'capture_without_verified_value');
  assert.equal(result.regenerative, false);
  assert.equal(result.ownerReturnEligible, false);
});

test('verified value plus attributable positive surplus can become regenerative and owner-return eligible', () => {
  const result = evaluateRegenerativeValue({
    externalValueEvidence: 'independent measured useful transformation',
    externalValueVerified: true,
    externalValueCreatedUsd: 100,
    capturedReturnUsd: 20,
    returnAttribution: 'owned settlement receipt',
    returnAttributionVerified: true,
    lifecycleCostUsd: 6,
    lifecycleCostComplete: true,
    materialObligationsUsd: 2,
    valueCapturePath: 'owned settlement rail',
    reinvestmentPath: 'surplus-funded next experiment',
    ownershipPath: 'creator-owned company/account',
    ownershipVerified: true,
    obligationsBounded: true,
  });

  assert.equal(result.antiExtractionRisk, false);
  assert.equal(result.netSurplusUsd, 12);
  assert.equal(result.regenerative, true);
  assert.equal(result.ownerReturnEligible, true);
  assert.equal(result.state, 'regenerative_return');
});

test('narrative value and ownership claims do not self-promote into verified truth', () => {
  const result = evaluateRegenerativeValue({
    externalValueEvidence: 'we say this saved time',
    externalValueCreatedUsd: 100,
    ownershipPath: 'we say we own it',
    capturedReturnUsd: 20,
    returnAttribution: 'self-described receipt',
    lifecycleCostUsd: 5,
    lifecycleCostComplete: true,
    valueCapturePath: 'settlement rail',
  });

  assert.equal(result.gates.externalValueClaimed, true);
  assert.equal(result.gates.externalValueVerified, false);
  assert.equal(result.gates.ownershipVerified, false);
  assert.equal(result.gates.returnAttributable, false);
  assert.equal(result.netSurplusUsd, null);
  assert.equal(result.ownerReturnEligible, false);
});

test('gross return with incomplete lifecycle cost cannot claim surplus', () => {
  const result = evaluateRegenerativeValue({
    externalValueEvidence: 'verified useful transformation',
    externalValueVerified: true,
    capturedReturnUsd: 20,
    returnAttribution: 'settlement receipt',
    returnAttributionVerified: true,
    lifecycleCostUsd: 4,
    lifecycleCostComplete: false,
    valueCapturePath: 'owned settlement rail',
  });

  assert.equal(result.gates.lifecycleCostObserved, true);
  assert.equal(result.gates.lifecycleCostComplete, false);
  assert.equal(result.netSurplusUsd, null);
  assert.equal(result.state, 'return_observed_cost_incomplete');
  assert.equal(result.regenerative, false);
});

test('surplus allocation is explicit and cannot silently exceed or underallocate realized surplus', () => {
  const allocation = allocateRealizedSurplus({
    surplusUsd: 100,
    ownerShare: 0.5,
    growthShare: 0.3,
    reserveShare: 0.15,
    sharedValueShare: 0.05,
  });

  assert.deepEqual(allocation.allocation, {
    owner: 50,
    growth: 30,
    reserve: 15,
    sharedValue: 5,
  });
  assert.throws(() => allocateRealizedSurplus({
    surplusUsd: 100,
    ownerShare: 0.6,
    growthShare: 0.6,
    reserveShare: 0,
  }), /sum to 1/);
});
