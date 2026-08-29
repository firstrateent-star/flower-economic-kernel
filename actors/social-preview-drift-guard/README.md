# Social Preview Drift Guard API

A bounded Apify Actor that checks whether a public URL presents a consistent, usable social-preview state across crawler-style user agents.

This is **not another Open Graph extractor**. The main output is a deterministic `PASS`, `RISK`, `FAIL`, or `INCONCLUSIVE` verdict with machine-readable reasons.

## What it checks

For each URL the Actor can:

- fetch the page as multiple crawler profiles (`default`, Facebook, X/Twitter, LinkedIn, Slack, Discord)
- compare HTTP status, redirects, canonical URL, `og:title`, `og:image`, `og:url`, Twitter card and image values across profiles
- flag crawler-conditioned metadata drift
- flag canonical/`og:url` conflicts
- detect missing or invalid social metadata
- probe discovered preview images and verify that they resolve successfully as image content
- reject private/local/reserved network targets and re-validate redirects
- separate target failure from measurement failure: complete transport failure returns `INCONCLUSIVE`, not `FAIL`

One default-dataset item is produced per inspected URL.

## Why this exists

Metadata extraction is already commoditized. The useful question in automated publishing, CMS, CI, and agent workflows is often:

> Will this URL present a contradictory or broken preview state when different crawler-like consumers fetch it?

The Actor converts that question into a compact decision record that another machine can act on.

## Example input

```json
{
  "urls": [
    "https://example.com/article-a",
    "https://example.com/article-b"
  ],
  "profiles": ["default", "facebook", "x", "linkedin"],
  "checkImages": true,
  "maxConcurrency": 4
}
```

## Example output shape

```json
{
  "inputUrl": "https://example.com/article-a",
  "verdict": "RISK",
  "riskScore": 24,
  "measurementStatus": "observed",
  "issues": [
    {
      "code": "PROFILE_METADATA_DRIFT",
      "severity": "risk",
      "message": "Crawler profiles received different og:title values."
    }
  ],
  "profiles": [],
  "imageChecks": [],
  "rulesetVersion": "0.1.0"
}
```

## Scope and limitations

The Actor compares **public HTTP responses and metadata delivered to crawler-style user agents**. It does not access private social-platform data and does not claim to reproduce proprietary platform caches, ranking logic, or the final card that a platform may render.

A `PASS` means the tested public crawler-facing state was internally consistent under the selected profiles. It is not a guarantee that Facebook, X, LinkedIn, Slack, Discord, or another service will display a particular cached preview.

`INCONCLUSIVE` means the Actor could not obtain enough transport-level evidence to judge the URL. It is intentionally distinct from `FAIL` and should not be treated as evidence that the target itself is broken.

The Actor intentionally uses direct HTTP rather than a browser or proxy by default. This keeps execution cheap, predictable, and suitable for bulk CI/API use.

## Private verification

A bounded private calibration on Apify established the intended four-state behavior:

- a healthy social-preview page produced `PASS`
- an observable page missing normal social metadata produced `RISK`
- an observable nonexistent page produced `FAIL`
- complete transport failure is represented as `INCONCLUSIVE`

A three-URL calibration batch completed in about two seconds at the Actor's 256 MB default memory allocation, with Apify displaying the run cost rounded to `$0.000`. The same calibration behavior survived the memory reduction from 1024 MB to 256 MB.

## Monetization design

The preferred Store model is **pay per event**, with one visible `url-checked` event per successfully observed URL result. `INCONCLUSIVE` results are not charged as `url-checked` events.

The initial price target is **$0.005 per observed URL** ($5 / 1,000 checks). Private platform runs have demonstrated sub-cent execution cost with substantial headroom at 256 MB, so this price is intended to prioritize a healthy contribution margin while remaining cheap for CI, CMS, API, and agent usage.

The Actor is designed to remain on **limited permissions** and not use Standby. For private testing before monetization is enabled, the Actor writes normal dataset items without a custom charge event.

## Passive-growth design

This Fruit is intended to leave reusable organs behind:

- safe bounded fetch
- crawler-profile comparison
- deterministic risk rules
- explicit observed-vs-inconclusive measurement semantics
- one-input/one-result dataset semantics
- pay-per-event charging pattern
- machine-readable limitations

The parent Flower Economic Kernel can later use public Apify Store statistics and run-health signals to decide whether to improve the listing, harden reliability, change pricing, expand rules, or replicate the same `representation_drift` geometry into a new Fruit.

Public code/pricing mutation remains human-gated. Private candidate improvements can be generated automatically.

## Apify source

This Actor lives in a monorepo. In Apify, use the Git source directory:

```text
https://github.com/firstrateent-star/flower-economic-kernel#main:actors/social-preview-drift-guard
```

The private technical and calibration gates have been completed. Public monetization and Store release remain explicit Center-holder decisions.
