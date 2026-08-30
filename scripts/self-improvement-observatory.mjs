import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { performance } from 'node:perf_hooks';
import { buildReasonerGardenView, diagnoseReasonerActivation } from '../src/core/reasoner-view.js';
import { classifyPressure } from '../src/core/pressure.js';
import { compareImprovementObservations } from '../src/core/improvement-observatory.js';

const OUTPUT_PATH = process.env.FLOWER_IMPROVEMENT_REPORT
  || 'reports/self-improvement-observatory-latest.json';
const BASELINE_PATH = process.env.FLOWER_IMPROVEMENT_BASELINE
  || 'benchmarks/self-improvement-baseline-v3.json';
const REVISION_KEY = process.env.GITHUB_SHA
  || process.env.FLOWER_IMPLEMENTATION_KEY
  || 'working-tree';
const CAUSAL_IMPLEMENTATION_FILES = [
  'src/core/reasoner-view.js',
  'src/core/pressure.js',
  'src/core/methodology-core.js',
  'src/core/improvement-transfer.js',
];

function percentile(values, p) {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.min(sorted.length - 1, Math.max(0, Math.floor((sorted.length - 1) * p)));
  return sorted[index];
}

async function causalImplementationFingerprint() {
  const hash = createHash('sha256');
  for (const file of CAUSAL_IMPLEMENTATION_FILES) {
    hash.update(file);
    hash.update('\0');
    hash.update(await fs.readFile(file));
    hash.update('\0');
  }
  return `causal_${hash.digest('hex').slice(0, 24)}`;
}

async function readBaseline() {
  try {
    return JSON.parse(await fs.readFile(BASELINE_PATH, 'utf8'));
  } catch (error) {
    if (error?.code === 'ENOENT') return null;
    throw error;
  }
}

function makeGarden(portfolioSize = 1) {
  const opportunities = [];
  const centers = [];
  for (let i = 0; i < portfolioSize; i += 1) {
    const isTarget = i === portfolioSize - 1;
    const id = isTarget ? 'target' : `cold_${i}`;
    opportunities.push({
      id,
      name: isTarget ? 'Target' : `Cold ${i}`,
      status: isTarget ? 'seed' : 'dormant',
      thesis: 'Synthetic stable observatory fixture.',
      failureArchetype: isTarget ? 'target_family' : `archetype_${i}`,
      reusableCapability: isTarget ? 'target_capability' : `capability_${i}`,
      selectedForExperiment: false,
      experimentId: null,
      fruitId: null,
    });
    centers.push({
      id,
      kind: 'opportunity',
      name: opportunities.at(-1).name,
      status: opportunities.at(-1).status,
      archetype: opportunities.at(-1).failureArchetype,
      archetypeFamily: opportunities.at(-1).failureArchetype,
      reusableCapability: opportunities.at(-1).reusableCapability,
      capabilityFamily: opportunities.at(-1).reusableCapability,
      nutrientChannel: null,
      coverage: {},
    });
  }

  return {
    schemaVersion: 2,
    id: 'garden_self_improvement_observatory',
    center: {
      rootGoal: 'Stable self-improvement observatory fixture',
      direction: 'Measure without manufacturing improvement.',
    },
    soil: [],
    fruits: [],
    opportunities,
    experiments: [],
    events: [],
    approvals: [],
    traces: [],
    transferSeeds: [],
    internalImprovements: [],
    humanActuationQueue: [],
    status: {},
    geometry: {
      version: 1,
      stage: 'synthetic_fixture',
      metrics: {},
      fruitOfLifeCenters: [],
      centers,
      archetypes: centers.map((center) => ({ name: center.archetypeFamily, centerIds: [center.id], reuseCount: 1 })),
      capabilities: centers.map((center) => ({ name: center.capabilityFamily, centerIds: [center.id], reuseCount: 1 })),
    },
  };
}

function decisionFixtures() {
  const seedGarden = makeGarden(1);
  const seedPressure = classifyPressure(seedGarden).type;

  const transferGarden = makeGarden(0);
  transferGarden.opportunities = [];
  transferGarden.geometry.centers = [];
  transferGarden.geometry.archetypes = [];
  transferGarden.geometry.capabilities = [];
  transferGarden.internalImprovements = [{
    id: 'fixture_internal_gain',
    name: 'Fixture internal gain',
    dimensions: {
      recomputation: { baseline: 10, after: 5, unit: 'ops', direction: 'lower', evidenceVerified: true },
    },
  }];
  const transferPressure = classifyPressure(transferGarden).type;

  const cases = [
    { name: 'seed routes to FALSIFY', expected: 'FALSIFY', actual: seedPressure },
    { name: 'unassessed verified internal gain routes to TRANSFER', expected: 'TRANSFER', actual: transferPressure },
  ];
  const passed = cases.filter((item) => item.expected === item.actual).length;
  return {
    cases,
    passed,
    total: cases.length,
    passRate: cases.length ? passed / cases.length : null,
    fingerprint: cases.map((item) => `${item.name}:${item.actual}`).join('|'),
  };
}

