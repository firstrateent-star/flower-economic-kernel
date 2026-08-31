# Agent Trace Efficiency Auditor

Audit AI-agent traces for **wasted-cognition candidates** without pretending that lower token counts or fewer calls automatically mean a better agent.

This Actor accepts generic trace/run JSON, flat OpenTelemetry-style spans, and AgentTrace-style traces with `spans[]` + `llm_steps[]`. It returns one audit row per trace. It is deterministic, uses no LLM, calls no external API, and is designed for CI, agent observability, routing experiments, and optimization-control workflows.

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

## Public-trace evidence

The current parser was replayed against **200 public NL2Bash agent traces** from the Apache-2.0 `pagarsky/agent-trace` dataset. That sample contained 516 model steps, 465 tool calls, and about 1.40M observed tokens.

The auditor produced:

- `failure_retry_overhead` on 110/200 traces with observed failures;
- `crystallization_candidate` on 28/200 traces with repeated exact tool + normalized-input signatures;
- `structural_recurrence_only` on 23/200 traces where tool recurrence existed without exact transformation recurrence;
- `context_projection_headroom` on only 1/200 traces at a 10,000-input-token threshold;
- `no_obvious_headroom` on 82/200 traces.

There were **0 optimization-authority regressions and 0 unverified-savings promotions**. These measurements show that the auditor can distinguish several trace structures and abstain when its heuristics do not expose a strong signal. They do **not** prove customer demand, realized savings, or generalization to every agent runtime.

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

The parser recognizes common attribute families including `gen_ai.*`, `llm.*`, several OpenInference-style fields, and AgentTrace-native top-level `tool_name`, `tool_input`, `exit_code`, plus `llm_steps` token telemetry. Unknown fields are ignored rather than guessed.

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

## Pricing

The public Actor uses Apify **pay per event**. One successfully emitted trace-group audit is the `trace-audited` event, currently configured at **$0.01**.

The implementation is intentionally low-compute: 128 MB default memory, no browser, no proxies, no LLM, and no third-party services.

## Privacy

The Actor only processes the trace data supplied to its run and writes its own result dataset/output. Avoid supplying secrets or sensitive message content when structural telemetry is sufficient. Tool inputs are reduced to short hashes for recurrence detection rather than reproduced in output.

## Method

The core method is derived from a broader optimization-control discipline: preserve the real objective, activate only decision-capable evidence, identify the cheapest useful experiment, verify changes causally, and crystallize repetition only after equivalence is established.

The customer does not need to adopt that methodology. The Actor simply returns a bounded, machine-readable audit.
