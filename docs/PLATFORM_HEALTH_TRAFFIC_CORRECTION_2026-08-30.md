# Platform Health Traffic Correction — 2026-08-30

## Trigger

A private zero-secret observer queried Apify's public Store API for the two live Flower Actors. Both appeared in the agentic-user filter and both showed two successful `publicActorRunStats30Days` runs that exclude runs started by the Actor owner.

At first glance, this looked like independent external execution evidence.

A second source-of-truth check found a critical confound: Apify documents that it automatically tests **all Actors in Apify Store daily** using the Actor's default input, expecting a successful run and non-empty default dataset within five minutes.

Therefore owner-excluded Store run counts cannot be promoted directly to user-demand evidence for a newly published Actor.

## New law

> **Platform Health Traffic != Market Traffic.**

A platform can execute, install, fetch, scan, approve, review, test, index, ping, or otherwise interact with a product as part of its own infrastructure. Such events prove reachability or operational health, not buyer intent.

## Truth ladder

Keep these states separate:

1. `LISTED_TRUTH` — the artifact is present on the external platform.
2. `ELIGIBILITY_TRUTH` — the artifact satisfies a distribution/payment eligibility gate.
3. `PLATFORM_EXECUTION_TRUTH` — the platform or another non-owner process has executed it.
4. `INDEPENDENT_USER_TRUTH` — an attributable independent user chose to execute/install/use it.
5. `CHARGED_EVENT_TRUTH` — an independent execution caused a billable event.
6. `CREATOR_REVENUE_TRUTH` — the creator's ledger records attributable earned value after platform economics.
7. `SETTLED_VALUE_TRUTH` — value is redeemable/settled to the creator.
8. `REPEAT_DEMAND_TRUTH` — an independent user or payer returns, or multiple independent users repeat the same paid transformation.

Do not skip levels because a platform exposes a convenient aggregate metric.

## Current Apify interpretation

### Social Preview Drift Guard API

Verified from the public Store API on 2026-08-30:

- listed and runnable;
- `isWhiteListedForAgenticPayments: true`;
- present when `allowsAgenticUsers=true`;
- absent when `allowsAgenticUsers=false`;
- pay-per-event at $0.005 per observed URL;
- Store aggregate shows two owner-excluded successful runs in the prior 30 days.

Because Apify automatically tests all Store Actors daily, the two owner-excluded runs do **not** establish independent-user demand.

Current promotion ceiling:

`LISTED_TRUTH = 1`
`ELIGIBILITY_TRUTH = 1`
`PLATFORM_EXECUTION_TRUTH >= 1`
`INDEPENDENT_USER_TRUTH = unresolved`
`CHARGED_EVENT_TRUTH = unresolved`
`CREATOR_REVENUE_TRUTH = 0 confirmed`
`REPEAT_DEMAND_TRUTH = unresolved`

### Google Maps Exact Match Guard

The same Store observation shows:

- listed and runnable;
- agentic-payment whitelist true;
- present in the agentic-user filter;
- two owner-excluded successful Store runs in the prior 30 days.

The same automated-testing confound applies. Do not count those aggregate runs as user adoption.

## Sensor finding

The unauthenticated public Actor-run list returned no individual run items for these Actors even though aggregate Store stats report owner-excluded runs. Therefore public data cannot currently attribute the runs to origin, user, or charged-event state.

This is a sensor limitation, not proof of absence.

New law:

> **Sensor blindness != absence of return, but blindness also does not license promotion.**

When attribution is unavailable, hold the state at the deepest independently verified layer.

## Portfolio consequence

The earlier human-actuation candidate to complete or investigate Apify KYC for agentic payments is obsolete: both live Actors are already publicly verified as agentic-payment eligible.

However, the new aggregate run counts do not yet earn public distribution expansion, pricing changes, feature work, or a claim of customer/revenue truth.

Changed Method Navigator therefore remains the highest-ranked human actuation candidate because its next uncertainty is genuinely independent-user exposure, while the Apify Actors already have platform distribution and their unresolved question is organic market return.

## Compact form

`PLATFORM ACTION -> CLASSIFY ORIGIN -> USER CHOICE -> CHARGE -> CREATOR LEDGER -> SETTLEMENT -> REPEAT`

Do not compress this into:

`RUN COUNT -> CUSTOMER`.
