# Changed Method Navigator — Human Membrane Packet — 2026-08-30

## Purpose

Reduce the remaining JetBrains Marketplace actuation to only the decisions that cannot be made safely by the machine.

This packet is **not publication authorization**. It records the defaults already earned by evidence and isolates the human-only choices.

## Machine-selected defaults

These are the current recommended probe settings unless the Center-holder explicitly changes them:

- Distribution: JetBrains Marketplace
- Initial visibility: **Hidden**
- Public unhide: **No**
- Price: **Free**
- Paid/freemium licensing: **No**
- Public source-code disclosure: **No**
- New feature work before return: **No**
- Technical scope: current Java/local-VCS Changed Method Navigator only
- Artifact: existing verified Marketplace-ready ZIP from successful CI
- Market objective: learn whether independent IntelliJ users install/use the transformation; not maximize downloads, revenue, or publicity

## Already machine-completed

- Real IntelliJ PSI functional test: pass
- Real IntelliJ SDK build: pass
- Plugin Verifier against current target: pass
- Marketplace description: prepared and packaged
- Change notes: prepared and packaged
- 40×40 SVG plugin icon: prepared and packaged
- Distribution ZIP inspected: packaged `plugin.xml` and icon confirmed
- Exact-name/plugin-ID web collision search: no indexed collision found as of 2026-08-30; this is supporting evidence, not a guarantee of Marketplace uniqueness

## Human-only decisions

### 1. Vendor public identity

Choose the real public vendor name that should appear on JetBrains Marketplace.

Current packaged placeholder: `Flower v2 Shadow Lab`.

Do not treat the placeholder as approved merely because it is packaged.

### 2. Real vendor contact

Provide/choose the real functional vendor website and/or email appropriate for the Marketplace vendor profile and plugin metadata.

JetBrains plugin metadata supports vendor URL and email. These must not be invented by the machine.

### 3. Marketplace legal/business declaration

The Center-holder must personally make any required Marketplace declarations, including trader/non-trader status and acceptance of the applicable JetBrains Marketplace terms/Developer Agreement.

The machine must not infer legal status.

### 4. EULA/license choice

Choose the applicable end-user license/EULA required by the initial Marketplace upload.

The machine can explain available options once the upload flow presents them, but it must not silently choose a legal agreement on the Center-holder's behalf.

### 5. Distribution authorization

Explicitly authorize **Hidden initial upload**.

Hidden is the current recommended experiment because it preserves low discovery while allowing Marketplace review and direct-link testing. This is still external distribution and therefore remains a human sovereignty boundary.

## After those choices

The machine-side work is bounded:

1. replace only final vendor/contact metadata if needed;
2. rerun the already-green preflight CI;
3. confirm packaged artifact again;
4. use the human-authorized Marketplace upload path with Hidden visibility;
5. do **not** unhide publicly without separate authorization;
6. measure independent installs/use/feedback before feature expansion or monetization.

## Stop rule

No further feature work, marketplace safari, naming polish, pricing design, or speculative product expansion is justified before this membrane is crossed or the branch is explicitly parked.

Compact transition:

`PACKAGED TRUTH -> HUMAN IDENTITY/LEGAL/DISTRIBUTION CHOICE -> METADATA FINALIZATION -> SAME CI -> HIDDEN EXTERNAL PROBE -> MARKET RETURN`
