# Causal Isolation and the Minimum Evidence Path — 2026-08-30

## Trigger

Changed Method Navigator initially appeared ready for a JetBrains Marketplace probe. A cheaper path then surfaced: IntelliJ can install a third-party plugin ZIP directly from disk, allowing a high-fit independent developer to test the same executable capability without Marketplace onboarding.

The direct beta is not merely lower-burden. It is a cleaner experiment.

## Core law

> **Choose the cheapest experiment that isolates the uncertainty you actually need to resolve.**

A realistic-looking experiment can be epistemically worse when it introduces extra variables.

## Confounding example

Suppose a Marketplace release receives no installs.

Possible causes include:

- the capability is not useful;
- users never saw the listing;
- search ranking was weak;
- title/description/icon failed to communicate the value;
- the plugin was hidden;
- approval or compatibility reduced exposure;
- competing plugins captured attention;
- trust in a new vendor was low;
- the target audience was not present during the observation window.

The observation `0 installs` therefore has many causal explanations.

By contrast, if a developer who has independently articulated the exact problem is given a verified binary and chooses to install it, the probe controls much of the discovery problem. Their return is more directly informative about:

`capability -> correct behavior -> workflow usefulness -> repeat intent`.

This does not test broad market demand, but it tests the immediate uncertainty with much less causal ambiguity.

## Information-per-cost formulation

For candidate experiment `e`, a useful ordering heuristic is:

`V(e) = E[DecisionChange(e)] × CausalIsolation(e) × Reversibility(e) / (HumanBurden(e) + Capital(e) + Time(e) + Confounding(e) + Irreversibility(e))`

This is not a calibrated numeric model. It encodes selection pressure.

The best experiment is not the one with the most variables or most realistic production surface. It is the one that most efficiently changes the next decision.

## State-graph interpretation

Let Flower's current epistemic state be node `S` and a decision-ready state be `S*`.

Experiments are directed edges with costs and evidence-return distributions.

The objective is approximately a minimum-cost evidence-bearing path:

`S --e1--> S1 --e2--> ... --en--> S*`

subject to each edge actually resolving a needed uncertainty.

Do not traverse expensive distribution/legal/payment edges when a cheaper validation edge reaches the same next epistemic node.

## Sequential decomposition

Complex market truth should be decomposed:

1. **Capability truth** — does it function?
2. **Utility truth** — does a high-fit independent user benefit?
3. **Repeat truth** — do they choose it again?
4. **Breadth truth** — do multiple independent users choose it?
5. **Discovery truth** — can passive distribution find them?
6. **Willingness-to-pay truth** — will they exchange value?
7. **Settlement truth** — does value actually arrive and clear?
8. **Regeneration truth** — does the return lower the cost of future cycles?

Trying to test all eight at once often produces ambiguous failure.

## Changed Method Navigator consequence

The next clean edge, once current-target technical truth is green, is:

`private verified ZIP -> one high-fit independent developer -> install/use/feedback`

not:

`vendor/legal setup -> Marketplace -> listing/discovery -> installs?`.

If utility fails, prune or mutate without paying distribution setup.

If utility survives, the next experiment can deliberately test breadth or distribution.

## Relationship to Flower root

This makes `PROBE` more precise:

`STATE -> GRADIENT -> MINIMUM CAUSALLY-ISOLATED PROBE -> RETURN -> UPDATED STATE`.

The Flower should add realism only when realism itself is the uncertainty under test.

## Compact form

`DO NOT TEST THE WHOLE BUSINESS WHEN ONE UNCERTAINTY IS BLOCKING THE NEXT DECISION.`
