# Revenue Path Sentinel — Nursery Prototype

Purpose: a small Framer plugin that audits monetization-critical links before publish.

This is deliberately narrower than a generic SEO/link checker. It looks for revenue-path failure states that can silently turn a working site into a non-earning site:

- payment/checkout links that appear to be test or sandbox URLs
- high-intent CTA links that are empty, placeholder, localhost, example-domain, or obvious staging targets
- high-intent CTA links with no Framer tracking ID
- internal high-intent links pointing to draft/missing routes when observable
- risky non-HTTPS checkout/payment URLs

The hypothesis is economic, not cosmetic: a tiny deterministic preflight can protect a much larger downstream flow. The plugin should remain local-only, deterministic, fail-closed, and require no external account or API.

## Why this Nursery branch exists

Current Framer Marketplace evidence shows strong existing distribution and immediate plugin publishing, while many generic link/SEO checkers already exist. This prototype therefore does *not* compete as another broad link checker; it targets the narrower state transition `visitor intent -> monetization CTA -> valid live destination -> attributable conversion`.

## First-penny test

Only after a fresh-project test passes should this be considered for public submission. Public publishing, pricing, creator/payment setup, and any Framer account action remain human-boundary actions.

Success hierarchy:

1. plugin runs in fresh Framer project
2. catches intentionally planted revenue-path faults with low false positives
3. can be packed as plugin.zip
4. published to Marketplace
5. external open/use
6. first legitimate paid sale
7. second independent sale
8. repeatable sales without human outreach

The first paid sale is the phase transition; it is not evidence of scale by itself.