function measureTargetedProjection(portfolioSize, iterations = 150) {
  const garden = makeGarden(portfolioSize);
  const target = garden.opportunities.at(-1);
  for (let i = 0; i < 20; i += 1) {
    buildReasonerGardenView({ garden, operation: 'FALSIFY', target });
  }

  const activation = diagnoseReasonerActivation({ garden, operation: 'FALSIFY', target });
  const durations = [];
  let view = null;
  for (let i = 0; i < iterations; i += 1) {
    const started = performance.now();
    view = buildReasonerGardenView({ garden, operation: 'FALSIFY', target });
    durations.push(performance.now() - started);
  }
  const bytes = Buffer.byteLength(JSON.stringify(view), 'utf8');
  return {
    portfolioSize,
    projectedOpportunityCount: view.opportunities.length,
    projectedFruitCount: view.fruits.length,
    payloadBytes: bytes,
    activationRecordsExamined: activation.recordsExamined,
    activationLookupMode: activation.lookupMode,
    medianLatencyMs: percentile(durations, 0.5),
    p95LatencyMs: percentile(durations, 0.95),
    targetPreserved: view.opportunities.some((item) => item.id === 'target'),
  };
}

function observationFromReport(report) {
  return {
    workloadKey: report.workloadKey,
    workloadVersion: report.workloadVersion,
    implementationKey: report.implementationKey,
    measuredAt: report.completedAt,
    dimensions: report.dimensions,
    decisionWitness: report.decisionWitness,
    evidenceSources: [`revision:${report.revisionKey}`],
    caveats: report.caveats,
  };
}

function summarizeBaselineComparison(baseline, currentObservation) {
  if (!baseline) {
    return {
      state: 'baseline_missing',
      comparisonValid: false,
      selfImprovementObserved: false,
      reason: `No baseline exists at ${BASELINE_PATH}.`,
    };
  }

  if (baseline.implementationKey === currentObservation.implementationKey) {
    return {
      state: 'same_causal_implementation',
      comparisonValid: false,
      selfImprovementObserved: false,
      reason: 'Repository revision changed without changing this workload\'s declared causal implementation fingerprint.',
      baselineImplementationKey: baseline.implementationKey,
      currentImplementationKey: currentObservation.implementationKey,
    };
  }

  const comparison = compareImprovementObservations(baseline, currentObservation, {
    name: 'Fixture-scoped Flower causal implementation comparison',
    description: 'Compares the current causal implementation against the canonical observatory baseline on the declared stable workload only.',
    sourceArtifact: OUTPUT_PATH,
  });

  return {
    state: comparison.comparisonValid
      ? comparison.assessment.internalState
      : 'not_comparable',
    comparisonValid: comparison.comparisonValid,
    selfImprovementObserved: comparison.comparisonValid
      && comparison.assessment.internalState === 'internal_improvement_evidenced',
    sameWorkload: comparison.sameWorkload,
    implementationChanged: comparison.implementationChanged,
    witnessMode: comparison.witness.mode,
    improvedDimensions: comparison.assessment.improvedDimensions,
    regressedDimensions: comparison.assessment.regressedDimensions,
    unitMismatches: comparison.unitMismatches,
    baselineImplementationKey: baseline.implementationKey,
    currentImplementationKey: currentObservation.implementationKey,
    internalImprovementCandidate: comparison.comparisonValid
      ? comparison.improvement
      : null,
    scopeNote: 'Any improvement state is scoped only to this declared workload and its decision witness. It is not a claim of global Flower improvement or external value.',
  };
}

