# Changed Method Navigator — Market Evidence Ledger — 2026-08-30

## Status

This ledger records external problem/demand evidence only. It does not authorize Marketplace publication, licensing, public source disclosure, pricing, or feature expansion.

Technical state remains frozen: real IntelliJ PSI functional test, real SDK build, and current-target Plugin Verifier have passed. The unresolved uncertainty is independent market use.

## Direct problem evidence

### January 2026 IntelliJ user request

A January 23, 2026 r/IntelliJIDEA discussion titled **“What’s your missing feature in IntelliJ?”** contains a near-direct description of the core problem.

The user asks for a Git compare outline listing methods changed in the current file; clicking a method should jump/focus the review on that method. They explicitly frame the need as carefully reviewing changes made by the developer or AI before committing.

Source:
https://www.reddit.com/r/IntelliJIDEA/comments/1qknzcr/whats_your_missing_feature_in_intellij/

Interpretation:
- strong evidence that the state transition `line-oriented Git changes -> method-oriented review navigation` is independently desired in 2026;
- not evidence that this specific plugin will be installed or purchased;
- the requested ideal goes beyond current v0 because it describes tighter diff-view integration and method-isolated review.

### JetBrains structural-diff backlog

JetBrains YouTrack issue `IJPL-99523`, **Make diff tool SMART, semantic, structure aware**, links multiple related structural-diff requests, including `IJPL-107972` **Compare source files at the method level** and `IJPL-103294` **Do text diff's which take method signatures into account**.

Source:
https://youtrack.jetbrains.com/projects/IJPL/issues/IJPL-99523/Make-diff-tool-SMART-semantic-structure-aware

Interpretation: method/structure-aware diffing is a persistent problem family, not a single invented need.

### Historical implementation/problem evidence

JetBrains' support forum contains a 2013 plugin-development question asking how to identify exactly which Java method changed after obtaining changes from `ChangeListManager.getAllChanges()`.

Source:
https://intellij-support.jetbrains.com/hc/en-us/community/posts/206120119-How-to-indentify-which-method-was-changed-in-a-Java-class

Stack Overflow contains a 2020 request for Git diff output grouped as methods added/deleted/renamed/modified with class paths/signatures.

Source:
https://stackoverflow.com/questions/60522572/git-diff-at-method-level

These older sources demonstrate persistence and technical relevance but carry much less weight for current commercial demand than 2026 evidence.

## Adjacent willingness-to-pay evidence

### Git Scope

Git Scope is an active JetBrains VCS plugin focused on making feature-branch/code changes easier to see and review. As observed in August 2026, JetBrains Marketplace shows roughly 34,303 downloads, a 4.6 rating, and recent 2026 maintenance.

Marketplace:
https://plugins.jetbrains.com/plugin/10083-git-scope

Its reviews provide unusually strong adjacent market evidence:
- January 2026: a user describes it as making working-code comparison substantially easier;
- April 2026: a user says they would pay even if it were paid;
- other reviews describe it as filling a clear IntelliJ gap and being exactly what users were looking for;
- historical reviews explicitly discuss the product becoming paid and users considering the value worth the price.

Reviews:
https://plugins.jetbrains.com/plugin/10083-git-scope/reviews

Interpretation:
- strong evidence that developers will install—and in this adjacent category, sometimes pay for—tools that reduce VCS change-review friction inside JetBrains IDEs;
- not evidence that Changed Method Navigator should copy Git Scope or that its market size/revenue will transfer;
- Git Scope's broader branch/file/line visibility is a substitute/neighbor, while Changed Method Navigator's current wedge is method-level compression of local Java changes.

## Research-level problem evidence

Microsoft research on code-review navigation has used “methods changed” as an explicit review-complexity measure and reported developer difficulty when change regions are scattered across files even when the file count is small. This supports the general hypothesis that structural grouping can reduce review-navigation burden.

This is background evidence, not product-market evidence.

## Current evidence hierarchy

Strongest current evidence:
1. 2026 direct user articulation closely matching the transformation.
2. Active paid/paid-history adjacent JetBrains plugin with tens of thousands of downloads and explicit willingness-to-pay reviews.
3. JetBrains structural/method-level diff backlog.
4. Long-lived technical/problem requests in JetBrains/Stack Overflow.
5. General code-review research.

What remains completely unproven:
- independent installation of Changed Method Navigator;
- repeat use;
- retention;
- willingness to pay for this narrow wedge;
- whether Java-only scope is sufficient;
- whether users consider source navigation enough without embedded diff isolation;
- whether Marketplace discovery can reach the relevant users.

## Scope freeze

The evidence increases confidence in the **problem**, not permission to implement the user's ideal feature list.

Do not add:
- embedded diff-view outline;
- method-isolated diff filtering;
- other languages;
- branch/commit range support;
- automatic refresh;
- AI review/risk scoring;
- semantic impact analysis;

until independent market use identifies the next bottleneck.

## Next uncertainty

`Will independent IntelliJ users install and repeatedly use the existing narrow Java changed-method navigation capability?`

No additional research or feature work can substitute for that state transition indefinitely.
