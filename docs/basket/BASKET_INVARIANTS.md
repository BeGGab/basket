# GreenMarket — Basket Domain Invariants

**Status:** Experimental Baseline v0.1

## Identity and lifecycle

- **I-001:** Creating Purchase does not destroy or consume its source List.
- **I-002:** One List may create multiple independent Purchases.
- **I-003:** Purchase is a concrete purchasing attempt, not a reusable list.
- **I-004:** SellerPurchase is the seller-specific lifecycle unit.
- **I-005:** One SellerPurchase must not block another.

## Offers

- **I-006:** Offer is immutable.
- **I-007:** Offer history is append-only.
- **I-008:** Acceptance does not mutate Offer.
- **I-009:** Unaccepted Offer cannot become agreed state.
- **I-010:** agreedOfferId references an immutable Offer.
- **I-011:** `activeOfferId` is a required projection pointer to the currently applicable Offer. Snapshot, acceptance (I-027) and STABLE all use this field; it is not an optional hint.
- **I-027:** Only the active Offer may be accepted. Older Offers remain historical facts; a rollback is a new Offer.
- **I-028:** An expired Offer (`validUntil` in the past) cannot be accepted. Validity is `isOfferValid`. Acceptance of an expired Offer is refused **before** any Acceptance is recorded.
- **I-029:** An Offer may be accepted only by the counterparty: BUYER accepts SELLER or SYSTEM; SELLER accepts BUYER. An actor cannot accept their own Offer. SYSTEM cannot accept.
- **I-035:** A counter (`BUYER_CHANGE` / `SELLER_COUNTEROFFER`) is a reply to a **live** proposal: countering an expired active Offer is forbidden, symmetric with I-028. Replacing an expired Offer requires an explicit new proposal with a non-counter reason (`PRICE_CHANGE`, `TIME_DISCOUNT`, …).
- **I-030:** Every Offer item must have `quantity` a finite number **> 0**, a `productId`, a `unit`, and if present a finite `price ≥ 0`. Zero/negative/NaN quantity cannot become an Offer or STABLE. The same guarantees apply at the other input boundaries: `addItem` (List item quantity/unit/referencePrice/alternative priority) and `setCatalog` (row quantity > 0, price ≥ 0, stock ≥ 0).

Offer expiration is three separate things:

1. **Validity** — defined (`isOfferValid` / `validUntil`).
2. **Acceptance of an expired Offer** — forbidden (I-028).
3. **OQ-009 (OPEN)** — pointer/status after an **already agreed** Offer later expires and no replacement exists. The mock does **not** auto-change SellerPurchase status on that expiry; validity only prevents *entering* STABLE. Leaving STABLE in place is not a closed domain decision.

## Substitution

- **I-012:** PROPOSED substitution does not alter agreed state.
- **I-013:** Substitution becomes effective only after explicit acceptance.
- **I-032:** Substitution lifecycle is one-way: `PROPOSED → ACCEPTED | REJECTED`. A decided Substitution is a historical fact and cannot be re-decided; a new intent is a new Substitution.

## Alternatives

- **I-014:** Alternatives are buyer pre-authorization.
- **I-015:** Alternatives are resolved during Purchase formation, not negotiation.
- **I-016:** Alternative resolution retains enough provenance for explanation.

## Stability

- **I-017:** STABLE means commercial agreement.
- **I-018:** STABLE does not imply payment, reservation, delivery, fulfillment or guaranteed physical quantity.
- **I-019:** Later partial fulfillment does not retroactively invalidate a valid agreement when partial fulfillment is allowed. `partialFulfillmentAllowed = false` is an enforced policy: `mockFulfill` refuses a delivery below the agreed quantity instead of recording it.

## Purchase state

- **I-020:** Purchase-level state is derived from SellerPurchase state. A Purchase with no SellerPurchases is `EMPTY`, not STABLE.
- **I-021:** Purchase must not duplicate seller lifecycle as a conflicting source of truth.

## History/projection

- **I-022:** Historical events and current projections must remain distinguishable.
- **I-023:** Snapshot state must expose agreed Offer, active/current Offer and pending substitutions.

## Boundaries

- **I-024:** Fulfilled quantity is outside the central current Basket model. The mock records the **delivered** quantity, and the FULFILLMENT stock checkpoint is evaluated on that delivered quantity, not on the agreed one.
- **I-025:** Payment/Reservation/Allocation/Delivery are not introduced merely to solve current scenarios. Concurrent over-claim is recorded as `stockConflicts` **detection events** (same race may appear at several checkpoints); it is not an Allocation entity. For detection, a claim is the quantity on the SellerPurchase's **valid active** commercial proposal. REJECTED, CANCELLED, and expired Offers are not claims.
- **I-026:** New FSM states require experimental evidence.

## Model integrity

- **I-031:** A SellerPurchase line is unique per `(sellerId, productId)`. Several catalog rows of the same seller for the same product do not create duplicate lines.
- **I-033:** State changes only through domain commands. `BasketWorld` keeps its collections private and every read (`requireSp`, `sellerPurchases`, `lists`, `purchases`, `offers`, `acceptances`, `substitutions`, `stockConflicts`, `fulfillments`, `catalog`, `snapshot`) returns a frozen copy, so `sp.status = …` or replacing `activeOfferId` cannot bypass `transition()` and the invariants above.
- **I-034:** The catalog is owned by the world: `setCatalog` stores a defensive copy and `setStock` is the only stock mutation. Mutating the object passed to `setCatalog` afterwards has no effect on the world.
