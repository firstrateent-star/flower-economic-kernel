# Economic Field Observatory v1 — 2026-08-29

## Center correction

Do not search industries, products, affiliate programs, or consumer purchases as the primary ontology.

Observe economic state transitions first:

`stock -> intention/obligation -> trigger -> gate -> routing -> settlement -> outcome -> feedback`

Money becomes unusually actionable when the state transition changes optionality, urgency, or downstream dependency.

## Two-network condition

A monetizable Flower bridge usually sits across two distinct networks:

1. **Primary flow network** — the value that needs to move (money, goods, service, entitlement, capacity, information).
2. **Compensation network** — the separate rule or actor that pays a resolver, referrer, auditor, broker, platform, or infrastructure provider for improving that movement.

The Flower need not own, custody, or skim the principal. The safest low-capital position is often a sidecar compensation rail:

`principal A -> useful transition -> principal B`

while independently:

`beneficiary/platform/resolver -> compensation -> Flower`

This separation lowers custody risk and clarifies the ethical requirement: compensation must be earned for useful resolution, not for obstructing or deceptively diverting the primary flow.

## Pressure surfaces

A pressure surface is an observable state where at least one of the following derivatives changes materially:

- urgency rises;
- reroutability rises;
- cost of delay rises;
- destination set reopens;
- a deadline approaches;
- a previously hidden entitlement becomes legible;
- a required enabling resource becomes scarce;
- a settlement/fulfillment attempt fails;
- a downstream cascade becomes possible.

The strongest candidate is not necessarily the largest monetary stock. It is the most accessible pressure multiplied by the smallest legitimate intervention.

## Flow keys

A Flow Key is a comparatively small missing input that unlocks a much larger downstream circulation.

Examples of the abstract type:

- identity/provenance proof;
- qualification document;
- replacement supplier;
- corrected invoice/PO data;
- compatible format/protocol;
- approval;
- scarce inventory or capacity slot;
- authoritative record;
- consent;
- missing routing information.

Search question:

`Which smallest missing key controls the greatest legitimate downstream value?`

## Current live evidence

### Federal reprocurement

Current FAR 49.402-6 requires the Government, when supplies/services remain required after default termination, to repurchase as soon as practicable and obtain competition to the maximum extent practicable. This is a clean example of:

`committed need -> selected resolver -> default -> destination set reopens -> competition resumes`

SAM.gov and USAspending expose public contract/award data and APIs, making parts of this state machine machine-observable.

Limitation: public observability does not itself attach compensation to Flower. A monetization rail must exist separately; otherwise this remains valuable intelligence, not Fruit.

### B2B receivable recovery

Current commercial recovery services publicly use contingency models, demonstrating a funded recovery edge:

`earned revenue -> invoice stalls -> recovery effort -> payment -> resolver percentage`

This is high-pressure and compensation-attached, but decisive data are private to the creditor and commercial collection activity introduces legal/compliance and client-acquisition burden.

### Healthcare claim denials

Current denial-recovery services use percentage-of-recovery models. This is strong structural evidence for:

`earned amount -> payer denial -> appeal -> recovered amount -> success fee`

But PHI, payer policy complexity, healthcare regulation, and human-review burden make it unsuitable as an autonomous first Fruit.

### Freight tender / settlement / invoice failures

Current freight markets show meaningful tender rejection pressure and contingency freight-invoice auditing. Freight therefore contains several independent pressure surfaces:

- capacity route rejected -> spot replacement;
- delivered service -> billing discrepancy -> audit/recovery;
- shipper demand -> broker routing -> recurring referral compensation.

Access to individual high-value events is often private/proprietary, so aggregate market pressure must not be mistaken for machine-addressable opportunity.

### Surplus / dead inventory

Liquidation markets visibly monetize:

`capital trapped in inventory -> discount/relisting -> buyer match -> cash recovery -> platform fee`

But Flower currently owns no inventory and public visibility into third-party inventory before marketplace listing is weak. Treat as a topology, not a first organism.

## Sidecar compensation evidence

Current programs show that compensation can be attached to a state transition without touching the principal:

- business-financing referral platforms pay when referred funding actually closes;
- freight broker referral programs pay a share of broker margin on referred shipper activity;
- commercial collections partners pay referral shares from recovery fees;
- SaaS/business-information programs pay recurring revenue shares after referred subscriptions begin.

This means Flower should independently map:

`pressure surface` AND `sidecar compensation rail`

The intersection matters more than either alone.

## New observatory state vector

Each detected economic surface should be represented as:

- principal/value at stake;
- beneficial owner;
- custodian;
- current controller;
- intention/obligation;
- trigger;
- gate;
- routing authority;
- destination set;
- deadline/expiry;
- settlement mechanism;
- observed failure/branch;
- urgency;
- reroutability;
- downstream dependency multiplier;
- observability;
- machine addressability;
- compensation attachment;
- compensation payer;
- compensation trigger;
- return telemetry;
- overlap density;
- human burden;
- capital burden;
- latency;
- regulatory friction;
- competition;
- extraction/manipulation risk;
- smallest falsifier;
- smallest legitimate intervention.

## Runtime scoring

A pure scoring module now exists at `src/core/field-score.js` with tests at `tests/field-score.test.js`.

It intentionally hard-gates giant-but-locked pools and high-human-burden candidates rather than letting nominal dollar size dominate selection.

The module is not yet wired into the existing opportunity selector. Wiring should wait until opportunity records carry explicit field-state attributes; otherwise numerical scores would create false precision.

## New laws returned to Center

1. **Primary-value ownership is unnecessary.** Useful participation in a transition can be compensated through a separate sidecar rail.
2. **Money density is not opportunity density.** Pressure, reroutability and machine addressability dominate inert size.
3. **Transition evidence precedes product ideation.** Observe the state change, then abstract, then project across domains.
4. **Compensation attachment must be verified independently.** A real failure with no funded resolver is not yet economic Fruit.
5. **Public observability is a scarce resource.** Private data can make a huge gradient inaccessible to a zero-capital autonomous system.
6. **A Flow Key can have multiplicative value.** Search for small missing inputs controlling large downstream chains.
7. **The safest interception surface is informative, not custodial.** Prefer diagnosing, verifying, matching or routing over taking possession of principal funds.
8. **A domain example must return an invariant.** If an experiment only teaches 'something about roofing/freight/etc.', abstraction is incomplete.
9. **Sidecar rails can diversify one sensing surface.** A single useful observation can potentially route to multiple funded resolvers without becoming a deceptive affiliate router.
10. **Do not accept terms merely to collect payout endpoints.** Terms/account creation must be earned by a specific surface whose distribution and transition can be tested.

## Current strongest research pressure

Search for economic state transitions satisfying all of:

`pre-existing intention/obligation`

`+ publicly observable trigger or failure`

`+ destination/resolver still legitimately mutable`

`+ delay or failure carries real cost`

`+ machine can supply a Flow Key with near-zero marginal human work`

`+ a sidecar compensation network already pays for successful resolution`

`+ completion creates telemetry that improves the next resolution`

When such a transition is found, search existing Fruit for mutation before creating new infrastructure.