# GreenMarket — Basket Domain Model

**Status:** Experimental Baseline v0.1

## Purpose

Define the working domain hypothesis for GreenMarket before production backend/API/Platform Core integration.

```text
List
  ↓
Resolution
  ↓
Purchase
  ↓
SellerPurchase[*]
  ↓
Offer[*] + Acceptance[*] + Substitution[*]
  ↓
STABLE
  ↓
future execution
```

## List

A durable buyer intent/reusable shopping list. It is not a transaction, is not tied to a seller, survives Purchase creation, and may create multiple Purchases.

```text
List
└── ListItem[*]
```

## ListItem

```text
ListItem
├── product
├── alternatives[]
├── quantity?
└── referencePrice?
```

`referencePrice` is an informational buyer reference, not automatically a price limit.

### Alternatives

Pre-authorized acceptable products, ordered by:

```text
alternativePriority
0 = primary
1 = first alternative
2 = second alternative
...
```

Alternatives participate in Purchase formation/resolution.

## Substitution

A seller/system proposal outside the buyer's pre-authorized alternatives.

```text
Substitution
├── originalItem
├── replacementItem
├── proposedBy
├── reason
├── status
└── createdAt
```

Status: `PROPOSED | ACCEPTED | REJECTED`.

A proposed substitution does not change the agreed purchase until accepted.

## Resolution

List is not converted into Purchase; a Purchase is derived from it.

```text
List
  ↓ Create Purchase
Purchase
```

Resolution chooses primary/alternative/unresolved.

Initial experimental policies:

- `PRIMARY_ONLY`
- `FIRST_AVAILABLE`
- `ASK_BUYER`

Price-aware policies remain open.

If an alternative is used, retain provenance where useful:

```text
PurchaseItem
├── resolvedFrom
└── alternativePriority
```

## Purchase

A concrete purchasing attempt which may contain several sellers.

```text
Purchase
├── SellerPurchase A
├── SellerPurchase B
└── SellerPurchase C
```

## SellerPurchase

The independent commercial lifecycle unit for one seller.

Different SellerPurchases may simultaneously be:

```text
A → STABLE
B → NEGOTIATING
C → REJECTED
```

## PurchaseItem

Current projected purchase state:

```text
PurchaseItem
├── product
├── quantity
├── unit
├── price
└── discount?
```

Commercial history must not be duplicated here; it belongs to Offer history.

## Quantity semantics

Distinguish:

```text
requestedQuantity
agreedQuantity
fulfilledQuantity
```

Example:

```text
requested = 20 kg
agreed    = 20 kg
fulfilled = 5 kg
```

This can be valid when partial fulfillment is allowed. Fulfillment is outside the current central model.

## Offer

Offer is an immutable first-class entity. Every new proposal creates a new Offer.

```text
Offer
├── actor
├── reason
├── items
├── createdAt
└── validUntil?
```

Actors:

`BUYER | SELLER | SYSTEM`

Candidate reasons:

`BUYER_CHANGE | SELLER_COUNTEROFFER | PRICE_CHANGE | TIME_DISCOUNT | AVAILABILITY_CHANGE | SUBSTITUTION | SYSTEM_ADJUSTMENT | EXPIRATION`

The reason list is provisional.

Offer history is append-only; a separate OfferRevision is not part of the baseline.

## Acceptance

Acceptance is a separate historical fact:

```text
Acceptance
├── offerId
├── actor
└── createdAt
```

Acceptance does not mutate the immutable Offer.

## Agreed and Active Offer

SellerPurchase may project current state with:

```text
agreedOfferId
activeOfferId
```

Both point to immutable Offers.

Example:

```text
agreedOfferId → Offer #18
activeOfferId → Offer #19
```

This means Offer #18 is accepted while #19 is currently awaiting a decision.

`activeOfferId` remains an experimental hypothesis and must be validated against expiration/silence.

## Snapshot invariant

At any point the model must distinguish:

```text
AGREED
CURRENT OFFER
PENDING SUBSTITUTION
```

Example:

```text
AGREED:
  Offer #18

CURRENT:
  Offer #19

PENDING:
  Substitution #7
```

## STABLE

Working definition:

> STABLE means that buyer and seller have agreed on the current commercial proposal.

Conceptually:

```text
activeOffer == agreedOffer
AND no unresolved mandatory substitution
AND agreed offer is valid
```

STABLE does not mean payment, reservation, delivery, guaranteed physical availability, or guaranteed quantity.

## Experimental SellerPurchase states

Initial candidates:

`DRAFT | NEGOTIATING | WAITING_SELLER | WAITING_BUYER | STABLE | REJECTED | CANCELLED | EXPIRED`

States must be added only when evidence requires them.

Seller silence initially remains facts such as `lastSellerActivity` and `waitingSince`, not automatically a new FSM state.

## Purchase state

Purchase-level state is derived from SellerPurchase states. It must not become a second source of truth.

## Execution boundary

After STABLE, future processes may start:

```text
STABLE
 ├── Payment
 ├── Reservation
 ├── Fulfillment
 └── Delivery
```

These are outside the current experiment.

## Core invariants

1. List survives Purchase creation.
2. One List can create multiple Purchases.
3. Purchase can contain multiple SellerPurchases.
4. SellerPurchase lifecycles are independent.
5. Offer is immutable.
6. Acceptance does not mutate Offer.
7. Unaccepted Offer is not agreed.
8. Proposed Substitution does not alter agreed state.
9. STABLE does not imply fulfillment.
10. Purchase state is derived.
11. Historical Offers/Acceptances remain inspectable.
12. Alternatives are resolved before/while forming Purchase; Substitution is explicit.
13. Future execution systems are not introduced merely to simplify this experiment.
