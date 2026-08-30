import test from 'node:test';
import assert from 'node:assert/strict';
import seed from '../garden/seed.json' with { type: 'json' };
import { syncFruitManifests, verifyPrivateFruit } from '../src/core/fruit-forge.js';

test('Fruit Forge imports live manifest, links opportunity, and ingests latest distribution reconciliation', async () => {
  const garden = structuredClone(seed);
  garden.opportunities.push({
    id: 'opp_b7681c126171',
    name: 'Cross-Platform Social Link Preview Drift Guard',
    status: 'validated',
    experimentId: null,
  });

  const result = await syncFruitManifests(garden);
  const fruit = garden.fruits.find((x) => x.id === 'fruit_social_preview_drift_guard');
  const opp = garden.opportunities.find((x) => x.id === 'opp_b7681c126171');

  assert.ok(result.manifests.length >= 1);
  assert.ok(fruit);
  assert.equal(fruit.status, 'live');
  assert.equal(fruit.permissions, 'limited');
  assert.equal(fruit.standby, false);
  assert.equal(fruit.publicRelease?.economicBoundaryCrossed, true);
  assert.equal(fruit.distributionState?.rails?.githubAction?.state, 'private_staged_ci_passed');
  assert.equal(fruit.distributionState?.stalenessDetected?.olderValue, 'not_built');
  assert.match(fruit.distributionState?.statePath ?? '', /distribution-state-2026-08-30\.json$/);
  assert.equal(opp.fruitId, fruit.id);
  assert.equal(opp.productizationState, 'live');
});

test('Social Preview Fruit passes its deterministic private-source verifier', async () => {
  const fruit = {
    id: 'fruit_social_preview_drift_guard',
    permissions: 'limited',
    standby: false,
    monetization: { preferredModel: 'pay_per_event' },
  };
  const verification = await verifyPrivateFruit(fruit);
  assert.equal(verification.pass, true);
  assert.ok(verification.checks.length >= 6);
  assert.ok(verification.checks.every((x) => x.pass));
});
