# Counterfactual Agent Verifier

Compare matched **baseline vs challenger AI-agent results** before accepting an optimization.

Use this Actor when you changed an agent's model, toolset, context, retry policy, execution surface, routing, or other configuration and need to answer:

> Did the challenger preserve the terminal result and protected quality while actually improving cost, latency, token use, errors, or human interruptions?

## What it protects

A cheaper challenger is **not** classified as better when it regresses:

- terminal success,
- supplied quality beyond tolerance, or
- any supplied protected metric.

Unknown evidence stays unknown. Missing terminal evidence produces `insufficient_evidence`.

## Inputs

Provide `comparisons`, each containing a matched workload case with `baseline` and `challenger` objects. The most important field on both sides is `terminalSuccess`.

Optional evidence includes `quality`, `costUsd`, `latencyMs`, `inputTokens`, `outputTokens`, `errorCount`, `humanInterruptions`, and explicit `protectedMetrics`.

## Outputs

Each comparison is classified as one of:

- `regression`
- `candidate_improvement`
- `decision_equivalent_observed`
- `insufficient_evidence`

A batch can report `replaySetPass` only when the caller explicitly marks the workload representative and every supplied case is comparable with no observed regression. Even then, this Actor **never authorizes production promotion by itself**.

## Why this is different from a generic agent evaluator

This Actor does not generate subjective scores or run an LLM judge. It is a deterministic evidence witness for a narrow problem: **counterfactual verification of an already-proposed change on matched cases**.

It is designed to compose with trace auditors, retry analyzers, toolset pruners, routers, and CI systems.

## Epistemic boundary

This Actor compares the evidence you supply. It does not prove that two workloads are truly matched, infer missing quality, execute the replay, or prove business value. Cost savings cannot compensate for terminal or protected-value regressions.
