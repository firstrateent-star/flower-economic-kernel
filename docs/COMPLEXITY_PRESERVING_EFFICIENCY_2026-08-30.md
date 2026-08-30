# Complexity-Preserving Efficiency — 2026-08-30

## Center
Efficiency must not be confused with simplification.

The Flower is intentionally multidimensional: many hypotheses, evidence relationships, constraints, reusable capabilities, mathematical structures, future consequences, and sovereignty boundaries may coexist. Reducing those dimensions merely to make the system cheaper would create a faster but less capable organism.

The target is therefore:

> Preserve decision-relevant complexity while removing redundant execution.

A useful distinction is:

**Knowledge topology** may remain dense, recursive, overlapping, and high-dimensional.

**Execution topology** should be sparse, event-driven, cached, batched, and bounded by material change.

## Efficiency objective
A rough operational objective is:

`ComplexityPreservingEfficiency = DecisionRelevantComplexityPreserved × UsefulTransitionYield / (HumanAttention + CostlyFrontiers + RedundantRecomputation + RepeatedInvocations + StateChurn)`

This is not a scalar truth metric. It is a design pressure. The numerator prevents efficiency work from winning merely by deleting dimensions; the denominator exposes avoidable extraction.

## What may be compressed
The following are legitimate efficiency targets when semantic meaning is preserved:

- repeated invocations that only continue deterministic consequences;
- recomputation of derived structures whose semantic inputs did not change;
- duplicate transmission of the same context across a costly cognition boundary;
- repeated searches against evidence already retrieved and still fresh enough for the decision;
- repeated human prompts caused only by machine scheduling or serialization;
- telemetry, timestamps, and raw counters that do not alter the decision state;
- multiple separate experiments when one real frontier genuinely supplies independently attributable evidence for several dimensions.

## What must not be compressed away
Efficiency may not erase:

- distinct hypotheses merely because they are inconvenient to compare;
- negative evidence or failed branches that prevent repeated mistakes;
- provenance needed to distinguish inference from observed truth;
- complements, counterexamples, boundary cases, or mathematical contradictions;
- buyer-context differences;
- downstream obligations and future consequences;
- sovereignty, legal, identity, trust, or publication boundaries;
- minority branches that have materially different evidence rather than cosmetic variation;
- uncertainty that has not actually been resolved.

The test is not whether fewer tokens or objects remain. The test is whether the same or better decisions remain possible.

## Law 1 — Bound uncertainty, not deterministic complexity
A pulse should cross only a bounded number of costly or uncertainty-creating frontiers, but once a real result exists it should carry deterministic consequences toward closure without requiring artificial restarts.

Old behavior capped all internal transitions at 12.

Corrected behavior uses a higher deterministic safety ceiling while retaining a separate costly-frontier budget. A CI proof closes 20 deterministic integration transitions in one pulse and still stops before a prohibited costly frontier.

Therefore:

`CostlyFrontierBudget != DeterministicClosureBudget`

## Law 2 — Derived complexity becomes inert when its inputs are unchanged
The Flower geometry can contain pairwise relationships and therefore become increasingly expensive to reconstruct as the Garden grows.

Geometry is now keyed by a SHA-256 signature over only geometry-relevant semantic inputs. If that signature is unchanged, the existing derived graph is returned exactly.

Therefore:

`SameSemanticInputs -> SameDerivedStructure -> NoRecomputation -> NoTimestampChurn`

Dense representation remains available; unchanged density stops consuming repeated work.

## Law 3 — Use task-specific views across costly cognition boundaries
The full Garden should remain rich. Expensive reasoners should not automatically receive every raw field on every call.

A future reasoner view should be a lossless-for-the-decision projection:

`DenseGarden -> OperationRelevantSubgraph -> CostlyReasoning -> Result -> DenseGarden`

The projection may remove duplication and irrelevant telemetry, but it must retain every field capable of changing the operation's decision.

For example, EXPAND needs failure history, reusable geometry, active distribution/capability context, current invariants, and fresh evidence constraints; it does not need duplicated copies of the same full geometry when a purpose-specific geometry view is already present.

## Law 4 — Reuse evidence without collapsing provenance
One expensive frontier may nourish multiple petals if the evidence genuinely supports them.

This is not permission to reuse a source indiscriminately. Evidence must remain mapped to the exact claim/dimension it supports.

`OneFrontier -> MultipleAttributedReturns` is efficient.

