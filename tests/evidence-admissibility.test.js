import test from 'node:test';
import assert from 'node:assert/strict';
import {
  assessEvidenceAdmissibility,
  buildDecisionEvidenceManifest,
} from '../src/core/evidence-admissibility.js';

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

test('legacy imported chronology remains operational context but is not replay-admissible', () => {
  const result = assessEvidenceAdmissibility({
    observedAt: '2026-08-30T18:30:00.000Z',
    provenance: 'imported_unverified',
    asOf: '2026-08-30T18:45:00.000Z',
  });
  assert.equal(result.admissible, false);
  assert.equal(result.reason, 'untrusted_time_provenance');
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
