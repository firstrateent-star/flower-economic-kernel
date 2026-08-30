# Changed Method Navigator — Packaged Artifact Check — 2026-08-30

## Verified artifact

GitHub Actions workflow: `Changed Method Navigator Preflight`

- run ID: `33317792204`
- head commit: `5a014208a783bef8886e76be3827c81918d2aab5`
- conclusion: `success`
- artifact ID: `9734055300`
- artifact digest: `sha256:13c657980c276b60dd8f033b61080cda79e981467a4c9a1b6501c9662ae6bbe2`
- artifact retention expiry: `2026-11-28`

All relevant CI steps passed:

- real IntelliJ PSI functional tests;
- build against the real IntelliJ SDK;
- Plugin Verifier current-target check;
- evidence/artifact upload.

## Distribution ZIP inspection

The CI artifact contains:

`experiments/changed-method-navigator/build/distributions/changed-method-navigator-preflight-0.0.4-preflight.zip`

The plugin distribution contains:

`changed-method-navigator-preflight/lib/changed-method-navigator-preflight-0.0.4-preflight.jar`

The packaged JAR was inspected, not merely the source tree. It contains:

- `META-INF/plugin.xml`
- `META-INF/pluginIcon.svg`

The packaged `plugin.xml` contains the prepared English Marketplace description and initial change notes. The packaged SVG exists under the expected `META-INF/pluginIcon.svg` path and was authored with a 40×40 SVG viewport/size.

## Intentional unresolved field

The packaged plugin currently retains:

`<vendor>Flower v2 Shadow Lab</vendor>`

This is **not** being promoted as the final real vendor identity. Vendor public name, functional website/email, trader status, and legal/license choices remain Center-holder decisions.

If the Center-holder chooses a different real vendor identity or JetBrains requires contact attributes in packaged metadata, update only that distribution metadata and rerun the same preflight before upload.

## Current technical boundary

No hidden technical feature work remains justified before external market return.

The only expected machine-side action after a human vendor/legal decision is a bounded metadata substitution + repeat of the already-green CI. That is not feature development.

Current transition:

`PACKAGED TECHNICAL TRUTH -> HUMAN VENDOR/LEGAL CHOICE -> METADATA FINALIZATION -> SAME CI -> HIDDEN MARKET PROBE`
