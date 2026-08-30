function parseTime(value) {
  if (!value) return null;
  const ms = Date.parse(value);
  return Number.isFinite(ms) ? ms : null;
}

function collectTimes(value, path = '$', out = []) {
  if (Array.isArray(value)) {
    value.forEach((item, index) => collectTimes(item, `${path}[${index}]`, out));
    return out;
  }
  if (!value || typeof value !== 'object') return out;

  for (const [key, child] of Object.entries(value)) {
    const childPath = `${path}.${key}`;
    if (typeof child === 'string' && /(At|Date|ObservedAt|capturedAt|asOf)$/i.test(key)) {
      const ms = parseTime(child);
      if (ms !== null) out.push({ path: childPath, value: child, ms });
    }
    collectTimes(child, childPath, out);
  }
  return out;
}

export function validateCheckpointTemporalIntegrity({ capturedAt, garden, dependencies = [] }) {
  const captureMs = parseTime(capturedAt);
  if (captureMs === null) {
    return { pass: false, reason: 'capturedAt must be a valid timestamp.', futureValues: [] };
  }

  const times = [
    ...collectTimes(garden, '$.garden'),
    ...dependencies.flatMap((item, index) => collectTimes(item, `$.dependencies[${index}]`)),
  ];
  const futureValues = times
    .filter((item) => item.ms > captureMs)
    .sort((a, b) => a.ms - b.ms)
    .map(({ path, value }) => ({ path, value }));

  return {
    pass: futureValues.length === 0,
    capturedAt,
    maxObservedTimestamp: times.length
      ? new Date(Math.max(...times.map((item) => item.ms))).toISOString()
      : null,
    futureValues,
    reason: futureValues.length === 0
      ? 'All included timestamped state/evidence is at or before capture time.'
      : 'Checkpoint includes timestamped state/evidence from after capture time and is hindsight-contaminated.',
  };
}
