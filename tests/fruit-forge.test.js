import test from 'node:test';
import assert from 'node:assert/strict';
import seed from '../garden/seed.json' with { type: 'json' };
import { syncFruitManifests, verifyPrivateFruit } from '../src/core/fruit-forge.js';
import { classifyPressure } from '../src/core/pressure.js';

test('Fruit Forge registers private source and links the validated opportunity', async () => {
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
  assert.equal(fruit.status, 'private_source_ready');
  assert.equal(fruit.permissions, 'limited');
  assert.equal(fruit.standby, false);
  assert.equal(opp.fruitId, fruit.id);
  assert.equal(classifyPressure(garden).type, 'VERIFY_FRUIT');
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
