import test from 'node:test';
import assert from 'node:assert/strict';
import { analyzeAgentTraceRows } from '../scripts/external-crystallization-shadow.mjs';

test('external crystallization analyzer detects repeated tool subsequences across traces', () => {
  const rows = [
    { trace_id: 'a', spans: [{ tool_name: 'read', duration_ms: 2 }, { tool_name: 'grep', duration_ms: 3 }, { tool_name: 'write', duration_ms: 4 }] },
    { trace_id: 'b', spans: [{ tool_name: 'read', duration_ms: 5 }, { tool_name: 'grep', duration_ms: 7 }] },
    { trace_id: 'c', spans: [{ tool_name: 'read', duration_ms: 11 }, { tool_name: 'grep', duration_ms: 13 }] },
  ];

  const report = analyzeAgentTraceRows(rows, { n: 2, minCount: 3 });
  assert.equal(report.traceCount, 3);
  assert.equal(report.repeatedSequenceCount, 1);
  assert.deepEqual(report.topRepeatedSequences[0].sequence, ['read', 'grep']);
  assert.equal(report.topRepeatedSequences[0].independentTraceCount, 3);
  assert.equal(report.topRepeatedSequences[0].compilationSafetyVerified, false);
  assert.equal(report.topRepeatedSequences[0].externalValueVerified, false);
});

test('repetition inside one trace does not masquerade as independent breadth', () => {
  const rows = [
    { trace_id: 'a', spans: [
      { tool_name: 'read' }, { tool_name: 'grep' },
      { tool_name: 'read' }, { tool_name: 'grep' },
      { tool_name: 'read' }, { tool_name: 'grep' },
    ] },
  ];

  const report = analyzeAgentTraceRows(rows, { n: 2, minCount: 3 });
  const candidate = report.topRepeatedSequences.find((item) => item.sequence.join(' -> ') === 'read -> grep');
  assert.ok(candidate);
  assert.equal(candidate.occurrenceCount, 3);
  assert.equal(candidate.independentTraceCount, 1);
});

test('no repeated structure yields no crystallization candidate', () => {
  const rows = [
    { trace_id: 'a', spans: [{ tool_name: 'read' }, { tool_name: 'write' }] },
    { trace_id: 'b', spans: [{ tool_name: 'search' }, { tool_name: 'execute' }] },
  ];
  const report = analyzeAgentTraceRows(rows, { n: 2, minCount: 2 });
  assert.equal(report.repeatedSequenceCount, 0);
});
