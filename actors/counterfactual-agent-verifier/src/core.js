function finite(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function bool(value) {
  return typeof value === 'boolean' ? value : null;
}

function delta(base, challenger) {
  const b = finite(base);
  const c = finite(challenger);
  return b === null || c === null ? null : c - b;
}

function lowerIsBetter(base, challenger) {
  const d = delta(base, challenger);
  return d === null ? null : -d;
}

function compareProtectedMetric(metric = {}) {
  const baseline = finite(metric.baseline);
  const challenger = finite(metric.challenger);
  const tolerance = Math.max(0, finite(metric.tolerance) ?? 0);
  const direction = metric.direction === 'lower' ? 'lower' : 'higher';
  if (baseline === null || challenger === null) {
    return { name:String(metric.name ?? 'unnamed'), direction, baseline, challenger, tolerance, comparable:false, regression:null, improvement:null };
  }
  const signed = direction === 'higher' ? challenger - baseline : baseline - challenger;
  return {
    name:String(metric.name ?? 'unnamed'), direction, baseline, challenger, tolerance, comparable:true,
    regression:signed < -tolerance,
    improvement:signed > tolerance,
    signedImprovement:Number(signed.toFixed(6)),
  };
}

export function verifyComparison(item = {}, defaults = {}) {
  const caseId = String(item.caseId ?? item.id ?? 'case');
  const baseline = item.baseline ?? {};
  const challenger = item.challenger ?? {};
  const qualityTolerance = Math.max(0, finite(item.qualityTolerance ?? defaults.qualityTolerance) ?? 0);
  const baselineSuccess = bool(baseline.terminalSuccess);
  const challengerSuccess = bool(challenger.terminalSuccess);
  const qualityDelta = delta(baseline.quality, challenger.quality);
  const qualityComparable = qualityDelta !== null;
  const qualityRegression = qualityComparable ? qualityDelta < -qualityTolerance : null;
  const qualityImprovement = qualityComparable ? qualityDelta > qualityTolerance : null;

  const protectedMetrics = (Array.isArray(item.protectedMetrics) ? item.protectedMetrics : []).map(compareProtectedMetric);
  const protectedRegressions = protectedMetrics.filter((x) => x.regression === true);
  const protectedImprovements = protectedMetrics.filter((x) => x.improvement === true);

  const terminalComparable = baselineSuccess !== null && challengerSuccess !== null;
  const terminalRegression = terminalComparable ? baselineSuccess && !challengerSuccess : null;
  const terminalImprovement = terminalComparable ? !baselineSuccess && challengerSuccess : null;
  const terminalPreserved = terminalComparable ? (!baselineSuccess || challengerSuccess) : null;

  const efficiency = {
    costUsdImprovement: lowerIsBetter(baseline.costUsd, challenger.costUsd),
    latencyMsImprovement: lowerIsBetter(baseline.latencyMs, challenger.latencyMs),
    inputTokensImprovement: lowerIsBetter(baseline.inputTokens, challenger.inputTokens),
    outputTokensImprovement: lowerIsBetter(baseline.outputTokens, challenger.outputTokens),
    errorCountImprovement: lowerIsBetter(baseline.errorCount, challenger.errorCount),
    humanInterruptionsImprovement: lowerIsBetter(baseline.humanInterruptions, challenger.humanInterruptions),
  };
  const knownEfficiency = Object.entries(efficiency).filter(([,v]) => v !== null);
  const efficiencyImprovements = knownEfficiency.filter(([,v]) => v > 0);
  const efficiencyRegressions = knownEfficiency.filter(([,v]) => v < 0);

  const materialRegression = terminalRegression === true || qualityRegression === true || protectedRegressions.length > 0;
  const comparableEnough = terminalComparable;
  const anyImprovement = terminalImprovement === true || qualityImprovement === true || protectedImprovements.length > 0 || efficiencyImprovements.length > 0;

  let verdict = 'insufficient_evidence';
  if (materialRegression) verdict = 'regression';
  else if (comparableEnough && anyImprovement) verdict = 'candidate_improvement';
  else if (comparableEnough) verdict = 'decision_equivalent_observed';

  return {
    caseId,
    verdict,
    terminal:{ baselineSuccess, challengerSuccess, comparable:terminalComparable, preserved:terminalPreserved, regression:terminalRegression, improvement:terminalImprovement },
    quality:{ baseline:finite(baseline.quality), challenger:finite(challenger.quality), delta:qualityDelta, tolerance:qualityTolerance, comparable:qualityComparable, regression:qualityRegression, improvement:qualityImprovement },
    protectedMetrics,
    protectedRegressionCount:protectedRegressions.length,
    efficiency,
    knownEfficiencyMetricCount:knownEfficiency.length,
    efficiencyImprovementCount:efficiencyImprovements.length,
    efficiencyRegressionCount:efficiencyRegressions.length,
    materialRegression,
    promotionCandidate:verdict === 'candidate_improvement',
    authority:{ productionPromotionAuthorized:false, reason:'A matched comparison can support a challenger hypothesis, but production promotion requires representative workload coverage and preserved protected outcomes across the required replay set.' },
    schemaVersion:1,
  };
}

export function verifyBatch(input = {}) {
  const comparisons = Array.isArray(input.comparisons) ? input.comparisons : [];
  if (!comparisons.length) throw new Error('Provide at least one baseline/challenger comparison.');
  const results = comparisons.map((x) => verifyComparison(x, input));
  const regressions = results.filter((x) => x.verdict === 'regression');
  const candidates = results.filter((x) => x.verdict === 'candidate_improvement');
  const insufficient = results.filter((x) => x.verdict === 'insufficient_evidence');
  const representativeWorkload = input.representativeWorkload === true;
  return {
    ok:true,
    comparisonCount:results.length,
    regressionCount:regressions.length,
    candidateImprovementCount:candidates.length,
    decisionEquivalentCount:results.filter((x)=>x.verdict==='decision_equivalent_observed').length,
    insufficientEvidenceCount:insufficient.length,
    representativeWorkload,
    replaySetPass:representativeWorkload && regressions.length === 0 && insufficient.length === 0,
    results,
    authority:{
      productionPromotionAuthorized:false,
      reason: representativeWorkload && regressions.length===0 && insufficient.length===0
        ? 'The supplied replay set passed this deterministic witness, but production authority remains external to this Actor.'
        : 'The replay set is not sufficient to authorize production promotion.'
    },
    epistemicBoundary:'This Actor compares supplied evidence; it does not execute the workload, prove that cases are truly matched, infer missing quality, or allow cost savings to compensate for terminal/protected-value regressions.',
    schemaVersion:1,
  };
}
