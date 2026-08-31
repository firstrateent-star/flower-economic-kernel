# Agent Retry Loop Auditor

Find **retry loops, repeated failed tool calls, failure streaks, terminal failures, and recovery transitions** in AI-agent execution traces.

This Actor is deliberately narrower than a general observability platform. It answers one operational question:

> Is this agent repeatedly spending attempts on failure states that deserve a different retry, validation, fallback, or escalation policy?

It uses deterministic trace analysis — no LLM calls — and returns evidence plus the smallest replay experiment needed to test a fix. It never claims that a retry is wasteful merely because it repeated, and it never reports verified savings without a matched replay.

## Best for

- debugging AI agent retry loops
- analyzing failed LLM/tool traces
- LangGraph, LangChain, OpenTelemetry, or custom agent spans
- repeated tool failures
- terminal unresolved agent runs
- testing retry budgets and fail-fast policies
- finding upstream validation opportunities
- CI analysis before changing retry/fallback logic

## What it detects

For every trace:

- error/failure event count
- **immediate identical retry after failure** — same tool/operation and same normalized input
- repeated failure signatures across a trace
- longest consecutive error streak
- whether the final observed event is still a failure
- transitions from failure back to a non-error event
- bounded hypotheses for replay experiments

Every result includes:

```json
{
  "authority": {
    "retryPolicyChangeAuthorized": false
  }
}
```

because pattern evidence is not enough to prove that production retry behavior should change.

## Example input

```json
{
  "traces": [
    {
      "traceId": "checkout-agent-42",
      "spans": [
        {
          "name": "tool:lookup_order",
          "tool_name": "lookup_order",
          "tool_input": {"orderId":"123"},
          "statusCode": "ERROR"
        },
        {
          "name": "tool:lookup_order",
          "tool_name": "lookup_order",
          "tool_input": {"orderId":"123"},
          "statusCode": "ERROR"
        },
        {
          "name": "tool:lookup_order",
          "tool_name": "lookup_order",
          "tool_input": {"orderId":"123","fallback":true},
          "statusCode": "OK"
        }
      ]
    }
  ]
}
```

The first two events are an immediate same-input retry after a failure. The third changed the recovery strategy. The Actor reports the pattern and suggests replaying matched failures with an explicit precondition, backoff, changed input, fallback, or retry budget — it does not assume which intervention is correct.

## Supported trace shapes

You can send:

- `traces`: objects containing `spans`
- `traces`: AgentTrace-style objects with `llm_steps`
- direct trace/event-like objects
- `spans`: a flat span array grouped by `traceId`, `trace_id`, `sessionId`, or `session_id`

Common OpenTelemetry-style error and tool attributes are recognized.

## Why retry analysis matters

Retries are sometimes essential: rate limits clear, transient infrastructure recovers, and fallback paths succeed. But an agent that repeats an unchanged failing transformation can also burn latency, tokens, tool quotas, and money while making no progress.

The safe optimization sequence is therefore:

1. observe the failure signature;
2. identify repeated or terminal pressure;
3. propose the smallest changed retry/validation/fallback policy;
4. replay the same representative cases;
5. preserve terminal success and protected authority boundaries;
6. only then promote the policy.

## Related Actor

Use **Agent Trace Efficiency Auditor** for a broader scan of context, model switching, exact repeated transformations, human-boundary spans, and failure pressure. Use this Actor when the problem you want to inspect is specifically **retry and failure-loop behavior**.

## Pricing

The intended Store pricing is one small pay-per-event charge per trace audited. The Actor uses no paid model, browser, proxy, or external API.

## Search phrases

AI agent retry analyzer, agent retry loop, LLM retry debugging, agent failure trace, AI agent error analysis, repeated tool failure, LangGraph retry loop, tool retry waste, agent failure debugging, retry policy audit.
