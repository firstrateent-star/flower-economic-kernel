# Phi & Fibonacci Optimization in Flower — Shadow Analysis

Status: research-only; canonical promotion not authorized.

## Boundary first

Phi and Fibonacci are part of Flower's geometric/mathematical ancestry, but ancestry does not grant optimization authority. Their mathematically earned optimization role is narrow:

- one-dimensional bounded search
- observable objective
- unimodal objective over the bracket (verified or sufficiently supported)
- expensive evaluations where reuse matters
- Fibonacci when the evaluation budget is fixed in advance
- golden-section search when the horizon is open-ended

Outside those conditions, use ordinary evidence-gated optimization or another method.

## Mathematics

`phi = (1 + sqrt(5))/2 ≈ 1.6180339887`

`tau = 1/phi = phi - 1 ≈ 0.6180339887`

The identity

`phi^2 = phi + 1`

creates the self-similar interval geometry used by golden-section search. Two interior probes divide a bracket so that after one side is rejected, one surviving old probe is already positioned correctly for the next reduced interval. Therefore after initialization each step generally requires only one new expensive function evaluation.

For a finite evaluation budget, Fibonacci search chooses ratios from successive Fibonacci numbers. As the budget grows, `F_(n-1)/F_n -> 1/phi`, so golden-section search is the asymptotic open-ended form.

## Framework 1 — Flower methodology optimization

### Earned use: threshold/parameter tuning

Flower now contains tunable quantities such as prompt projection boundaries, cache strategy thresholds, timeout values, confidence thresholds, reasoning-effort cutoffs, and potentially activation thresholds.

If one such parameter `x` can be isolated and replay produces an observable protected objective `J(x)`, and the replay curve is empirically unimodal over `[a,b]`, then Flower can replace coarse grid search with a reuse-preserving search.

Example:

`x = percentage of methodology retained in a projected reasoner view`

Possible protected objective:

`J(x) = effective inference cost`

subject to:

`decision-equivalence = true`
`origin integrity = true`
`stop behavior = preserved`

Important: the protected constraints are gates, not scalar terms. If equivalence fails, the point is inadmissible regardless of cost.

Then the admissible scalar optimization is:

`minimize J(x) over x in [a,b]`

and golden-section/Fibonacci search may be appropriate only if observed replay evidence supports unimodality.

### Deeper methodological transfer: preserve one probe

The strongest transferable lesson is not the number 0.618. It is the recurrence:

`new interval reuses old evidence + requires one new discriminating probe`

This suggests a general Flower optimization principle candidate:

> Prefer recursive search geometries that preserve still-valid evidence across state reduction, so each breath pays primarily for the changed frontier.

This is already compatible with sparse activation, semantic indexes, changed-frontier reasoning, cache reuse, and crystallization. It may therefore be a merge/derivation rather than a new canonical law.

### Fibonacci as finite-attention budgeting

Fibonacci search has a legitimate role when Flower knows a strict experiment budget in advance. If exactly `N` expensive evaluations are available for a bounded scalar question, Fibonacci spacing is a mathematically grounded candidate for minimizing worst-case residual uncertainty under unimodality.

Do NOT generalize this into 'Flower should do 1,2,3,5,8 breaths' or 'allocate 61.8% to the champion.' Those claims do not follow from Fibonacci search theory.

## Framework 2 — economic/runtime kernel optimization

### Strong candidates

1. **Cache/projection split tuning**
   Tune one scalar such as retained stable-prefix fraction or projection threshold against observed effective inference cost, while holding terminal decision quality above a hard floor.

2. **Reasoning-effort threshold**
   If a single difficulty/uncertainty threshold determines when Flower escalates from cheap cognition to expensive cognition, replay can test cost-vs-quality across the threshold. Phi/Fibonacci become eligible only if the admissible objective is empirically unimodal.

3. **Timeout / latency threshold**
   For a deterministic executor or sensor whose timeout creates a single tradeoff curve, bounded one-dimensional tuning may fit.

4. **Activation threshold**
   If a scalar threshold controls how much local state is activated and replay shows a single optimum in effective cost under protected accuracy, golden/Fibonacci search can reduce required evaluations.

### Invalid uses

- terminal candidate scoring weights
- resource allocation across incomparable opportunities
- flourishing dimensions
- human-attention vs money tradeoffs
- broad market portfolio weights
- branching ratios in an unknown search landscape
- choosing 61.8% merely because Flower originated in sacred geometry

These are multi-dimensional, non-unimodal, value-laden, or otherwise outside the theorem's assumptions.

## Optimization synthesis

The useful cross-framework pattern is:

`RICH BRACKET / FIELD`
`-> TWO DISCRIMINATING PROBES`
`-> DISCARD INFERIOR REGION`
`-> REUSE ONE VALID PROBE`
`-> PAY FOR ONE NEW FRONTIER PROBE`
`-> REPEAT`

This is mathematically continuous with Flower's current architecture:

`large latent field -> sparse local activation -> preserve valid state -> update only changed frontier`

The golden ratio is therefore most useful to Flower when it reveals a **reuse-preserving recursive geometry**, not when treated as a universal magic proportion.

## Promotion experiment

Do not modify runtime yet.

First find one real Flower scalar tuning problem with:

- bounded interval
- same-workload replay
- protected decision-equivalence witness
- observed effective cost
- at least enough sampled points to test whether the admissible objective is plausibly unimodal

Then compare:

- grid search
- binary/ternary-style baseline where applicable
- golden-section search
- finite-budget Fibonacci search

Measure number of expensive evaluations required to reach the same tolerance / selected parameter region.

Promote only if phi/Fibonacci reduce evaluation burden without changing the protected decision outcome.
