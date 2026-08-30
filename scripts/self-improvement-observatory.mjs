import fs from 'node:fs/promises';
import path from 'node:path';
import { performance } from 'node:perf_hooks';
import { buildReasonerGardenView } from '../src/core/reasoner-view.js';
import { classifyPressure } from '../src/core/pressure.js';

const OUTPUT_PATH = process.env.FLOWER_IMPROVEMENT_REPORT
  || 'reports/self-improvement-observatory-latest.json';
const IMPLEMENTATION_KEY = process.env.FLOWER_IMPLEMENTATION_KEY
  || process.env.GITHUB_SHA
  || 'working-tree';

function percentile(values, p) {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.min(sorted.length - 1, Math.max(0, Math.floor((sorted.length - 1) * p)));
  return sorted[index];
}

function makeGarden(portfolioSize = 1) {
  const opportunities = [];
  const centers = [];
  for (let i = 0; i < portfolioSize; i += 1) {
    const id = i === 0 ? 'target' : `cold_${i}`;
    opportunities.push({
      id,
      name: i === 0 ? 'Target' : `Cold ${i}`,
      status: i === 0 ? 'seed' : 'dormant',
      thesis: 'Synthetic stable observatory fixture.',
      failureArchetype: i === 0 ? 'target_family' : `archetype_${i}`,
      reusableCapability: i === 0 ? 'target_capability' : `capability_${i}`,
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
  const target = garden.opportunities[0];
  for (let i = 0; i < 20; i += 1) {
    buildReasonerGardenView({ garden, operation: 'FALSIFY', target });
  }

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
    medianLatencyMs: percentile(durations, 0.5),
    p95LatencyMs: percentile(durations, 0.95),
    targetPreserved: view.opportunities.some((item) => item.id === 'target'),
  };
}

async function main() {
  const startedAt = new Date().toISOString();
  const decisions = decisionFixtures();
  const portfolioSizes = [10, 100, 1000, 5000];
  const projections = portfolioSizes.map((size) => measureTargetedProjection(size));
  const largest = projections.at(-1);
  const complexityCapacity = projections
    .filter((item) => item.targetPreserved && item.projectedOpportunityCount === 1 && item.payloadBytes < 30000)
    .map((item) => item.portfolioSize)
    .reduce((max, value) => Math.max(max, value), 0);

  const report = {
    schemaVersion: 1,
    probe: 'flower_self_improvement_observatory_v1',
    epistemicStatus: 'observation_only',
    startedAt,
    completedAt: new Date().toISOString(),
    implementationKey: IMPLEMENTATION_KEY,
    workloadKey: 'kernel_targeted_projection_and_pressure_fixture_v1',
    workloadVersion: 1,
    dimensions: {
      computeInputProxy: {
        value: largest.payloadBytes,
        unit: 'projected-json-bytes',
        direction: 'lower',
        evidenceVerified: true,
        proxy: true,
        note: 'Payload bytes are a compute/input proxy, not a physical-energy measurement.',
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
      taskKey: 'pressure-routing-fixture-v1',
      resultFingerprint: decisions.fingerprint,
      qualityScore: decisions.passRate,
      qualityDirection: 'higher',
    },
    projections,
    decisionFixtures: decisions,
    physicalEnergyMeasured: false,
    currentClaims: {
      selfImprovementObserved: false,
      why: 'This run establishes an accountable observation. Improvement requires a comparable prior observation from the same workload/version and an implementation change.',
      externalValueObserved: false,
    },
    caveats: [
      'Different workloads or workload versions must not be compared as self-improvement evidence.',
      'CI timing is retained as an observation but is not promotion evidence until repeated or controlled measurements make it comparable enough.',
      'Payload bytes and synthetic portfolio capacity are explicit proxies, not energy or universal complexity truth.',
      'A benchmark improvement would prove only an internal gain on this fixture; external usefulness requires separate evidence.',
    ],
  };

  await fs.mkdir(path.dirname(OUTPUT_PATH), { recursive: true });
  await fs.writeFile(OUTPUT_PATH, `${JSON.stringify(report, null, 2)}\n`);
  console.log(JSON.stringify(report, null, 2));
}

main().catch((error) => {
  console.error(error?.stack ?? error);
  process.exitCode = 1;
});
