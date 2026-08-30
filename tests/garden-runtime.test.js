import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import seed from '../garden/seed.json' with { type: 'json' };
import { loadGarden, saveGarden, validateGarden } from '../src/core/garden.js';

test('current canonical Garden validates as schema v2', () => {
  assert.equal(seed.schemaVersion, 2);
  assert.equal(validateGarden(structuredClone(seed)).schemaVersion, 2);
});

test('file runtime upgrades legacy persistent state while preserving dynamic work', async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'flower-garden-'));
  const seedFile = path.join(dir, 'seed.json');
  const stateFile = path.join(dir, 'state.json');
  await fs.writeFile(seedFile, JSON.stringify(seed), 'utf8');

  const legacy = structuredClone(seed);
  legacy.schemaVersion = 1;
  legacy.center.autonomy.publicDeploy = true;
  legacy.humanActuationQueue = [];
  legacy.opportunities = [{ id: 'opp_live_runtime', name: 'Live runtime work', status: 'supported' }];
  legacy.experiments = [{ id: 'exp_live_runtime', opportunityId: 'opp_live_runtime', status: 'authorized' }];
  legacy.status.pulseCount = 9;
  await fs.writeFile(stateFile, JSON.stringify(legacy), 'utf8');

  const garden = await loadGarden({ stateFile, seedFile });
  assert.equal(garden.schemaVersion, 2);
  assert.equal(garden.center.autonomy.publicDeploy, false);
  assert.deepEqual(garden.opportunities, legacy.opportunities);
  assert.deepEqual(garden.experiments, legacy.experiments);
  assert.equal(garden.status.pulseCount, 9);
  assert.deepEqual(garden.humanActuationQueue, seed.humanActuationQueue);
});

test('save rejects legacy schema after reconciliation boundary', async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'flower-save-'));
  const stateFile = path.join(dir, 'state.json');
  const legacy = structuredClone(seed);
  legacy.schemaVersion = 1;

  await assert.rejects(() => saveGarden(stateFile, legacy), /Unsupported Garden schemaVersion/);
});