`OneSource -> AssumedUniversalSupport` is epistemic corruption.

## Law 5 — Sparse activation
The existence of many petals does not imply that all petals must execute on every cycle.

After a material perturbation, activate the smallest affected region plus any connected regions whose decision state can actually change.

Conceptually:

`GlobalComplexState + LocalPerturbation -> RelevantSubgraphActivation -> GlobalStateUpdate`

This preserves the whole field while preventing complexity from becoming mandatory global recomputation.

Implemented refinement:

- EXPAND and SELECT remain global because their decision is inherently comparative across the field.
- Targeted cognition such as FALSIFY, EXPERIMENT, EXECUTE_EXPERIMENT, and BUILD_PLAN receives the target plus centers sharing its failure-archetype or reusable-capability family.
- Aggregate portfolio counts survive even when unrelated organism detail is omitted.
- Missing/ambiguous target identity falls back to the global compressed view rather than risking information loss.

Therefore sparse activation is an optimization with a safety fallback, not a license to forget unrelated knowledge.

## Law 6 — Efficiency includes human interrupts
Human attention is part of execution cost. A system that makes ten correct micro-decisions but asks the Center-holder to restart it after each one is less efficient than a system that autonomously closes the safe chain and interrupts once at the genuine sovereignty boundary.

Therefore:

`HumanInterrupts should scale with SovereigntyTransitions, not InternalTransitionCount.`

## Law 7 — Wake must have causal reach
A sensor event that wakes Flower but cannot alter the decision state is false responsiveness.

Decision-relevant observation truth must be allowed to project into the Fruit fields it directly observes, while governance remains protected. For example, independently observed usage, charged events, creator revenue, settled value, repeat demand, agentic eligibility, market truth, and external usage may update operational Fruit truth. An externally observed lifecycle `status` does not silently replace Flower lifecycle authority.

Each material observation therefore carries an impact description:

`Observation -> Changed Truth Keys -> Impact Domains -> Directly Affected Organism(s)`

This enables later sparse activation while preserving provenance between observed fact and governance decision.

## Law 8 — Human priority may change when reality changes
A static human-actuation rank is a prior, not an eternal truth.

When eligible sovereignty actions compete, verified economic return or repeat demand should outrank merely independent use, which should outrank an organism with no market return. Static rank remains the tie-breaker inside the same evidence tier.

`EconomicReturn/Repeat > IndependentUse > NoMarketReturn`

Platform readiness, agentic eligibility, health traffic, raw counters, and other non-market signals do not receive this priority boost.

Likewise, a human action explicitly staged as “not yet earned” may become eligible when independent return arrives, but evidence does not authorize the action. It only changes eligibility/priority; the sovereignty membrane remains intact.

## Law 9 — Cache invalidation must follow true dependencies
Caching is only efficient when invalidation is causally precise.

The Flower geometry uses integrated supporting experiment dimensions to compute earned coverage. Therefore an experiment moving from authorized to result-ready, or returning weak/inconclusive evidence, cannot change geometry and must not invalidate the graph. Only experiment state that can actually change coverage participates in the geometry signature.

General law:

`DerivedStateInvalidation <- ActualSemanticDependencies`

not:

`DerivedStateInvalidation <- AnyNearbyStateMutation`.

This is the computational analogue of epistemic discipline: do not update a belief or structure from evidence that cannot logically bear on it.

## Mathematical analogy
The desired Flower resembles a sparse dynamical system more than a simplified tree.

The state space may be high-dimensional:

`S ∈ R^n` with large `n`.

Efficiency does not require reducing `n` arbitrarily. It requires that a perturbation activate only a sparse subset of derivatives when possible:

`dS/dt` may be sparse even when `S` is complex.

A more precise local form is a sparse Jacobian intuition. If decision state `y_i` cannot depend on state variable `x_j`, then a perturbation to `x_j` should not force recomputation of `y_i`:

`∂y_i / ∂x_j = 0 -> no activation edge required`.

Likewise, a graph may contain many nodes and edges while incremental computation touches only the neighborhood affected by new evidence.

## New operating question
Do not ask:

> How can Flower think about fewer things?

Ask:

> How can Flower preserve everything that could change the decision while doing less work on everything that cannot?

And after a perturbation ask:

> What can this evidence actually change, and what is mathematically/causally independent of it?

That is complexity-preserving efficiency.
