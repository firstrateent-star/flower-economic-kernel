# Social Preview Drift Guard — GitHub Action

Automatically audit social link-preview state during CI using the paid [Social Preview Drift Guard API](https://apify.com/firstrate/social-preview-drift-guard-api) on Apify.

The Action compares crawler-conditioned Open Graph / Twitter Card / canonical / redirect / preview-image state and turns the Actor's deterministic `PASS`, `RISK`, `FAIL`, or `INCONCLUSIVE` result into GitHub annotations and an optional CI gate.

## Why use it

A page can look correct in a browser while Facebook, X, LinkedIn, or another crawler receives different or broken preview state. This Action moves that check into deployment automation instead of relying on a person to remember to test links manually.

## Quick start

1. Create or use an Apify account.
2. Add your Apify API token to the repository as a GitHub Actions secret named `APIFY_TOKEN`.
3. Add a workflow step like this:

```yaml
name: Social preview guard

on:
  workflow_dispatch:
  push:
    branches: [main]

jobs:
  preview-audit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Check social previews
        uses: firstrateent-star/social-preview-drift-guard-action@v1
        with:
          apify-token: ${{ secrets.APIFY_TOKEN }}
          urls: |
            https://example.com/
            https://example.com/blog/latest-post
          profiles: default,facebook,x,linkedin
          check-images: true
          fail-on: fail
```

## CI behavior

- `PASS` — logs a successful check.
- `RISK` — creates a GitHub warning annotation.
- `FAIL` — creates an error annotation and, by default, fails the step.
- `INCONCLUSIVE` — creates a warning because transport evidence was insufficient; the underlying Actor does not charge the `url-checked` event for inconclusive measurements.

Set `fail-on` to:

- `fail` (default): fail CI only when a URL returns `FAIL`.
- `risk`: fail CI on either `RISK` or `FAIL`.
- `never`: report findings without failing CI.

## Inputs

| Input | Required | Default | Meaning |
| --- | --- | --- | --- |
| `apify-token` | yes | — | Apify API token, passed from a GitHub secret |
| `urls` | yes | — | JSON array, comma-separated list, or newline-separated URLs; maximum 100 |
| `profiles` | no | `default,facebook,x,linkedin` | Crawler profiles to compare; maximum 6 |
| `check-images` | no | `true` | Probe preview-image reachability/content type |
| `fail-on` | no | `fail` | `fail`, `risk`, or `never` |

## Outputs

`pass`, `risk`, `fail`, `inconclusive`, `worst-verdict`, and `results-json` are available to later workflow steps.

Example:

```yaml
      - name: Check social previews
        id: previews
        uses: firstrateent-star/social-preview-drift-guard-action@v1
        with:
          apify-token: ${{ secrets.APIFY_TOKEN }}
          urls: https://example.com

      - run: echo "Worst verdict: ${{ steps.previews.outputs.worst-verdict }}"
```

## Pricing and cost shape

The underlying Actor currently charges **$0.005 per successfully observed URL**. `INCONCLUSIVE` measurements are not charged as `url-checked` events. The Actor accepts at most 100 URLs per run, so at the current event price the paid result component is naturally bounded to about **$0.50 per Action invocation**.

Always review the current Actor Store price before relying on that estimate.

## Security

The Action does not contain the private implementation of Social Preview Drift Guard or any Flower Economic Kernel code. Authentication is delegated to Apify's official `setup-apify-cli-action`; this wrapper sends only the configured audit input to the public Actor and processes the returned dataset.

Do not hard-code an Apify token in workflow YAML. Use GitHub Actions secrets.

## What it checks

The Actor can detect or surface conditions including missing/contradictory social metadata, crawler-conditioned metadata drift, canonical conflicts, redirect/state differences, broken preview images, and HTTP failures. Full social-platform rendering parity is not claimed.

## Current status

This wrapper is staged for public release. The paid Actor is already live on Apify. A public GitHub Action release creates an additional recurring machine-to-machine distribution channel for the same underlying Fruit.
