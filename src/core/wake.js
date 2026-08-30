const TERMINAL_PRESSURES = new Set(['HUMAN', 'STILLNESS']);

function stableJson(value) {
  if (value === undefined) return 'undefined';
  return JSON.stringify(value, Object.keys(value ?? {}).sort());
}

export function materialObservationChanged(previous, current) {
  if (!previous && !current) return false;
  if (!previous && current) return true;
  if (previous && !current) return false;

  const materialKeys = [
    'independentUser',
    'chargedEvent',
    'creatorRevenue',
    'settledValue',
    'repeatDemand',
    'agenticPaymentEligible',
    'marketTruth',
    'externalUsage',
    'status',
  ];

  return materialKeys.some((key) => stableJson(previous[key]) !== stableJson(current[key]));
}

export function classifyWake({
  previousObservation = null,
  currentObservation = null,
  pressure = null,
  event = null,
} = {}) {
  if (event?.status === 'new') {
    return {
      wake: true,
      reason: 'new_reality_event',
      detail: 'Reality produced a new unprocessed event.',
    };
  }

  if (materialObservationChanged(previousObservation, currentObservation)) {
    return {
      wake: true,
      reason: 'material_observation_change',
      detail: 'A monitored Fruit changed on a decision-relevant truth dimension.',
    };
  }

  if (pressure && !TERMINAL_PRESSURES.has(pressure.type)) {
    return {
      wake: true,
      reason: 'autonomous_pressure_available',
      detail: `Kernel pressure ${pressure.type} can proceed without Center-holder authority.`,
    };
  }

  if (pressure?.type === 'HUMAN') {
    return {
      wake: false,
      reason: 'human_membrane',
      detail: 'The next highest-leverage action requires explicit Center-holder authority; repeated pulses would not resolve it.',
    };
  }

  return {
    wake: false,
    reason: 'stillness',
    detail: 'No decision-relevant state change or autonomous pressure exists.',
  };
}
