import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import seed from './fixtures/test-seed.js';
import { FLOWER_METHODOLOGY, FLOWER_METHODOLOGY_VERSION } from '../src/core/methodology-core.js';
import { addTrace } from '../src/core/transitions.js';

test('integrated methodology contains reciprocal Flower-efficiency cultivation rather than one-way optimization', () => {
  assert.equal(FLOWER_METHODOLOGY.version, FLOWER_METHODOLOGY_VERSION);
  assert.ok(FLOWER_METHODOLOGY.invariants.length >= 10);
  assert.ok(FLOWER_METHODOLOGY.efficiency.laws.length >= 8);
  assert.ok(FLOWER_METHODOLOGY.dualCultivation.methodologyToEfficiency.length >= 3);
  assert.ok(FLOWER_METHODOLOGY.dualCultivation.efficiencyToMethodology.length >= 3);
  assert.ok(FLOWER_METHODOLOGY.operatingLoop.some((step) => step.startsWith('TEMPER:')));
  assert.ok(FLOWER_METHODOLOGY.operatingLoop.some((step) => step.startsWith('REST:')));
  assert.ok(FLOWER_METHODOLOGY.operatingLoop.some((step) => step.startsWith('RECURSE:')));
});

test('canonical methodology document agrees with executable methodology version and precedence', async () => {
  const doc = await fs.readFile(new URL('../docs/CURRENT_FLOWER_METHODOLOGY.md', import.meta.url), 'utf8');
  assert.match(doc, new RegExp(FLOWER_METHODOLOGY_VERSION.replaceAll('.', '\\.')));
  assert.match(doc, /src\/core\/methodology-core\.js/);
  assert.match(doc, /COMPLEXITY_PRESERVING_EFFICIENCY_2026-08-30\.md/);
  assert.match(doc, /FLOWER_ROOT_RECURSION_AND_ABUNDANCE_RESET_2026-08-29\.md/);
  assert.match(doc, /Dual cultivation/);
});

test('repository entrypoint points readers to the canonical current methodology', async () => {
  const readme = await fs.readFile(new URL('../README.md', import.meta.url), 'utf8');
  assert.match(readme, /docs\/CURRENT_FLOWER_METHODOLOGY\.md/);
  assert.match(readme, /src\/core\/methodology-core\.js/);
});

test('new traces record the methodology version that produced them', () => {
  const garden = structuredClone(seed);
  garden.traces = [];
  addTrace(garden, { kind: 'methodology_provenance_test', summary: 'test trace' });
  assert.equal(garden.traces.length, 1);
  assert.equal(garden.traces[0].methodologyVersion, FLOWER_METHODOLOGY_VERSION);
});
