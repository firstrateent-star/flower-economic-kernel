function numberAttr(attrs, key) {
  const value = attrs?.[key];
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function stringAttr(attrs, key) {
  const value = attrs?.[key];
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function operationName(span = {}) {
  const attrs = span.attributes ?? {};
  return stringAttr(attrs, 'gen_ai.operation.name')
    ?? stringAttr(attrs, 'gen_ai.operation.type')
    ?? span.operationName
    ?? span.name
    ?? null;
}

function spanKind(span = {}) {
  const op = String(operationName(span) ?? '').toLowerCase();
  const attrs = span.attributes ?? {};
  if (op.includes('tool') || stringAttr(attrs, 'gen_ai.tool.name')) return 'tool';
  if (op.includes('chat') || op.includes('generate') || stringAttr(attrs, 'gen_ai.request.model')) return 'model';
  if (op.includes('agent') || stringAttr(attrs, 'gen_ai.agent.name') || stringAttr(attrs, 'gen_ai.agent.id')) return 'agent';
  return 'other';
}

/**
 * Shadow-only audit over OpenTelemetry-like GenAI spans.
 * It reports observable cost/work patterns and optimization hypotheses, never verified savings.
 */
export function auditOtelGenAiTrace(spans = []) {
  const normalized = spans.map((span, index) => {
    const attrs = span?.attributes ?? {};
    const inputTokens = numberAttr(attrs, 'gen_ai.usage.input_tokens') ?? numberAttr(attrs, 'gen_ai.usage.prompt_tokens');
    const outputTokens = numberAttr(attrs, 'gen_ai.usage.output_tokens') ?? numberAttr(attrs, 'gen_ai.usage.completion_tokens');
    const durationMs = Number.isFinite(Number(span?.durationMs)) ? Number(span.durationMs) : null;
    return {
      index,
      name: operationName(span),
      kind: spanKind(span),
      model: stringAttr(attrs, 'gen_ai.request.model') ?? stringAttr(attrs, 'gen_ai.response.model'),
      toolName: stringAttr(attrs, 'gen_ai.tool.name'),
      inputTokens,
      outputTokens,
      totalTokens: inputTokens !== null || outputTokens !== null ? (inputTokens ?? 0) + (outputTokens ?? 0) : null,
      durationMs,
      errorType: stringAttr(attrs, 'error.type') ?? stringAttr(attrs, 'exception.type'),
    };
  });

  const modelSpans = normalized.filter((x) => x.kind === 'model');
  const toolSpans = normalized.filter((x) => x.kind === 'tool');
  const knownTokenSpans = modelSpans.filter((x) => x.totalTokens !== null);
  const totalTokens = knownTokenSpans.reduce((sum, x) => sum + x.totalTokens, 0);
  const totalKnownDurationMs = normalized.filter((x) => x.durationMs !== null).reduce((sum, x) => sum + x.durationMs, 0);

  const modelCounts = new Map();
  for (const span of modelSpans) {
    const key = span.model ?? 'unknown-model';
    modelCounts.set(key, (modelCounts.get(key) ?? 0) + 1);
  }

  const repeatedToolRuns = [];
  for (let i = 1; i < toolSpans.length; i += 1) {
    const previous = toolSpans[i - 1];
    const current = toolSpans[i];
    if (previous.toolName && current.toolName && previous.toolName === current.toolName) {
      repeatedToolRuns.push({ toolName: current.toolName, previousIndex: previous.index, currentIndex: current.index });
    }
  }

  const hypotheses = [];
  if (modelSpans.length >= 4) {
    hypotheses.push({
      type: 'adaptive_headroom_probe',
      why: 'The trace contains multiple model calls. Replay is needed to test whether all calls are necessary for the protected terminal outcome.',
      verifiedSavings: false,
    });
  }
  if (new Set(modelSpans.map((x) => x.model).filter(Boolean)).size > 1) {
    hypotheses.push({
      type: 'configuration_routing_probe',
      why: 'Multiple models appear in one trace. Compare same-task terminal quality, cost, and latency before claiming the route is efficient or inefficient.',
      verifiedSavings: false,
    });
  }
  if (repeatedToolRuns.length > 0) {
    hypotheses.push({
      type: 'repeated_tool_transformation_probe',
      why: 'Adjacent repeated tool names exist, but tool-name recurrence is not transformation equivalence. Inspect input/output fingerprints before crystallization.',
      occurrences: repeatedToolRuns.length,
      verifiedSavings: false,
    });
  }
  if (normalized.some((x) => x.errorType)) {
    hypotheses.push({
      type: 'retry_or_failure_cost_probe',
      why: 'The trace contains an error witness. Determine whether subsequent work was required recovery or avoidable retry overhead.',
      verifiedSavings: false,
    });
  }

  return {
    schema: 'flower.otel-genai-audit.v1',
    traceSummary: {
      spanCount: normalized.length,
      modelCallCount: modelSpans.length,
      toolCallCount: toolSpans.length,
      knownTokenSpanCount: knownTokenSpans.length,
      totalObservedTokens: knownTokenSpans.length ? totalTokens : null,
      totalKnownDurationMs: normalized.some((x) => x.durationMs !== null) ? totalKnownDurationMs : null,
      models: [...modelCounts.entries()].map(([model, calls]) => ({ model, calls })),
      errorSpanCount: normalized.filter((x) => x.errorType).length,
    },
    normalizedSpans: normalized,
    optimizationHypotheses: hypotheses,
    claims: {
      inefficiencyVerified: false,
      savingsVerified: false,
      terminalQualityPreserved: false,
      externalValueVerified: false,
    },
    nextWitness:
      'Replay the same task with one bounded candidate change and compare terminal outcome, tokens/cost, latency, errors, and any human intervention under a stable workload.',
    epistemicBoundary:
      'Observability can reveal where work occurs; it cannot by itself prove that the work was unnecessary. Flower audit outputs are hypotheses until same-task causal replay preserves or improves the protected terminal outcome.',
  };
}
