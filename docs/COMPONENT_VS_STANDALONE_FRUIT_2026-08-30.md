# Component vs Standalone Fruit — 2026-08-30

## Trigger

Corpus-first recovery surfaced two deterministic validation capabilities that looked superficially suitable for machine-paid distribution:

1. RAG Crawl Preflight / AI Ingestion Router.
2. Google Maps Business → Website Identity Guard.

Fresh market comparison showed a recurring failure mode: a useful check can be technically real and economically useful inside a workflow while still being a weak standalone marketplace product.

## Current evidence

### RAG Crawl Preflight

Recovered code can probe machine-readable corpora, robots/sitemaps, inventory, HTML token size, JavaScript rendering risk and crawl/embed cost, and can short-circuit deep crawling when a validated direct corpus is sufficient.

A near-direct current Apify substitute, `Website Crawl Preflight Auditor`, advertises robots/sitemap/static extraction/JavaScript risk/crawl-cost preflight before RAG jobs. As observed on 2026-08-30, its Store surface showed 2 total users and 1 monthly active user despite being current and inexpensive.

Interpretation: the transformation exists, but current standalone Store throughput is too weak to justify waking the recovered prototype.

### Maps → Website Identity Guard

Google Places exposes `websiteUri` as the authoritative website for a place, while Google also provides correction/reporting paths for inaccurate website/business information. Current community reports show cases where map/local results associate another business's identity or website with the intended listing.

The broader economic problem of business/entity verification is real: current APIs match businesses using names, addresses, phones and websites, and some explicitly return a `website_matches` signal.

However, a near-direct Apify `Business Verification API` observed on 2026-08-30 showed 2 total users and 1 monthly active user. Another current API (`1Lookup Business Verify`) already accepts business name, city, phone, email and website and returns explicit phone/domain/website-match components.

Interpretation: website identity checking is a reusable entity-resolution component, but current evidence does not support another standalone Apify verification Actor.

## x402 cross-check

Independent paid x402 market measurement currently suggests that much commodity agent data is merely a paid wrapper around free public inputs. The more defensible paid categories are:

- proprietary intelligence;
- compute an agent cannot cheaply reproduce;
- real-world fulfillment;
- trust/attestation where a maintained source or accountable party stands behind the answer.

This sharpens the distinction between a *detector* and a *Fruit*.

## New law

> **A useful deterministic check is not automatically a standalone economic organism.**

A capability should be promoted to standalone Fruit only when at least one of these is true:

1. independent buyers already search/pay for the check itself at meaningful breadth;
2. the check carries scarce data, compute, authority or attestation that cannot be cheaply recreated;
3. the check sits on an endogenous repeated trigger with enough frequency that distribution is part of the organism;
4. it protects a much larger committed value flow and can capture a defensible fraction of the protected value.

Otherwise, preserve it as a component and attach it to a larger organism only when that organism earns the dependency.

## Component economics

For a component `c`, standalone viability is not just correctness:

`StandaloneValue(c) = DemandBreadth × RepeatFrequency × Scarcity × Capture / (DistributionBurden + MarginalCost + HumanActivation)`

A component may have low standalone value but high inherited value:

`InheritedValue(c) = FailurePrevented × ParentFlow × ReuseCount × IntegrationFit`

This creates two distinct states:

- `standalone_candidate`
- `reusable_component`

Do not force reusable components to become products.

## Consequences for the Garden

### RAG Crawl Preflight

State: `cold_storage_component`.

Retain:
- route-before-crawl pattern;
- machine-readable corpus validation;
- bounded sitemap inventory;
- JavaScript rendering-risk heuristics;
- crawl/token/embed cost estimation;
- short-circuit-on-cheaper-route logic.

Do not rebuild or publish unless current demand materially changes or another active Fruit needs the routing capability.

### Maps → Website Identity Guard

State: `reusable_component / standalone_downgraded`.

Retain:
- fail-closed business↔website identity comparison;
- name/phone/location corroboration;
- mismatch-candidate semantics;
- provenance-aware verification pattern.

Do not create another standalone validation Actor on current evidence. Reconsider if it becomes a required trust step inside a higher-frequency enrichment, lead-routing, procurement or resolution organism.

### Social Preview Drift Guard

This rule does not retroactively kill the live Fruit. It is already published and therefore should be measured rather than speculatively rewritten. Its staged CI wrapper is particularly important because CI gives the validator an endogenous repeated trigger. External usage and repetition—not more features—decide whether it graduates.

### Changed Method Navigator

The rule strengthens rather than weakens this organism: it is not merely a generic validator. It transforms a repeated developer workflow (`line-oriented local changes -> method-oriented review map`) inside the IDE itself. Its remaining uncertainty is independent user adoption, not whether it can be embedded in a larger workflow.

## Compact form

`DETECTABLE FAILURE != STANDALONE PRODUCT`

Prefer:

`CAPABILITY -> REPEATED PARENT FLOW -> EMBEDDED TRIGGER -> RETURN`

unless independent market evidence proves buyers already want the capability as a product in its own right.
