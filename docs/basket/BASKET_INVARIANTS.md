# GreenMarket — Basket Domain Invariants

**Status:** Experimental Baseline v0.1

Canonical domain semantics (identities, matching, pricing, stock, open questions) live in
[`docs/domain/GREENMARKET_DOMAIN_SPEC.md`](../domain/GREENMARKET_DOMAIN_SPEC.md). This file lists the
invariants the experiment currently enforces. A PR that changes a CONFIRMED domain rule MUST update
the specification first (`AGENTS.md`).

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
- **I-011:** `activeOfferId` is a required projection pointer to the current standing proposal. Snapshot, acceptance (I-027) and STABLE all use this field; it is not an optional hint. Time passage does not clear it; an expired active Offer is still the pointer, just not acceptable (I-028) or counterable (I-035).
- **I-027:** Only the active Offer may be accepted. Older Offers remain historical facts; a rollback is a new Offer.
- **I-028:** An expired Offer (`validUntil` in the past) cannot be accepted. Validity is `isOfferValid`. Acceptance of an expired Offer is refused **before** any Acceptance is recorded.
- **I-029:** An Offer may be accepted only by the counterparty: BUYER accepts SELLER or SYSTEM; SELLER accepts BUYER. An actor cannot accept their own Offer. SYSTEM cannot accept.
- **I-035:** A counter is a reply to a **live** proposal. The domain mark is `isCounterReason` (`BUYER_CHANGE` / `SELLER_COUNTEROFFER`). Countering an expired active Offer is forbidden, symmetric with I-028. Replacing an expired Offer requires an explicit new proposal with a non-counter reason (`PRICE_CHANGE`, `TIME_DISCOUNT`, …).
- **I-030:** Every Offer item must have `quantity` a finite number **> 0**, a `productId`, a `unit`, and if present a finite `price ≥ 0`. Zero/negative/NaN quantity cannot become an Offer or STABLE. The same guarantees apply at the other input boundaries: `addItem` (List item quantity/unit/referencePrice/alternative priority) and `setCatalog` (row quantity > 0, price ≥ 0, stock ≥ 0).

Offer expiration is three separate things:

1. **Validity** — defined (`isOfferValid` / `validUntil`): may this *standing proposal* be accepted or countered.
2. **Acceptance / counter of an expired Offer** — forbidden (I-028 / I-035).
3. **Already-agreed Offer later expires** — **CLOSED (I-037 / I-038)**. Pointers stay; the Acceptance remains the baseline; STABLE is not exited. See SPEC §38 / experiment OQ-009.

- **I-037:** `validUntil` constrains acceptance and counter of the **active** standing proposal only. It does not revoke a recorded Acceptance, clear `agreedOfferId` / `activeOfferId`, or remove the agreed Offer as a price baseline. An expired agreed Offer is still the commercial baseline and may keep STABLE, but it is not a stock claim (I-025).
- **I-038:** STABLE is the presence of an accepted agreement (`agreedOfferId === activeOfferId` and no pending mandatory substitutions). Current Offer validity is not a STABLE entry or exit condition — the Acceptance already happened while the Offer was valid (I-028).
- **I-039:** Silence is the absence of a domain command. It does not change SellerPurchase status, `activeOfferId`, or `agreedOfferId`, and does not invent `REJECTED`, `CANCELLED`, or `EXPIRED`.
- **I-040:** The world's `DeterministicClock` is the sole source of *current* time. Domain operations read `clock.now()`; they do not take a "now" timestamp. `Offer.validUntil` is input data of that Offer, not a time source. `advance` moves the clock and nothing else — it does not create Offers, Acceptances, Substitutions, stock-conflict events, or FSM transitions, does not clear pointers, and does not recompute STABLE eligibility (I-038). `isOfferValid` is a derived fact from `clock.now()` vs `validUntil` (exclusive end). Emulator/runtime `tick()` is not a domain operation.
- **I-041:** Passage of time and silence do not transition a SellerPurchase to `EXPIRED`. `EXPIRED` is reserved so the FSM can refuse that automatic transition (I-026).

