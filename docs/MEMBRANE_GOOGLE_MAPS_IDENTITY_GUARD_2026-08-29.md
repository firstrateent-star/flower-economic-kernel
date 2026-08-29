# Earned Membrane — Google Maps Identity Guard — 2026-08-29

## Why this branch earned a human boundary

This is not selected because it was already built. It is selected because a fresh pressure-surface scan found an unusually strong conjunction between an existing Fruit and a live upstream economic flow.

### Primary flow

The Apify-maintained `compass/crawler-google-places` Google Maps Scraper currently shows approximately 577K total users and 35K monthly active users, with 1,784 ratings at the time of the scan.

That is a large existing machine-to-machine data flow. Users pay for/consume business identity data and route it downstream into lead generation, enrichment, CRM, review, and automation workflows.

### Failure reality

A current public issue on the same upstream Actor documents a name+address query returning a completely different business, including wrong name and address. Another issue shows the exact-name matching option can also unexpectedly eliminate otherwise valid results.

This verifies the failure topology directly in the same substrate the existing Fruit uses:

`expected business identity -> Google Maps lookup -> plausible/wrong or over-filtered result -> downstream automation risk`

### Existing Flow Key

`google-maps-exact-match-guard` already implements a fail-closed identity-verification membrane using expected business name/address and returns `safeToAutouse` only on strong evidence.

It therefore does not need a new product hypothesis to be useful at this pressure surface.

### Why this is different from prior branch capture

The upstream flow was re-discovered from the field, not privileged merely because the code already exists.

The branch has:

- live upstream machine demand;
- direct public evidence of the exact failure;
- an existing zero-marginal-code Flow Key;
- same-platform machine-to-machine distribution potential;
- objective output telemetry (`matched`, `ambiguous`, `no_match`, `safeToAutouse`);
- no need to custody principal money;
- low human fulfillment burden once deployed;
- no need to manufacture consumer demand.

Unknowns remain:

- whether the Actor is actually public/indexed in the Apify Store now;
- whether its current deployment is configured for Pay Per Event;
- current real usage/revenue;
- whether Apify discovery surfaces the guard naturally near Google Maps workflows;
- exact KYC/payout status of the developer account;
- conversion willingness: upstream users may tolerate occasional identity ambiguity rather than pay for a guard.

## Exact next consequential action

The next useful action is not another generic web search. It is to inspect the actual Apify Actor/account state and, if not already public/monetized, prepare/enable a tightly priced Pay Per Event Store launch so real machine usage can test willingness to pay.

This crosses the human membrane because it can involve:

- publishing or changing public availability;
- accepting/operating under Apify Store/developer terms;
- configuring monetization;
- KYC/payout identity if not already completed.

No public or account-state change should be made without the Center-holder's explicit approval.

## Proposed first-money experiment after approval

Keep scope unchanged; do not add features.

1. Verify actual Actor state in Apify Console.
2. If private/unpublished, publish the existing fail-closed guard rather than building a new Actor.
3. Use a minimal Pay Per Event price appropriate to a verification call, with no recurring cost to the developer.
4. Position it explicitly as a post-scrape trust membrane for exact business workflows, not as another Google Maps scraper.
5. Measure only external causal artifacts: Store page live, runs by other accounts, paid events, repeat runs, and revenue.
6. If no discovery/usage appears, do not expand features; next experiment is distribution/integration or prune.

## Center return

This branch yields a stronger invariant:

**Attach a tiny trust/routing membrane immediately downstream of a very large existing machine flow only when the exact failure is publicly observable in that same flow.**

This is a general field law that can later project to scraped datasets, identity resolution, API outputs, payment routing, procurement records, and agent tool calls.
