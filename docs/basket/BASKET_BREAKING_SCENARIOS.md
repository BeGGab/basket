# GreenMarket — Basket Breaking Scenarios

**Status:** Experimental Baseline v0.1

These scenarios intentionally attempt to expose weaknesses in the model.

## BS-001 — List → Purchase

Create Purchase from List. Verify List survives and Purchase is separate.

## BS-002 — Multiple Sellers

One Purchase contains three SellerPurchases.

## BS-003 — Independent Seller Lifecycle

```text
A → STABLE
B → NEGOTIATING
C → REJECTED
```

A must be able to proceed independently.

## BS-004 — Long Bidirectional Negotiation

Unlimited sequence:

```text
BUYER → SELLER → BUYER → SELLER → ...
```

## BS-005 — Price Change

```text
15 → 17 → 15.5 → 16 + 5% discount
```

Every proposal is a new immutable Offer. Earlier Offer objects (including nested `items`) must stay unchanged after later proposals.

## BS-006 — Automatic Time Discount

```text
15 MAD
→ SYSTEM
→ 12 MAD
reason = TIME_DISCOUNT
```

## BS-007 — Quantity Reduction

```text
Buyer: 10 kg
Seller: 6 kg
Buyer: accepts 6 kg
```

## BS-008 — Composition Change

```text
A+B+C → A+C → A+C+D
```

## BS-009 — Alternatives

Primary unavailable, authorized alternative available. Test resolution.

## BS-010 — Expensive Alternative

Primary unavailable; alternative exists but is far above referencePrice. Expose policy behavior; do not invent a hidden threshold.

## BS-011 — Stock Race

```text
Stock = 6 kg
Purchase A → 4 kg
Purchase B → 3 kg
```

Each request is individually within stock; together they are not. Record the first layer where the combined claim is detected (Offer creation, Acceptance, STABLE or fulfillment). Do not solve allocation in this experiment.

For stock-conflict detection, a claim is the quantity represented by the SellerPurchase's current **valid** active commercial proposal. REJECTED, CANCELLED, and expired Offers do not compete.

## BS-012 — Offer Expiration

Offer expires while SellerPurchase remains.

## BS-013 — Seller Silence

Seller stops responding. Do not automatically classify as REJECTED or EXPIRED. Test `lastSellerActivity`/`waitingSince`.

## BS-014 — Partial Fulfillment

```text
requested = 20 kg
agreed = 20 kg
actual = 5 kg
```

Commercial agreement remains valid if partial fulfillment is allowed.

## BS-015 — One List → Multiple Purchases

Same List creates Purchase #101 and #102 without being consumed.

## BS-016 — Snapshot Conflict

Simultaneously represent:

```text
AGREED: Offer #18
CURRENT: Offer #19
PENDING: Substitution #7
```

Mandatory consistency test.

## BS-017 — Accept Previous Offer

Acceptance of an older Offer when a newer one exists is **prohibited**. Only the active Offer can be accepted (I-027). Older Offers remain in append-only history. To return to a previous price, the actor proposes a new Offer.

## BS-018 — Substitution Outside Alternatives

Buyer allows Black→White; seller proposes Baguette. Must be Substitution.

## BS-019 — Alternative Across Sellers

Primary unavailable from Seller A but available from Seller B. **Resolution precedes seller partitioning** and is not seller-specific: both sellers receive the globally resolved primary, not a private alternative on A.

## BS-020 — Simultaneous Seller Changes

Two SellerPurchases change independently without state overwrite.

## BS-021 — Expired Active Offer + New Offer

The pointer `activeOfferId` is required (I-011). This scenario checks what it points at after an Offer expires **and** a newer Offer is created. I-028 forbids accepting the expired Offer. Already-agreed expiry without a replacement is BS-031 (I-037 / I-038).

## BS-022 — Silence After Expiration

Expired Offer plus no new seller response. Silence is not a command and is not `markWaiting`. Status stays whatever the last real command left (typically `WAITING_BUYER` after a seller Offer). Not REJECT/CANCEL/EXPIRED (I-039). Only computed `isOfferValid` becomes false.

## BS-023 — Conflicting Full Promises

Same race as BS-011 (`stock=6`, A→4, B→3). Both SellerPurchases may still become STABLE. `stockConflicts` is a **detection-event log** (the same race may be recorded at OFFER_CREATION, ACCEPTANCE and STABLE). Do not introduce GUARANTEED/Reservation/Allocation. Assertions must prove stock=6, combined=7, first checkpoint OFFER_CREATION, and independent STABLE.

Claim = active Offer quantity. If A has agreed=4 and a newer active=7, B's 3 combines as 3+7=10, not 3+4=7.

## BS-024 — Accepted Offer Followed by New Offer

Expected:

```text
agreedOfferId → #18
activeOfferId → #19
```

## BS-025 — Accepted Substitution + New Offer

Keep substitution acceptance and later Offer as separate historical facts.

## BS-026 — Silence While Offer Is Valid

Do not conflate silence with expiration.

## BS-027 — Alternative With Unacceptable Price

Expose Resolution policy explicitly.

## BS-028 — Partial Availability Before STABLE

`PartialAvailabilitySeller` offers the in-stock quantity (e.g. 5 kg) instead of the requested 20 kg. Buyer may accept that reduced Offer; STABLE is possible on the reduced agreement. Assert `activeOffer.items[0].quantity === 5` and `agreedOffer.items[0].quantity === 5`, not only `status === STABLE`. The case «agreed 20 / actual 5» is BS-014 (`mockFulfill`), not this profile.

`PartialAvailabilitySeller` observes catalog stock at Offer creation and on `tick()` if stock later drops. Cross-purchase allocation is outside this experiment. A zero-stock result does not create a quantity-0 Offer.

## BS-029 — Silence while Offer is valid

Offer A is active. Buyer does nothing. `time < validUntil`. Status, `activeOfferId`, and `agreedOfferId` stay; Offer remains valid (I-039).

## BS-030 — Silence until expiration

Offer A is active. Buyer does nothing. `time > validUntil`. Same pointers and status; `isOfferValid` is false. Not implicit REJECT (I-039 / I-028).

## BS-031 — Accepted Offer expires

Offer A is accepted (`agreedOfferId = A`, `activeOfferId = A`). Time passes `validUntil`. No replacement Offer. SellerPurchase stays STABLE; both pointers stay A; A is no longer valid as a standing proposal (I-037 / I-038). COUNTER of A is still forbidden (I-035). A is not a stock claim (I-025). `advance` creates no new facts (I-040).

## BS-032 — Accepted Offer expires, then a new Offer appears

A accepted → A expires → B created. `agreedOfferId` stays A; `activeOfferId` becomes B; B may be accepted if valid. After ACCEPT(B): STABLE, both pointers B.

## BS-033 — Expired Offer cannot be revived

Expired A, then ACCEPT(A). Blocked by I-028. No Acceptance recorded.

## BS-034 — Expired Offer cannot be countered

Expired A, then a **counter** (`isCounterReason`: `BUYER_CHANGE` and `SELLER_COUNTEROFFER`) is blocked by I-035. A non-counter replacement (`PRICE_CHANGE`) is allowed. The test must use the domain counter mark, not an incidental `proposeOffer` reason.

## BS-035 — Silence must not create a fake FSM state

Long silence after expiration does not invent `EXPIRED` or any other new lifecycle status (I-039 / I-041).

## BS-036 — Time determinism

Same initial snapshot + same commands + same timestamps → identical full observable world (I-040).
