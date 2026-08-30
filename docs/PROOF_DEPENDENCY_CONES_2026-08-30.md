# Proof Dependency Cones — 2026-08-30

## Trigger

Changed Method Navigator's expensive real-SDK preflight was being retriggered by documentation-only files placed under the experiment directory. The executable plugin had not changed, yet the same functional/build/verifier proof was being recomputed.

At the same time, IntelliJ itself moved from the previously tested 2026.1.4 platform to 2026.2/2026.2.1. That environmental mutation genuinely *did* make the older compatibility proof stale.

The contrast exposes a general evidence law.

## Core law

> **A proof should be recomputed only when a mutation intersects the dependencies that make the proof true.**

Let an evidence item be `E` and let `D(E)` be the set of artifacts, assumptions, environment states and external facts on which `E` depends.

A mutation `m` invalidates or stales `E` only when:

`m ∩ D⁺(E) != ∅`

where `D⁺(E)` is the transitive dependency cone of the evidence.

If:

`m ∩ D⁺(E) = ∅`

then the existing evidence should normally be preserved rather than recomputed.

This is an operational rule, not a formal proof that all dependency graphs are perfectly known. Unknown dependencies should be represented explicitly rather than causing universal retesting.

## Examples

### Documentation-only mutation

Evidence:

`real PSI functional test passed for executable X on platform P`

Mutation:

`add PRIVATE_BETA_HANDOFF.md`

The Markdown file is not consumed by compilation, plugin packaging, runtime behavior or compatibility verification.

Therefore:

`documentation edit ∉ D⁺(functional proof)`

and an expensive full preflight should not be rerun.

### Platform-version mutation

Evidence:

`plugin is compatible with IntelliJ 2026.1.4`

Mutation:

`current target becomes IntelliJ 2026.2.1`

The target platform is a direct dependency of compatibility/runtime truth.

Therefore:

`platform version ∈ D⁺(compatibility proof)`

and a new preflight is justified.

### Toolchain mutation forced by platform dependency

IntelliJ 2026.2+ requires Java 25 for plugin development. A 2026.2 compile attempt under Java 21 failed because platform classes used class-file version 69 while the compiler accepted version 65.

The failure did not establish a plugin-API incompatibility. It established that the proof environment itself was outside the platform's required dependency cone.

The correct mutation was therefore:

`Java 21 -> Java 25`

without product feature changes.

## Evidence graph

Flower should increasingly store evidence as a graph rather than isolated booleans:

`artifact -> test harness -> toolchain -> target platform -> proof -> decision`

and separately:

`external source -> freshness window -> market claim -> decision`.

When one node changes, traverse only the downstream edges that can actually become stale.

## Economic effect

Blind retesting creates extraction cost:

- compute;
- latency;
- attention;
- noisy CI history;
- false impressions that technical uncertainty has reopened;
- opportunity cost while waiting for redundant proofs.

Dependency-aware proof reuse converts eliminated uncertainty into a durable asset.

This is economic reproduction at the evidence layer.

## Epistemic caution

Proof reuse must not become an excuse for stale truth.

Important external dependencies include:

- current platform/API versions;
- marketplace rules;
- laws and policies;
- live inventory;
- pricing;
- settlement state;
- demand behavior;
- model/runtime changes.

Time-sensitive evidence can have an implicit temporal dependency even when no repository file changed.

A useful evidence record therefore includes:

`E = (claim, dependencies, observedAt, freshnessClass, source, invalidationRules)`.

## CI implication

CI path filters should approximate the executable proof dependency cone. Changed Method Navigator's workflow now triggers on source/resources, build configuration and the workflow itself rather than every Markdown file under the experiment directory.

## Compact form

`MUTATION -> INTERSECT PROOF DEPENDENCY CONE? -> YES: RETEST / NO: REUSE EVIDENCE`

This keeps evidence fresh without repeatedly paying to rediscover truths that did not change.
