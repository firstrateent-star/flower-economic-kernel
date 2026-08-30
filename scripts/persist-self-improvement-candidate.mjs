import fs from 'node:fs/promises';
import path from 'node:path';

const REPORT_PATH = process.env.FLOWER_IMPROVEMENT_REPORT
  || 'reports/self-improvement-observatory-latest.json';
const LEDGER_DIR = process.env.FLOWER_IMPROVEMENT_LEDGER_DIR
  || 'observations/self-improvement-ledger';

function safeKey(value) {
  return String(value ?? 'unknown').replace(/[^a-zA-Z0-9._-]/g, '_');
}

async function main() {
  const report = JSON.parse(await fs.readFile(REPORT_PATH, 'utf8'));
  const comparison = report.baselineComparison;

  if (report.currentClaims?.selfImprovementObserved !== true) {
    console.log(JSON.stringify({ persisted: false, reason: 'no_verified_internal_improvement' }));
    return;
  }

  if (report.currentClaims?.externalValueObserved !== false) {
    throw new Error('Internal improvement ledger may not persist a report that claims external value.');
  }
  if (comparison?.comparisonValid !== true || comparison?.state !== 'internal_improvement_evidenced') {
    throw new Error('Internal improvement persistence requires a valid internal_improvement_evidenced comparison.');
  }
  if (!Array.isArray(comparison.improvedDimensions) || comparison.improvedDimensions.length === 0) {
    throw new Error('Internal improvement persistence requires at least one verified improved dimension.');
  }
  if (Array.isArray(comparison.regressedDimensions) && comparison.regressedDimensions.length > 0) {
    throw new Error('Internal improvement persistence may not hide verified regressions.');
  }
  if (!comparison.internalImprovementCandidate?.comparisonVerified) {
    throw new Error('Internal improvement persistence requires a comparison-verified candidate.');
  }

  const record = {
    ...report,
    sourceWorkflowRun: Number(process.env.GITHUB_RUN_ID ?? 0) || null,
    persistedAt: new Date().toISOString(),
    persistenceState: 'cold_verified_internal_improvement',
    explicitNonClaims: [
      'This record does not prove external usefulness.',
      'This record does not prove demand, willingness to pay, ownership, revenue, or regenerative surplus.',
      'This record is scoped to the declared workload and decision witness.',
    ],
  };

  await fs.mkdir(LEDGER_DIR, { recursive: true });
  const filename = `${safeKey(report.workloadKey)}__${safeKey(report.implementationKey)}.json`;
  const file = path.join(LEDGER_DIR, filename);
  const serialized = `${JSON.stringify(record, null, 2)}\n`;

  try {
    await fs.writeFile(file, serialized, { encoding: 'utf8', flag: 'wx' });
    console.log(JSON.stringify({ persisted: true, file, state: record.persistenceState }));
  } catch (error) {
    if (error?.code !== 'EEXIST') throw error;
    console.log(JSON.stringify({ persisted: false, reason: 'candidate_already_persisted', file }));
  }
}

main().catch((error) => {
  console.error(error?.stack ?? error);
  process.exitCode = 1;
});