## Substitution

- **I-012:** PROPOSED substitution does not alter agreed state.
- **I-013:** Substitution becomes effective only after explicit acceptance.
- **I-032:** Substitution lifecycle is one-way: `PROPOSED → ACCEPTED | REJECTED`. A decided Substitution is a historical fact and cannot be re-decided; a new intent is a new Substitution.

## Alternatives

- **I-014:** Alternatives are buyer pre-authorization.
- **I-015:** Alternatives are resolved during Purchase formation, not negotiation.
- **I-016:** Alternative resolution retains enough provenance for explanation.

## Stability

- **I-017:** STABLE means commercial agreement. It does not mean the agreed Offer's `validUntil` is still in the future.
- **I-018:** STABLE does not imply payment, reservation, delivery, fulfillment or guaranteed physical quantity.
- **I-019:** Later partial fulfillment does not retroactively invalidate a valid agreement when partial fulfillment is allowed. `partialFulfillmentAllowed = false` is an enforced policy: `mockFulfill` refuses a delivery below the agreed quantity instead of recording it.

## Purchase state

- **I-020:** Purchase-level state is derived from SellerPurchase state. A Purchase with no SellerPurchases is `EMPTY`, not STABLE.
- **I-021:** Purchase must not duplicate seller lifecycle as a conflicting source of truth.

## History/projection

- **I-022:** Historical events and current projections must remain distinguishable.
- **I-023:** Snapshot state must expose agreed Offer, active/current Offer, pending substitutions, and a List-alternative **projection** (`AlternativeProjection` in `domain/projections.ts` — not a commercial entity). Alternatives are sourced from the List. Current `sp.items` and this SellerPurchase's offer history are only a binding set (which List lines belong to this SP). Replacing the current commercial item does not drop List alternatives. The projection compares requested qty/unit with catalog qty/unit/price and does not select AUTO_ACCEPT / BEST_PRICE.

## Boundaries

- **I-024:** Fulfilled quantity is outside the central current Basket model. The mock records the **delivered** quantity, and the FULFILLMENT stock checkpoint is evaluated on that delivered quantity, not on the agreed one.
- **I-025:** Payment/Reservation/Allocation/Delivery are not introduced merely to solve current scenarios. Concurrent over-claim is recorded as `stockConflicts` **detection events** (same race may appear at several checkpoints); it is not an Allocation entity. A claim is the quantity on the SellerPurchase's **valid active** commercial proposal; claims compete only within the same commercial line `(productId, unit)` — a `pcs` claim does not draw on a `kg` stock pool. REJECTED, CANCELLED, and expired Offers are not claims. Current claims are the diagnostic projection `stockClaims(sellerId, productId, unit)` — the same predicate detection uses. `stockConflicts` is not a claims registry: an empty log is not evidence that claims are empty. A STABLE SellerPurchase whose active Offer has expired therefore holds no stock claim — consistent with I-018 (`STABLE ≠ stock guarantee`).
- **I-026:** New FSM states require experimental evidence.

## Model integrity

