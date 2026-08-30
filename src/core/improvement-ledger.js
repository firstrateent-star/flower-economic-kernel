import fs from 'node:fs/promises';
import path from 'node:path';

function clone(value) {
  return value == null ? value : structuredClone(value);
}

async function listJsonFiles(dir) {
  try {
    return (await fs.readdir(dir, { withFileTypes: true }))
      .filter((entry) => entry.isFile() && entry.name.endsWith('.json'))
      .map((entry) => path.join(dir, entry.name))
      .sort();
  } catch (error) {
    if (error?.code === 'ENOENT') return [];
    throw error;
  }
}

function admissibleImprovementRecord(record = {}) {
  const comparison = record.baselineComparison;
  const candidate = comparison?.internalImprovementCandidate;
  const regressed = Array.isArray(comparison?.regressedDimensions)
    ? comparison.regressedDimensions
    : [];

  return record.epistemicStatus === 'observation_only'
    && record.currentClaims?.selfImprovementObserved === true
    && record.currentClaims?.externalValueObserved === false
    && comparison?.comparisonValid === true
    && comparison?.state === 'internal_improvement_evidenced'
    && Array.isArray(comparison?.improvedDimensions)
    && comparison.improvedDimensions.length > 0
    && regressed.length === 0
    && candidate?.comparisonVerified === true
    && typeof candidate?.id === 'string'
    && candidate.id.length > 0;
}

function normalizedCandidate(record, sourceFile) {
  const candidate = clone(record.baselineComparison.internalImprovementCandidate);
  return {
    ...candidate,
    sourceArtifact: sourceFile,
    observatoryProvenance: {
      sourceWorkflowRun: record.sourceWorkflowRun ?? null,
      sourceRevision: record.revisionKey ?? record.sourceRevision ?? null,
      implementationKey: record.implementationKey ?? null,
      workloadKey: record.workloadKey ?? null,
      workloadVersion: record.workloadVersion ?? null,
      comparisonState: record.baselineComparison?.state ?? null,
      externalValueObserved: false,
    },
    externalValueVerified: false,
    repeatExternalValueVerified: false,
    externalProblemEvidence: [],
  };
}

function upsertById(list, item) {
  const existing = list.find((entry) => entry?.id === item.id);
  if (!existing) {
    list.push(item);
    return 'created';
  }
  if (JSON.stringify(existing) === JSON.stringify(item)) return 'unchanged';
  Object.assign(existing, item);
  return 'updated';
}

export async function reconcileImprovementEvidenceLedger(garden, {
  rootDir = process.cwd(),
  relativeDir = 'observations/self-improvement-ledger',
} = {}) {
  if (!garden) throw new Error('reconcileImprovementEvidenceLedger requires a Garden.');
  garden.internalImprovements ??= [];

  const dir = path.join(rootDir, relativeDir);
  const files = await listJsonFiles(dir);
  const created = [];
  const updated = [];
  const rejected = [];

  for (const file of files) {
    const record = JSON.parse(await fs.readFile(file, 'utf8'));
    const sourceFile = path.relative(rootDir, file).replaceAll(path.sep, '/');
    if (!admissibleImprovementRecord(record)) {
      rejected.push({ sourceFile, reason: 'record_not_admissible_as_verified_internal_improvement' });
      continue;
    }

    const candidate = normalizedCandidate(record, sourceFile);
    const state = upsertById(garden.internalImprovements, candidate);
    if (state === 'created') created.push(candidate.id);
    if (state === 'updated') updated.push(candidate.id);
  }

  return {
    changed: created.length > 0 || updated.length > 0,
    filesScanned: files.length,
    created,
    updated,
    rejected,
  };
}
