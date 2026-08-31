import crypto from 'node:crypto';

const MODEL_KEYS = [
  'gen_ai.request.model',
  'gen_ai.response.model',
  'llm.request.model',
  'llm.response.model',
  'openinference.llm.model_name',
  'model',
  'modelName',
];

const INPUT_TOKEN_KEYS = [
  'gen_ai.usage.input_tokens',
  'gen_ai.usage.prompt_tokens',
  'llm.token_count.prompt',
  'llm.usage.prompt_tokens',
  'openinference.llm.token_count.prompt',
  'input_tokens',
  'prompt_tokens',
];

const OUTPUT_TOKEN_KEYS = [
  'gen_ai.usage.output_tokens',
  'gen_ai.usage.completion_tokens',
  'llm.token_count.completion',
  'llm.usage.completion_tokens',
  'openinference.llm.token_count.completion',
  'output_tokens',
  'completion_tokens',
];

const TOOL_KEYS = ['gen_ai.tool.name', 'tool.name', 'tool_name', 'openinference.tool.name'];
const TOOL_INPUT_KEYS = ['gen_ai.tool.call.arguments', 'tool.input', 'tool.arguments', 'tool_input', 'openinference.tool.input'];
const TRACE_ID_KEYS = ['traceId', 'trace_id', 'sessionId', 'session_id', 'conversation.id'];

function objectish(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
}

function attrs(span) {
  return {
    ...objectish(span?.attributes),
    ...objectish(span?.attrs),
    ...objectish(span?.resource?.attributes),
  };
}

function pick(source, keys) {
  for (const key of keys) {
    if (source?.[key] !== undefined && source?.[key] !== null && source?.[key] !== '') return source[key];
  }
  return null;
}

function numberOrZero(value) {
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? n : 0;
}

function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.keys(value).sort().map((key) => [key, stable(value[key])]));
  }
  return value;
}

function stableString(value) {
  if (value === undefined) return '';
  if (typeof value === 'string') return value.trim();
  try {
    return JSON.stringify(stable(value));
  } catch {
    return String(value);
  }
}

function hash(value) {
  return crypto.createHash('sha256').update(stableString(value)).digest('hex').slice(0, 16);
}

function durationMs(span) {
  const direct = Number(span?.durationMs ?? span?.duration_ms ?? span?.duration);
  if (Number.isFinite(direct) && direct >= 0) return direct;
  const startNs = Number(span?.start_ns);
  const endNs = Number(span?.end_ns);
  if (Number.isFinite(startNs) && Number.isFinite(endNs) && endNs >= startNs) return (endNs - startNs) / 1e6;
  const start = Date.parse(span?.startTime ?? span?.start_time ?? span?.startTimeUnixNano ?? '');
  const end = Date.parse(span?.endTime ?? span?.end_time ?? span?.endTimeUnixNano ?? '');
  if (Number.isFinite(start) && Number.isFinite(end) && end >= start) return end - start;
  return 0;
}

function statusIsError(span, a) {
  const status = String(span?.status?.code ?? span?.statusCode ?? a['error.type'] ?? a['exception.type'] ?? '').toLowerCase();
  const exitCode = Number(span?.exit_code ?? span?.exitCode);
  return status.includes('error') || status.includes('fail') || Boolean(span?.error) || (Number.isFinite(exitCode) && exitCode !== 0);
}

function inferToolName(span, a) {
  const explicit = pick(a, TOOL_KEYS) ?? span?.tool_name ?? span?.toolName;
  if (explicit) return String(explicit);
  const name = String(span?.name ?? span?.operationName ?? '');
  if (/tool/i.test(name)) return name.replace(/^.*tool[:.\s/-]*/i, '').trim() || name;
  return null;
}

function inferModel(span, a) {
  const explicit = pick(a, MODEL_KEYS) ?? span?.model ?? span?.modelName;
  if (explicit) return String(explicit);
  const name = String(span?.name ?? span?.operationName ?? '');
  if (/chat|completion|llm|model|generate/i.test(name) && !/tool/i.test(name)) return 'unknown-model';
  return null;
}

function inferHumanBoundary(span, a) {
  const text = `${span?.name ?? ''} ${span?.type ?? ''} ${a['event.name'] ?? ''} ${a['operation.name'] ?? ''}`.toLowerCase();
  return /(human|approval|approve|confirmation|confirm|manual review|review required|handoff)/.test(text);
}

function traceIdOf(span, fallback) {
  const a = attrs(span);
  return String(pick(span, TRACE_ID_KEYS) ?? pick(a, TRACE_ID_KEYS) ?? fallback);
}

function llmStepAsSpan(step, traceModel) {
  return {
    name: `llm_step_${step?.step_number ?? step?.stepNumber ?? 'unknown'}`,
    model: step?.model ?? traceModel ?? 'unknown-model',
    input_tokens: step?.input_tokens ?? step?.inputTokens ?? 0,
    output_tokens: step?.output_tokens ?? step?.outputTokens ?? 0,
    duration_ms: step?.duration_ms ?? step?.durationMs ?? 0,
    type: 'LLM_STEP',
  };
}

