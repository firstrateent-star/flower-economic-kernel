import test from 'node:test';
import assert from 'node:assert/strict';
import {
  TIME_PROVENANCE,
  assertReplayableGardenChronology,
  classifyGardenTimeProvenance,
} from '../src/core/time-provenance.js';

test('legacy or undeclared chronology remains operationally representable but is not trusted for replay', () => {
  const result = classifyGardenTimeProvenance({ id: 'legacy-garden' });
  assert.equal(result.class, TIME_PROVENANCE.IMPORTED_UNVERIFIED);
  assert.equal(result.trustedForProspectiveReplay, false);
  assert.throws(
    () => assertReplayableGardenChronology({ id: 'legacy-garden' }),
    /prospective replay requires explicitly trusted temporal provenance/,
  );
});

test('runtime-written chronology can be admitted to prospective replay', () => {
  const garden = { temporalProvenance: { class: TIME_PROVENANCE.RUNTIME_WRITTEN } };
  const result = assertReplayableGardenChronology(garden);
  assert.equal(result.class, TIME_PROVENANCE.RUNTIME_WRITTEN);
  assert.equal(result.trustedForProspectiveReplay, true);
});

test('externally observed chronology can be admitted to prospective replay', () => {
  const garden = { temporalProvenance: { class: TIME_PROVENANCE.OBSERVED } };
  const result = assertReplayableGardenChronology(garden);
  assert.equal(result.class, TIME_PROVENANCE.OBSERVED);
  assert.equal(result.trustedForProspectiveReplay, true);
});