- **I-031:** A SellerPurchase line is unique per the commercial identity `(sellerId, productId, unit)` — the same identity as a CatalogLine (I-036). `tomatoes/kg` and `tomatoes/pcs` are two independent lines. Several catalog rows of the same `(seller, product, unit)` do not create duplicate lines. A second ListItem that collapses to an already-present `(productId, unit)` (e.g. `2 kg` and `5 kg` tomatoes) is the domain-undefined duplicate case (**SPEC OQ-003**) and is surfaced explicitly as an unresolved `DUPLICATE_LINE`, never silently dropped or silently aggregated.
- **I-033:** State changes only through domain commands. `BasketWorld` keeps its collections private and every read (`requireSp`, `sellerPurchases`, `lists`, `purchases`, `offers`, `acceptances`, `substitutions`, `stockConflicts`, `stockClaims`, `fulfillments`, `catalog`, `snapshot`) returns a frozen copy, so `sp.status = …` or replacing `activeOfferId` cannot bypass `transition()` and the invariants above.
- **I-034:** The catalog is owned by the world: `setCatalog` stores a defensive copy and `setStock(sellerId, productId, unit, stock)` is the only stock mutation. `setStock` keys on the commercial line and requires a **unique** matching row — an ambiguous or missing match throws instead of silently editing the first row. Mutating the object passed to `setCatalog` afterwards has no effect on the world.
- **I-036:** A catalog line has ONE commercial identity — `(sellerId, productId, unit)` — defined once in `domain/catalog` and shared by resolution, SellerPurchase creation, `setStock`, stock-conflict detection, the **Seller Emulator**, AND the assistants (so the domain is never laxer than the assistant or emulator layer). `price` is the price per one `unit` (I-042). The catalog `quantity` is a reference/package size, not part of the identity, not a price multiplier, and not a unit conversion (I-045). Availability is unit-aware (a `pcs` row is not availability for a `kg` request); when in-stock rows of one line disagree on price the line has **no** reference price (ambiguous) and is never priced by array order — at Purchase creation such a line is left unresolved (`AMBIGUOUS_PRICE`) rather than silently picking the first row.
- **I-042:** `PurchaseItem.price` and `CatalogOffer.price` are the price of one `unit`. A commercial line total is the derived product `quantity * price`. That total is not a stored field (`linePrice` does not exist). A missing `price` yields no derived total.
- **I-043:** Changing `quantity` does not reinterpret `price` as a line/position total. `(2 kg, 15)` and `(4 kg, 15)` have the same unit price; only the derived total changes. A quantity change on an Offer is a new Offer (I-044), not a silent reread of `price`.
- **I-044:** Each Offer item stores the price basis `(productId, quantity, unit, price)`. Changing any of those facts requires a new Offer. Acceptance does not mutate the previous Offer (I-006 / I-008).
- **I-045:** Catalog `quantity` is a Stage-1 reference/package size of that row. It is not CatalogLine identity, not a price multiplier, and not a conversion. `unit = "package"` is a commercial unit like `kg`. Same identity + different prices is `AMBIGUOUS_PRICE`. Requested `PurchaseItem.quantity` is not copied from catalog `quantity`. A ListItem without quantity is `MISSING_QUANTITY`, not a silent `1`. This does **not** decide future volume-pricing / package-contents policy (**SPEC OQ-002 OPEN**).
- **I-046:** Acceptance is a commercial fact: every Offer item must have a finite `price ≥ 0`. A standing proposal may omit `price`; `acceptOffer` refuses it before recording Acceptance. `unitLineTotal` is a diagnostic IEEE-754 product — it multiplies only when I-030 quantity bounds and this price bound hold. It is not a money type and not a hidden command validator. Quantity `> 0` is I-030, not a TZ-006 rule. `lineTotalAbsence` distinguishes missing price from invalid quantity/price without treating `null` as a commercial status.
- **I-047:** Package contents / size in another unit is not a stored Catalog, Offer, or PurchaseItem fact. External `1 package = 5 kg` is experimenter knowledge. Catalog `quantity` is not that fact (I-045). The current identity `(sellerId, productId, unit)` cannot represent distinct package bases. This is a Stage-1 limitation, not a decision that contents must not exist later (**SPEC OQ-002A OPEN**).
- **I-048:** A concrete volume-priced deal is an Offer `(quantity, unit, price)`. `5 kg @ 15` and `20 kg @ 12` are two Offers. A standing quantity-range price schedule is not an Offer and is not introduced. Equal derived totals are not Offer identity. This does not close whether a future schedule concept is needed (**SPEC OQ-002B** Stage-1 + remaining OPEN).