export function normalizeInput(input = {}) {
  const maxItems = Math.max(1, Math.min(Number(input.maxItems ?? 1000), 10000));
  const rawTraces = Array.isArray(input.traces) ? input.traces : [];
  const rawSpans = Array.isArray(input.spans) ? input.spans : [];
  const groups = [];

  for (let i = 0; i < rawTraces.slice(0, maxItems).length; i += 1) {
    const item = rawTraces[i];
    const directSpans = Array.isArray(item?.spans) ? item.spans : [item];
    const llmStepSpans = Array.isArray(item?.llm_steps)
      ? item.llm_steps.map((step) => llmStepAsSpan(step, item?.model))
      : Array.isArray(item?.llmSteps)
        ? item.llmSteps.map((step) => llmStepAsSpan(step, item?.model))
        : [];
    const itemSpans = [...directSpans, ...llmStepSpans];
    groups.push({
      id: String(item?.traceId ?? item?.trace_id ?? item?.sessionId ?? item?.session_id ?? `trace-${i + 1}`),
      spans: itemSpans,
    });
  }

  if (rawSpans.length) {
    const byId = new Map();
    for (let i = 0; i < rawSpans.slice(0, maxItems * 100).length; i += 1) {
      const span = rawSpans[i];
      const id = traceIdOf(span, `flat-${i + 1}`);
      if (!byId.has(id)) byId.set(id, []);
      byId.get(id).push(span);
    }
    for (const [id, spans] of byId) groups.push({ id, spans });
  }

  return groups.slice(0, maxItems);
}

function analyzeSpan(span, highInputTokenThreshold) {
  const a = attrs(span);
  const model = inferModel(span, a);
  const toolName = inferToolName(span, a);
  const inputTokens = numberOrZero(pick(a, INPUT_TOKEN_KEYS) ?? span?.inputTokens ?? span?.input_tokens);
  const outputTokens = numberOrZero(pick(a, OUTPUT_TOKEN_KEYS) ?? span?.outputTokens ?? span?.output_tokens);
  const toolInput = pick(a, TOOL_INPUT_KEYS) ?? span?.toolInput ?? span?.tool_input ?? null;
  return {
    name: String(span?.name ?? span?.operationName ?? span?.type ?? 'unnamed-span'),
    model,
    toolName,
    toolInputHash: toolName && toolInput !== null ? hash(toolInput) : null,
    inputTokens,
    outputTokens,
    durationMs: durationMs(span),
    error: statusIsError(span, a),
    humanBoundary: inferHumanBoundary(span, a),
    highInputTokens: inputTokens >= highInputTokenThreshold,
  };
}

