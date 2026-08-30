import fs from 'node:fs/promises';
import path from 'node:path';
import { FRUIT_OF_LIFE_CENTERS, refreshGeometry } from '../src/core/geometry.js';
import { flowerGeometryProjectionAudit, neighborhoodByDimensions } from '../src/core/activation-projection-audit.js';

const INPUT_PATH = process.env.FLOWER_DIMENSIONAL_GARDEN || 'garden/seed.json';
const OUTPUT_PATH = process.env.FLOWER_DIMENSIONAL_REPORT || 'reports/dimensional-projection-observatory-latest.json';

function entropy(values = []) {
  const counts = new Map();
  for (const value of values) counts.set(value, Number(counts.get(value) ?? 0) + 1);
  const total = values.length;
  if (total === 0) return 0;
  let h = 0;
  for (const count of counts.values()) {
    const p = count / total;
    h -= p * Math.log2(p);
  }
  return h;
}

function meaningfulCoverageState(value) {
  return value != null && !['unknown', 'claimed'].includes(String(value));
}

function dimensionStats(centers, dimension) {
  const pathName = `coverage.${dimension}`;
  const values = centers.map((center) => center?.coverage?.[dimension] ?? 'missing');
  const meaningful = values.filter(meaningfulCoverageState);
  const distinct = [...new Set(values)].sort();
  const meaningfulDistinct = [...new Set(meaningful)].sort();
  return {
    dimension,
    path: pathName,
    entropyBits: entropy(values),
    distinctStates: distinct,
    meaningfulDistinctStates: meaningfulDistinct,
    meaningfulCoverageCount: meaningful.length,
    centerCount: centers.length,
    invariant: distinct.length <= 1,
    potentiallyDiscriminating: distinct.length > 1 && meaningfulDistinct.length > 0,
  };
}

function currentFamilyNeighborhood(geometry, targetId) {
  return neighborhoodByDimensions(
    geometry.centers ?? [],
    targetId,
    ['archetypeFamily', 'capabilityFamily'],
  ).ids;
}

function targetCoverageCandidates(geometry, targetId, stats) {
  const target = (geometry.centers ?? []).find((center) => center.id === targetId);
  if (!target) return [];

  return stats
    .filter((stat) => stat.potentiallyDiscriminating)
    .filter((stat) => meaningfulCoverageState(target.coverage?.[stat.dimension]))
    .map((stat) => {
      const audit = flowerGeometryProjectionAudit(geometry, targetId, [stat.path]);
      return {
        dimension: stat.dimension,
        targetState: target.coverage?.[stat.dimension] ?? null,
        entropyBits: stat.entropyBits,
        currentFamilyNeighborhoodSize: audit.indexedIds.length,
        coverageChartSize: audit.requiredIds.length,
        coverageOnlyNeighborIds: audit.missingRequiredIds,
        familyOnlyNeighborIds: audit.extraIndexedIds,
        candidateHiddenDimension: audit.missingRequiredIds.length > 0,
        candidateOverActivation: audit.extraIndexedIds.length > 0,
        causalRelevanceVerified: false,
      };
    });
}

async function main() {
  const garden = JSON.parse(await fs.readFile(INPUT_PATH, 'utf8'));
  refreshGeometry(garden);
  const geometry = garden.geometry;
  const centers = geometry?.centers ?? [];
  const stats = FRUIT_OF_LIFE_CENTERS.map((dimension) => dimensionStats(centers, dimension));
  const targetAudits = centers.map((center) => ({
    targetId: center.id,
    name: center.name,
    kind: center.kind,
    familyNeighborhoodSize: currentFamilyNeighborhood(geometry, center.id).length,
    coverageCandidates: targetCoverageCandidates(geometry, center.id, stats),
  }));

  const hiddenCandidates = targetAudits.flatMap((target) => target.coverageCandidates
    .filter((candidate) => candidate.candidateHiddenDimension)
    .map((candidate) => ({ targetId: target.targetId, ...candidate })));
  const overActivationCandidates = targetAudits.flatMap((target) => target.coverageCandidates
    .filter((candidate) => candidate.candidateOverActivation)
    .map((candidate) => ({ targetId: target.targetId, ...candidate })));

  hiddenCandidates.sort((a, b) => b.coverageOnlyNeighborIds.length - a.coverageOnlyNeighborIds.length
    || b.entropyBits - a.entropyBits);
  overActivationCandidates.sort((a, b) => b.familyOnlyNeighborIds.length - a.familyOnlyNeighborIds.length
    || b.entropyBits - a.entropyBits);

  const report = {
    schemaVersion: 1,
    probe: 'flower_dimensional_projection_observatory_v1',
    epistemicStatus: 'real_garden_projection_baseline_not_causal_relevance_proof',
    generatedAt: new Date().toISOString(),
    inputPath: INPUT_PATH,
    originQuestion: 'Could the Flower of Life help reveal or access something like another dimension?',
    operationalTranslation: 'A hidden decision dimension is a causally relevant state coordinate omitted from the active projection. This Observatory can detect representational divergence, not causal relevance or alternate physical dimensions.',
    geometry: {
      version: geometry?.version ?? null,
      stage: geometry?.stage ?? null,
      centerCount: centers.length,
      indexedActivationDimensions: ['archetypeFamily', 'capabilityFamily'],
      fruitOfLifeCoverageDimensions: FRUIT_OF_LIFE_CENTERS,
    },
    dimensionStats: stats,
    targetAudits,
    summary: {
      potentiallyDiscriminatingCoverageDimensions: stats.filter((stat) => stat.potentiallyDiscriminating).map((stat) => stat.dimension),
      invariantCoverageDimensions: stats.filter((stat) => stat.invariant).map((stat) => stat.dimension),
      candidateHiddenDimensionRelationCount: hiddenCandidates.length,
      candidateOverActivationRelationCount: overActivationCandidates.length,
      topHiddenCandidates: hiddenCandidates.slice(0, 12),
      topOverActivationCandidates: overActivationCandidates.slice(0, 12),
    },
    physicalAlternateDimensionClaim: false,
    runtimeMutationAuthorized: false,
    nextPressure: hiddenCandidates.length > 0
      ? {
          type: 'OPERATION_SPECIFIC_DECISION_EQUIVALENCE_TEST',
          why: 'The real Garden contains coverage relationships not represented by the current two-family activation chart. Choose one real reasoner operation and test whether one omitted coordinate changes the decision before modifying runtime activation.',
        }
      : {
          type: 'PRESERVE_CURRENT_PROJECTION',
          why: 'No current meaningful coverage-only relation was found. Preserve the sparse family projection until new Garden structure creates a decision-relevant divergence.',
        },
  };

  await fs.mkdir(path.dirname(OUTPUT_PATH), { recursive: true });
  await fs.writeFile(OUTPUT_PATH, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  console.log(JSON.stringify(report, null, 2));
}

main().catch((error) => {
  console.error(error?.stack ?? error);
  process.exitCode = 1;
});