async function main() {
  const startedAt = new Date().toISOString();
  const implementationKey = await causalImplementationFingerprint();
  const decisions = decisionFixtures();
  const portfolioSizes = [10, 100, 1000, 5000];
  const projections = portfolioSizes.map((size) => measureTargetedProjection(size));
  const largest = projections.at(-1);
  const complexityCapacity = projections
    .filter((item) => item.targetPreserved && item.projectedOpportunityCount === 1 && item.payloadBytes < 30000)
    .map((item) => item.portfolioSize)
    .reduce((max, value) => Math.max(max, value), 0);

  const report = {
    schemaVersion: 4,
    probe: 'flower_self_improvement_observatory_v3',
    epistemicStatus: 'observation_only',
    startedAt,
    completedAt: new Date().toISOString(),
    revisionKey: REVISION_KEY,
    implementationKey,
    causalImplementationFiles: CAUSAL_IMPLEMENTATION_FILES,
    workloadKey: 'kernel_targeted_projection_and_pressure_fixture',
    workloadVersion: 3,
    dimensions: {
      computeInputProxy: {
        value: largest.payloadBytes,
        unit: 'projected-json-bytes',
        direction: 'lower',
        evidenceVerified: true,
        proxy: true,
        note: 'Payload bytes are a compute/input proxy, not a physical-energy measurement.',
      },
      activationWorkProxy: {
        value: largest.activationRecordsExamined,
        unit: 'geometry-records-examined',
        direction: 'lower',
        evidenceVerified: true,
        proxy: true,
        note: 'Exact record-visit witness for the targeted neighborhood-resolution path on this workload; a compute-work proxy, not physical energy.',
      },
      speed: {
        value: largest.medianLatencyMs,
        unit: 'milliseconds',
        direction: 'lower',
        evidenceVerified: false,
        proxy: false,
        note: 'Observed on a shared CI runner. Retained for trend visibility but not promotion evidence until repeated or controlled measurements establish comparability.',
      },
      accuracy: {
        value: decisions.passRate,
        unit: 'fixture-pass-rate',
        direction: 'higher',
        evidenceVerified: true,
        proxy: false,
        note: 'Accuracy here means correctness on declared deterministic pressure-routing fixtures, not general intelligence accuracy.',
      },
      complexityCapacity: {
        value: complexityCapacity,
        unit: 'synthetic-portfolio-items-under-30kb-targeted-view',
        direction: 'higher',
        evidenceVerified: true,
        proxy: true,
        note: 'Synthetic capacity witness for sparse activation; not a universal complexity measure.',
      },
    },
    decisionWitness: {
      verified: decisions.passRate === 1,
      taskKey: 'pressure-routing-fixture-v3',
      resultFingerprint: decisions.fingerprint,
      qualityScore: decisions.passRate,
      qualityDirection: 'higher',
    },
    projections,
    decisionFixtures: decisions,
    physicalEnergyMeasured: false,
    baselinePath: BASELINE_PATH,
    currentClaims: {
      selfImprovementObserved: false,
      externalValueObserved: false,
    },
    caveats: [
      'Different workloads or workload versions must not be compared as self-improvement evidence.',
      'Repository revisions that do not change the declared causal implementation files do not count as implementation changes for this workload.',
      'Activation record visits are a deterministic compute-work proxy for this resolution path, not a universal compute or energy metric.',
      'CI timing is retained as an observation but is not promotion evidence until repeated or controlled measurements make it comparable enough.',
      'Payload bytes and synthetic portfolio capacity are explicit proxies, not energy or universal complexity truth.',
      'A benchmark improvement would prove only an internal gain on this fixture; external usefulness requires separate evidence.',
    ],
  };

  const baseline = await readBaseline();
  const baselineComparison = summarizeBaselineComparison(baseline, observationFromReport(report));
  report.baselineComparison = baselineComparison;
  report.currentClaims.selfImprovementObserved = baselineComparison.selfImprovementObserved === true;
  report.currentClaims.selfImprovementScope = baselineComparison.selfImprovementObserved
    ? 'fixture_scoped_internal_only'
    : null;
  report.currentClaims.externalValueObserved = false;
  report.currentClaims.why = baselineComparison.selfImprovementObserved
    ? 'A comparable causal implementation improved this stable internal workload without a verified regression. External usefulness remains unverified.'
    : baselineComparison.reason ?? baselineComparison.scopeNote ?? 'No promotion-quality internal improvement was observed.';

  await fs.mkdir(path.dirname(OUTPUT_PATH), { recursive: true });
  await fs.writeFile(OUTPUT_PATH, `${JSON.stringify(report, null, 2)}\n`);
  console.log(JSON.stringify(report, null, 2));
}

main().catch((error) => {
  console.error(error?.stack ?? error);
  process.exitCode = 1;
});
