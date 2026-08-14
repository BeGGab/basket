# GreenMarket Domain Specification

Version: 0.2
Status: EXPERIMENTAL
Update basis: analysis of pr_11
Scope: Stage 1 Basket Experiment
Purpose: a single domain contract for the core code, emulators, scenarios, tests, and the later AI layer.

> This is a living domain specification, not an implementation TZ. It is the **canonical source** of
> GreenMarket domain semantics and MUST evolve after every substantive PR. New domain semantics
> discovered during implementation must be recorded here — not left only in code or PR review.

---

## 1. Purpose

The document captures the accumulated knowledge about the GreenMarket domain gained through modeling
and experimentation.

It defines:

- domain entities;
- their identity;
- relationships;
- lifecycles;
- commercial semantics;
- invariants;
- edge-case handling rules;
- confirmed decisions;
- working hypotheses;
- open questions;
- executable scenarios that these rules must be verified by.

The document evolves after each substantive PR. New domain semantics discovered during
implementation must NOT remain only in the code or PR review — they must be recorded here.

## 2. Knowledge statuses

- **CONFIRMED** — the rule is confirmed by the experiment and tests.
- **ASSUMED** — the rule is accepted as a working hypothesis but not yet proven.
- **OPEN** — no domain decision exists yet.
- **SUPERSEDED** — a previously active decision has been replaced by a new one.

## 3. Core model

```
List
  │
  │ resolution
  ▼
Purchase
  │
  ├── SellerPurchase
  ├── SellerPurchase
  └── SellerPurchase
          │
          ▼
      Offer history
          │
      Acceptance
          │
          ▼
        STABLE
```

The model deliberately separates:

- `List`     = long-lived intent
- `Purchase` = a concrete purchasing attempt

One List can spawn several Purchases. **CONFIRMED**

## 4. List

`List` is the buyer's long-lived intent (family list, weekly shop, BBQ, trip, holiday shop). A List
is neither an Order nor a current purchase.

Minimal `ListItem`:

```
ListItem
├── product
├── quantity?
├── unit?
├── referencePrice?
└── alternatives?
```

Quantity and price may be absent. **CONFIRMED**

## 5. Alternatives

Alternatives are part of the buyer's intent and belong to the List.

```
Bread
├── black       priority 1
└── white       priority 2
```

Resolution may automatically use an alternative:

```
primary unavailable → alternative #1 → alternative #2 → unresolved
```

**CONFIRMED**

## 6. Alternatives ≠ Substitution

- **Alternative** — a variant pre-approved by the buyer.
- **Substitution** — a new variant proposed by the seller during a concrete purchase.

```
Alternative:   pre-approved
Substitution:  requires a separate decision
```

If `white bread` (a declared alternative) is found during Resolution, that is ordinary Resolution.
If the seller proposes `baguette`, that is a Substitution. **CONFIRMED**

## 7. Resolution

Resolution turns a List into a concrete Purchase. It must respect the commercial compatibility of a
ListItem with the seller catalog: product, unit, availability, alternatives, seller.

Resolution MUST NOT use matching semantics different from this specification. **CONFIRMED**

## 8. CatalogLine

The experiment establishes the commercial identity of a CatalogLine:

```
CatalogLine identity = sellerId + productId + unit
```

`quantity` is NOT part of CatalogLine identity. Therefore:

```
Tomatoes / kg / 1 kg
Tomatoes / kg / 5 kg
Tomatoes / kg / 20 kg
```

all belong to the same commercial line `Tomatoes / kg`. `quantity` may still affect price; whether
quantity affects unit price is still open. **CONFIRMED**

## 9. Unit

Unit is part of the commercial identity:

```
kg ≠ pcs
kg ≠ box
l  ≠ pcs
```

`Tomatoes / kg` does not satisfy `Tomatoes / pcs` even for the same productId. **CONFIRMED**

## 10. Unified CatalogLine matching

