# Agent Trace Efficiency Auditor

Audit AI-agent traces for **wasted-cognition candidates** without pretending that lower token counts or fewer calls automatically mean a better agent.

This Actor accepts generic trace/run JSON or flat OpenTelemetry-style spans and returns one audit row per trace. It is deterministic, uses no LLM, calls no external API, and is designed for CI, agent observability, routing experiments, and optimization-control workflows.

## What it detects

- high input-token model calls worth testing with smaller context projections;
- model switching that may or may not be earning its complexity;
- error/failure spans that may create retry overhead;
- repeated tool-name structure;
- **exact repeated tool + normalized-input transformations** that may be candidates for caching or deterministic compilation;
- human approval/review/handoff spans that may deserve sovereignty-vs-routine classification.

## What it deliberately does NOT claim

A structural trace audit cannot prove that a cheaper configuration is better.

- same tool sequence **does not** imply same transformation;
- fewer model switches **does not** imply better routing;
- fewer tokens **does not** imply preserved task quality;
- fewer human approvals **does not** imply preserved human sovereignty;
- projected savings are not settled savings.

Every output therefore contains optimization **hypotheses and replay tests**, with optimization authority disabled until a matched workload preserves terminal outcomes and protected boundaries.

## Input

You can provide grouped traces:

```json
{
  "traces": [
    {
      "traceId": "checkout-agent-42",
      "spans": [
        {
          "name": "chat",
          "attributes": {
            "gen_ai.request.model": "gpt-example",
            "gen_ai.usage.input_tokens": 14000,
            "gen_ai.usage.output_tokens": 500
          }
        },
        {
          "name": "tool:inventory",
          "attributes": {
            "gen_ai.tool.name": "inventory",
            "gen_ai.tool.call.arguments": { "sku": "ABC-123" }
          }
        }
      ]
    }
  ]
}
```

Or flat spans carrying `traceId`, `trace_id`, `sessionId`, or `session_id`.

The parser recognizes common attribute families including `gen_ai.*`, `llm.*`, and several OpenInference-style fields. Unknown fields are ignored rather than guessed.

## Output

Each trace audit includes:

- observed model/tool call counts;
- observed input/output tokens where present;
- model switches;
- error spans;
- human-boundary spans;
- high-input-token calls;
- repeated tool shapes;
- exact repeated transformation signatures;
- evidence-backed optimization experiments;
- an explicit authority boundary explaining why replay is still required.

## Typical workflow

1. Export traces from your agent runtime or observability platform.
2. Run this Actor.
3. Read the highest-evidence optimization hypothesis.
4. Replay the **same task** with the proposed cheaper/simpler configuration.
5. Preserve terminal success, safety/authority boundaries, and required quality.
6. Only then call the change an optimization.

## Pricing compatibility

The Actor supports an optional Apify pay-per-event event named `trace-audited`. If that event is not configured, it runs without custom event charging. If configured, one successfully emitted trace audit can be billed as one event.

The implementation is intentionally low-compute: 128 MB default memory, no browser, no proxies, no LLM, and no third-party services.

## Privacy

The Actor only processes the trace data supplied to its run and writes its own result dataset/output. Avoid supplying secrets or sensitive message content when structural telemetry is sufficient. Tool inputs are reduced to short hashes for recurrence detection rather than reproduced in output.

## Method

The core method is derived from a broader optimization-control discipline: preserve the real objective, activate only decision-capable evidence, identify the cheapest useful experiment, verify changes causally, and crystallize repetition only after equivalence is established.

The customer does not need to adopt that methodology. The Actor simply returns a bounded, machine-readable audit.
