# Changed Method Navigator — Private Beta Handoff

> Preparation only. This document does not authorize sharing the plugin, contacting a tester, publishing a download link, or changing the repository's privacy/IP posture.

## Goal of the first external probe

Answer one question:

> Does a high-fit independent IntelliJ developer install this narrow capability and find method-oriented local-change navigation useful enough to want to use it again?

This is a utility probe, not a pricing or Marketplace-discovery test.

## Artifact gate

Do not share any build until the current exact IntelliJ target passes:

1. real PSI functional test;
2. plugin build against the target SDK;
3. Plugin Verifier;
4. packaged-artifact inspection.

As of this handoff preparation, IntelliJ IDEA 2026.2.1 is the exact current target under test and requires Java 25 for plugin development.

## What the tester receives

Only after explicit Center-holder authorization:

- the verified plugin distribution ZIP;
- concise install instructions;
- a one-paragraph statement of current scope;
- a tiny feedback prompt.

Do not provide source code unless separately authorized.

## Install instructions

IntelliJ IDEA supports third-party plugin ZIP/JAR installation from disk:

1. Open **Settings / Preferences -> Plugins**.
2. Click the gear/settings icon on the Plugins page.
3. Choose **Install Plugin from Disk**.
4. Select the Changed Method Navigator ZIP.
5. Restart the IDE if IntelliJ requests it.
6. Open a Java project with local VCS changes.
7. Open the **Changed Methods** tool window and refresh.
8. Click a listed method to jump to its source.

## Exact beta scope

The beta intentionally does only this:

`current local VCS changes -> changed line ranges -> Java PSI methods -> clickable Changed Methods list`

Current limitations:

- Java only;
- local VCS changes only;
- separate tool window;
- click navigates to source rather than isolating the diff;
- manual refresh;
- no AI review, semantic risk score, call graph, blast radius, MCP or multi-language indexing.

These are experiment boundaries, not promises for a roadmap.

## Feedback prompt

Ask only questions that can change the next decision:

1. Did it correctly identify the methods you expected from your local changes?
2. Did clicking through the method list make reviewing those changes meaningfully easier than your normal IntelliJ workflow?
3. Would you choose to use this again on a real change set? Why or why not?
4. What was the single biggest friction or missing behavior?

Do not lead with feature brainstorming or pricing questions.

## Success semantics

One positive tester is not Market Truth.

A strong first return is:

`independent install + correct behavior + real-workflow usefulness + repeat intent`

A weak/kill return includes:

- cannot install/use on a current supported IDE;
- built-in IntelliJ behavior already makes the tool redundant for the tester;
- method list does not materially improve review;
- user wants a fundamentally different problem rather than a small adjacent behavior.

## What this probe does NOT establish

- Marketplace discoverability;
- broad independent demand;
- willingness to pay;
- retention at population scale;
- legal/commercial readiness.

## After return

Only let observed friction choose the next mutation.

Do not pre-build diff embedding, many-language support, AI context, impact analysis or monetization before the first external return.