Any operation working with a commercial catalog line must use the SAME matching semantics:
Resolution, Purchase creation, price lookup, stock lookup, stock-conflict detection, Buyer
Assistant, Seller Assistant, Seller Emulator.

A local implementation of the form `sellerId + productId` is forbidden when the operation needs to
identify a concrete commercial line. **CONFIRMED**

> Reinforced by pr_11: after unifying the matcher in the domain, all emulators must use it too,
> instead of their own simplified lookup.

## 11. Catalog ambiguity

If several rows share `sellerId + productId + unit` but have different prices, the lookup is
ambiguous:

```
Seller A
Tomatoes / kg / 15
Tomatoes / kg / 12
→ AMBIGUOUS   (not 12, not 15)
```

Choosing the first or the minimum price as a hidden policy is forbidden. **CONFIRMED**

## 12. Reference Price

Reference price is a fact/anchor for policy. An unambiguous catalog match may yield a reference
price; ambiguity yields no reference price. Reference lookup must not itself make a commercial
decision. **CONFIRMED**

## 13. Price semantics

The experiment surfaced a contradiction between two interpretations: `price = unit price` vs
`price = line/position price`. The current implementation and part of the policy use unit-price
semantics, but the final domain semantics are not yet proven.

This affects: quantity changes, reference price, price hike, discount, COUNTER, package pricing.

**OPEN — OQ-001.** Until resolved, new price policies must not be treated as finally confirmed.

## 14. Purchase

`Purchase` is a concrete purchasing attempt. One List may spawn Purchase #1, #2, #3. A Purchase has
its own lifecycle and is not a copy of the List. **CONFIRMED**

## 15. SellerPurchase

A Purchase is composed of independent SellerPurchases:

```
Purchase
├── SellerPurchase A → STABLE
├── SellerPurchase B → NEGOTIATING
└── SellerPurchase C → REJECTED
```

`SellerPurchase` is the primary unit of commercial interaction with a specific seller. One seller
must not block the others. **CONFIRMED**

## 16. SellerPurchaseItem identity

After pr_11 the following rule is fixed: if `unit` is part of CatalogLine identity, then a
SellerPurchaseItem must also distinguish `productId + unit`, not only `productId`.

```
Tomatoes / kg
Tomatoes / pcs
→ two independent positions
```

**CONFIRMED.** This is a direct result of the CatalogLine ↔ SellerPurchase mismatch found in pr_11.

## 17. Duplicate ListItems

The following case remains open:

```
List:
    Tomatoes / 2 kg
    Tomatoes / 5 kg
```

Such lines must not be silently collapsed just because `productId + unit` matches. It must be
separately decided whether they are two independent PurchaseItems or one aggregated position.

**OPEN — OQ-003.** Until resolved, the code must not introduce implicit aggregation behavior. The
current implementation surfaces the duplicate explicitly as an unresolved `DUPLICATE_LINE` (the
first line resolves; the second is neither silently dropped nor silently merged). This is a
temporary experimental handling of an OPEN question, not a confirmed aggregation policy.

## 18. requested / agreed / fulfilled

Quantity at different stages is different concepts:

```
requestedQuantity → agreedQuantity → fulfilledQuantity
```

Valid scenario: `requested = 20 kg`, `agreed = 20 kg`, `fulfilled = 5 kg` when the buyer agreed in
advance to the corresponding actual-delivery rule. **CONFIRMED**

## 19. STABLE

STABLE means the commercial terms of the SellerPurchase are agreed. STABLE does NOT mean: paid,
reserved, requested-quantity guaranteed, actually delivered, or handed to delivery. Thus
`STABLE ≠ stock guarantee`. **CONFIRMED**

## 20. Offer

