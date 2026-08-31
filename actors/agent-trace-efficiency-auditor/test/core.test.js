import test from 'node:test';
import assert from 'node:assert/strict';
import { auditInput, auditTraceGroup } from '../src/core.js';

test('detects trace headroom signals without authorizing savings', () => {
  const [result] = auditInput({
    highInputTokenThreshold: 10000,
    traces: [{
      traceId: 'trace-a',
      spans: [
        { name: 'chat', attributes: { 'gen_ai.request.model': 'small-model', 'gen_ai.usage.input_tokens': 12000, 'gen_ai.usage.output_tokens': 200 } },
        { name: 'tool:search', attributes: { 'gen_ai.tool.name': 'search', 'gen_ai.tool.call.arguments': { q: 'alpha' } } },
        { name: 'chat', attributes: { 'gen_ai.request.model': 'large-model', 'gen_ai.usage.input_tokens': 15000, 'gen_ai.usage.output_tokens': 300 } },
        { name: 'human approval' },
        { name: 'tool:search', attributes: { 'gen_ai.tool.name': 'search', 'gen_ai.tool.call.arguments': { q: 'alpha' } } },
      ],
    }],
  });

  assert.equal(result.traceId, 'trace-a');
  assert.equal(result.highInputTokenCalls, 2);
  assert.equal(result.modelSwitches, 1);
  assert.equal(result.humanBoundarySpans, 1);
  assert.equal(result.exactRepeatedTransformations, 1);
  assert.equal(result.authority.optimizationAuthorized, false);
  assert.ok(result.hypotheses.some((x) => x.id === 'context_projection_headroom'));
  assert.ok(result.hypotheses.some((x) => x.id === 'crystallization_candidate'));
  assert.ok(result.hypotheses.every((x) => x.savingsVerified === false));
});

test('tool recurrence with diverse inputs does not become transformation equivalence', () => {
  const result = auditTraceGroup({
    id: 'trace-b',
    spans: [
      { name: 'tool:web', attributes: { 'gen_ai.tool.name': 'web', 'gen_ai.tool.call.arguments': { url: 'https://a.example' } } },
      { name: 'tool:web', attributes: { 'gen_ai.tool.name': 'web', 'gen_ai.tool.call.arguments': { url: 'https://b.example' } } },
      { name: 'tool:web', attributes: { 'gen_ai.tool.name': 'web', 'gen_ai.tool.call.arguments': { url: 'https://c.example' } } },
    ],
  });

  assert.equal(result.repeatedToolShapes, 1);
  assert.equal(result.exactRepeatedTransformations, 0);
  assert.ok(result.hypotheses.some((x) => x.id === 'structural_recurrence_only'));
  assert.ok(!result.hypotheses.some((x) => x.id === 'crystallization_candidate'));
});

test('error and retry pressure is surfaced as a hypothesis, not a guarantee', () => {
  const result = auditTraceGroup({
    id: 'trace-c',
    spans: [
      { name: 'chat', status: { code: 'ERROR' }, attributes: { 'gen_ai.request.model': 'model-a', 'gen_ai.usage.input_tokens': 2000 } },
      { name: 'chat', attributes: { 'gen_ai.request.model': 'model-a', 'gen_ai.usage.input_tokens': 2000 } },
    ],
  });

  assert.equal(result.errorSpans, 1);
  const hypothesis = result.hypotheses.find((x) => x.id === 'failure_retry_overhead');
  assert.ok(hypothesis);
  assert.equal(hypothesis.savingsVerified, false);
});

test('flat spans group by trace id', () => {
  const results = auditInput({ spans: [
    { traceId: 'one', name: 'chat', attributes: { 'gen_ai.request.model': 'm1' } },
    { traceId: 'one', name: 'tool:x', attributes: { 'gen_ai.tool.name': 'x' } },
    { traceId: 'two', name: 'chat', attributes: { 'gen_ai.request.model': 'm2' } },
  ] });
  assert.equal(results.length, 2);
  assert.equal(results.find((x) => x.traceId === 'one')?.spanCount, 2);
  assert.equal(results.find((x) => x.traceId === 'two')?.spanCount, 1);
});

test('AgentTrace native shape adds llm_steps and direct tool telemetry', () => {
  const [result] = auditInput({
    highInputTokenThreshold: 1500,
    traces: [{
      trace_id: 'agenttrace-native',
      model: 'Qwen/Qwen3-0.6B',
      spans: [
        {
          type: 'TOOL',
          tool_name: 'bash',
          tool_input: "kwargs={'command':'grep foo /testdata'}",
          duration_ms: 15.5,
          exit_code: 1,
        },
        {
          type: 'TOOL',
          tool_name: 'final_answer',
          tool_input: "kwargs={'answer':'none'}",
          duration_ms: 0.01,
          exit_code: 0,
        },
      ],
      llm_steps: [
        { step_number: 1, input_tokens: 1510, output_tokens: 944 },
        { step_number: 2, input_tokens: 1612, output_tokens: 495 },
      ],
    }],
  });

  assert.equal(result.traceId, 'agenttrace-native');
  assert.equal(result.spanCount, 4);
  assert.equal(result.toolCallSpans, 2);
  assert.equal(result.modelCallSpans, 2);
  assert.equal(result.totalInputTokens, 3122);
  assert.equal(result.totalOutputTokens, 1439);
  assert.equal(result.errorSpans, 1);
  assert.equal(result.highInputTokenCalls, 2);
  assert.deepEqual(result.modelsObserved, ['Qwen/Qwen3-0.6B']);
  assert.ok(result.hypotheses.some((x) => x.id === 'failure_retry_overhead'));
  assert.ok(result.hypotheses.some((x) => x.id === 'context_projection_headroom'));
});

test('AgentTrace repeated tool names with different direct tool_input remain structural only', () => {
  const [result] = auditInput({
    traces: [{
      trace_id: 'agenttrace-diverse',
      spans: [
        { type: 'TOOL', tool_name: 'bash', tool_input: "kwargs={'command':'ls'}", exit_code: 0 },
        { type: 'TOOL', tool_name: 'bash', tool_input: "kwargs={'command':'grep foo'}", exit_code: 0 },
      ],
    }],
  });
  assert.equal(result.repeatedToolShapes, 1);
  assert.equal(result.exactRepeatedTransformations, 0);
  assert.ok(result.hypotheses.some((x) => x.id === 'structural_recurrence_only'));
});
