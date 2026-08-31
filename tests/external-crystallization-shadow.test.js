import test from 'node:test';
import assert from 'node:assert/strict';
import { analyzeAgentTraceRows } from '../scripts/external-crystallization-shadow.mjs';

test('same tool shape with same inputs across traces can become an exact-transformation candidate', () => {
  const rows = [
    { trace_id: 'a', spans: [{ tool_name: 'read', tool_input: { path: 'x' }, duration_ms: 2 }, { tool_name: 'grep', tool_input: { q: 'y' }, duration_ms: 3 }] },
    { trace_id: 'b', spans: [{ tool_name: 'read', tool_input: { path: 'x' }, duration_ms: 5 }, { tool_name: 'grep', tool_input: { q: 'y' }, duration_ms: 7 }] },
    { trace_id: 'c', spans: [{ tool_name: 'read', tool_input: { path: 'x' }, duration_ms: 11 }, { tool_name: 'grep', tool_input: { q: 'y' }, duration_ms: 13 }] },
  ];

  const report = analyzeAgentTraceRows(rows, { n: 2, minCount: 3 });
  assert.equal(report.traceCount, 3);
  assert.equal(report.repeatedToolShapeCount, 1);
  assert.equal(report.exactTransformationCandidateCount, 1);
  const candidate = report.topExactTransformationCandidates[0];
  assert.deepEqual(candidate.sequence, ['read', 'grep']);
  assert.equal(candidate.independentTraceCount, 3);
  assert.equal(candidate.strongestExactInputReuseTraceCount, 3);
  assert.equal(candidate.compilationSafetyVerified, false);
  assert.equal(candidate.externalValueVerified, false);
});

test('same tool names with diverse inputs do not masquerade as the same transformation', () => {
  const rows = [
    { trace_id: 'a', spans: [{ tool_name: 'bash', tool_input: 'ls' }, { tool_name: 'bash', tool_input: 'cat a' }] },
    { trace_id: 'b', spans: [{ tool_name: 'bash', tool_input: 'pwd' }, { tool_name: 'bash', tool_input: 'grep x b' }] },
    { trace_id: 'c', spans: [{ tool_name: 'bash', tool_input: 'find .' }, { tool_name: 'bash', tool_input: 'wc -l c' }] },
  ];

  const report = analyzeAgentTraceRows(rows, { n: 2, minCount: 3 });
  assert.equal(report.repeatedToolShapeCount, 1);
  assert.equal(report.exactTransformationCandidateCount, 0);
  assert.equal(report.topRepeatedSequences[0].distinctInputSequenceCount, 3);
  assert.equal(report.topRepeatedSequences[0].crystallizationCandidate, false);
});

test('terminal boundary sequences are never crystallization candidates', () => {
  const rows = [
    { trace_id: 'a', spans: [{ tool_name: 'bash', tool_input: 'ls' }, { tool_name: 'final_answer', tool_input: null }] },
    { trace_id: 'b', spans: [{ tool_name: 'bash', tool_input: 'ls' }, { tool_name: 'final_answer', tool_input: null }] },
    { trace_id: 'c', spans: [{ tool_name: 'bash', tool_input: 'ls' }, { tool_name: 'final_answer', tool_input: null }] },
  ];

  const report = analyzeAgentTraceRows(rows, { n: 2, minCount: 3 });
  assert.equal(report.repeatedToolShapeCount, 1);
  assert.equal(report.exactTransformationCandidateCount, 0);
  assert.equal(report.topRepeatedSequences[0].containsBoundary, true);
});

test('repetition inside one trace does not masquerade as independent transformation breadth', () => {
  const rows = [
    { trace_id: 'a', spans: [
      { tool_name: 'read', tool_input: 1 }, { tool_name: 'grep', tool_input: 2 },
      { tool_name: 'read', tool_input: 1 }, { tool_name: 'grep', tool_input: 2 },
      { tool_name: 'read', tool_input: 1 }, { tool_name: 'grep', tool_input: 2 },
    ] },
  ];

  const report = analyzeAgentTraceRows(rows, { n: 2, minCount: 3 });
  const candidate = report.topRepeatedSequences.find((item) => item.sequence.join(' -> ') === 'read -> grep');
  assert.ok(candidate);
  assert.equal(candidate.occurrenceCount, 3);
  assert.equal(candidate.independentTraceCount, 1);
  assert.equal(candidate.crystallizationCandidate, false);
});

test('no repeated structure yields no transformation candidate', () => {
  const rows = [
    { trace_id: 'a', spans: [{ tool_name: 'read' }, { tool_name: 'write' }] },
    { trace_id: 'b', spans: [{ tool_name: 'search' }, { tool_name: 'execute' }] },
  ];
  const report = analyzeAgentTraceRows(rows, { n: 2, minCount: 2 });
  assert.equal(report.repeatedToolShapeCount, 0);
  assert.equal(report.exactTransformationCandidateCount, 0);
});
