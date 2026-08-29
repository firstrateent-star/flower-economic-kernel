# Toroidal Loop Scan — 2026-08-29

This scan searches for existing economic loops with observable pressure, a bottleneck that may be machine-bridgeable, and a plausible return path carrying at least two forms of nourishment.

## Candidate family 1 — Home energy incentive -> contractor/project loop

Observed pressure:
- U.S. DOE currently exposes household tax credits, rebates and savings by ZIP/product, including Home Energy Rebates, WAP and LIHEAP.
- This means public/official incentive information already exists, but it is distributed across program/state/product rules and requires users to translate eligibility into an actual project.
- Current contractor/referral programs show downstream funded edges. Atmosphere publicly recruits partners who can earn referral fees for solar, battery storage and EV charger projects. Regions currently pays up to $1,000 for qualified contractor referrals that activate into its home-improvement financing program during its 2026 promotion.

Loop hypothesis:
`household improvement intent -> incentive/eligibility uncertainty -> project economics -> contractor/financing match -> completed project -> referral/revenue -> outcome data -> better future routing`

Possible bridge:
A free incentive-to-project decision layer that starts from ZIP + home/project facts and answers: likely incentive stack, effective project cost range, financing/referral options, and next legitimate resolver.

Why toroidally interesting:
- financial return can come from funded referrals or lead/call rails;
- each completed/failed transition returns local program eligibility, provider availability and conversion evidence;
- incentive databases and logic are reusable across many project types;
- the same traffic can route differently depending on actual eligibility.

Risks/pruning pressure:
- incentive rules change and must remain authoritative/current;
- many official and commercial incentive finders exist, so the organism needs a narrower high-friction transition rather than generic rebate lookup;
- contractor/referral coverage is geographic and fragmented;
- do not imply tax/legal eligibility beyond authoritative rules.

Nursery state: SENSED/PRESSURED, not yet bridged.

## Candidate family 2 — Contractor network expansion loop

Observed pressure:
- Regions Home Improvement Financing has a live July–September 2026 contractor referral program paying $1,000 when a referred legitimate contractor enrolls in a qualifying loan program by November 30, subject to eligibility/tax terms.
- Modernize's August 12, 2026 referral FAQ says an eligible referrer can earn up to $350 for a contractor referral: $100 on a valid lead form and $250 more if the contractor signs up to receive leads.

Loop hypothesis:
`contractor exists -> growth/financing/distribution need -> platform enrollment -> platform gains supply -> contractor gains demand/capital -> referrer reward -> enrollment evidence -> better contractor targeting`

Toroidal attraction:
- the funded state transition is explicit and high-value;
- public business data can potentially detect legitimate contractors;
- success creates structured evidence about contractor type/geography/qualification.

Fatal current constraint:
- these programs restrict referrer eligibility or require a partner/customer relationship; automation cannot assume eligibility or submit referrals without terms/identity compliance.

Nursery state: PRESSURED but HUMAN/TERMS membrane. Do not pursue automatically.

## Candidate family 3 — Home-service demand -> qualified call loop

Observed pressure:
- A current OfferVault listing updated Aug 27, 2026 shows Lead Smart seeking publishers for nationwide roofing-contractor calls, with dynamic $2–$30 lead revenue share on that specific listing.
- Pay-per-call remains direct evidence that buyers fund routing of already-existing home-service intent.

Loop hypothesis:
`urgent household problem -> diagnosis/decision -> appropriate service category -> qualified call -> provider resolution -> payout -> conversion/provider evidence -> better diagnosis/routing`

Toroidal attraction:
- immediate state transition is measurable;
- many home-service categories can share the same sensing/decision infrastructure;
- outcome telemetry can improve future routing;
- can cross-pollinate with energy-incentive traffic and resolution-failure traffic.

Risk:
- traffic generation is the scarce input;
- approval/compliance/payment onboarding remains a human membrane;
- generic local lead-gen pages are saturated and can become doorway/spam content.

Nursery state: PRESSED/FUNDED EDGE VERIFIED; distribution bridge unverified.

## Candidate family 4 — Unclaimed entitlement -> resolver loop

Observed pressure:
- IRS said in March 2026 that more than 1.3 million taxpayers had about $1.2B in unclaimed 2022 refunds, median estimated refund $686, before the April 15 deadline.
- IRS also explicitly notes that people can miss refundable credits because they do not file.

This proves awareness/qualification failures can strand very large pools of legitimate economic value.

Loop hypothesis:
`person has latent entitlement -> awareness/qualification uncertainty -> authoritative eligibility guidance -> legitimate filing/resolution path -> recovered money -> trust/data -> future entitlement detection`

Why not immediate fruit:
- tax preparation/refund representation is regulated/high-stakes;
- refund-contingent compensation can be problematic, and IRS warns about preparers promising inflated refunds or charging based on refunds;
- current 2022 deadline has passed.

Method lesson:
Search for entitlement classes with the same structural pressure but lower regulatory burden: utility credits, warranties, service guarantees, rebates, refunds, deposits, unclaimed consumer balances, cancellation rights.

Nursery state: STRUCTURAL EVIDENCE only; specific tax branch pruned.

## Center return

The scan suggests the strongest live pattern is not one vertical but a reusable topology:

`high-intent event -> eligibility/decision membrane -> resolver routing -> funded state transition -> outcome telemetry -> shared routing soil`

The most attractive loops contain both:
1. a pre-existing monetary pressure on the downstream edge;
2. a return signal that improves future matching.

The home-energy + home-service domain is notable because several abundance reservoirs overlap: intent, entitlement/rebate, decision uncertainty, contractor capacity, financing, referral/call payouts and post-resolution evidence. This does NOT automatically make it the winning Orchard. It earns deeper Nursery testing because one sensing layer could potentially route multiple legitimate outcomes rather than depend on one affiliate product.

## Center methodology mutation

New rule: score *overlap density* in addition to edge gradient.

`loop potential = usable gradient × return quality × overlap density`

Overlap density asks how many independent abundance reservoirs and funded resolvers can be reached through the same truthful sensing event without confusing user intent.

A high-overlap hub can lower reproduction cost because the sensing, eligibility logic, traffic acquisition and telemetry are shared while downstream resolvers remain diversified.

Counter-rule: overlap without user benefit becomes an affiliate router and should be pruned. The hub must resolve uncertainty better than sending the user directly to a provider.
