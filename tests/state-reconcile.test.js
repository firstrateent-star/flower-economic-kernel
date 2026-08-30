import test from 'node:test';
import assert from 'node:assert/strict';
import seed from '../garden/seed.json' with { type: 'json' };
import { reconcileCanonicalControlPlane } from '../src/core/state-reconcile.js';

test('persistent Garden receives current governance without losing dynamic experiment state', () => {
  const existing = structuredClone(seed);
  existing.center.autonomy.publicDeploy = true;
  existing.center.invariants = ['stale invariant'];
  existing.soil = existing.soil.slice(0, 1);
  existing.humanActuationQueue = [];
  existing.opportunities = [{ id: 'opp_runtime', status: 'supported', name: 'Runtime opportunity' }];
  existing.experiments = [{ id: 'exp_runtime', opportunityId: 'opp_runtime', status: 'authorized' }];
  existing.status.pulseCount = 17;

  const { garden, changes } = reconcileCanonicalControlPlane(existing, seed);

  assert.equal(garden.center.autonomy.publicDeploy, false);
  assert.deepEqual(garden.center.invariants, seed.center.invariants);
  assert.ok(garden.soil.length >= seed.soil.length);
  assert.deepEqual(garden.humanActuationQueue, seed.humanActuationQueue);
  assert.deepEqual(garden.opportunities, existing.opportunities);
  assert.deepEqual(garden.experiments, existing.experiments);
  assert.equal(garden.status.pulseCount, 17);
  assert.ok(changes.includes('center_governance'));
  assert.ok(changes.includes('human_actuation_queue'));
});

test('canonical reconciliation adds missing mature Fruit without erasing measured runtime return', () => {
  const existing = structuredClone(seed);
  const cmn = seed.fruits.find((x) => x.id === 'fruit_changed_method_navigator');
  existing.fruits = existing.fruits.filter((x) => x.id !== cmn.id);
  const preview = existing.fruits.find((x) => x.id === 'fruit_social_preview_drift_guard');
  preview.creatorRevenueUsd = 1.25;
  preview.externalUsage = 'independent_confirmed';

  const { garden } = reconcileCanonicalControlPlane(existing, seed);
  const reconciledCmn = garden.fruits.find((x) => x.id === cmn.id);
  const reconciledPreview = garden.fruits.find((x) => x.id === preview.id);

  assert.ok(reconciledCmn);
  assert.equal(reconciledCmn.status, 'market_ready_private');
  assert.equal(reconciledPreview.creatorRevenueUsd, 1.25);
  assert.equal(reconciledPreview.externalUsage, 'independent_confirmed');
});

test('resolved human actuation state is not resurrected by canonical pending state', () => {
  const existing = structuredClone(seed);
  existing.humanActuationQueue = seed.humanActuationQueue.map((item) => ({ ...item }));
  existing.humanActuationQueue[0].state = 'authorized';

  const { garden } = reconcileCanonicalControlPlane(existing, seed);
  assert.equal(garden.humanActuationQueue[0].state, 'authorized');
});

test('missing persistent Garden initializes exactly from canonical Garden', () => {
  const { garden, changes } = reconcileCanonicalControlPlane(null, seed);
  assert.deepEqual(garden, seed);
  assert.deepEqual(changes, ['initialized_from_canonical']);
});
