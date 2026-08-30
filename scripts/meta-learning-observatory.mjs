import fs from 'node:fs/promises';
import path from 'node:path';
import { analyzeMetaLearningEpisodes } from '../src/core/meta-learning.js';

const INPUT_PATH = process.env.FLOWER_META_LEARNING_EPISODES
  || 'methodology/meta-learning/episodes-v1.json';
const OUTPUT_PATH = process.env.FLOWER_META_LEARNING_REPORT
  || 'reports/meta-learning-observatory-latest.json';

async function main() {
  const source = JSON.parse(await fs.readFile(INPUT_PATH, 'utf8'));
  const analysis = analyzeMetaLearningEpisodes(source.episodes ?? []);
  const report = {
    ...analysis,
    probe: 'flower_meta_learning_observatory_v1',
    sourcePath: INPUT_PATH,
    generatedAt: new Date().toISOString(),
    sourceEpistemicStatus: source.epistemicStatus ?? null,
    externalFlourishingClaim: false,
    note: 'This report can identify recurring internal learning mechanisms and prospective tests. It cannot claim that Flower improves all systems, people, or forms of life without independent external evidence and conflict-aware evaluation.',
  };

  await fs.mkdir(path.dirname(OUTPUT_PATH), { recursive: true });
  await fs.writeFile(OUTPUT_PATH, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  console.log(JSON.stringify(report, null, 2));
}

main().catch((error) => {
  console.error(error?.stack ?? error);
  process.exitCode = 1;
});
