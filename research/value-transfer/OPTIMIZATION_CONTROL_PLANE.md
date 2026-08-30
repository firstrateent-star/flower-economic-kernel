# Flower Optimization Control Plane — Research Branch

**Status:** research / transfer hypothesis. Not canonical methodology, not external-value proof, not authorization to publish or commercialize.

## Why this exists

Flower now contains several internally useful mechanisms that can be applied simultaneously to improve Flower while being tested for value to other systems. The strongest synthesis is not another context compressor. It is a control plane that chooses the cheapest adequate way to perceive, reason, act, and verify improvement.

The provisional loop is:

`STATE -> SPARSE CONTEXT -> VALUE/INFORMATION GRADIENT -> EXECUTION MODE -> MODEL/REASONER -> ACTION -> CAUSAL OBSERVATORY -> UPDATED STATE`

The broader Value Field remains a membrane around local optimization: verified material regressions cannot be averaged away by speed, money, or token savings.

## Parallel petals

### 1. Sparse context activation

**Internal Flower evidence:** targeted cognition already preserves global state while activating a small causal neighborhood; indexed repeated activation produced a verified internal efficiency improvement on the declared Observatory workload.

**External problem evidence:** current agent tooling increasingly uses on-demand tool loading, progressive disclosure, context pruning, deterministic context budgeting, and tool filtering because large tool/context surfaces increase token cost and can reduce tool-selection quality.

**How Flower should apply it now:** continue measuring operation-specific context bytes and decision equivalence; do not add generic compression merely because competitors exist.

**Potential outward value:** a decision-preserving context projector that can prove which reductions preserve task decisions, rather than only promising token reduction.

**Differentiation pressure:** commodity context compression is already crowded. Flower should only externalize this petal if causal-equivalence witnessing or integration with the rest of the control plane provides material additional value.

### 2. Self-Improvement Observatory

**Internal Flower evidence:** comparable workloads + causal implementation fingerprints + decision witnesses prevented false speed claims and later certified the indexed-activation improvement while preserving regression visibility.

**How Flower should apply it now:** every optimization petal in this document must pass through the Observatory or an equivalent comparison before becoming an internal-improvement claim.

**Potential outward value:** agent teams need regression/evaluation systems that distinguish changed metrics from causal improvement. Existing agent-eval projects confirm demand for trajectory, cost, latency, tool-use, and regression evaluation.

**Differentiation pressure:** many eval harnesses already exist. Flower's possible contribution is the causal self-improvement membrane: same workload, changed causal implementation, preserved decision witness, no verified regression, then bounded transfer analysis.

### 3. Marginal Value / Marginal Information Navigator

**Internal Flower state:** `src/core/value-gradient.js` now exposes direct-value density and information-value density separately, preserves unknowns, and consults the non-scalar Value Field.

**How Flower should apply it now:** instrument live opportunities with explicit smallest-next-action records before allowing this witness to govern selection. Do not manufacture decision stakes or probabilities from narrative prose.

**Potential outward value:** agents can use the witness to choose whether to probe, act, ask a human, or stop based on decision-changing yield per scarce resource.

**Differentiation pressure:** value-of-information mathematics is established. Flower's potential novelty is the combination with provenance, irreversible human burden, value-field regressions, and causal post-action observability.

### 4. Execution-Mode Router — NEW

**External signal:** current MCP benchmarking indicates direct tools and local/code-mode execution have different efficient task shapes. Short semantic steps may favor direct calls; long deterministic chains, repeated fan-out, large intermediates, and oversized tool catalogs can favor local execution and compression before model exposure.

**How Flower should apply it:** classify experiment/executor stages by task shape before adding more tools. Prefer direct tool exposure when model inspection must guide the next step; prefer deterministic local reduction when a stage consists mainly of repeatable filtering/aggregation.

**Potential outward value:** an agent execution router that reduces unnecessary model-visible tool traffic without hiding semantic decisions that require the model.

**Promotion test:** same workflow and decision result, different execution modes, measured tool/model calls + bytes/tokens + latency + error/decision witness. No runtime router until Flower has at least two genuinely different executor shapes to compare.

### 5. Adaptive Model Router — NEW

**External signal:** current routing research increasingly optimizes quality, monetary cost, and latency jointly rather than using one model for every query.

**Current Flower limitation:** `EfficientOpenAIReasoner` changes the Garden view but currently delegates to one configured underlying model. Flower does not yet have a measured multi-model routing policy.

