import fs from 'node:fs/promises';
import { fetchPublicStore, rankSeedZeroProbes } from '../src/economics/seed-zero-market-flow-scanner.js';
import { summarizeMarketArchetypes } from '../src/economics/seed-zero-market-archetypes.js';

const outputPath = process.argv[2] ?? 'artifacts/seed-zero-market-flow-scan.json';
const maxActors = Math.max(100, Math.min(Number(process.env.SEED_ZERO_MAX_ACTORS ?? 5000), 10000));
const actors = await fetchPublicStore({ maxActors });
const ranked = rankSeedZeroProbes(actors, { minimumRecentUsers: 1, limit: 100 });
const archetypes = summarizeMarketArchetypes(actors);
const gapProbeFamilies = ranked.families.filter((x) => x.evidenceClass === 'GAP_PROBE_EARNED');
const gapProbes = ranked.probes.filter((x) => gapProbeFamilies.some((family) => family.family === x.family));
const report = {
  schemaVersion: 3,
  observedAt: new Date().toISOString(),
  source: 'https://api.apify.com/v2/store',
  sourceAuthenticationRequired: false,
  scannedActors: actors.length,
  methodology: {
    objective: 'Use Store telemetry to witness current machine-consumed demand, separate raw source access from higher-order transformations, and identify where independent gap falsification is worth attention.',
    epistemicBoundary: 'Store usage can witness demand, breadth, concentration, pricing, agentic compatibility, and product archetype. It cannot prove that an unserved buyer gap exists.',
    promotionRule: 'No Store-only result is build-eligible. Construction requires an independent buyer-gap witness and a separate activation-distance assessment.',
  },
  marketArchetypes: archetypes,
  topFamilies: ranked.families.slice(0, 20),
  gapProbeFamilies: gapProbeFamilies.slice(0, 20),
  topDemandWitnesses: ranked.probes.slice(0, 50),
  gapProbes: gapProbes.slice(0, 50),
  buildCandidates: [],
};
await fs.mkdir(outputPath.split('/').slice(0, -1).join('/') || '.', { recursive: true });
await fs.writeFile(outputPath, `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify({
  observedAt: report.observedAt,
  scannedActors: report.scannedActors,
  marketArchetypes: report.marketArchetypes,
  gapProbeFamilies: report.gapProbeFamilies.slice(0, 8),
  gapProbes: report.gapProbes.slice(0, 12),
  buildCandidates: report.buildCandidates,
}));
