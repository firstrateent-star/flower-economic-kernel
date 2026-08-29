# Social Preview Drift Guard API

Check whether a public URL has a **consistent, usable social-preview state across crawler-style consumers** before it reaches a publishing workflow, CMS, CI pipeline, or automated agent.

Instead of only extracting Open Graph tags, Social Preview Drift Guard returns a deterministic decision for each URL:

- `PASS` — the tested crawler-facing state was observed and no material issue was detected
- `RISK` — the page was observed, but social-preview weaknesses or inconsistencies were found
- `FAIL` — the page was observed and a decisive broken or contradictory state was found
- `INCONCLUSIVE` — the Actor could not gather enough transport-level evidence to judge the URL

The normal starting price is **$0.005 per successfully observed URL**. `INCONCLUSIVE` measurements are not charged as `url-checked` events.

## What it checks

For each URL, the Actor can fetch the page using multiple crawler-style user agents and compare what each receives. The default profiles represent a normal crawler plus Facebook, X/Twitter, and LinkedIn; Slack and Discord profiles are also available.

Checks include:

- HTTP status and crawler-dependent status drift
- redirects and final URL consistency
- canonical URL consistency
- `og:title`, `og:image`, and `og:url`
- Twitter Card metadata
- crawler-conditioned metadata differences
- canonical / Open Graph URL conflicts
- missing or invalid social metadata
- preview-image reachability and image content type
- bounded public-network safety checks for URLs and redirects

The output is designed for both humans and machines. Every inspected URL produces one dataset item containing the verdict, risk score, issue codes, crawler-profile observations, image checks, and an explicit scope statement.

## Quick start

For one URL:

```json
{
  "url": "https://www.apify.com"
}
```

For a batch:

```json
{
  "urls": [
    "https://example.com/article-a",
    "https://example.com/article-b"
  ]
}
```

The Actor audits up to 100 URLs per run. The defaults are intended to work without additional configuration.

## Example result

```json
{
  "inputUrl": "https://example.com/article-a",
  "verdict": "RISK",
  "riskScore": 24,
  "measurementStatus": "observed",
  "issues": [
    {
      "code": "MISSING_OG_IMAGE",
      "severity": "risk",
      "message": "og:image is missing."
    }
  ],
  "profileCount": 4,
  "rulesetVersion": "0.1.0"
}
```

## Useful workflows

### Publishing QA

Run the Actor before publishing or distributing a URL. A workflow can stop on `FAIL`, request review on `RISK`, continue on `PASS`, and retry or route `INCONCLUSIVE` separately.

### CI and CMS automation

Use the machine-readable verdict and issue codes in CI, content pipelines, release checks, CMS publishing flows, or scheduled link-health jobs.

### Agent and API workflows

The Actor uses bounded inputs, limited permissions, deterministic verdicts, and one result per URL, making it suitable for programmatic use from the Apify API and automated agents.

## Interpreting the verdict

A `PASS` means the **public HTTP responses and metadata returned to the selected crawler-style user agents were internally consistent under this test**. It is not a guarantee that a social platform will display a particular cached or final rendered card.

A `FAIL` is reserved for observed decisive problems such as HTTP errors, crawler-dependent status conflicts, material canonical/Open Graph drift, invalid preview-image state, or other fail-severity conditions.

An `INCONCLUSIVE` result is intentionally different from a failure. It means the Actor could not obtain enough evidence to make a trustworthy PASS/RISK/FAIL judgment. This prevents transport problems from being misreported as defects in the target page.

## Inputs

- `url` — one public HTTP(S) URL
- `urls` — additional URLs, up to 100 total per run
- `profiles` — crawler profiles to compare
- `checkImages` — probe discovered preview images
- `maxConcurrency` — parallel URL processing limit
- `requestTimeoutSecs` — per-request timeout
- `maxHtmlMb` — maximum HTML response size per crawler profile

## Output and pricing

One default-dataset item is produced for each inspected URL. The run summary also reports aggregate PASS/RISK/FAIL/INCONCLUSIVE counts.

The paid event is `url-checked` at **$0.005 per observed URL ($5 per 1,000 checks)**. An inconclusive measurement is returned for diagnostic transparency but is not charged as a successful `url-checked` event.

Platform caches, proprietary ranking logic, authenticated/private social data, and the exact final card rendered inside a social network are outside the Actor's scope.
