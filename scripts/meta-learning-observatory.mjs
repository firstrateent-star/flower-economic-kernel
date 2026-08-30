import fs from 'node:fs/promises';
import path from 'node:path';
import { analyzeMetaLearningEpisodes } from '../src/core/meta-learning.js';

const INPUT_PATH = process.env.FLOWER_META_LEARNING_EPISODES
  || 'methodology/meta-learning/episodes-v2.json';
const OUTPUT_PATH = process.env.FLOWER_META_LEARNING_REPORT
  || 'reports/meta-learning-observatory-latest.json';

async function main() {
  const source = JSON.parse(await fs.readFile(INPUT_PATH, 'utf8'));
  const analysis = analyzeMetaLearningEpisodes(source.episodes ?? []);
  const report = {
    ...analysis,
    probe: 'flower_meta_learning_observatory_v2',
    sourcePath: INPUT_PATH,
    generatedAt: new Date().toISOString(),
    sourceEpistemicStatus: source.epistemicStatus ?? null,
    externalFlourishingClaim: false,
    flourishingOrientation: {
      principle: 'Seek transformations that increase reachable flourishing while preserving truth, agency, sustainability, non-extraction, and the capacity for future good growth.',
      dimensions: ['agency', 'truth', 'capability', 'wellbeing', 'resilience', 'optionality', 'regeneration', 'resource_efficiency', 'displaced_costs', 'harm'],
      scalarized: false,
      conflictRule: 'Benefits to one organism do not count as broad flourishing when material costs or harms are merely displaced onto another without being represented.',
    },
    note: 'Historical meta-learning can generate bounded prospective experiments. It cannot establish universal causality or claim flourishing for all systems, people, or living things without independent external and conflict-aware evidence.',
  };

  await fs.mkdir(path.dirname(OUTPUT_PATH), { recursive: true });
  await fs.writeFile(OUTPUT_PATH, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  console.log(JSON.stringify(report, null, 2));
}

main().catch((error) => {
  console.error(error?.stack ?? error);
  process.exitCode = 1;
});