**How Flower should apply it:** remain single-model until a stable replay suite exists. Then benchmark operations (EXPAND, FALSIFY, SELECT, TRANSFER, etc.) across candidate models/reasoning levels and preserve operation-specific quality witnesses.

**Potential outward value:** combine value-at-stake with model routing: spend more cognition only where expected decision improvement justifies the marginal model cost/latency.

**Promotion test:** same operation suite, at least two model routes, quality/cost/latency measured, no protected-value regression, and routing beats the best fixed policy on a declared objective without hiding tail failures.

### 6. Semantic reuse / content-addressed memory

**Internal Flower evidence:** methodology memory and causal fingerprints already showed that equivalence recognition can remove repeated reasoning while allowing reopening when evidence changes.

**External signal:** semantic/result caching is an active agent optimization category.

**How Flower should apply it:** prefer exact/content-addressed reuse where equivalence can be proven. Use semantic reuse only behind validation/invalidation because semantic similarity is not decision equivalence.

**Potential outward value:** safe agent caching whose cache key includes the causal state required for validity, not merely prompt similarity.

### 7. Shared Constraint Leverage Map — NEW EMERGENT

**Origin:** marginal action reasoning reveals that the highest-value next transition may resolve one shared bottleneck that unlocks many branches.

For constraint `c` affecting branches `i`:

`Leverage(c) ~= direct_value(c) + sum_i P(c unlocks i) * reachable_value_i`

This is a hypothesis, not a current scalar ranking law.

**How Flower should apply it:** before adding depth to several branches that are blocked for the same reason, detect shared missing capabilities, evidence channels, distribution rails, executors, or sovereignty boundaries. Resolve the reusable bottleneck when it has stronger evidenced marginal leverage than branch-local work.

**Potential outward value:** workflow/agent systems could identify high-centrality constraints whose removal increases useful throughput across multiple workflows.

**Promotion test:** recorded multi-branch workload where resolving a shared constraint reduces total steps/cost or increases successful terminal flow compared with optimizing branches independently.

### 8. Failure-to-Regression Memory

**External signal:** current agent-evaluation projects increasingly turn production failures into golden/regression tests.

**Internal Flower relationship:** evidence memory, mutation memory, historical negative controls, and self-improvement baselines already implement parts of this principle.

**How Flower should apply it:** when a real external transfer or economic failure occurs, preserve the smallest causal fixture that would have detected it before recurrence. Avoid converting every narrative failure into a hot test if no reproducible invariant exists.

**Potential outward value:** probably useful, but less differentiated because the category is increasingly crowded.

## Current portfolio ordering

### Apply to Flower now

1. Self-Improvement Observatory as mandatory evidence membrane for optimization claims.
2. Sparse operation-specific context activation and decision-equivalence measurement.
3. Marginal value/information instrumentation of smallest next actions.
4. Detect shared constraints before duplicating branch-local work.

### Build cold baselines before runtime promotion

1. Execution-mode routing.
2. Adaptive model routing.
3. Evidence-safe Pareto-before-weighting.
4. Safe semantic reuse beyond exact/content-addressed equivalence.

### Do not externalize as a standalone product yet

1. Generic context compression/filtering — strong external problem, but crowded surface.
2. Generic agent eval harness — strong problem, but crowded surface.
3. Generic semantic cache — crowded and validity-sensitive.

Instead test whether the integrated control plane creates a stronger transformation:

> **Use the minimum causally sufficient context, execution path, and cognition level for the next highest-value or highest-information action, then verify causally whether the system actually improved.**

## External evidence consulted — 2026-08-30

These establish problem/category reality, not Flower's external value:

- Ratel context engineering: https://github.com/ratel-ai/ratel
- GitHub Copilot CLI tool search: https://docs.github.com/en/copilot/concepts/agents/copilot-cli/tool-search
- Less Context, Better Agents: https://arxiv.org/abs/2606.10209
- Code Mode MCP task-shape benchmark: https://github.com/tmustier/code-mode-mcp/blob/main/docs/benchmarks/2026-07-direct-tools-and-code-mode.md
- Latency-aware LLM routing: https://arxiv.org/abs/2607.18253
- Agent evaluation harness example: https://github.com/reaatech/agent-eval-harness
- ContextCache: https://github.com/spranab/contextcache
- AgentEval failure memory: https://github.com/nishanttyagi28/agenteval

## Epistemic boundary

Internal usefulness, market/category activity, and plausible transferability do not prove that this combined control plane creates external value. The next earned milestone is a bounded external/runtime benchmark on a structurally appropriate workload. Any monetary form remains downstream of verified usefulness, legitimate capture, attributable return, full cost, ownership, and surplus.
