# Utopia Activation Checkpoint — 2026-08-30

## Current truth

Confirmed creator revenue remains **$0**.

The public Social Preview Actor is already deployed, monetized, runnable, automatically deployable, hourly return-sensed, and now independently discovery-sensed. No independent paid-use event has yet been confirmed.

## Market scan mutation

The Seed-0 scanner was hardened so public Store telemetry can witness demand and competitive shape but cannot promote a Store-only observation directly into a build candidate.

Every Store-only candidate is now `buildEligible: false` until it has:

1. an independent buyer-gap witness; and
2. a separate activation-distance assessment.

The scanner also separates broad market archetypes instead of confusing source access with downstream buyer workflows.

### Live Store archetype snapshot

Observed from 4,138 public Apify Actors on 2026-08-30T20:24:41Z:

| Archetype | Recent users | Recent-user share | Actors | Recent users / Actor |
|---|---:|---:|---:|---:|
| source_access | 554,778 | 90.06% | 3,167 | 175.17 |
| other | 41,654 | 6.76% | 383 | 108.76 |
| workflow_generation | 8,579 | 1.39% | 107 | 80.18 |
| stateful_delta | 4,358 | 0.71% | 174 | 25.05 |
| diagnostic | 3,336 | 0.54% | 88 | 37.91 |
| decision_transform | 3,319 | 0.54% | 219 | 15.16 |

Interpretation: this Apify habitat overwhelmingly rewards direct source access. The strongest higher-order successes generally remain source access plus one useful modifier rather than large autonomous decision workflows.

Examples observed in the higher-order slices:

- Trustpilot review scraping + incremental state: 962 recent users.
- LinkedIn profile extraction + enrichment: 1,127 recent users.
- Leads finder: 2,693 recent users.

## Gap falsification

Several obvious source-plus-modifier ideas were independently checked and rejected as first builds because existing Actors already serve them:

- unified cross-platform ad intelligence;
- multi-source/new-only job monitoring;
- incremental RAG/content change crawling;
- Google Reviews new-review/rating monitoring;
- Instagram follower monitoring;
- LinkedIn company/new-hire monitoring.

This does not prove these markets are closed. It proves the naive versions do not currently earn construction priority.

## Discovery membrane

A dedicated discovery witness now queries the public Apify Store using plausible buyer searches and compares that surface with the authenticated Actor record.

First observation:

- Actor appeared in 7 of 9 buyer-visible search queries.
- Best rank was 1 for the exact product phrase.
- Rank for `social preview` was 6.
- The authenticated Actor record had the new title/description.
- The public Store search document was still returning the older title/description.

Therefore:

`ActorRecordTruth != StoreSearchDocumentTruth`

The remaining metadata difference is classified as a Store indexing/cache propagation membrane, not a deployment failure and not revenue evidence.

## Activation-distance decision

Use the existing rule:

`GOOD HABITAT + NO ORGANISM < MATURE ORGANISM + ONE EVIDENCE MEMBRANE`

when the mature organism has stronger evidence and negligible maintenance.

No newly probed organism has yet beaten the activation distance of the existing Social Preview Actor.

Therefore active speculative construction stops here.

## Resting portfolio

- Social Preview return sensing: hourly.
- Social Preview Store discovery sensing: daily.
- Seed-0 market sensing: weekly.
- Confirmed creator revenue: $0 until independently witnessed otherwise.

Active attention should return only when one of these surfaces produces a materially stronger signal, or when a new independent gap witness beats the current activation-distance threshold.
