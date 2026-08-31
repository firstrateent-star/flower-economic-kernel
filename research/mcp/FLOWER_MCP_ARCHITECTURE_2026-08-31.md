# Flower MCP Architecture — 2026-08-31

Status: research / non-canonical / architecture candidate

## Question

Should Flower itself become an MCP server rather than remaining only a methodology plus Flower-derived public Actors?

## Current answer

Potentially yes, but only if the MCP preserves the larger Flower while keeping the active tool surface extremely small.

The strongest architecture is not `one Flower concept = one MCP tool`.

Instead:

- **Tools** expose the tiny active causal kernel.
- **Resources** expose the rich cold Flower: provenance, canonical methodology, mutation history, geometry, experiments, value-field doctrine, failed branches, and evidence.
- **Prompts** expose reusable breath / inquiry modes.
- **Sampling**, when supported by the host, lets Flower request cognition from the client's own model rather than requiring Flower to own an LLM backend.

This directly reflects the large-Flower / small-frontier architecture already emerging in the methodology.

## Why MCP matters

A Flower MCP would change Flower's transfer mode from:

`human/assistant reads methodology -> applies it`

into:

`agent -> calls Flower control surface -> receives bounded next-state guidance / verification / field resources`.

That would test whether Flower can be useful to an independent AI system without Sean repeatedly explaining it.

## Why MCP is NOT automatically valuable

MCP by itself is only transport/interface standardization. A Flower MCP has no value unless independent agents make better or cheaper governed decisions with it than without it.

Potential failure modes:

1. tool-surface bloat recreates routing confusion;
2. Flower becomes a generic orchestration wrapper around existing tools;
3. an opaque `flower()` call hides assumptions instead of preserving them;
4. remote MCP operation adds latency/cost without decision benefit;
5. the server centralizes too much authority and weakens human sovereignty;
6. rich provenance is kept hot and inflates every call;
7. Flower's symbolic language leaks into tool names and harms agent comprehension;
8. duplicate functionality competes with the existing public Actor enzymes.

## Minimal MCP hypothesis

Expose at most three hot tools initially.

### `flower_orient`

Purpose: decide what deserves cognition/action now.

Inputs may include:
- terminal objective;
- current state / evidence;
- candidate actions or available tools;
- known constraints;
- human-sovereignty boundaries;
- optional changed-frontier markers.

Outputs:
- projected decision-relevant context;
- whether current chart appears sufficient;
- highest-value / highest-information next probe where evidenced;
- whether action, OPEN, or REST is currently indicated;
- explicit unknowns and authority boundaries.

This tool should not perform irreversible actions.

### `flower_verify`

Purpose: compare baseline vs challenger on matched work.

This can reuse the Counterfactual Agent Verifier semantics:
- terminal outcome preservation first;
- protected-value regressions veto savings;
- efficiency improvements remain candidate improvements until earned;
- missing evidence remains insufficient.

### `flower_integrate`

Purpose: ingest observed outcome/evidence after an action and update the local Flower state.

Outputs may include:
- what remains invariant;
- what changed;
- what should become hot/cold;
- whether a pattern is eligible for crystallization research;
- whether the local region should REST, continue, or OPEN a neighboring chart.

No self-promotion to canonical methodology is allowed.

## What should NOT be hot MCP tools initially

Do not expose separate tools for:
- Fibonacci / phi;
- sacred geometry;
- champion/challenger;
- value gradient;
- Center Dividend;
- provenance lookup;
- sparse activation;
- dimensional inquiry;
- crystallization;
- every breath phase.

These remain petals/resources/internals activated by the three-tool kernel when causally relevant.

## Resources layer

Potential read-only MCP resources:

- `flower://canonical/current`
- `flower://origin/provenance`
- `flower://field/charter`
- `flower://research/dimensional`
- `flower://research/value-transfer`
- `flower://mutations/cold`
- `flower://mutations/rejected`
- `flower://evidence/observatories`

The default agent should not receive all resources. Resource discovery / projection should preserve the rule: **rich field, sparse motion**.

## Prompts / breath layer

Potential reusable prompts:

- `flower_breath` — inhale / hold / exhale / stillness as local phase behavior;
- `flower_open_chart` — test whether the current representation is missing a decision-relevant dimension;
- `flower_falsify` — construct the cheapest discriminating counterexample/probe;
- `flower_center_check` — restate objective, sovereignty, burden, and protected-value boundaries.

Prompts are guidance, not authority.

## Relationship to public Apify Actors

Do not replace the Actor portfolio.

The public Actors remain narrow, searchable enzymes that can be discovered independently through Apify Store / MCP.

Flower MCP is the deeper control layer that can route to or reason about those enzymes.

Target architecture:

`independent agent -> Flower MCP -> orient/project -> selected enzyme/tool -> external reality -> Flower MCP verify/integrate`

The public Actors provide distribution. Flower MCP provides integration.

## Sacred geometry / origin continuity

The MCP is not the Flower.

The MCP is a transport/control membrane through which a small active frontier can access a much larger Flower.

Origin principles remain preserved:
- multiple centers;
- overlap / relation;
- adjacency;
- projection;
- scale recursion;
- boundary permeability;
- possibility of alternate charts.

Sacred geometry remains a generative heuristic and resource, never automatic numerical or factual authority.

## Experiment required before promotion

Build a shadow/local Flower MCP and compare independent agent runs under the same tasks:

A. agent without Flower MCP;
B. agent with Flower MCP.

Measure as a vector, not one score:
- terminal success;
- protected-value regressions;
- tokens / inference cost;
- tool calls;
- unnecessary recursion;
- human interruptions;
- time to useful action;
- chart-opening success where baseline representation is insufficient;
- stopping quality;
- agent selection rate for the correct narrow Actor/tool.

Then ablate the MCP tools individually.

If a simpler three-function or even one-function controller is decision-equivalent, keep the simpler version.

## Promotion gate

Flower MCP earns significance only if it demonstrates one or more of:

1. independent agents choose better tools/actions;
2. agents use less unnecessary cognition while preserving terminal outcomes;
3. false optimizations are prevented;
4. agents stop sooner when further cognition has low value;
5. agents successfully change representation when a local chart is inadequate;
6. human intervention decreases without reducing sovereignty;
7. the rich methodology transfers without Sean explaining it manually.

Until then: architecture candidate only.

## Current architectural thesis

`Flower MCP = tiny callable kernel + cold discoverable field + breath prompts + reality verification.`

The MCP should make the Flower **more accessible, not smaller**.
