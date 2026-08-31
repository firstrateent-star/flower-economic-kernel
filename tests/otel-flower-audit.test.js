import test from 'node:test';
import assert from 'node:assert/strict';
import { auditOtelGenAiTrace } from '../research/value-transfer/otel-flower-audit.js';

test('OTel audit summarizes GenAI work without claiming savings', () => {
  const result = auditOtelGenAiTrace([
    { name: 'invoke_agent', durationMs: 20, attributes: { 'gen_ai.agent.name': 'worker' } },
    { name: 'chat', durationMs: 100, attributes: { 'gen_ai.request.model': 'model-a', 'gen_ai.usage.input_tokens': 100, 'gen_ai.usage.output_tokens': 20 } },
    { name: 'execute_tool', durationMs: 30, attributes: { 'gen_ai.tool.name': 'search' } },
    { name: 'chat', durationMs: 110, attributes: { 'gen_ai.request.model': 'model-a', 'gen_ai.usage.input_tokens': 120, 'gen_ai.usage.output_tokens': 25 } },
  ]);

  assert.equal(result.traceSummary.modelCallCount, 2);
  assert.equal(result.traceSummary.toolCallCount, 1);
  assert.equal(result.traceSummary.totalObservedTokens, 265);
  assert.equal(result.claims.savingsVerified, false);
  assert.equal(result.claims.externalValueVerified, false);
});

test('multiple model calls create a headroom hypothesis only', () => {
  const spans = Array.from({ length: 4 }, (_, index) => ({
    name: 'chat',
    attributes: { 'gen_ai.request.model': index < 2 ? 'small' : 'large', 'gen_ai.usage.input_tokens': 50, 'gen_ai.usage.output_tokens': 10 },
  }));
  const result = auditOtelGenAiTrace(spans);
  assert.ok(result.optimizationHypotheses.some((x) => x.type === 'adaptive_headroom_probe'));
  assert.ok(result.optimizationHypotheses.some((x) => x.type === 'configuration_routing_probe'));
  assert.equal(result.claims.terminalQualityPreserved, false);
});

test('repeated tool names are not promoted to transformation equivalence', () => {
  const result = auditOtelGenAiTrace([
    { name: 'execute_tool', attributes: { 'gen_ai.tool.name': 'bash' } },
    { name: 'execute_tool', attributes: { 'gen_ai.tool.name': 'bash' } },
  ]);
  const hypothesis = result.optimizationHypotheses.find((x) => x.type === 'repeated_tool_transformation_probe');
  assert.equal(hypothesis.verifiedSavings, false);
  assert.match(hypothesis.why, /not transformation equivalence/i);
});

test('empty traces remain honest and produce no fake opportunity', () => {
  const result = auditOtelGenAiTrace([]);
  assert.equal(result.traceSummary.spanCount, 0);
  assert.equal(result.traceSummary.totalObservedTokens, null);
  assert.deepEqual(result.optimizationHypotheses, []);
});
