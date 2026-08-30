# Agentic Eligibility Probe — Social Preview Drift Guard

## Purpose

Resolve exactly one uncertainty without changing product behavior:

> Is the already-live Actor currently exposed by Apify as an agentically payable Actor (`allowsAgenticUsers=true`)?

## Why this is the next test

Apify's current rules make eligible Actors available to agentic users automatically. The Actor's existing manifest already records the structural requirements that can be checked from our corpus:

- pay-per-event pricing;
- events only, no passed-through platform usage;
- limited permissions;
- no Standby;
- public/live Actor.

The remaining account/platform state is developer KYC and the resulting current agentic-eligibility flag. Public Store publication does not prove either.

## Exact external test

Query the current Apify Store/API for this Actor with agentic filtering enabled, or inspect the Actor's platform data for the explicit flag:

`allowsAgenticUsers=true`

Actor identity:

`firstrate/social-preview-drift-guard-api`

Do not infer the result from Google indexing, Actor publication, pricing model, or our private manifest.

## Pass

The current platform explicitly returns the Actor in agentic discovery or reports `allowsAgenticUsers=true`.

Then:

- record the verified date/source;
- do not change code;
- treat first independent agentic run, first paid event, and first repeat independent user as the next evidence sequence.

## Fail

The Actor is explicitly absent from the agentic-eligible set or reports `allowsAgenticUsers=false`.

Then determine the smallest exact blocker from current platform state. If the blocker is human KYC, preserve it as a sovereignty boundary rather than coding around it. If a structural Actor setting drifted from the manifest, reconcile that single setting before considering any broader mutation.

## Inconclusive

The Actor is too newly published to resolve through accessible public surfaces, or the available tool cannot inspect the account/platform field.

Then preserve the uncertainty. Do not build an x402 wrapper or duplicate the product merely because eligibility cannot yet be observed.

## Forbidden mutation before result

No new payment rail, no x402 middleware, no pricing change, no new crawler profiles, no public distribution wrapper, and no product feature is justified by this probe.
