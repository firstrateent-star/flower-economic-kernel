import fs from 'node:fs/promises';
import path from 'node:path';
import { analyzeMetaLearningEpisodes } from '../src/core/meta-learning.js';

const HISTORICAL_PATH = process.env.FLOWER_META_LEARNING_EPISODES
  || 'methodology/meta-learning/episodes-v2.json';
const PROSPECTIVE_PATH = process.env.FLOWER_META_LEARNING_PROSPECTIVE_EPISODES
  || 'methodology/meta-learning/prospective-episodes-v1.json';
const OUTPUT_PATH = process.env.FLOWER_META_LEARNING_REPORT
  || 'reports/meta-learning-observatory-latest.json';

async function readEpisodes(file) {
  const source = JSON.parse(await fs.readFile(file, 'utf8'));
  return {
    path: file,
    epistemicStatus: source.epistemicStatus ?? null,
    episodes: source.episodes ?? [],
  };
}

async function main() {
  const historical = await readEpisodes(HISTORICAL_PATH);
  const prospective = await readEpisodes(PROSPECTIVE_PATH);
  const episodes = [...historical.episodes, ...prospective.episodes];
  const analysis = analyzeMetaLearningEpisodes(episodes);
  const report = {
    ...analysis,
    probe: 'flower_meta_learning_observatory_v3',
    sourcePaths: [historical.path, prospective.path],
    sourceEpistemicStatuses: [historical.epistemicStatus, prospective.epistemicStatus],
    historicalEpisodeCount: historical.episodes.length,
    prospectiveEpisodeCount: prospective.episodes.length,
    generatedAt: new Date().toISOString(),
    externalFlourishingClaim: false,
    flourishingOrientation: {
      principle: 'Seek transformations that increase reachable flourishing while preserving truth, agency, sustainability, non-extraction, and the capacity for future good growth.',
      dimensions: ['agency', 'truth', 'capability', 'wellbeing', 'resilience', 'optionality', 'regeneration', 'resource_efficiency', 'displaced_costs', 'harm'],
      scalarized: false,
      conflictRule: 'Benefits to one organism do not count as broad flourishing when material costs or harms are merely displaced onto another without being represented.',
    },
    note: 'The combined lineage now contains one prospective comparable internal intervention. That is stronger than retrospective recurrence but still cannot establish external value or universal flourishing. The next earned question is bounded cross-domain transfer.',
  };

  await fs.mkdir(path.dirname(OUTPUT_PATH), { recursive: true });
  await fs.writeFile(OUTPUT_PATH, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  console.log(JSON.stringify(report, null, 2));
}

main().catch((error) => {
  console.error(error?.stack ?? error);
  process.exitCode = 1;
});
