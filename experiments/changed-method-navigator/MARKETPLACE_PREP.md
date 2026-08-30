# Changed Method Navigator — Marketplace Preflight

> PRIVATE EXPERIMENTAL MATERIAL. This file prepares a future market test; it does not authorize publication, licensing terms, disclosure of source code, or a change to the repository's existing IP/privacy posture.

## Evidence state

Technical evidence is complete enough for a market probe against IntelliJ IDEA 2026.1.4:

- real IntelliJ PSI functional test passes;
- plugin builds against the real IntelliJ SDK;
- Plugin Verifier passes for the current target;
- CI preserves the plugin ZIP and test/verifier evidence.

The unresolved question is market truth, not another technical feature.

## Exact v0 behavior

Changed Method Navigator reads IntelliJ's current local VCS changes, maps changed new-file line ranges onto real Java PSI methods, lists the touched methods in a `Changed Methods` tool window, and navigates to a selected method in source.

Current boundaries are part of the experiment:

- Java only;
- current local changes only;
- separate tool window, not embedded inside the diff viewer;
- clicking navigates to source but does not isolate the diff to only that method;
- refresh is explicit;
- no claim of broader language support, semantic change classification, impact analysis, or AI review.

Do not add those features before market evidence earns them.

## External demand evidence to retain

A January 2026 IntelliJ community discussion contains a near-direct request for a Git comparison outline that lists methods changed in a file and lets the developer click a method to focus review, explicitly mentioning careful review of changes made by the developer or AI before committing.

JetBrains YouTrack also retains the long-running request `IJPL-99523` for a semantic/structure-aware diff and links related requests including comparing source files at the method level.

Nearest observed substitutes are not identical:

- Topias visualizes historical method change frequency and appears stale relative to current IntelliJ releases.
- Git Scope provides branch/scope-aware changed-file and changed-line navigation but does not appear to provide the same changed-method list for current Java edits.

This is evidence of a residual problem, not proof of willingness to install or pay.

## Candidate Marketplace copy

### Name

Changed Method Navigator

### Short summary

Review local Java changes method-by-method instead of hunting through changed lines across files.

### Description

Changed Method Navigator adds a focused tool window for Java developers reviewing local VCS changes.

It maps IntelliJ's changed lines to Java methods using the IDE's own PSI model, then shows only the methods touched by those changes. Select a method to jump directly to it in source.

Use it when a change set spans several files or when AI-assisted edits make it more important to answer a simple question quickly: **which methods did this work actually touch?**

Current preflight scope is deliberately narrow:

- Java source files
- local VCS changes visible to IntelliJ
- changed-method list ordered by file and source position
- one-click source navigation
- manual refresh

This version does not classify the meaning or risk of changes, alter files, send code to an external service, or claim to replace IntelliJ's diff viewer.

### Change notes

Initial preflight release: identify Java methods touched by current local VCS changes and navigate to them from a dedicated tool window.

### Likely primary category/tag

VCS. Confirm available Marketplace taxonomy during upload rather than adding speculative tags.

## Human-only gates before any upload

1. Revisit the repository's explicit IP/trade-secret/publication warning. A compiled plugin is still a disclosure/distribution decision even if the source repository remains private.
2. Decide whether the first probe should be hidden/direct-link beta or public discovery. Hidden upload can pass review but is not searchable; it therefore tests installability/user response only if testers can be reached directly.
3. The human owner must log into JetBrains Marketplace, accept the Developer Agreement, create/select a Vendor profile, and personally choose trader/non-trader status.
4. Choose a Developer EULA/license. Do not infer or silently select legal terms from this file.
5. Supply the required vendor website/email and required Marketplace assets, including a compliant 40x40 SVG logo.
6. Do not add payment/licensing code merely to monetize before installation demand exists. A free demand probe can precede payment activation.

## Market-probe success / kill signals

A first market probe should answer one uncertainty only: will independent IntelliJ users choose to install/use this narrow changed-method navigation capability?

Evidence that earns deeper work could include independent installs plus repeated use/feedback asking for adjacent functionality (diff-view integration, additional languages, committed-range comparison, automatic refresh).

Evidence that should prevent feature expansion includes approval without installs, installs without repeat use, feedback that IntelliJ already solves the workflow adequately, or users consistently asking for a materially different problem.

## Operating rule

Technical uncertainty has already been reduced enough. Until market evidence returns, feature work is forbidden by the experiment:

`technical truth -> market probe -> evidence -> expand/prune`

not

`technical truth -> more features -> more features -> hope`.
