# Local Intrinsic-Dimension Flower Field

**Status:** research hypothesis; not canonical methodology and not a claim about physical extra dimensions.

## Origin

This branch descends from the original Flower-of-Life question about whether a visible representation might conceal or project richer dimensional structure.

The inquiry has now differentiated four ideas that must not be conflated:

- ambient/embedding dimension;
- intrinsic dimension;
- hidden causal dimension;
- alternate coordinate or representational basis.

The new question is operational:

> How many independent degrees of freedom are actually decision-relevant in the local region Flower is traversing?

## External research alignment

Established manifold-learning work treats high-dimensional observations as potentially concentrated near lower-dimensional structure. Work on deep-network representations has reported intrinsic dimension substantially below ambient representation size. More recent work emphasizes local intrinsic dimension, and other research challenges the assumption that one connected dataset has one constant dimension by modeling mixtures/singular structures with dimension that can vary point to point.

Sources consulted in this branch:

- Ansuini, Laio, Macke, Zoccolan (2019), *Intrinsic dimension of data representations in deep neural networks*, arXiv:1905.12784.
- Tempczyk et al. (ICML 2022), *LIDL: Local Intrinsic Dimension Estimation Using Approximate Likelihood*.
- von Rohrscheidt & Rieck (ICML 2023), *Topological Singularity Detection at Multiple Scales*.
- Wang & Wang (ICML 2024), *CW Complex Hypothesis for Image Data*.
- Yu et al. (2026 preprint), *Local Intrinsic Dimension of Representations Predicts Alignment and Generalization in AI Models and Human Brain*.

These sources support studying local intrinsic dimension as a computational/geometric quantity. They do not support claims that the Flower of Life accesses another physical dimension.

## Flower translation

Let the full representational state live in an ambient space with dimension `D`, but let a local decision region around state `x` have effective intrinsic dimension `d(x)`.

Generally:

`d(x) <= D`

and Flower should not assume:

`d(x) = constant`.

A better field picture is therefore stratified rather than globally uniform:

`REGION A: low effective dimension`

`REGION B: higher effective dimension`

`BOUNDARY / SINGULARITY: dimensional structure changes`

`REGION C: different coordinate system or causal factors become relevant`

This maps naturally to Flower's asynchronous field model: different regions can expand, rest, formalize, test, or compress under different local complexity.

## Connection to A_n frontier growth

The A_n coordination-sequence work gives an exact toy model showing why dimension matters: shell size grows as a degree-(n-1) polynomial and accumulated ball size as degree n.

That does **not** imply real Flower problems literally have A_n geometry. It provides a falsifiable structural warning:

> If local independent relational dimension rises, exhaustive adjacency grows rapidly; fixed-width reasoning may miss structure while full-field reasoning becomes wasteful.

Therefore a dimension-aware Flower would ideally allocate activation budget using local decision complexity rather than ambient state size.

## Candidate Dimension-Adaptive Breath

Research-only concept:

`SENSE LOCAL STRUCTURE -> ESTIMATE DECISION-RELEVANT DIMENSION / SINGULARITY -> CHOOSE REPRESENTATION -> ALLOCATE BREADTH/DEPTH -> PROBE -> UPDATE LOCAL MODEL`

Possible consequences if later evidenced:

- low-dimension regions: compress aggressively, reuse invariants, broader cheap local exploration;
- high-dimension regions: narrower probes, stronger challenger allocation, higher evidence burden before depth;
- dimensional boundaries/singularities: avoid overconfident interpolation; increase uncertainty and test whether the coordinate system itself changed;
- unknown local dimension: preserve global fallback rather than pretending a low-dimensional chart is sufficient.

## Why this is not canonical yet

The current Garden is too small and too categorical to justify a trustworthy local intrinsic-dimension estimator. Flower already has sparse family indexing, causal-subgraph activation, complexity tax, and global fallback. Adding a numerical dimension estimator now would likely create more machinery than decision gain.

## Falsifier / promotion gate

Do not promote a Dimension-Adaptive Breath unless a bounded comparable experiment shows that a local-dimension or dimensional-boundary signal changes at least one real allocation/activation decision and improves a protected witness such as:

- decision equivalence/accuracy;
- activation work;
- payload/context burden;
- time-to-truth;
- branch diversity without extra human burden;
- detection of a case the current family projection misses.

If existing sparse causal activation performs equivalently, keep this hypothesis cold.

## Epistemic boundary

Local intrinsic dimension is a mathematical/statistical property of representations and data neighborhoods. A useful local-dimension model inside Flower would not establish literal alternate physical dimensions, spiritual cosmology, or consciousness claims.