`Offer` is immutable. Each new proposal (Offer #17, #18, #19) is a new object. Offer history is
append-only. A separate OfferRevision is not required in the current model. **CONFIRMED**

## 21. Offer actor

An Offer may be created by `BUYER`, `SELLER`, or `SYSTEM`. Buyer counteroffer and seller
counteroffer are elements of one Offer history. **CONFIRMED**

## 22. Offer reason

An Offer has a `reason` describing the cause of the change (e.g. `MANUAL_COUNTEROFFER`,
`SHELF_LIFE_DISCOUNT`, `AVAILABILITY_CHANGE`, `SYSTEM_PRICE_DROP`, ...). The enum is not considered
final. **ASSUMED**

## 23. Agreed Offer / Active Offer

A SellerPurchase holds `agreedOfferId` and `activeOfferId`, both pointing into the immutable Offer
history:

```
agreedOfferId = Offer #18   (last agreed state)
activeOfferId = Offer #19   (current proposal)
```

The Active Offer does not become agreed automatically. **CONFIRMED**

## 24. Acceptance

Acceptance is a separate historical fact:

```
Acceptance
├── offerId
├── actor
└── timestamp
```

Acceptance moves the agreed pointer but does not replace the historical record. **CONFIRMED**

## 25. Substitution

Substitution is a separate entity with a lifecycle:

```
PROPOSED → ACCEPTED / REJECTED
```

It must be addressed by a concrete `substitutionId`. An array position must not be used as the
identifier of a business operation. **CONFIRMED**

## 26. Advice

Advice is an executable command, not just a recommendation. It contains `actor`, `kind`,
`target/payload`, `basis`. Main kinds: `WAIT`, `ACCEPT_ACTIVE`, `ACCEPT_SUBSTITUTION`, `COUNTER`,
`REJECT`. **CONFIRMED**

## 27. Advice Basis

Advice is computed relative to a concrete snapshot. Basis must capture the facts the decision
depends on: SellerPurchase, active/agreed Offer, Offer items, catalog facts, pending substitutions,
validity-relevant Offer. Changing these facts makes the Advice stale. **CONFIRMED**

## 28. Advice Apply

Advice must not recompute its business target from a changed world:

```
ACCEPT_ACTIVE        → a concrete offerId
ACCEPT_SUBSTITUTION  → a concrete substitutionId
COUNTER              → a concrete items[]
```

If the corresponding snapshot changed, the stale Advice is not applied. **CONFIRMED**

## 29. Counter

COUNTER must preserve the identity of the original lines and change only permitted commercial
parameters. In the current model `productId`, `unit`, `quantity` must stay the same; price may
change. For a multi-item COUNTER every line is validated. **CONFIRMED**

## 30. REJECT

REJECT must carry a machine-readable `rejectReason`, and the reason must have a corresponding basis.
An arbitrary `REJECT + reason` is not a valid command merely because the enum is syntactically
correct. Semantic validation of the basis is part of the Apply contract. **CONFIRMED**

## 31. Buyer/Seller Assistant

The Assistant is a policy layer:

```
Domain facts → Policy → Advice → Domain Apply
```

The Assistant does not mutate the domain directly. Current deterministic policies are experimental
and are not the final production policy. **CONFIRMED**

## 32. Seller Emulator

The Seller Emulator models seller behavior. Profiles must use the same domain semantics as the core
code — especially CatalogLine matching, stock, unit, price, availability.

After pr_11 it is fixed: the emulator MUST NOT use a simplified `productId`-only matcher when the
domain semantics require `productId + unit`. **CONFIRMED**

## 33. Stock

Stock lookup is defined by `sellerId + productId + unit`. Different units must not be merged into one
stock pool without a special domain rule. **CONFIRMED**

## 34. Stock conflict

```
Stock = 6
Purchase A → 4
Purchase B → 3
```

The combined claims must be detectable as a conflict. But conflict detection does NOT mean
allocation or reservation. **CONFIRMED**

## 35. Partial Availability Seller

A partial-availability emulator must determine stock by the same CatalogLine identity
`sellerId + productId + unit`. It must not sum `Tomatoes / kg` and `Tomatoes / pcs` as one stock
pool. **CONFIRMED** (added after pr_11 — the emulator itself surfaced the need to guard this
boundary).

## 36. Stock allocation

Allocation and reservation are outside Stage 1. Do not pre-introduce `GUARANTEED` / `RESERVED` /
`ALLOCATED` just to resolve a stock race. **CONFIRMED**

## 37. Partial fulfillment

`agreed = 20 kg`, `fulfilled = 5 kg` is allowed when the corresponding rule was accepted by the
buyer. Fulfillment as a production subsystem remains outside Stage 1. **CONFIRMED**

## 38. Expiration

Distinguish Offer validity from negotiation lifetime. `validUntil` belongs to a concrete Offer. A
general TTL for the whole SellerPurchase negotiation is not yet defined. **OPEN — OQ-005** (see also
OQ-004 for the expired agreed Offer).

## 39. Silence

Silence is not automatically `REJECTED` or `EXPIRED`. Observable facts may be `waitingSince`,
`lastSellerActivity`, `silenceDuration`. A formal FSM state is introduced only after its necessity
is proven. **CONFIRMED**

## 40. SellerPurchase lifecycle

Minimal model:

```
DRAFT → NEGOTIATING / WAITING → STABLE
```

Separate branches: `REJECTED`, `CANCELLED`, `EXPIRED`. Not every observable circumstance should
become a separate FSM state. **ASSUMED**

## 41. Purchase status

Purchase status is derived from SellerPurchases; it is not a second source of truth. E.g.
`A → STABLE`, `B → NEGOTIATING`, `C → REJECTED` may yield a derived Purchase status
`PARTIALLY_STABLE`. **CONFIRMED**

## 42. Stage 1 boundaries

Outside the core model: Order, Payment, Reservation, Allocation, Delivery. After STABLE there may be
mock actions `pay()`, `reserve()`, `sendToDelivery()`, but this does not imply production subsystems.
**CONFIRMED**

## 43. Determinism

For the same initial world and the same scenario, the result must be deterministic. Verification must
cover not only the event stream but a canonical snapshot of the WHOLE observable domain state:
Purchase, SellerPurchase, Offer history, Acceptance history, substitutions, catalog, stock conflicts,
fulfillments, relevant pointers. **CONFIRMED** (this closes the earlier insufficient check of only
`status` / `activeOfferId` / `agreedOfferId`).

## 44. Executable Domain Scenarios

Each substantive rule must have a reproducible scenario. Minimal set from the current experiment:

```
CATALOG-UNIT-001         same product + different unit  → independent catalog lines
PURCHASE-ITEM-UNIT-001   same product + different unit  → independent PurchaseItems
CATALOG-AMBIGUOUS-001    same seller+product+unit, different prices → ambiguous
STOCK-UNIT-001           same product + different units → independent stock lines
STOCK-RACE-001           stock=6, A=4, B=3 → conflict detected, no allocation
ADVICE-STALE-OFFER-001   same Offer id + changed content → stale
ADVICE-STALE-TIME-001    Advice → clock advances → apply → stale
COUNTER-MULTI-001        multi-item counter → every line validated
PARTIAL-FULFILLMENT-001  agreed 20 → fulfilled 5 → valid when buyer policy permits
```

## 45. Newly discovered rule: CatalogLine identity must propagate through the model

pr_11 showed it is not enough to define `CatalogLine = sellerId + productId + unit` only for catalog
lookup. This identity must be used consistently through:

```
Catalog → Resolution → Purchase → SellerPurchase → Offer → Stock → Emulator → Assistant
```

Otherwise different layers get different representations of the same commercial line. **CONFIRMED**

## 46. Newly discovered rule: no silent collapsing

If two objects differ in a field that is part of their domain identity, they must not be silently
merged. In particular `product + kg` and `product + pcs` cannot be reduced to one position.
Similarly, a second ListItem must not be silently dropped merely because `productId` matches, until a
corresponding aggregation policy is defined. **CONFIRMED**

## 47. Open Questions

These SPEC OQs are the canonical domain-level questions. They are **not** the same numbering as
the experiment log in `docs/basket/BASKET_OPEN_QUESTIONS.md` (OQ-001…OQ-028).

- **OQ-001 — Price semantics.** Is `price` a unit price or a line price? **OPEN**
- **OQ-002 — Package quantity pricing.** May quantity/package size change the unit price
  (`1 kg → 15/kg`, `20 kg → 12/kg`)? Stage 1 **assumes** that package/reference `quantity` never
  changes the unit price — this is a deliberate experimental assumption, not a proven domain truth.
  **OPEN**
- **OQ-003 — Duplicate ListItems.** What to do with `Tomatoes / 2 kg` and `Tomatoes / 5 kg` in one
  List? **OPEN**
- **OQ-004 — Expired agreed Offer.** What happens to `agreedOfferId` if the agreed Offer expired?
  **OPEN** (maps to experiment OQ-009)
- **OQ-005 — Negotiation lifetime.** Is a separate TTL for the whole SellerPurchase negotiation
  needed? **OPEN** (maps to experiment OQ-010)
- **OQ-006 — Allocation.** At which stage does allocation/reservation become necessary? **OPEN**
  (maps to experiment OQ-016)
- **OQ-007 — Partial fulfillment lifecycle.** Where will `agreedQuantity` / `fulfilledQuantity` live
  beyond Stage 1? **OPEN**
- **OQ-008 — Alternative price policy.** If primary is unavailable and the alternative is much more
  expensive than the reference price: `AUTO_ACCEPT` or `ASK_BUYER`? **OPEN** (maps to experiment
  OQ-002)

## 48. Evolution Log

| Version | Source | Change |
| --- | --- | --- |
| v0.1 | Initial model + experiment | base model List → Purchase → SellerPurchase → Offer |
| v0.1 | experiment | Offer immutable |
| v0.1 | experiment | Alternatives separated from Substitution |
| v0.1 | experiment | requested/agreed/fulfilled separated |
| v0.1 | experiment | STABLE ≠ guaranteed availability |
| v0.1 | PR series | Advice as executable command |
| v0.1 | PR series | AdviceBasis / stale protection |
| v0.2 | pr_11 | CatalogLine identity finalized as seller + product + unit |
| v0.2 | pr_11 | SellerPurchaseItem must distinguish product + unit |
| v0.2 | pr_11 | stock/emulator matching must use unit |
| v0.2 | pr_11 | silent collapsing by productId forbidden |
| v0.2 | pr_11 | duplicate ListItem behavior moved to OPEN (SPEC OQ-003); experiment surfaces `DUPLICATE_LINE` |
| v0.2 | pr_11 | package-quantity unit-price assumption recorded as OPEN (SPEC OQ-002), not as proven truth |
| v0.2 | pr_11 | determinism verified by full observable snapshot |

## 49. Rule for the next PR

Before starting the next PR the developer (human or AI) must:

1. read the current `GREENMARKET_DOMAIN_SPEC`;
2. identify the affected invariants;
3. use the existing domain matchers;
4. not introduce their own identity/matching semantics;
5. when a new domain rule is discovered, stop to record it first;
6. add an executable scenario;
7. only then implement the change.

If a PR surfaces new knowledge:

```
Observation → Domain decision → SPEC update → Invariant → Scenario → Implementation → Regression test
```

## 50. Current main technical conclusion

After pr_11 the core architectural hypothesis became much cleaner:

```
CatalogLine
    │ identity
    ▼
sellerId + productId + unit
    ├── Resolution
    ├── Purchase creation
    ├── SellerPurchase
    ├── Stock
    ├── Stock conflict
    ├── Seller Emulator
    ├── Buyer/Seller Assistant
    └── Offer comparison
```

The unified CatalogLine identity is now a domain rule, not a detail of one matcher.

The remaining main open question of the next level:

```
productId + unit → PurchaseItem → quantity
```

i.e. what to do with several ListItems of the same product and same unit but different quantities.
This must not be resolved silently in code; it should be closed by the next experiment and then
recorded in the next version of the specification.
