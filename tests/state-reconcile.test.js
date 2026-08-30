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

test('resolved human actuation state and resolution provenance are not resurrected or erased', () => {
  const existing = structuredClone(seed);
  existing.humanActuationQueue = seed.humanActuationQueue.map((item) => ({ ...item }));
  existing.humanActuationQueue[0].state = 'authorized';
  existing.humanActuationQueue[0].resolvedBecause = 'Center-holder explicitly authorized this boundary.';
  existing.humanActuationQueue[0].resolvedAt = '2026-08-30T16:30:00.000Z';

  const { garden } = reconcileCanonicalControlPlane(existing, seed);
  assert.equal(garden.humanActuationQueue[0].state, 'authorized');
  assert.equal(garden.humanActuationQueue[0].resolvedBecause, existing.humanActuationQueue[0].resolvedBecause);
  assert.equal(garden.humanActuationQueue[0].resolvedAt, existing.humanActuationQueue[0].resolvedAt);
});

test('human queue reconciliation reaches a fixed point after terminal resolution', () => {
  const existing = structuredClone(seed);
  existing.humanActuationQueue = seed.humanActuationQueue.map((item) => ({ ...item }));
  const kyc = existing.humanActuationQueue.find((item) => item.organismId === 'fruit_social_preview_drift_guard' && item.action.toLowerCase().includes('kyc'));
  kyc.state = 'resolved_by_platform_truth';
  kyc.resolvedBecause = 'Verified platform truth resolved eligibility without Center-holder action.';

  const first = reconcileCanonicalControlPlane(existing, seed);
  const second = reconcileCanonicalControlPlane(first.garden, seed);

  assert.deepEqual(second.garden, first.garden);
  assert.deepEqual(second.changes, []);
});

test('canonical reconciliation preserves runtime updatedAt instead of fabricating seed-time churn', () => {
  const existing = structuredClone(seed);
  existing.updatedAt = '2026-08-30T16:30:00.000Z';
  const canonical = structuredClone(seed);
  canonical.updatedAt = '2026-08-30T14:42:00.000Z';

  const { garden } = reconcileCanonicalControlPlane(existing, canonical);
  assert.equal(garden.updatedAt, existing.updatedAt);
});

test('missing persistent Garden initializes exactly from canonical Garden', () => {
  const { garden, changes } = reconcileCanonicalControlPlane(null, seed);
  assert.deepEqual(garden, seed);
  assert.deepEqual(changes, ['initialized_from_canonical']);
});
