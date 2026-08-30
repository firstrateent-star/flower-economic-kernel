import test from 'node:test';
import assert from 'node:assert/strict';
import seed from './fixtures/test-seed.js';
import { refreshGeometry } from '../src/core/geometry.js';
import { buildReasonerGardenView } from '../src/core/reasoner-view.js';
import { FLOWER_METHODOLOGY } from '../src/core/methodology-core.js';

function bytes(value) {
  return Buffer.byteLength(JSON.stringify(value), 'utf8');
}

test('reasoner views structurally compress a dense equivalent cognition payload without deleting canonical complexity', (t) => {
  const garden = structuredClone(seed);
  const target = garden.opportunities[0];
  target.failureArchetype = 'identity_pointer_drift';
  target.reusableCapability = 'entity_identity_matching';

  for (let i = 0; i < 24; i += 1) {
    garden.opportunities.push({
      id: `opp_benchmark_${i}`,
      name: `Benchmark Opportunity ${i}`,
      status: 'needs_test',
      thesis: `Independent hypothesis ${i} with detailed state that remains canonical.`,
      failureArchetype: i % 6 === 0 ? 'identity_metadata_conflict' : `unrelated_family_${i}`,
      reusableCapability: i % 6 === 0 ? 'cross_source_identity_reconciliation' : `unrelated_capability_${i}`,
      nutrientChannel: 'benchmark channel',
      externalEvidence: Array.from({ length: 4 }, (_, j) => `https://evidence.example/${i}/${j}`),
      epistemicNote: 'Preserved dense knowledge for complexity-preserving efficiency benchmark.',
    });
  }
  garden.traces = Array.from({ length: 30 }, (_, i) => ({
    id: `trace_${i}`,
    kind: 'breath',
    summary: `Historical execution telemetry ${i} that remains canonical but is not needed across this cognition boundary.`,
  }));

  refreshGeometry(garden);
  const canonicalBefore = JSON.stringify(garden);
  const globalView = buildReasonerGardenView({ garden, operation: 'EXPAND' });
  const sparseView = buildReasonerGardenView({ garden, operation: 'FALSIFY', target });

  // The reasoner boundary always carries the executable methodology. The fair baseline
  // is therefore the uncompressed Garden plus that same methodology, not Garden bytes
  // alone. This keeps the complexity tax honest when the methodology itself evolves.
  const equivalentUncompressedPayload = { garden, methodology: FLOWER_METHODOLOGY };
  const fullBytes = bytes(equivalentUncompressedPayload);
  const globalBytes = bytes(globalView);
  const sparseBytes = bytes(sparseView);

  assert.equal(JSON.stringify(garden), canonicalBefore);
  assert.ok(globalBytes < fullBytes, `expected global view ${globalBytes} < equivalent payload ${fullBytes}`);
  assert.ok(sparseBytes < globalBytes, `expected sparse view ${sparseBytes} < global ${globalBytes}`);
  assert.ok(sparseView.opportunities.some((opp) => opp.id === target.id));
  assert.equal(sparseView.portfolioSummary.opportunityCount, garden.opportunities.length);

  t.diagnostic(JSON.stringify({
    equivalentUncompressedBytes: fullBytes,
    globalReasonerBytes: globalBytes,
    targetReasonerBytes: sparseBytes,
    globalFraction: Number((globalBytes / fullBytes).toFixed(3)),
    targetFraction: Number((sparseBytes / fullBytes).toFixed(3)),
  }));
});
