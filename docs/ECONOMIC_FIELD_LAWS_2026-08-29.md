# Economic Field Laws — 2026-08-29

This note abstracts recurring monetary topologies from live evidence. The goal is not to name businesses; it is to discover reusable laws that can be projected across unrelated domains.

## Law 1 — Temporal pressure converts stock into urgency

Money that is merely available may be inert. Money with an expiration, due date, service-level requirement, fiscal deadline, contract deadline, or carrying cost acquires directional pressure.

Federal budget authority illustrates the distinction: unobligated balances have not yet been legally committed; obligated balances have binding actions with future payment still due; expiring unobligated balances can cease to be available. Historical federal procurement evidence found spending in the last week of the fiscal year was 4.9× the weekly average, showing how deadline structure can sharply alter flow velocity.

General topology:
`stock + deadline/decay -> pressure -> accelerated allocation -> weaker routing quality if decision capacity is constrained`

Search implication: detect not only value density but approaching changes in optionality.

## Law 2 — Failed flow can propagate through dependency chains

New York Fed material on securities settlement describes daisy chains where one delivery fail causes downstream fails because the expected recipient cannot satisfy its own obligation. The same source notes that relatively small amounts of scarce collateral can sometimes resolve a much larger volume of failed trades as one settlement frees another.

General topology:
`A fails to deliver to B -> B fails to deliver to C -> C fails to deliver to D ...`

This introduces a network multiplier:
`intervention leverage = downstream flow restored / local resource required`

Search implication: the highest-value intervention may not sit beside the largest money stock. It may sit at the narrow dependency whose restoration clears many downstream obligations.

## Law 3 — Flow pressure and ownership are separable

A participant can create/capture value without owning the principal. Custodians, routers, clearing systems, factors, marketplaces, payment processors and financing intermediaries are compensated for reducing time, risk, uncertainty or coordination friction.

General roles must remain distinct:
`beneficial owner != custodian != controller != qualifier != router != resolver != recipient`

Search implication: map rights and control surfaces, not just asset ownership.

## Law 4 — Time itself can be monetizable friction

Supply-chain finance demonstrates a canonical temporal bridge: a supplier owns an approved receivable due in 30–90 days; a financing node pays early at a discount; the buyer pays later on original terms. The principal economic demand is not a new purchase but a preference over *when* value becomes liquid.

General topology:
`certain/likely future flow + costly waiting -> time bridge -> earlier liquidity -> fee/spread`

Search implication: identify flows where timing mismatch, rather than insufficient value, is the bottleneck. Avoid regulated credit activities unless appropriately licensed; the law is broader than direct lending.

## Law 5 — Resolution optionality is an economic asset

Federal acquisition rules explicitly contemplate alternative resolution after contractor default: revised schedules, acceptable third-party arrangements, and repurchase where supplies/services are still needed. The underlying need can survive failure of the original route.

General topology:
`committed need -> chosen resolver -> resolver failure -> need persists -> destination set reopens`

The valuable transient state is not failure itself but *reopened optionality under continuing pressure*.

Search implication: detect state transitions that reopen legitimate routing before incumbents or markets re-equilibrate.

## Law 6 — Economic pressure is not proportional to nominal stock

A huge stock with no accessible rule-change surface may have near-zero usable gradient. A much smaller flow with deadline, branching, measurable failure and funded resolution can have high usable gradient.

A more useful local field measure is:
`pressure density = value-at-stake × urgency × reroutability × observability × dependency multiplier`

Then usable intervention gradient further discounts capital, human burden, regulation, competition, latency and execution uncertainty.

## Law 7 — Small scarce resources can unlock disproportionately large flows

The settlement-fail evidence implies a deeper cross-domain pattern: when a network reuses the same scarce enabling resource sequentially, restoring that resource at one point can clear multiple dependent obligations.

Examples of possible enabling resources (not assumed opportunities): collateral, qualification evidence, identity proof, data normalization, approval, trust, a compatible interface, a replacement supplier, a specific inventory item, a scheduling slot, a missing document.

Search implication: look for *flow keys* — small resources whose absence blocks many dollars of otherwise viable circulation.

## Law 8 — Allocation rules create predictable phase transitions

Budgets, contracts, claims, invoices, credits and settlements move between named states. The state transition often changes who is allowed to act, how urgent movement becomes, and whether destinations can change.

General state grammar:
`available -> reserved -> committed -> due -> attempted -> settled`
with branches such as:
`attempted -> failed -> retryable -> rerouted -> settled`
or
`available -> expiring -> reallocated/expired`.

Search implication: model state machines rather than static markets. Valuable gradients often appear at transitions, not equilibrium states.

## Law 9 — Observation value can exceed transaction value

A resolved transition returns information about timing, qualification, route quality, counterparty performance and causal success. If this telemetry improves future routing across multiple flows, a small transaction can create large reproductive value.

`total loop return = direct capture + uncertainty reduction + reusable state/routing knowledge + future cost reduction`

Search implication: favor observable loops. A hidden payout with no causal telemetry is weaker soil than a smaller but fully measurable transition.

## Law 10 — The Flower should seek field laws before manifestations

Do not move directly from an observed flow to a named business.

Correct toroidal cycle:
`specific observation -> abstract topology -> project across unrelated domains -> falsify -> find invariant -> update Center -> repeat`

This avoids branch capture and permits infinite expansion without merely enumerating ideas.

## New Center variables

For any monetary flow or float, record:

- value stock / rate of flow
- beneficial owner
- current custodian
- current controller
- allocation rule
- state in lifecycle
- trigger for next transition
- deadline / decay / carrying cost
- qualifying gate
- routing authority
- possible destination set
- whether destination is currently fixed or reopened
- dependencies upstream and downstream
- failure propagation multiplier
- smallest flow key that could unblock movement
- observability of state and outcome
- legal/terms permission to intervene
- legitimate compensation mechanism
- return telemetry
- externalities / nourishment

## New search primitive — the pressure surface

Search for moments where several derivatives become positive at once:

`d(urgency)/dt > 0`
`d(reroutability)/dt > 0`
`d(cost-of-delay)/dt > 0`
`observability = high`

These are *pressure surfaces*: temporary states where money that was inert or committed becomes newly movable, where intervention value rises sharply, and where the next destination may still be undecided.

## Current strongest abstract families to pressure-test

1. Reopened-resolution loops: committed need survives resolver failure.
2. Expiring-optionality loops: value loses usability if not allocated before a rule/deadline transition.
3. Cascading-dependency loops: one small missing resource blocks many downstream obligations.
4. Temporal-liquidity loops: future value is credible but waiting is costly.
5. Identity/qualification-discontinuity loops: value exists but cannot move because entitlement and proof are disconnected.

None is promoted to a business or Orchard by abstraction alone. The next step is to locate machine-observable, legally accessible manifestations where a minimal intervention can prove flow restoration and return telemetry.