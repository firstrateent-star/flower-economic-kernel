import test from 'node:test';
import assert from 'node:assert/strict';
import { allocateRealizedSurplus, evaluateRegenerativeValue } from '../src/core/regenerative-value.js';

test('paid return without external value evidence is not healthy regenerative Fruit', () => {
  const result = evaluateRegenerativeValue({
    capturedReturnUsd: 25,
    lifecycleCostUsd: 5,
    valueCapturePath: 'owned settlement rail',
    returnAttribution: 'settlement receipt',
    reinvestmentPath: 'bounded next experiment',
    ownershipPath: 'creator-owned account',
  });

  assert.equal(result.antiExtractionRisk, true);
  assert.equal(result.state, 'capture_without_value_evidence');
  assert.equal(result.regenerative, false);
  assert.equal(result.ownerReturnEligible, false);
});

test('verified value plus attributable positive surplus can become regenerative and owner-return eligible', () => {
  const result = evaluateRegenerativeValue({
    externalValueEvidence: 'independent user reports measurable saved work',
    externalValueCreatedUsd: 100,
    capturedReturnUsd: 20,
    returnAttribution: 'owned settlement receipt',
    lifecycleCostUsd: 6,
    materialObligationsUsd: 2,
    valueCapturePath: 'owned settlement rail',
    reinvestmentPath: 'surplus-funded next experiment',
    ownershipPath: 'creator-owned company/account',
    obligationsBounded: true,
  });

  assert.equal(result.antiExtractionRisk, false);
  assert.equal(result.netSurplusUsd, 12);
  assert.equal(result.regenerative, true);
  assert.equal(result.ownerReturnEligible, true);
  assert.equal(result.state, 'regenerative_return');
});

test('gross return with unknown lifecycle cost cannot claim surplus', () => {
  const result = evaluateRegenerativeValue({
    externalValueEvidence: 'verified useful transformation',
    capturedReturnUsd: 20,
    returnAttribution: 'settlement receipt',
    valueCapturePath: 'owned settlement rail',
  });

  assert.equal(result.gates.lifecycleCostKnown, false);
  assert.equal(result.netSurplusUsd, null);
  assert.equal(result.state, 'attributable_return_observed');
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
