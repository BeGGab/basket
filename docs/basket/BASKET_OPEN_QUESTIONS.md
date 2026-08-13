# GreenMarket — Basket Open Questions

**Status:** Experimental Baseline v0.1

These are hypotheses to resolve through experiments, not implementation requirements.

## Resolution

- **OQ-001:** Which policies are sufficient: PRIMARY_ONLY, FIRST_AVAILABLE, ASK_BUYER?
- **OQ-002:** Should alternative selection consider price?
- **OQ-003:** If yes, should referencePrice participate?
- **OQ-004:** Does each alternative need its own expected price/range?
- **OQ-005:** Is ANY_ACCEPTABLE required?
- **OQ-006:** RESOLVED (BS-019). Resolution is catalog-global and happens *before* seller partitioning. One ListItem → one productId for the Purchase; sellers are not given private alternatives.

## Offers

- **OQ-007:** RESOLVED (I-011 / I-027 / BS-021 / BS-024). `activeOfferId` is a required projection pointer, maintained by `proposeOffer`. `lastOffer()` is a convenience scan of history, not a substitute for the field.
- **OQ-008:** RESOLVED (BS-017 / I-027). No. After a newer Offer exists, the older Offer cannot be accepted. Only `activeOfferId` is acceptable; history stays append-only.
- **OQ-009:** OPEN. Split from already-decided pieces:
  - Offer **validity** (`isOfferValid` / `validUntil`) — defined.
  - **Acceptance** of an expired Offer — forbidden (I-028).
  - `activeOfferId` as a required pointer — closed (OQ-007).
  - Still open: pointer/status when an **already agreed** Offer later expires and no replacement Offer is proposed (keep pointer? clear it? which status?). The mock’s `STABLE → WAITING_BUYER` on clock advance is experimental observation, not a closed answer.
- **OQ-010:** Is a separate negotiation TTL necessary?

## Silence

- **OQ-011:** Are lastSellerActivity and waitingSince sufficient?
- **OQ-012:** Is SELLER_UNRESPONSIVE a real domain state or only a derived UI signal?

## Substitution

- **OQ-013:** Does accepted substitution update the projection directly or produce a new Offer first?
- **OQ-014:** Can buyer initiate a Substitution?

## Stock and fulfillment

- **OQ-015:** At what point does limited stock become a commercial conflict: Offer, Acceptance, STABLE or fulfillment?
- **OQ-016:** Does the future domain need Allocation?
- **OQ-017:** Does the future domain need Reservation?

## Purchase state

- **OQ-018:** What is the minimum Purchase-level status set?
- **OQ-019:** Is PARTIALLY_STABLE needed or derivable?
- **OQ-020:** Is READY meaningful before downstream execution exists?

## History

- **OQ-021:** Are Offer + Acceptance sufficient for audit history?
- **OQ-022:** Does any scenario require another historical fact entity?

## Future boundary

- **OQ-023:** What event starts Payment?
- **OQ-024:** Can each SellerPurchase independently start Reservation/Delivery?
- **OQ-025:** When does an Order become necessary?

## Model discipline

- **OQ-026:** Does any scenario force a new entity?
- **OQ-027:** Does any entity become overloaded?
- **OQ-028:** Does any implementation require duplicated state? SellerPurchase no longer has a parallel `rejected` flag; `status === "REJECTED"` is the sole lifecycle signal.
