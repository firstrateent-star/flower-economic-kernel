# Changed Method Navigator — One-Session Human Authority Packet

Purpose: resolve the smallest irreducible human-authority membrane required for a **free, Hidden-only JetBrains Marketplace probe**. This packet preserves five distinct legal/identity/publication decisions while batching them into one interaction. It does **not** authorize public/unhidden release, monetization, source publication, or any other downstream action beyond the explicit choices below.

## Why these five choices remain human

Current JetBrains Marketplace requirements make these materially distinct. A new plugin upload requires a Vendor profile, Developer Agreement acceptance, trader/non-trader declaration, and a Developer EULA/license. Hidden publication is a separate publication-authority choice. Optional vendor website/email fields are not required and should not be invented merely to complete the form.

## Reply schema

A single response can resolve all five decisions without merging their meaning:

1. **Hidden initial upload** — `YES` / `NO`
   - Recommended probe posture: `YES, Hidden only`.
   - This does **not** authorize later public/unhidden release.

2. **Vendor identity** — provide:
   - `public vendor name:`
   - `vendor ID:`
   - The vendor ID is treated as an identity choice with long-lived consequences; do not invent it automatically.
   - Optional vendor website/email can remain blank unless deliberately chosen.

3. **Trader status** — `TRADER` / `NON-TRADER`
   - This must reflect the Center-holder's actual legal/commercial status.
   - Flower must not infer it.

4. **JetBrains Marketplace Developer Agreement** — `ACCEPTED` / `NOT ACCEPTED`
   - Acceptance must occur in the actual JetBrains account/session.
   - A chat response may record intent/status but does not itself constitute platform acceptance.

5. **Developer EULA / license posture** — choose one:
   - `PROPRIETARY / PRIVATE-SOURCE DEVELOPER EULA`
   - `OPEN-SOURCE LICENSE: <license name>`
   - `OTHER / NOT YET DECIDED`
   - Current recommended hidden-probe posture: proprietary/private-source Developer EULA unless the Center-holder deliberately wants source publication/open-source obligations.

## Compact response template

```text
Hidden upload: YES, Hidden only
Vendor public name: <chosen name>
Vendor ID: <chosen immutable ID>
Trader status: TRADER or NON-TRADER
Developer Agreement: ACCEPTED or NOT ACCEPTED
License/EULA: PROPRIETARY PRIVATE-SOURCE or <chosen alternative>
```

## What Flower may do after all five are resolved

Once all five are explicitly resolved, Flower may carry the dependent machine work without asking again for each step:

- insert final vendor metadata while leaving optional contact fields blank unless supplied;
- prepare the selected Developer EULA/license artifact;
- rebuild the plugin;
- rerun the real PSI functional test;
- rerun the IntelliJ SDK build and Plugin Verifier;
- inspect the packaged distribution artifact;
- configure the initial release as free + Hidden;
- assemble the Marketplace upload payload;
- after the human account/legal session is actually complete, upload the verified package as Hidden;
- after JetBrains approval, preserve the direct hidden-plugin link and define the smallest independent-user observation needed to resolve Market Truth.

## Explicitly still unauthorized

This packet does **not** authorize:

- making the plugin publicly searchable/unhidden;
- monetizing the plugin;
- publishing private source code;
- accepting legal agreements on behalf of the Center-holder;
- choosing trader status;
- inventing vendor identity/contact details;
- changing the Flower methodology's protected values or sovereignty rules.

The desired interaction shape is therefore:

`5 sovereign decisions -> 1 bounded human session -> 7+ machine-carried actions -> external user evidence`

This compresses coordination, not meaning.