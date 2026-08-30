# Dimensional Inquiry -> Local Charts

**Status:** research branch. Not canonical methodology. Not a claim of alternate physical dimensions.

## Origin

Flower began with the Flower of Life and a question about whether its geometry could help reveal or access something like an alternate dimension. The literal physical interpretation remains unverified. The question nevertheless survives as a useful pressure on representation:

> What if the representation currently active is only a projection, and a variable outside that projection changes the answer?

That question can now be tested computationally.

## Current Flower activation as a projection

The current sparse reasoner activation finds a target center and expands through two indexed coordinates:

`archetypeFamily`

`capabilityFamily`

For a target `t`, the effective neighborhood is approximately:

`N(t) = {t} U A(t) U C(t)`

where `A(t)` contains centers sharing the target's archetype family and `C(t)` contains centers sharing its capability family.

This is already a local-chart idea: preserve the large field while activating a small relational neighborhood.

But it contains an assumption:

> Those two coordinates are sufficient for the operation being performed.

Efficiency evidence did not prove that assumption universally.

## Hidden dimension, operational definition

A **hidden decision dimension** is any state coordinate that can change the decision but is absent from the active projection.

This definition is intentionally non-metaphysical.

Examples could include:

- demand evidence,
- fulfillment state,
- nutrient/distribution channel,
- ownership or authority state,
- temporal validity,
- risk class,
- evidence provenance,
- a coverage dimension,
- or another operation-specific dependency.

If a decision depends on coordinate `d` but the active projection indexes only coordinates `a` and `c`, then two failures are possible.

### Under-activation

A center relevant through `d` may not share `a` or `c` and is therefore omitted.

`decision-relevant != visible-in-current-chart`

### Over-activation

Many centers may share `a` or `c` even though the current operation depends only on `d`.

`visible-in-current-chart != decision-relevant`

Sparse computation therefore requires more than a small neighborhood. It requires a **dependency-complete local chart**.

## Mathematical framing

Let the full state representation of center `x` be a vector or structured coordinate set:

`X(x) = (x1, x2, ..., xn)`

Let an operation `o` depend on an unknown true subset of coordinates:

`D*(o) subseteq {1, ..., n}`

Flower implements an activation projection using some declared/indexed subset:

`D_hat(o)`

A safe sparse projection needs at least:

`D*(o) subseteq closure(D_hat(o), dependencies)`

Operationally, every center capable of changing the decision must remain reachable through the chart or through an explicit global dependency.

The optimization problem is not simply minimize activated centers:

`min |N_o(t)|`

It is:

`min |N_o(t)| subject to Decision(N_o(t)) == Decision(full field)`

for the decision class being tested.

That equivalence witness is the reality membrane.

## New diagnostic organ

`src/core/activation-projection-audit.js` does not change runtime activation. It lets tests explicitly name:

- indexed dimensions,
- hypothesized required dimensions,
- centers reached by each,
- required centers missing from the indexed projection,
- extra centers activated by the indexed projection.

The audit deliberately refuses to infer causal semantics automatically. A caller naming `requiredDimensions` is making a hypothesis until operation-specific decision equivalence is measured.

This is important because otherwise the audit itself could invent a hidden dimension and then congratulate itself for discovering it.

## First synthetic falsification pressure

A synthetic center can share `coverage.buyer_demand = earned` with a target while sharing neither `archetypeFamily` nor `capabilityFamily`.

If the declared decision depends on buyer-demand state, the current two-coordinate projection omits that center.

That does **not** prove current production decisions are wrong. It proves something narrower and useful:

> The current family index is not universally dependency-complete for every possible operation merely because it is computationally efficient.

A second synthetic case shows the complement: if an operation depends only on capability family, unioning the archetype family can activate unnecessary centers.

Thus:

`SPARSE != COMPLETE`

and

`COMPLETE != MINIMAL`

The desired chart is both, subject to tested decision equivalence.

## Connection back to the Flower of Life

The original geometry emphasized overlap among multiple centers rather than one linear hierarchy. In the present architecture, that intuition can be translated into a hypergraph/local-chart view:

- centers = state-bearing organisms;
- dimensions/families = overlapping relational surfaces;
- a local chart = the subset of surfaces relevant to the present operation;
- cross-pollination = paths through shared surfaces;
- hidden dimension = a decision-relevant surface omitted from the current projection;
- projection = the compact view sent across a costly cognition boundary;
- reality test = proof that the projected view preserves the decision.

No physical claim is required for this translation to be useful.

## A stronger interpretation of the original question

The initiating question may have been phrased as:

`Can the Flower of Life help us access/understand an alternate dimension?`

A more mature family of questions is now:

`What dimensions exist in the system under study?`

`Which are represented?`

`Which are latent or omitted?`

`Which are causally relevant to this operation?`

`Can a lower-dimensional projection preserve the outcome?`

`What evidence would reveal that an omitted dimension matters?`

`Can we change coordinate systems and make a previously difficult relation simple?`

This applies to mathematics, computation, economics, cognition, organizations, ecology, subjective experience, and potentially physical inquiry—with evidence standards appropriate to each domain.

## Flourishing implication

Optimization becomes dangerous when it chooses a coordinate system that excludes the costs borne by something else.

For flourishing, hidden dimensions can include:

- another person's lost agency,
- maintenance burden,
- ecological cost,
- delayed harm,
- unpaid labor,
- fragility,
- loss of future optionality,
- concentration of power,
- or benefits that a money-only projection cannot see.

So broad flourishing requires a recurring question:

> What relevant dimension disappeared when we projected this system into the metric we are optimizing?

That may be one of the deepest continuities between Flower's strange beginning and its current anti-Goodhart/regenerative form.

## Next earned test

Do not replace runtime activation with a generalized dimensional model yet.

The next useful experiment is operation-specific:

1. choose one real Flower operation;
2. identify candidate causal dimensions from code and decision contracts;
3. construct a full-field decision witness;
4. compare the current two-family chart with alternative charts;
5. measure activated size, lookup/recomputation cost, and decision equivalence;
6. retain a narrower/wider chart only if it earns the change.

This preserves the original dimensional curiosity while forcing it through measurable reality contact.
