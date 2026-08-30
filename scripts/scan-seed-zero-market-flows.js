import fs from 'node:fs/promises';
import { fetchPublicStore, rankSeedZeroCandidates } from '../src/economics/seed-zero-market-flow-scanner.js';

const outputPath = process.argv[2] ?? 'artifacts/seed-zero-market-flow-scan.json';
const maxActors = Math.max(100, Math.min(Number(process.env.SEED_ZERO_MAX_ACTORS ?? 5000), 10000));
const actors = await fetchPublicStore({ maxActors });
const ranked = rankSeedZeroCandidates(actors, { minimumRecentUsers: 1, limit: 100 });
const report = {
  schemaVersion: 1,
  observedAt: new Date().toISOString(),
  source: 'https://api.apify.com/v2/store',
  sourceAuthenticationRequired: false,
  scannedActors: actors.length,
  methodology: {
    objective: 'Find zero-cash machine-consumed generative transformations with current usage and lower competitive concentration; do not rank raw popularity alone.',
    caveat: 'Marketplace usage is demand evidence, not proof that a new entrant can capture demand. Ranking is a probe for where deeper falsification is earned.',
  },
  topFamilies: ranked.families.slice(0, 20),
  topCandidates: ranked.candidates.slice(0, 50),
};
await fs.mkdir(outputPath.split('/').slice(0, -1).join('/') || '.', { recursive: true });
await fs.writeFile(outputPath, `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify({ observedAt: report.observedAt, scannedActors: report.scannedActors, topFamilies: report.topFamilies.slice(0, 8), topCandidates: report.topCandidates.slice(0, 12) }));
