import fs from 'node:fs/promises';
import path from 'node:path';
import { methodologyProjectionMatrix } from '../research/methodology/methodology-projection.js';

const OUTPUT = process.env.FLOWER_METHODOLOGY_PROJECTION_REPORT
  || 'reports/methodology-projection-observatory-latest.json';

const rows = methodologyProjectionMatrix();
const report = {
  probe: 'flower_methodology_projection_observatory_v1',
  generatedAt: new Date().toISOString(),
  canonicalMethodologyVersion: '2026-08-30.integrated-v5',
  rows,
  summary: {
    operationCount: rows.length,
    minReductionFraction: Math.min(...rows.map((row) => row.reductionFraction)),
    maxReductionFraction: Math.max(...rows.map((row) => row.reductionFraction)),
    meanReductionFraction: Number((rows.reduce((sum, row) => sum + row.reductionFraction, 0) / rows.length).toFixed(6)),
    allProtectedSpinesPresent: rows.every((row) => row.protectedSpinePresent),
  },
  claims: {
    structuralPayloadReductionObserved: rows.every((row) => row.bytesSaved > 0),
    decisionEquivalenceVerified: false,
    runtimePromotionAuthorized: false,
  },
  nextPressure:
    'Run same-workload paired reasoner comparisons using full methodology versus projected methodology. Promote only if decision/evidence/authority outcomes remain equivalent or improve while payload decreases.',
};

await fs.mkdir(path.dirname(OUTPUT), { recursive: true });
await fs.writeFile(OUTPUT, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
console.log(JSON.stringify(report, null, 2));
