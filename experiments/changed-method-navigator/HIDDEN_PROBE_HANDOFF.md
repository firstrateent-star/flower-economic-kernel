# Changed Method Navigator — Hidden Probe Handoff

> PRIVATE. This handoff reduces avoidable human setup but does not authorize upload, publication, licensing, vendor identity, trader-status, or external contact.

## Current machine-complete state

The branch contains a tested IntelliJ plugin whose real-SDK build, current-target Plugin Verifier, and real Java PSI functional test previously passed. Marketplace-facing description/change notes and a 40×40 SVG plugin logo are now also prepared.

No feature expansion is justified before external return.

## What is still intentionally human-only

JetBrains currently requires, for an initial production Marketplace upload:

1. login to JetBrains Marketplace;
2. acceptance of the Marketplace Developer Agreement if not already accepted;
3. creation/selection of a Vendor profile;
4. a real Public Vendor Name, functional website, and functional email;
5. trader/non-trader declaration;
6. a Developer EULA/license choice;
7. explicit choice to upload the plugin;
8. explicit choice to mark the initial upload Hidden.

Do not infer or fill those fields from repository/account metadata.

## Recommended first probe if authorized

Use a **free Hidden initial upload**, not a paid release.

Why:
- Hidden can only be chosen during the initial upload.
- After approval, a hidden plugin is omitted from Marketplace search, IDE search, and search-engine indexing.
- It remains directly downloadable/installable by link.
- It can later be removed while hidden.
- Unhiding is irreversible.
- A free probe avoids adding licensing/product-code/payment implementation before installation demand exists.

This probe tests one question only:

`Will an independent IntelliJ user choose to install/use the narrow changed-method navigation capability?`

## What the JetBrains Marketplace Demo can and cannot answer

JetBrains offers a separate demo/sandbox Marketplace by request to marketplace@jetbrains.com. It can test upload, vendor organization, paid/freemium release mechanics, test purchasing, and licensing. Demo uploads are automatically approved.

However:
- access itself requires a human email/request and credentials;
- plugin information may be visible to other demo testers;
- it does not expose the plugin to organic production users;
- it therefore does not resolve current MarketTruth.

Decision: do **not** spend Center-holder attention on the demo before real market exposure requires paid/licensing mechanics.

New law:

`SandboxTruth != MarketTruth`

and

`Operational rehearsal should not outrank the uncertainty the experiment is actually trying to resolve.`

## Pre-upload artifact checks

Before an authorized upload, rerun the existing private CI after the release-metadata/logo changes and require:

- real PSI functional test PASS;
- buildPlugin PASS;
- Plugin Verifier PASS;
- artifact upload PASS.

The remaining vendor placeholder in plugin.xml is intentionally unresolved until the Center-holder chooses the real vendor identity and functional contact details required by JetBrains.

## Stop condition

Do not:
- add languages;
- embed into the diff viewer;
- implement paid licensing;
- create product codes;
- add telemetry;
- contact potential testers;
- upload to production or demo Marketplace;
- make the private repository public;

until the relevant human boundary is explicitly authorized or external return earns a specific mutation.
