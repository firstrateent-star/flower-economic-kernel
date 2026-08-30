import test from 'node:test';
import assert from 'node:assert/strict';
import seed from './fixtures/test-seed.js';
import { migrateLegacyRuntimeState } from '../src/core/legacy-state-migrations.js';

test('legacy unsupported promotion is demoted without losing the opportunity', () => {
  const garden = structuredClone(seed);
  const opp = garden.opportunities[0];
  opp.status = 'supported';
  opp.sources = [];

  const result = migrateLegacyRuntimeState(garden);
  assert.equal(opp.status, 'needs_test');
  assert.ok(result.repaired.includes(opp.id));
});

test('legacy Maps sample ceiling is migrated to platform minimum without adding recurring spend', () => {
  const garden = structuredClone(seed);
  const opp = garden.opportunities[0];
  garden.experiments = [{
    id: 'exp_maps_legacy_cap',
    opportunityId: opp.id,
    status: 'authorized',
    method: 'maps_website_sample',
    actionType: 'spend',
    oneTimeCostUsd: 0.10,
    recurringUsd: 0,
    authorization: { allowed: true, requiresApproval: false },
  }];

  const result = migrateLegacyRuntimeState(garden);
  assert.equal(garden.experiments[0].oneTimeCostUsd, 0.50);
  assert.equal(garden.experiments[0].recurringUsd, 0);
  assert.equal(garden.experiments[0].authorization.allowed, true);
  assert.ok(result.stateMigrations.some((x) => x.includes('charge_cap_0.10_to_0.50')));
});

test('self-declared inaccessible core measurement becomes measurement blocked before buyer spend', () => {
  const garden = structuredClone(seed);
  const opp = garden.opportunities[0];
  opp.status = 'needs_test';
  opp.experimentId = null;
  opp.realityAccess = 'The core failure cannot be accessed with current executors.';

  const result = migrateLegacyRuntimeState(garden);
  assert.equal(opp.status, 'measurement_blocked');
  assert.equal(opp.measurementBlockedDimension, 'failure_reality');
  assert.ok(result.stateMigrations.some((x) => x.includes('validation_path_preflight_block')));
});
