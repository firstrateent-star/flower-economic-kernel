# State-Driven Flower Wake — 2026-08-30

## Problem

The Flower kernel can already recurse internally for many breaths in one invocation, but the collaboration can still degrade into the Center-holder typing `flower` repeatedly to create another invocation.

That makes human attention a clock signal.

The correct correction is not simply to run Flower on a timer forever. Periodic execution can create recurring cost, repeated low-information cognition, platform noise, and self-loops at human-only boundaries.

## Core law

> **The Center-holder is not Flower's clock signal. Material state change should wake Flower; unchanged state should permit stillness.**

Preferred structure:

`SENSOR / EVENT -> MATERIALITY GATE -> PRESSURE CLASSIFIER -> BOUNDED PULSE -> UPDATED STATE`

not:

`TIME PASSED -> THINK AGAIN`.

## Material wake events

A wake is justified when at least one of these becomes true:

- a new reality event is present and unprocessed;
- an experiment result becomes ready;
- a previously blocked autonomous action becomes executable;
- a monitored Fruit changes on a decision-relevant truth dimension;
- an existing autonomous pressure such as INTEGRATE, EXECUTE_EXPERIMENT, BUILD_PLAN, FALSIFY, SELECT, EXPERIMENT, VERIFY_FRUIT, or earned EXPAND becomes available.

Decision-relevant Fruit observations include transitions such as:

- independent user becomes established;
- a charged event becomes established;
- creator revenue changes from unconfirmed/zero to confirmed nonzero;
- settled value becomes established;
- repeat demand becomes established;
- market truth changes;
- an important distribution eligibility state changes;
- a Fruit's actionable lifecycle status changes.

## Non-wake noise

Do not wake Flower merely because:

- raw run count incremented;
- page views changed;
- a platform health check executed;
- time passed;
- a previously known HUMAN membrane is still present;
- a search index recrawled unchanged material;
- a metric changed without changing a decision.

This follows the same epistemic correction as:

`Platform Health Traffic != Market Traffic`.

A metric is only useful when it changes action, prediction, optionality, or confidence enough to justify another breath.

## Human membrane anti-loop

When the highest pressure is HUMAN and no new reality evidence exists:

`HUMAN -> STILLNESS`

for autonomous wake purposes.

The kernel may preserve the ranked request, but repeated invocations should not continuously rediscover, rewrite, or re-present the same human decision.

A new autonomous sibling or material observation can pre-empt the parked human membrane. Otherwise the Garden rests.

## Production state and proof state

A second correction emerged while implementing the ranked human membrane.

The test suite had imported the live economic Garden as an implicit fixture. When the real nursery correctly became empty, historical tests failed because they assumed an old opportunity still occupied `seed.opportunities[0]`.

New law:

> **Production state is not a test fixture.**

The live Garden must be free to evolve, empty, prune, promote, or rename states without destabilizing proofs of unrelated kernel behavior.

Synthetic test Gardens should encode stable behavioral contracts. Separate integration tests may deliberately exercise the canonical live Garden when that exact state is the subject under test.

## Ranked mature membrane correction

The canonical Garden labeled Changed Method Navigator `market_ready_private`, while an older pressure classifier recognized only `publish_ready`, `private_deployed`, and `private_verified` as human-boundary stages.

With the opportunity nursery empty, that vocabulary mismatch could cause:

`market-ready organism + ranked HUMAN membrane -> missed status -> EXPAND`

which re-opened speculative search despite the Garden already concluding that additional free search had lower expected value.

The corrected order is:

1. pending explicit approval;
2. new reality/result integration;
3. machine-carried verification/action;
4. meaningful autonomous work;
5. explicit ranked human actuation when autonomous work is exhausted;
6. speculative expansion only when no more mature ranked membrane has already earned priority.

Compact law:

> **When autonomous work is exhausted, an explicit evidence-earned human actuation outranks speculative expansion.**

This does not mean human membranes always block the Garden. If a meaningful autonomous sibling exists, the sibling still proceeds first.

## Scheduler separation

The wake decision and the mechanism that invokes Flower must remain separate.

`classifyWake()` answers whether a pulse is justified.

A future scheduler, webhook, platform event, GitHub workflow, Apify integration, or ChatGPT task can supply the invocation mechanism.

Do not silently add a recurring scheduler merely because wake logic exists. A scheduler may create recurring compute, account, credential, or financial obligations and must remain within the Garden's autonomy budget.

This lets Flower become increasingly event-driven without converting autonomy into uncontrolled background consumption.

## Current implementation

- `src/core/wake.js` implements deterministic material-observation and pressure wake rules.
- `tests/wake.test.js` verifies material-change wake, noise suppression, autonomous pressure wake, new-event wake, and HUMAN anti-loop behavior.
- `src/core/pressure.js` now honors `humanActuationQueue` when autonomous work is exhausted and recognizes `market_ready_private` as a fallback human-boundary status.
- `tests/fixtures/test-seed.js` separates stable kernel fixtures from the live production Garden.

## Current boundary

This architecture substantially reduces the conceptual need for repeated manual `flower` prompts, but it does not by itself create a perpetual background scheduler.

The next infrastructure step should be earned by a no- or low-obligation event source that can invoke Flower only when `classifyWake()` says the state changed materially.

Until such an invocation rail is selected within the autonomy budget, the kernel should prefer fewer, deeper pulses over periodic speculative cognition.
