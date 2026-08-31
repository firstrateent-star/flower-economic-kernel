import test from 'node:test';
import assert from 'node:assert/strict';
import { analyzeExecutionSurfaces, parseAnalysisTable } from '../scripts/external-execution-surface-shadow.mjs';

const markdown = `
| Scaffolding | Model | Arm | Init tok | Total in | Cache % | Tools | Tool ok | Done % | Cost $ | Wall s |
|---|---|---|---|---|---|---|---|---|---|---|
| codex | model-a | CLI | 1,000 | 10,000 | 0 | 2 | 1.0 | 100.0 | 0.10 | 10 |
| codex | model-a | MCP | 1,000 | 5,000 | 0 | 2 | 1.0 | 100.0 | 0.05 | 9 |
| codex | model-b | CLI | 1,000 | 4,000 | 0 | 2 | 1.0 | 100.0 | 0.04 | 8 |
| codex | model-b | MCP | 1,000 | 12,000 | 0 | 2 | 1.0 | 100.0 | 0.12 | 7 |
| other | model-c | CLI | 1,000 | 4,000 | 0 | 2 | 1.0 | 100.0 | 0.04 | 8 |
| other | model-c | MCP | 1,000 | 3,000 | 0 | 2 | 1.0 | 80.0 | 0.03 | 7 |
`;

test('parser extracts comparable execution-surface rows', () => {
  const rows = parseAnalysisTable(markdown);
  assert.equal(rows.length, 6);
  assert.equal(rows[0].totalInputTokens, 10000);
  assert.equal(rows[0].completionPct, 100);
});

test('analyzer preserves completion and detects execution-surface reversal', () => {
  const result = analyzeExecutionSurfaces(parseAnalysisTable(markdown));
  assert.equal(result.comparablePairCount, 3);
  assert.equal(result.counts.mcpParetoDominates, 1);
  assert.equal(result.counts.cliParetoDominates, 1);
  assert.equal(result.counts.tradeoffOrTie, 1);
  assert.deepEqual(result.reversalScaffolds, ['codex']);
  assert.equal(result.staticSurfaceWinnerExists, false);
});

test('lower cost does not dominate when completion regresses', () => {
  const result = analyzeExecutionSurfaces(parseAnalysisTable(markdown));
  const pair = result.pairs.find((item) => item.scaffolding === 'other');
  assert.equal(pair.outcome, 'tradeoff_or_tie');
  assert.equal(pair.completionDeltaMcpMinusCli, -20);
});
