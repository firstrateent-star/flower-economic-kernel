import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { compileHumanBoundary } from '../src/core/human-boundary-compiler.js';

async function cmnPacket() {
  return JSON.parse(await fs.readFile(new URL('../experiments/changed-method-navigator/HUMAN_BOUNDARY_PACKET.json', import.meta.url), 'utf8'));
}

test('CMN boundary compiles to five irreducible human-authority choices and seven downstream machine actions', async () => {
  const packet = await cmnPacket();
  const compiled = compileHumanBoundary(packet);
  assert.equal(compiled.minimumHumanDecisionCount, 5);
  assert.equal(compiled.downstreamMachineActionCount, 7);
  assert.equal(compiled.activationGainProxy, 1.4);
  assert.equal(compiled.readyForMachineContinuation, false);
  assert.deepEqual(
    compiled.humanChoices.map((x) => x.id).sort(),
    ['accept_developer_agreement', 'authorize_hidden_initial_upload', 'eula_license_posture', 'trader_status', 'vendor_identity'].sort(),
  );
});

test('machine actions remain blocked only by unresolved sovereignty choices', async () => {
  const packet = await cmnPacket();
  const resolved = {
    authorize_hidden_initial_upload: true,
    vendor_identity: { vendorId: 'chosen-by-human', publicName: 'Chosen by Human' },
    trader_status: 'chosen-by-human',
    accept_developer_agreement: true,
    eula_license_posture: 'chosen-by-human',
  };
  const compiled = compileHumanBoundary(packet, resolved);
  assert.equal(compiled.minimumHumanDecisionCount, 0);
  assert.equal(compiled.blockedMachineActions.length, 0);
  assert.equal(compiled.executableMachineActions.length, 7);
  assert.equal(compiled.readyForMachineContinuation, true);
});

test('compiler never substitutes recommended posture for unresolved human authority', async () => {
  const packet = await cmnPacket();
  const compiled = compileHumanBoundary(packet);
  const uploadDecision = compiled.humanChoices.find((x) => x.id === 'authorize_hidden_initial_upload');
  assert.equal(uploadDecision.recommendedPosture, 'authorize hidden only');
  assert.equal(uploadDecision.resolved, false);
  assert.equal(compiled.readyForMachineContinuation, false);
});
