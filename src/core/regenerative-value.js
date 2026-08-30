const nonNegative = (value) => {
  if (value === undefined || value === null || value === '') return null;
  const number = Number(value);
  if (!Number.isFinite(number)) return null;
  return Math.max(0, number);
};

function named(value) {
  if (typeof value === 'string') return value.trim().length > 0;
  if (Array.isArray(value)) return value.length > 0;
  if (value && typeof value === 'object') return Object.keys(value).length > 0;
  return Boolean(value);
}

function knownCost(candidate = {}) {
  const direct = nonNegative(candidate.lifecycleCostUsd ?? candidate.fullLifecycleCostUsd);
  if (direct !== null) return direct;

  const components = [
    candidate.computeCostUsd,
    candidate.hostingCostUsd,
    candidate.apiCostUsd,
    candidate.supportCostUsd,
    candidate.capitalCostUsd,
    candidate.settlementCostUsd,
    candidate.maintenanceCostUsd,
    candidate.pricedHumanBurdenUsd,
    candidate.otherMaterialCostUsd,
  ];
  const normalized = components.map(nonNegative);
  const anyKnown = normalized.some((value) => value !== null);
  if (!anyKnown) return null;
  if (normalized.some((value, index) => components[index] !== undefined && components[index] !== null && value === null)) return null;
  return normalized.reduce((sum, value) => sum + (value ?? 0), 0);
}

export function evaluateRegenerativeValue(candidate = {}) {
  const externalValueUsd = nonNegative(candidate.externalValueCreatedUsd ?? candidate.externalValueUsd);
  const capturedReturnUsd = nonNegative(
    candidate.capturedReturnUsd
    ?? candidate.settledValueUsd
    ?? candidate.creatorRevenueUsd,
  );
  const lifecycleCostUsd = knownCost(candidate);
  const materialObligationsUsd = nonNegative(candidate.materialObligationsUsd) ?? 0;
  const fullCostUsd = lifecycleCostUsd === null ? null : lifecycleCostUsd + materialObligationsUsd;
  const netSurplusUsd = capturedReturnUsd === null || fullCostUsd === null
    ? null
    : capturedReturnUsd - fullCostUsd;

  const gates = {
    externalValueEvidence: named(candidate.externalValueEvidence) || externalValueUsd !== null,
    capturePathNamed: named(candidate.valueCapturePath ?? candidate.captureRail ?? candidate.pricing),
    returnAttributable: capturedReturnUsd !== null && (
      candidate.returnAttributable === true
      || named(candidate.returnAttribution)
      || candidate.creatorRevenueUsd !== undefined
      || candidate.settledValueUsd !== undefined
    ),
    lifecycleCostKnown: fullCostUsd !== null,
    obligationsBounded: candidate.obligationsBounded !== false,
    truthfulValueClaim: candidate.truthfulValueClaim !== false,
    ownershipPathNamed: named(candidate.ownershipPath ?? candidate.ownerReturnPath ?? candidate.settlementOwner),
    reinvestmentPathNamed: named(candidate.reinvestmentPath ?? candidate.regenerationPath),
  };

  const antiExtractionRisk = Boolean(
    capturedReturnUsd !== null
    && capturedReturnUsd > 0
    && !gates.externalValueEvidence,
  ) || candidate.extractionRisk === true;

  let state = 'value_hypothesis';
  if (gates.externalValueEvidence) state = 'external_value_evidenced';
  if (gates.externalValueEvidence && gates.capturePathNamed) state = 'capture_path_ready';
  if (gates.returnAttributable) state = 'attributable_return_observed';
  if (gates.returnAttributable && gates.lifecycleCostKnown) state = 'full_cost_known';
  if (netSurplusUsd !== null && netSurplusUsd > 0) state = 'positive_surplus';
  if (netSurplusUsd !== null && netSurplusUsd > 0 && gates.reinvestmentPathNamed) state = 'regenerative_return';
  if (netSurplusUsd !== null && netSurplusUsd <= 0) state = 'return_without_positive_surplus';
  if (antiExtractionRisk) state = 'capture_without_value_evidence';

  return {
    state,
    externalValueUsd,
    capturedReturnUsd,
    lifecycleCostUsd: fullCostUsd,
    netSurplusUsd: netSurplusUsd === null ? null : Number(netSurplusUsd.toFixed(6)),
    gates,
    antiExtractionRisk,
    healthyCapturePath: gates.externalValueEvidence
      && gates.capturePathNamed
      && gates.obligationsBounded
      && gates.truthfulValueClaim
      && !antiExtractionRisk,
    ownerReturnEligible: netSurplusUsd !== null
      && netSurplusUsd > 0
      && gates.ownershipPathNamed
      && gates.obligationsBounded
      && !antiExtractionRisk,
    regenerative: netSurplusUsd !== null
      && netSurplusUsd > 0
      && gates.reinvestmentPathNamed
      && gates.obligationsBounded
      && !antiExtractionRisk,
  };
}

export function allocateRealizedSurplus({
  surplusUsd,
  ownerShare,
  growthShare,
  reserveShare,
  sharedValueShare = 0,
} = {}) {
  const surplus = Number(surplusUsd);
  if (!Number.isFinite(surplus) || surplus <= 0) {
    throw new Error('allocateRealizedSurplus requires realized surplusUsd > 0.');
  }

  const shares = {
    owner: Number(ownerShare),
    growth: Number(growthShare),
    reserve: Number(reserveShare),
    sharedValue: Number(sharedValueShare),
  };
  for (const [name, share] of Object.entries(shares)) {
    if (!Number.isFinite(share) || share < 0 || share > 1) {
      throw new Error(`${name} share must be a number between 0 and 1.`);
    }
  }

  const total = Object.values(shares).reduce((sum, share) => sum + share, 0);
  if (Math.abs(total - 1) > 1e-9) {
    throw new Error(`surplus allocation shares must sum to 1; received ${total}.`);
  }

  const allocation = Object.fromEntries(
    Object.entries(shares).map(([name, share]) => [name, Number((surplus * share).toFixed(6))]),
  );

  return {
    surplusUsd: Number(surplus.toFixed(6)),
    shares,
    allocation,
  };
}