function exactTransformationCounts(spans) {
  const counts = new Map();
  for (const s of spans) {
    if (!s.toolName || !s.toolInputHash) continue;
    const key = `${s.toolName}:${s.toolInputHash}`;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return [...counts.entries()]
    .filter(([, count]) => count > 1)
    .map(([key, count]) => {
      const idx = key.indexOf(':');
      return { toolName: key.slice(0, idx), inputHash: key.slice(idx + 1), count };
    })
    .sort((a, b) => b.count - a.count || a.toolName.localeCompare(b.toolName));
}

function toolShapeCounts(spans) {
  const counts = new Map();
  for (const s of spans) {
    if (!s.toolName) continue;
    counts.set(s.toolName, (counts.get(s.toolName) ?? 0) + 1);
  }
  return [...counts.entries()].map(([toolName, count]) => ({ toolName, count })).sort((a, b) => b.count - a.count);
}

function buildHypotheses(summary) {
  const hypotheses = [];
  const add = (id, title, evidence, replayTest, confidence = 'directional') => hypotheses.push({
    id,
    title,
    evidence,
    test: replayTest,
    confidence,
    savingsVerified: false,
  });

  if (summary.highInputTokenCalls > 0) {
    add(
      'context_projection_headroom',
      'Test whether large contexts can be projected before expensive model calls',
      `${summary.highInputTokenCalls} model-call span(s) crossed the configured high-input-token threshold.`,
      'Replay the same task with a smaller causally sufficient context. Preserve terminal outcome, error rate, and authority boundaries; compare uncached input tokens, latency, and cost.',
    );
  }

  if (summary.modelSwitches > 0) {
    add(
      'model_routing_headroom',
      'Test whether model switching is helping enough to justify its complexity',
      `${summary.modelSwitches} model switch(es) were observed across ordered model-call spans.`,
      'Replay matched tasks with the current routing policy and a simpler stable policy. Compare terminal success first, then cost/latency. Do not assume fewer switches is better.',
    );
  }

  if (summary.errorSpans > 0) {
    add(
      'failure_retry_overhead',
      'Inspect whether failures are causing avoidable repeated work',
      `${summary.errorSpans} error/failure span(s) were observed.`,
      'Group failures by operation and compare successful vs failed paths. Test the smallest upstream validation or retry-policy change that could prevent repeated work.',
      'moderate',
    );
  }

  if (summary.exactRepeatedTransformations > 0) {
    add(
      'crystallization_candidate',
      'Repeated exact tool transformations may be candidates for deterministic reuse',
      `${summary.exactRepeatedTransformations} repeated tool+input transformation signature(s) were observed.`,
      'Verify that repeated inputs produce decision-equivalent outputs across representative cases. Only then consider cache/compile/deterministic reuse.',
      'moderate',
    );
  }

  if (summary.repeatedToolShapes > 0 && summary.exactRepeatedTransformations === 0) {
    add(
      'structural_recurrence_only',
      'Tool recurrence exists, but transformation equivalence is not established',
      `${summary.repeatedToolShapes} tool name(s) recur, while no exact tool+input transformation signature repeats.`,
      'Do not compile based on tool sequence alone. Sample inputs/outputs and test transformation equivalence before automation.',
      'high',
    );
  }

  if (summary.humanBoundarySpans > 0) {
    add(
      'human_attention_boundary',
      'Review whether every human interruption is sovereignty-relevant',
      `${summary.humanBoundarySpans} span(s) look like human approval/review/handoff boundaries.`,
      'Classify each interruption as required sovereignty/authority vs reversible routine work. Automate only the latter and measure whether understanding/control remain preserved.',
    );
  }

  if (!hypotheses.length) {
    add(
      'no_obvious_headroom',
      'No strong structural inefficiency signal was observed from the supplied trace fields',
      'The trace did not expose high-token calls, model switching, errors, repeated exact transformations, or human-boundary spans under the current heuristics.',
      'Preserve the current policy until richer telemetry or a task-level outcome comparison reveals a decision-changing blind spot.',
      'high',
    );
  }

  return hypotheses;
}

export function auditTraceGroup(group, options = {}) {
  const highInputTokenThreshold = Math.max(1000, Number(options.highInputTokenThreshold ?? 10000));
  const spans = (group?.spans ?? []).map((span) => analyzeSpan(span, highInputTokenThreshold));
  const modelSpans = spans.filter((s) => s.model);
  const toolSpans = spans.filter((s) => s.toolName);
  const modelSequence = modelSpans.map((s) => s.model);
  const modelSwitches = modelSequence.reduce((count, model, index) => count + (index > 0 && model !== modelSequence[index - 1] ? 1 : 0), 0);
  const exactRepeats = exactTransformationCounts(spans);
  const toolCounts = toolShapeCounts(spans);
  const repeatedToolShapes = toolCounts.filter((x) => x.count > 1).length;
  const totalInputTokens = modelSpans.reduce((sum, s) => sum + s.inputTokens, 0);
  const totalOutputTokens = modelSpans.reduce((sum, s) => sum + s.outputTokens, 0);
  const summary = {
    traceId: String(group?.id ?? 'unknown'),
    spanCount: spans.length,
    modelCallSpans: modelSpans.length,
    toolCallSpans: toolSpans.length,
    totalInputTokens,
    totalOutputTokens,
    totalTokens: totalInputTokens + totalOutputTokens,
    totalObservedDurationMs: spans.reduce((sum, s) => sum + s.durationMs, 0),
    modelSwitches,
    errorSpans: spans.filter((s) => s.error).length,
    humanBoundarySpans: spans.filter((s) => s.humanBoundary).length,
    highInputTokenCalls: modelSpans.filter((s) => s.highInputTokens).length,
    repeatedToolShapes,
    exactRepeatedTransformations: exactRepeats.length,
    modelsObserved: [...new Set(modelSequence)],
    toolsObserved: toolCounts.slice(0, 30),
    exactTransformationRepeats: exactRepeats.slice(0, 30),
  };

  return {
    ...summary,
    hypotheses: buildHypotheses(summary),
    authority: {
      optimizationAuthorized: false,
      deterministicChoiceAuthorized: false,
      reason: 'Trace structure can identify experiments worth running; it cannot prove that a cheaper configuration preserves the terminal outcome without matched replay evidence.',
    },
    epistemicBoundary: 'Same tool sequence is not the same transformation. Fewer tokens/calls/switches are not automatically better. Savings remain unverified until matched workloads preserve terminal outcomes and protected boundaries.',
    schemaVersion: 1,
  };
}

export function auditInput(input = {}) {
  const groups = normalizeInput(input);
  if (!groups.length) throw new Error('Provide at least one trace/run in `traces` or one span in `spans`.');
  return groups.map((group) => auditTraceGroup(group, { highInputTokenThreshold: input.highInputTokenThreshold }));
}
