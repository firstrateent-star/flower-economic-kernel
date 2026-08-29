const clamp = (n, min = 0, max = 1) => Math.min(max, Math.max(min, Number(n) || 0));

export function scorePressureSurface(surface = {}) {
  const value = Math.log10(1 + Math.max(0, Number(surface.valueAtStakeUsd) || 0)) / 7;
  const urgency = clamp(surface.urgency);
  const reroutability = clamp(surface.reroutability);
  const observability = clamp(surface.observability);
  const machineAddressability = clamp(surface.machineAddressability);
  const dependencyMultiplier = Math.min(2, Math.max(0.25, Number(surface.dependencyMultiplier) || 1));
  const compensationAttachment = clamp(surface.compensationAttachment);
  const returnQuality = clamp(surface.returnQuality);
  const overlapDensity = Math.min(2, Math.max(0.25, Number(surface.overlapDensity) || 1));
  const humanBurden = clamp(surface.humanBurden);
  const capitalBurden = clamp(surface.capitalBurden);
  const regulatoryFriction = clamp(surface.regulatoryFriction);
  const competition = clamp(surface.competition);
  const latency = clamp(surface.latency);
  const extractionRisk = clamp(surface.extractionRisk);

  const pressure = value * urgency * reroutability * observability * machineAddressability * dependencyMultiplier;
  const nourishment = (0.55 * compensationAttachment) + (0.45 * returnQuality);
  const multiplicity = overlapDensity;
  const friction = 1 + humanBurden + capitalBurden + regulatoryFriction + competition + latency + extractionRisk;
  const score = (pressure * nourishment * multiplicity) / friction;

  return {
    score: Number(score.toFixed(6)),
    pressure: Number(pressure.toFixed(6)),
    nourishment: Number(nourishment.toFixed(6)),
    friction: Number(friction.toFixed(6)),
    gate: {
      observable: observability >= 0.5,
      reroutable: reroutability >= 0.5,
      machineAddressable: machineAddressability >= 0.5,
      compensationAttached: compensationAttachment >= 0.35,
      lowHumanBurden: humanBurden <= 0.45,
      lowCapitalBurden: capitalBurden <= 0.25,
      acceptableRegulatoryFriction: regulatoryFriction <= 0.55,
    },
  };
}

export function classifySurface(surface = {}) {
  const { score, gate } = scorePressureSurface(surface);
  const passed = Object.values(gate).every(Boolean);
  if (!passed) return { state: 'observe_or_prune', score, gate };
  if (score >= 0.06) return { state: 'nursery_priority', score, gate };
  if (score >= 0.015) return { state: 'nursery', score, gate };
  return { state: 'observe', score, gate };
}
