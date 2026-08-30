import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { reconcileImprovementEvidenceLedger } from '../src/core/improvement-ledger.js';
import { reconcileImprovementTransferSeeds } from '../src/core/improvement-transfer.js';

function verifiedRecord(overrides = {}) {
  return {
    epistemicStatus: 'observation_only',
    revisionKey: 'revision_after',
    implementationKey: 'causal_after',
    workloadKey: 'stable_fixture',
    workloadVersion: 1,
    currentClaims: {
      selfImprovementObserved: true,
      externalValueObserved: false,
    },
    baselineComparison: {
      state: 'internal_improvement_evidenced',
      comparisonValid: true,
      improvedDimensions: ['latency'],
      regressedDimensions: [],
      internalImprovementCandidate: {
        id: 'imp_verified_fixture',
        name: 'Verified fixture improvement',
        workloadKey: 'stable_fixture',
        workloadVersion: 1,
        comparisonVerified: true,
        dimensions: {
          latency: {
            baseline: 100,
            after: 60,
            unit: 'ms',
            direction: 'lower',
            evidenceVerified: true,
          },
          accuracy: {
            baseline: 1,
            after: 1,
            unit: 'fixture-pass-rate',
            direction: 'higher',
            evidenceVerified: true,
          },
        },
        internalEvidence: ['Comparable workload.', 'Verified decision equivalence.'],
      },
    },
    ...overrides,
  };
}

async function tempRoot() {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'flower-improvement-ledger-'));
  await fs.mkdir(path.join(root, 'observations/self-improvement-ledger'), { recursive: true });
  return root;
}

async function writeRecord(root, name, record) {
  await fs.writeFile(
    path.join(root, 'observations/self-improvement-ledger', name),
    `${JSON.stringify(record, null, 2)}\n`,
  );
}

test('verified fixture-scoped improvement enters the Garden without external-value promotion', async () => {
  const root = await tempRoot();
  await writeRecord(root, 'causal_after.json', verifiedRecord());
  const garden = { internalImprovements: [], transferSeeds: [] };

  const first = await reconcileImprovementEvidenceLedger(garden, { rootDir: root });
  assert.equal(first.changed, true);
  assert.deepEqual(first.created, ['imp_verified_fixture']);
  assert.equal(garden.internalImprovements.length, 1);
  assert.equal(garden.internalImprovements[0].externalValueVerified, false);
  assert.equal(garden.internalImprovements[0].repeatExternalValueVerified, false);
  assert.deepEqual(garden.internalImprovements[0].externalProblemEvidence, []);
  assert.match(garden.internalImprovements[0].sourceArtifact, /observations\/self-improvement-ledger\/causal_after\.json$/);

  const second = await reconcileImprovementEvidenceLedger(garden, { rootDir: root });
  assert.equal(second.changed, false);
  assert.equal(garden.internalImprovements.length, 1);
});

test('records with external-value leakage or verified regressions are rejected', async () => {
  const root = await tempRoot();
  await writeRecord(root, 'external-leak.json', verifiedRecord({
    currentClaims: { selfImprovementObserved: true, externalValueObserved: true },
  }));
  await writeRecord(root, 'regression.json', verifiedRecord({
    baselineComparison: {
      ...verifiedRecord().baselineComparison,
      regressedDimensions: ['accuracy'],
    },
  }));
  const garden = { internalImprovements: [] };

  const result = await reconcileImprovementEvidenceLedger(garden, { rootDir: root });
  assert.equal(result.changed, false);
  assert.equal(result.rejected.length, 2);
  assert.equal(garden.internalImprovements.length, 0);
});

test('durable internal improvement can crystallize into a cold transfer seed only after transfer shape exists', async () => {
  const root = await tempRoot();
  const record = verifiedRecord();
  record.baselineComparison.internalImprovementCandidate.transformation = 'Avoid repeated work while preserving decision-equivalent results.';
  record.baselineComparison.internalImprovementCandidate.beneficiaryClasses = ['stateful systems'];
  record.baselineComparison.internalImprovementCandidate.externalValueMeasure = 'Independent workload performs less repeated work with equal-or-better decisions.';
  await writeRecord(root, 'transferable.json', record);

  const garden = { internalImprovements: [], transferSeeds: [] };
  await reconcileImprovementEvidenceLedger(garden, { rootDir: root });
  const transfer = reconcileImprovementTransferSeeds(garden);
  assert.equal(transfer.changed, true);
  assert.equal(garden.transferSeeds.length, 1);
  assert.equal(garden.transferSeeds[0].externalValueVerified, false);
  assert.equal(garden.transferSeeds[0].status, 'hypothesis');
});
