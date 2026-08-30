const DEFAULT_DIMENSIONS = Object.freeze([
  'agency',
  'truth',
  'wellbeing',
  'resilience',
  'optionality',
  'regeneration',
  'resourceEfficiency',
  'harmAvoidance',
]);

const POSITIVE = new Set(['positive', 'improved', 'preserved', 'beneficial']);
const NEGATIVE = new Set(['negative', 'regressed', 'degraded', 'harmful']);
const MIXED = new Set(['mixed', 'tradeoff']);
const UNKNOWN = new Set(['unknown', 'unmeasured', 'uncertain']);

function normalizeEffect(raw) {
  if (raw == null) {
    return { state: 'unknown', evidenceVerified: false, material: false, note: null };
  }

  if (typeof raw === 'string') {
    return { state: raw.trim().toLowerCase(), evidenceVerified: false, material: false, note: null };
  }

  if (typeof raw === 'number' && Number.isFinite(raw)) {
    return {
      state: raw > 0 ? 'positive' : raw < 0 ? 'negative' : 'preserved',
      evidenceVerified: false,
      material: false,
      magnitude: raw,
      note: null,
    };
  }

  if (typeof raw === 'object') {
    const state = String(raw.state ?? raw.effect ?? raw.direction ?? 'unknown').trim().toLowerCase();
    return {
      ...raw,
      state,
      evidenceVerified: raw.evidenceVerified === true,
      material: raw.material === true,
      note: raw.note ?? null,
    };
  }

  return { state: 'unknown', evidenceVerified: false, material: false, note: null };
}

function classifyState(state) {
  if (POSITIVE.has(state)) return 'positive';
  if (NEGATIVE.has(state)) return 'negative';
  if (MIXED.has(state)) return 'mixed';
  if (UNKNOWN.has(state)) return 'unknown';
  return 'unknown';
}

/**
 * Preserve a vector of value effects without reducing it to one utility score.
 * The local optimizer remains free to optimize its domain objective, but a verified
 * material regression in another declared value dimension cannot be averaged away.
 */
export function evaluateValueField(candidate = {}, {
  dimensions = DEFAULT_DIMENSIONS,
} = {}) {
  const supplied = candidate.valueEffects ?? candidate.flourishingEffects ?? {};
  const dimensionNames = [...new Set([...dimensions, ...Object.keys(supplied ?? {})])];
  const effects = {};
  const verifiedMaterialRegressions = [];
  const verifiedMaterialImprovements = [];
  const tradeoffs = [];
  const unknowns = [];

  for (const dimension of dimensionNames) {
    const effect = normalizeEffect(supplied?.[dimension]);
    const classification = classifyState(effect.state);
    effects[dimension] = { ...effect, classification };

    if (classification === 'negative' && effect.evidenceVerified && effect.material) {
      verifiedMaterialRegressions.push(dimension);
    }
    if (classification === 'positive' && effect.evidenceVerified && effect.material) {
      verifiedMaterialImprovements.push(dimension);
    }
    if (classification === 'mixed') tradeoffs.push(dimension);
    if (classification === 'unknown') unknowns.push(dimension);
  }

  return {
    dimensions: dimensionNames,
    effects,
    verifiedMaterialRegressions,
    verifiedMaterialImprovements,
    tradeoffs,
    unknowns,
    noVerifiedMaterialRegression: verifiedMaterialRegressions.length === 0,
    scalarized: false,
    epistemicBoundary:
      'This vector constrains local optimization with known material cross-dimensional effects. Unknown dimensions remain unknown; they are not silently converted to zero, benefit, or automatic veto.',
  };
}

export const VALUE_FIELD_DIMENSIONS = DEFAULT_DIMENSIONS;
