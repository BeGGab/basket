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
- **OQ-009:** CLOSED (SPEC v0.3 §38 / I-037 / I-038 / BS-031 / BS-032). An already-agreed Offer that later expires keeps `agreedOfferId` and `activeOfferId`, remains the price baseline, and does not exit STABLE. `validUntil` still forbids accept/counter of that standing proposal (I-028 / I-035). Canonical statement: **SPEC OQ-004 CLOSED**.
- **OQ-010:** Is a separate negotiation TTL necessary? OPEN. Canonical statement: **SPEC OQ-005**.

## Silence

- **OQ-011:** CLOSED for Stage-1 silence semantics (SPEC v0.3 §39 / I-039 / BS-029 / BS-030 / BS-035). `waitingSince` + `lastSellerActivity` + clock suffice for the current experiment. Silence is the absence of a command, not an entity and not REJECT/CANCEL/EXPIRED. Not a proof for all future waiting policies.
- **OQ-012:** CLOSED for passage of time (SPEC v0.3 §40 / I-040 / I-041 / BS-035 / BS-036). `SELLER_UNRESPONSIVE` is not a domain state. `advance` is the domain time operation; emulator `tick()` is not. Time does not enter `EXPIRED`. Negotiation lifetime / timeout policy remains **OPEN — OQ-010 / SPEC OQ-005**.

## Substitution

- **OQ-013:** Does accepted substitution update the projection directly or produce a new Offer first?
- **OQ-014:** Can buyer initiate a Substitution?

## Stock and fulfillment

- **OQ-015:** At what point does limited stock become a commercial conflict: Offer, Acceptance, STABLE or fulfillment?
- **OQ-016:** Does the future domain need Allocation? OPEN. BS-011/BS-023 only confirm a detection-event log, not an allocation model. Canonical statement: **SPEC OQ-006**.
- **OQ-017:** Does the future domain need Reservation?
- **OQ-029:** Duplicate ListItems of the same `(productId, unit)` with different quantities (e.g. tomatoes 2 kg and 5 kg in one List). OPEN. Canonical statement: **SPEC OQ-003** in `docs/domain/GREENMARKET_DOMAIN_SPEC.md`. The experiment currently surfaces the second line as `DUPLICATE_LINE` rather than silently aggregating or dropping it.
- **OQ-030:** May catalog package/reference `quantity` change the unit price (volume pricing)? OPEN. Canonical statement: **SPEC OQ-002**. Stage 1 assumes it does not.

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
