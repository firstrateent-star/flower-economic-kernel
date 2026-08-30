import test from 'node:test';
import assert from 'node:assert/strict';
import {
  assessEvidenceAdmissibility,
  buildDecisionEvidenceManifest,
} from '../src/core/evidence-admissibility.js';
import {
  createStateAvailabilityWitness,
  verifyStateAvailabilityWitness,
} from '../src/core/state-availability-witness.js';

test('trusted evidence at or before cutoff is admissible', () => {
  const result = assessEvidenceAdmissibility({
    observedAt: '2026-08-30T18:40:00.000Z',
    provenance: 'observed_external',
    asOf: '2026-08-30T18:45:00.000Z',
  });
  assert.equal(result.admissible, true);
  assert.equal(result.reason, 'admissible_at_cutoff');
});

test('future evidence is not admissible even with trusted provenance', () => {
  const result = assessEvidenceAdmissibility({
    observedAt: '2026-08-30T18:46:00.000Z',
    provenance: 'observed_external',
    asOf: '2026-08-30T18:45:00.000Z',
  });
  assert.equal(result.admissible, false);
  assert.equal(result.reason, 'observed_after_cutoff');
});

test('legacy imported chronology remains operational context but is not replay-admissible before a trusted witness', () => {
  const result = assessEvidenceAdmissibility({
    observedAt: '2026-08-30T18:30:00.000Z',
    provenance: 'imported_unverified',
    asOf: '2026-08-30T18:45:00.000Z',
  });
  assert.equal(result.admissible, false);
  assert.equal(result.reason, 'untrusted_time_provenance');
});

test('a trusted state witness makes legacy evidence available prospectively without certifying its claimed chronology', () => {
  const garden = {
    experiments: [],
    events: [{ id: 'legacy', at: '2026-08-30T18:20:00.000Z', type: 'LEGACY_NOTE' }],
    fruits: [],
  };
  const witness = createStateAvailabilityWitness({
    garden,
    clock: () => '2026-08-30T18:50:00.000Z',
  });
  assert.equal(verifyStateAvailabilityWitness({ witness, garden }).ok, true);

  const before = buildDecisionEvidenceManifest({
    garden,
    asOf: '2026-08-30T18:49:59.000Z',
    availabilityWitness: witness,
  });
  assert.equal(before.counts.admissible, 0);

  const after = buildDecisionEvidenceManifest({
    garden,
    asOf: '2026-08-30T18:50:00.000Z',
    availabilityWitness: witness,
  });
  assert.equal(after.counts.admissible, 1);
  assert.equal(after.units[0].admissibility.reason, 'admissible_by_witnessed_availability');
  assert.equal(after.units[0].admissibility.chronologyCertified, false);
  assert.equal(after.units[0].admissibility.availabilityCertified, true);
  assert.equal(after.units[0].observedAt, '2026-08-30T18:20:00.000Z');
});

test('availability witness is bound to the exact Garden snapshot', () => {
  const garden = { experiments: [], events: [], fruits: [] };
  const witness = createStateAvailabilityWitness({
    garden,
    clock: () => '2026-08-30T18:50:00.000Z',
  });
  garden.events.push({ id: 'later' });
  assert.deepEqual(verifyStateAvailabilityWitness({ witness, garden }), {
    ok: false,
    reason: 'snapshot_hash_mismatch',
  });
  assert.throws(() => buildDecisionEvidenceManifest({
    garden,
    asOf: '2026-08-30T18:55:00.000Z',
    availabilityWitness: witness,
  }), /Invalid state availability witness/);
});

test('manifest preserves all evidence units while distinguishing the admissible causal subset', () => {
  const garden = {
    experiments: [
      {
        id: 'exp_trusted', opportunityId: 'opp_1', status: 'integrated', validationDimension: 'buyer_demand',
        integratedAt: '2026-08-30T18:40:00.000Z', timeProvenance: 'runtime_written',
        result: { verdict: 'supports' },
      },
      {
        id: 'exp_future', opportunityId: 'opp_1', status: 'integrated', validationDimension: 'willingness_to_pay',
        integratedAt: '2026-08-30T18:50:00.000Z', timeProvenance: 'runtime_written',
        result: { verdict: 'supports' },
      },
    ],
    events: [
      { id: 'legacy', at: '2026-08-30T18:20:00.000Z', type: 'LEGACY_NOTE' },
    ],
    fruits: [],
  };
  const manifest = buildDecisionEvidenceManifest({ garden, asOf: '2026-08-30T18:45:00.000Z' });
  assert.equal(manifest.counts.total, 3);
  assert.equal(manifest.counts.admissible, 1);
  assert.equal(manifest.counts.inadmissible, 2);
  assert.deepEqual(manifest.admissibleIds, ['experiment:exp_trusted']);
  assert.equal(manifest.units.length, 3);
});
