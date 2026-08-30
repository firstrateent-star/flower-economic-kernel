import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import seed from './fixtures/test-seed.js';
import { FLOWER_METHODOLOGY, FLOWER_METHODOLOGY_VERSION } from '../src/core/methodology-core.js';
import { addTrace } from '../src/core/transitions.js';

test('integrated methodology contains reciprocal Flower-efficiency cultivation rather than one-way optimization', () => {
  assert.equal(FLOWER_METHODOLOGY.version, FLOWER_METHODOLOGY_VERSION);
  assert.ok(FLOWER_METHODOLOGY.invariants.length >= 15);
  assert.ok(FLOWER_METHODOLOGY.efficiency.laws.length >= 10);
  assert.ok(FLOWER_METHODOLOGY.dualCultivation.methodologyToEfficiency.length >= 3);
  assert.ok(FLOWER_METHODOLOGY.dualCultivation.efficiencyToMethodology.length >= 3);
  assert.ok(FLOWER_METHODOLOGY.operatingLoop.some((step) => step.startsWith('LOCK:')));
  assert.ok(FLOWER_METHODOLOGY.operatingLoop.some((step) => step.startsWith('DIVERSIFY:')));
  assert.ok(FLOWER_METHODOLOGY.operatingLoop.some((step) => step.startsWith('ACT:')));
  assert.ok(FLOWER_METHODOLOGY.operatingLoop.some((step) => step.startsWith('TEMPER:')));
  assert.ok(FLOWER_METHODOLOGY.operatingLoop.some((step) => step.startsWith('REST:')));
  assert.ok(FLOWER_METHODOLOGY.operatingLoop.some((step) => step.startsWith('RECURSE:')));
});

test('integrated v5 makes terminal alignment, regenerative capture, and dual-dividend self-improvement native governance', () => {
  assert.equal(FLOWER_METHODOLOGY_VERSION, '2026-08-30.integrated-v5');
  assert.match(FLOWER_METHODOLOGY.center.terminalValueAim, /true objective/);
  assert.match(FLOWER_METHODOLOGY.center.regenerativeAim, /surplus/);
  assert.match(FLOWER_METHODOLOGY.fieldGovernance.championChallenger, /current champion/);
  assert.match(FLOWER_METHODOLOGY.fieldGovernance.twoTemperatureSearch, /bounded exploration/);
  assert.match(FLOWER_METHODOLOGY.terminalGovernance.principle, /terminal outcome/);
  assert.match(FLOWER_METHODOLOGY.regenerativeValueGovernance.principle, /closed and accountable loop/);
  assert.match(FLOWER_METHODOLOGY.regenerativeValueGovernance.ledgers.surplus, /attributable return/);
  assert.match(FLOWER_METHODOLOGY.selfImprovementValueGovernance.principle, /two distinct dividends/);
  assert.match(FLOWER_METHODOLOGY.selfImprovementValueGovernance.loop, /TRANSFER HYPOTHESIS/);
  assert.match(FLOWER_METHODOLOGY.selfImprovementValueGovernance.antiGoodhartCheck, /transfer seeds/);
  assert.ok(FLOWER_METHODOLOGY.selfImprovementValueGovernance.rules.some((x) => /Internal usefulness does not verify external/.test(x)));
  assert.ok(FLOWER_METHODOLOGY.operatingLoop.some((step) => step.startsWith('IMPROVE:')));
  assert.ok(FLOWER_METHODOLOGY.operatingLoop.some((step) => step.startsWith('TRANSFER:')));
  assert.ok(FLOWER_METHODOLOGY.operatingLoop.some((step) => step.startsWith('ALLOCATE:')));
  assert.ok(FLOWER_METHODOLOGY.stopConditions.some((x) => /lower expected value than a safe available action/.test(x)));
});

test('integrated v5 retains cold methodology mutation memory and protected human authority', () => {
  assert.match(FLOWER_METHODOLOGY.mutationGovernance.memoryRule, /Same proposal plus same evidence reuses the prior assessment/);
  assert.match(FLOWER_METHODOLOGY.mutationGovernance.memoryRule, /materially new evidence may reopen/);
  assert.ok(FLOWER_METHODOLOGY.mutationGovernance.protectedDomains.includes('ownership authority'));
  assert.ok(FLOWER_METHODOLOGY.mutationGovernance.protectedDomains.includes('surplus allocation authority'));
});

test('canonical methodology document agrees with executable methodology version and precedence', async () => {
  const doc = await fs.readFile(new URL('../docs/CURRENT_FLOWER_METHODOLOGY.md', import.meta.url), 'utf8');
  assert.match(doc, new RegExp(FLOWER_METHODOLOGY_VERSION.replaceAll('.', '\\.')));
  assert.match(doc, /src\/core\/methodology-core\.js/);
  assert.match(doc, /COMPLEXITY_PRESERVING_EFFICIENCY_2026-08-30\.md/);
  assert.match(doc, /FLOWER_ROOT_RECURSION_AND_ABUNDANCE_RESET_2026-08-29\.md/);
  assert.match(doc, /terminal objective/i);
  assert.match(doc, /champion/i);
  assert.match(doc, /two-temperature/i);
  assert.match(doc, /regenerative value governance/i);
  assert.match(doc, /Gross return is not surplus/i);
  assert.match(doc, /ownership/i);
  assert.match(doc, /Dual Dividend/i);
  assert.match(doc, /Self-Improvement Observatory/i);
  assert.match(doc, /internal improvement.*external value/is);
  assert.match(doc, /TRANSFER/);
});

test('prior cold mutation ledger remains preserved as ancestry', async () => {
  const ledger = JSON.parse(await fs.readFile(new URL('../methodology/mutation-ledger/2026-08-30-integrated-v2.json', import.meta.url), 'utf8'));
  assert.equal(ledger.promotedMethodologyVersion, '2026-08-30.integrated-v2');
  assert.equal(ledger.assessment.eligibleForCanonical, true);
  assert.equal(ledger.evidence.measurement.rediscoveries, 100);
  assert.equal(ledger.evidence.measurement.freshEvaluationsRequired, 1);
  assert.equal(ledger.evidence.measurement.priorAssessmentsReused, 99);
});

test('v5 promotion ledger preserves the dual-dividend evidence and stopping condition', async () => {
  const ledger = JSON.parse(await fs.readFile(new URL('../methodology/mutation-ledger/2026-08-30-integrated-v5.json', import.meta.url), 'utf8'));
  assert.equal(ledger.promotedMethodologyVersion, FLOWER_METHODOLOGY_VERSION);
  assert.equal(ledger.assessment.eligibleForCanonical, true);
  assert.match(ledger.thesis, /dual-dividend membrane/i);
  assert.match(ledger.assessment.stoppingCondition, /measurement/i);
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
