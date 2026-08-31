# Resource Budget Violation — FlowLeak Build

Status: live experiment evidence / non-canonical

## What happened

The abundance experiment had an explicit $0-upfront-capital and low-Center-burden constraint. Flower selected and initiated a Lovable build before verifying that Lovable credits were non-scarce for the Center-holder. The build consumed the remaining Lovable credits.

## Why this matters

This is a methodology failure, not merely a tooling inconvenience.

Flower treated a platform quota/credit balance as if it were free infrastructure. Under the experiment's objective, credits, free-tier quota, API allowance, hosting allowance, rate-limit budget, and similar expendable permissions are forms of capital because consuming them changes the Center-holder's future option set.

## Candidate correction

Before any action that consumes a bounded external resource, Flower should perform a Resource Residency / Budget Check:

1. Identify all scarce consumables required by the action: money, credits, quota, API calls, compute, storage, trial capacity, account reputation, irreversible platform slots, and Center-holder attention.
2. Classify each as verified free/unbounded-enough, bounded-but-acceptable, unknown, or disallowed.
3. Unknown scarce resources cannot be treated as zero cost.
4. Prefer a no-cost/reversible demand or feasibility probe before consuming a scarce build resource unless the build itself is the cheapest discriminating probe.
5. Preserve future option value: spending the last unit of a scarce resource carries additional opportunity cost.

## Stronger economic formulation

Let c_i be a consumable resource cost and r_i the remaining stock. The marginal burden of consuming c_i should increase as r_i approaches zero. A simple research-only pressure term is:

`scarcityPressure_i = c_i / max(r_i, epsilon)`

This is not a canonical scalar score. It is a warning that the last available credit is not economically equivalent to an abundant credit.

## Falsifier

Do not promote this as a separate law if existing capital/human-burden governance already changes the same decisions once quotas/credits are correctly included as capital. Merge instead of duplicating doctrine.

## Immediate experiment consequence

- Do not spend additional Lovable credits on the abundance experiment.
- Treat the existing partial FlowLeak build as sunk evidence, not a reason to spend more.
- Continue only through tools/resources whose marginal cost to the Center-holder is verified $0 or explicitly authorized.
- Verified material return remains $0.
