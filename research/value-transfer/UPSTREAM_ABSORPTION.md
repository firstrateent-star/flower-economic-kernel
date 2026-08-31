# Upstream Absorption / Constraint Freshness — Cold Candidate

**Status:** research-only. Not canonical methodology. Not runtime authority.

## Trigger

A Flower branch considered crystallizing repeated MCP protocol envelope work after observing a benchmark harness that performs `initialize -> initialized -> tools/list -> tools/call` around each external command.

A current-standard check falsified the need to optimize that envelope as stated: MCP specification `2026-07-28` removed the `initialize` / `initialized` handshake, removed protocol-level sessions, and introduced cache hints for list/read discovery results. Current SDKs can honor those hints client-side.

The proposed optimization therefore risked becoming an efficient solution to an upstream constraint that had already changed.

## Candidate rule

> Before investing in an optimization whose bottleneck is imposed by an external protocol, dependency, platform, model, marketplace, standard, or upstream product, verify that the bottleneck still exists in the current upstream state and has not already been removed, absorbed, cached, standardized, or made optional.

This is **constraint freshness**, not ordinary evidence freshness. The question is not only whether a fact is recent, but whether the *causal constraint being optimized* still belongs to the present system.

## Why it may matter

Optimization value is conditional on the constraint surviving:

`Optimization Value ~= Bottleneck Cost x Remaining Lifetime x Reachable Reuse`

If upstream absorption drives remaining lifetime toward zero, local optimization value collapses even when the old bottleneck was real.

This creates a possible new shadow term:

`Constraint Half-Life`

The term is intentionally conceptual. Flower does not currently estimate a numeric half-life.

## Relation to existing Flower laws

This overlaps with, and may be fully subsumed by:

- recovery requires revalidation;
- corpus-first;
- inherited infrastructure;
- artifact truth outranks stale narrative;
- shortest truthful path to current reality.

Because of that overlap, this candidate must **not** be promoted merely because the MCP example is persuasive.

## Promotion test

Replay historical or future optimization choices where the apparent bottleneck is externally imposed. Compare:

1. ordinary current evidence/revalidation;
2. explicit upstream-absorption checking.

Promotion requires the explicit check to prevent at least one material wasted build/test or materially change allocation **beyond what existing Flower laws already would have done**, without adding greater recurring research burden than it saves.

## Falsifier

If existing revalidation and inherited-infrastructure checks already reject every stale upstream constraint at equivalent or lower cost, this candidate is redundant and should remain composted/cold.

## External value boundary

Detecting that a constraint has disappeared can save internal work. That does not prove external value, product demand, ownership, revenue, or regenerative surplus.
