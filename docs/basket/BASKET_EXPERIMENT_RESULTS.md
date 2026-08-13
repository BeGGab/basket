# GreenMarket — Basket Experiment Results

**Status:** Evidence from TZ-BASKET-001…004 mock run  
**Experiment version:** v0.1  
**Model version:** v0.1.10 (substitution content + policy in basis; semantic rejectReason validation; full-field COUNTER guard; matrix verifies apply end state; OQ-009 assumption pinned)

## How to read results

- **Impl `PASS`** — the mock matches the current experimental expectation (code + invariants in force).
- **Domain `CONFIRMED`** — the scenario closes or supports a *specific tested invariant*, not an entire future subsystem (e.g. Allocation).
- **Domain `OPEN`** — implementation is deterministic, but the business semantics are still an open question (see `openQuestion`).
- Do not treat Impl PASS as confirmation of an unresolved OQ.
- Expected/Actual are serialized from the fact map `prove()` asserted on live world state. A scenario cannot record a hand-written result: `prove()` is the only evidence builder.
- All 28 scenarios are programmatically exercised; Domain OPEN rows are still run, not skipped.

## Purpose

Record evidence from the mock domain and seller emulator.

## Scenario results

| Scenario | Impl | Domain | Model issue | Decision |
|---|---|---|---|---|
| BS-001 | PASS | CONFIRMED | none | keep v0.1 |
| BS-002 | PASS | CONFIRMED | none | keep v0.1 |
| BS-003 | PASS | CONFIRMED | none | keep v0.1 |
| BS-004 | PASS | CONFIRMED | none | keep v0.1 |
| BS-005 | PASS | CONFIRMED | none | keep v0.1 |
| BS-006 | PASS | CONFIRMED | none | keep v0.1 |
| BS-007 | PASS | CONFIRMED | none | keep v0.1 |
| BS-008 | PASS | CONFIRMED | none | keep v0.1 |
| BS-009 | PASS | CONFIRMED | none | keep v0.1 |
| BS-010 | PASS | OPEN (OQ-002) | none | keep v0.1 |
| BS-011 | PASS | OPEN (OQ-016) | none | detection layer only; Allocation remains OQ-016 |
| BS-012 | PASS | OPEN (OQ-009) | none | domain does not auto-drop STABLE on agreed expiry (OQ-009 OPEN) |
| BS-013 | PASS | OPEN (OQ-012) | none | keep v0.1 |
| BS-014 | PASS | CONFIRMED | none | keep v0.1 |
| BS-015 | PASS | CONFIRMED | none | keep v0.1 |
| BS-016 | PASS | CONFIRMED | none | keep v0.1 |
| BS-017 | PASS | CONFIRMED | none | close OQ-008: only active Offer is acceptable |
| BS-018 | PASS | CONFIRMED | none | keep v0.1 |
| BS-019 | PASS | CONFIRMED | none | close OQ-006: Resolution before seller partitioning |
| BS-020 | PASS | CONFIRMED | none | keep v0.1 |
| BS-021 | PASS | OPEN (OQ-009) | none | keep v0.1 |
| BS-022 | PASS | OPEN (OQ-011) | none | keep v0.1 |
| BS-023 | PASS | OPEN (OQ-016) | none | detection-event log only; Allocation/Reservation remain OQ-016 |
| BS-024 | PASS | CONFIRMED | none | keep v0.1 |
| BS-025 | PASS | CONFIRMED | none | keep v0.1 |
| BS-026 | PASS | CONFIRMED | none | keep v0.1 |
| BS-027 | PASS | OPEN (OQ-001) | none | keep v0.1 |
| BS-028 | PASS | CONFIRMED | none | keep v0.1 |

## Scenario records

### BS-001 — Impl PASS / Domain CONFIRMED

- Expected: listItems=1; purchasesDiffer=true; purchaseListId=list-1
- Actual: listItems=1; purchasesDiffer=true; purchaseListId=list-1
- Invariant: I-001 I-002
- Hypothesis: CONFIRMED
- Open question: none
- Model violation: none
- New concept: none
- Workaround: none
- Decision: keep v0.1

### BS-002 — Impl PASS / Domain CONFIRMED

- Expected: sellerPurchases=3
- Actual: sellerPurchases=3
- Invariant: I-004
- Hypothesis: CONFIRMED
- Open question: none
- Model violation: none
- New concept: none
- Workaround: none
- Decision: keep v0.1

### BS-003 — Impl PASS / Domain CONFIRMED

- Expected: a=STABLE; b=WAITING_BUYER; c=REJECTED; purchase=MIXED
- Actual: a=STABLE; b=WAITING_BUYER; c=REJECTED; purchase=MIXED
- Invariant: I-005 I-020
- Hypothesis: CONFIRMED
- Open question: none
- Model violation: none
- New concept: none
- Workaround: none
- Decision: keep v0.1

### BS-004 — Impl PASS / Domain CONFIRMED

- Expected: sellerOffers=8; buyerOffers=8; everyOfferHasItems=true
- Actual: sellerOffers=8; buyerOffers=8; everyOfferHasItems=true
- Invariant: I-006 I-007
- Hypothesis: CONFIRMED
- Open question: none
- Model violation: none
- New concept: none
- Workaround: none
- Decision: keep v0.1

### BS-005 — Impl PASS / Domain CONFIRMED

- Expected: firstPrice=15; secondPrice=17; thirdPrice=15.5; idsDiffer=true; firstPriceAfterLaterOps=15; firstQtyAfterLaterOps=2; secondPriceAfterLaterOps=17; qtyAfterMutationAttempt=2
- Actual: firstPrice=15; secondPrice=17; thirdPrice=15.5; idsDiffer=true; firstPriceAfterLaterOps=15; firstQtyAfterLaterOps=2; secondPriceAfterLaterOps=17; qtyAfterMutationAttempt=2
- Invariant: I-006
- Hypothesis: CONFIRMED
- Open question: none
- Model violation: none
- New concept: none
- Workaround: none
- Decision: keep v0.1

### BS-006 — Impl PASS / Domain CONFIRMED

- Expected: actor=SYSTEM; reason=TIME_DISCOUNT; price=12
- Actual: actor=SYSTEM; reason=TIME_DISCOUNT; price=12
- Invariant: I-006
- Hypothesis: CONFIRMED
- Open question: none
- Model violation: none
- New concept: none
- Workaround: none
- Decision: keep v0.1

### BS-007 — Impl PASS / Domain CONFIRMED

- Expected: agreedQty=6; status=STABLE
- Actual: agreedQty=6; status=STABLE
- Invariant: I-017
- Hypothesis: CONFIRMED
- Open question: none
- Model violation: none
- New concept: none
- Workaround: none
- Decision: keep v0.1

### BS-008 — Impl PASS / Domain CONFIRMED

- Expected: offers=3; firstSize=3; secondSize=2; thirdSize=3
- Actual: offers=3; firstSize=3; secondSize=2; thirdSize=3
- Invariant: I-007
- Hypothesis: CONFIRMED
- Open question: none
- Model violation: none
- New concept: none
- Workaround: none
- Decision: keep v0.1

### BS-009 — Impl PASS / Domain CONFIRMED

- Expected: kind=ALTERNATIVE; productId=white_bread; priority=1
- Actual: kind=ALTERNATIVE; productId=white_bread; priority=1
- Invariant: I-014 I-015
- Hypothesis: CONFIRMED
- Open question: none
- Model violation: none
- New concept: none
- Workaround: none
- Decision: keep v0.1

### BS-010 — Impl PASS / Domain OPEN (OQ-002)

- Expected: productId=white_bread; kind=ALTERNATIVE; chosenPrice=999; referencePrice=10
- Actual: productId=white_bread; kind=ALTERNATIVE; chosenPrice=999; referencePrice=10
- Invariant: I-014
- Hypothesis: OPEN
- Open question: OQ-002
- Model violation: none
- New concept: none
- Workaround: none
- Decision: keep v0.1

### BS-011 — Impl PASS / Domain OPEN (OQ-016)

- Expected: detectedAt=OFFER_CREATION; combined=7; stock=6
- Actual: detectedAt=OFFER_CREATION; combined=7; stock=6
- Invariant: I-025
- Hypothesis: OPEN
- Open question: OQ-016
- Model violation: none
- New concept: none
- Workaround: none
- Decision: detection layer only; Allocation remains OQ-016

### BS-012 — Impl PASS / Domain OPEN (OQ-009)

- Expected: laterStatus=STABLE; laterOfferValid=false; agreedIsLive=true; counterOverExpiredRejected=true
- Actual: laterStatus=STABLE; laterOfferValid=false; agreedIsLive=true; counterOverExpiredRejected=true
- Invariant: I-026 I-028
- Hypothesis: OPEN
- Open question: OQ-009
- Model violation: none
- New concept: none
- Workaround: none
- Decision: domain does not auto-drop STABLE on agreed expiry (OQ-009 OPEN)

### BS-013 — Impl PASS / Domain OPEN (OQ-012)

- Expected: status=WAITING_SELLER; hasWaitingSince=true
- Actual: status=WAITING_SELLER; hasWaitingSince=true
- Invariant: I-026
- Hypothesis: OPEN
- Open question: OQ-012
- Model violation: none
- New concept: none
- Workaround: none
- Decision: keep v0.1

### BS-014 — Impl PASS / Domain CONFIRMED

- Expected: beforeFulfillment=STABLE; afterFulfillment=STABLE; agreedQty=20; actualQty=5
- Actual: beforeFulfillment=STABLE; afterFulfillment=STABLE; agreedQty=20; actualQty=5
- Invariant: I-018 I-019 I-024
- Hypothesis: CONFIRMED
- Open question: none
- Model violation: none
- New concept: none
- Workaround: none
- Decision: keep v0.1

### BS-015 — Impl PASS / Domain CONFIRMED

- Expected: listName=reuse; purchasesDiffer=true; sameList=true
- Actual: listName=reuse; purchasesDiffer=true; sameList=true
- Invariant: I-002
- Hypothesis: CONFIRMED
- Open question: none
- Model violation: none
- New concept: none
- Workaround: none
- Decision: keep v0.1

### BS-016 — Impl PASS / Domain CONFIRMED

- Expected: agreedOffer=offer-5; agreedPrice=15; currentOffer=offer-7; currentPrice=12; pending=1; historyPrice=15
- Actual: agreedOffer=offer-5; agreedPrice=15; currentOffer=offer-7; currentPrice=12; pending=1; historyPrice=15
- Invariant: I-022 I-023
- Hypothesis: CONFIRMED
- Open question: none
- Model violation: none
- New concept: none
- Workaround: none
- Decision: keep v0.1

### BS-017 — Impl PASS / Domain CONFIRMED

- Expected: activeAfterNewer=offer-6; olderRejected=true; agreedAfterAttempt=null; olderPrice=15; agreedFinal=offer-6; status=STABLE
- Actual: activeAfterNewer=offer-6; olderRejected=true; agreedAfterAttempt=null; olderPrice=15; agreedFinal=offer-6; status=STABLE
- Invariant: I-007 I-011 I-027
- Hypothesis: CONFIRMED
- Open question: none
- Model violation: none
- New concept: none
- Workaround: none
- Decision: close OQ-008: only active Offer is acceptable

### BS-018 — Impl PASS / Domain CONFIRMED

- Expected: replacement=baguette; status=PROPOSED; agreedOfferId=null
- Actual: replacement=baguette; status=PROPOSED; agreedOfferId=null
- Invariant: I-012
- Hypothesis: CONFIRMED
- Open question: none
- Model violation: none
- New concept: none
- Workaround: none
- Decision: keep v0.1

### BS-019 — Impl PASS / Domain CONFIRMED

- Expected: sellerA=none; sellerB=black_bread
- Actual: sellerA=none; sellerB=black_bread
- Invariant: I-015
- Hypothesis: CONFIRMED
- Open question: none
- Model violation: none
- New concept: none
- Workaround: none
- Decision: close OQ-006: Resolution before seller partitioning

### BS-020 — Impl PASS / Domain CONFIRMED

- Expected: aPrice=15; bPrice=99
- Actual: aPrice=15; bPrice=99
- Invariant: I-005
- Hypothesis: CONFIRMED
- Open question: none
- Model violation: none
- New concept: none
- Workaround: none
- Decision: keep v0.1

### BS-021 — Impl PASS / Domain OPEN (OQ-009)

- Expected: activeOfferId=offer-6; expiredStillValid=false; activeValid=true
- Actual: activeOfferId=offer-6; expiredStillValid=false; activeValid=true
- Invariant: I-011
- Hypothesis: OPEN
- Open question: OQ-009
- Model violation: none
- New concept: none
- Workaround: none
- Decision: keep v0.1

### BS-022 — Impl PASS / Domain OPEN (OQ-011)

- Expected: offerValid=false; status=WAITING_SELLER; hasWaitingSince=true
- Actual: offerValid=false; status=WAITING_SELLER; hasWaitingSince=true
- Invariant: I-026
- Hypothesis: OPEN
- Open question: OQ-011
- Model violation: none
- New concept: none
- Workaround: none
- Decision: keep v0.1

### BS-023 — Impl PASS / Domain OPEN (OQ-016)

- Expected: aStatus=STABLE; bStatus=STABLE; firstAt=OFFER_CREATION; stock=6; combined=7; activeClaimCombined=10; fulfillments=0
- Actual: aStatus=STABLE; bStatus=STABLE; firstAt=OFFER_CREATION; stock=6; combined=7; activeClaimCombined=10; fulfillments=0
- Invariant: I-025
- Hypothesis: OPEN
- Open question: OQ-016
- Model violation: none
- New concept: none
- Workaround: none
- Decision: detection-event log only; Allocation/Reservation remain OQ-016

### BS-024 — Impl PASS / Domain CONFIRMED

- Expected: agreedOfferId=offer-5; activeOfferId=offer-7
- Actual: agreedOfferId=offer-5; activeOfferId=offer-7
- Invariant: I-010 I-011
- Hypothesis: CONFIRMED
- Open question: none
- Model violation: none
- New concept: none
- Workaround: none
- Decision: keep v0.1

### BS-025 — Impl PASS / Domain CONFIRMED

- Expected: subStatus=ACCEPTED; offerAfterSubstitution=SUBSTITUTION; reversalRejected=true
- Actual: subStatus=ACCEPTED; offerAfterSubstitution=SUBSTITUTION; reversalRejected=true
- Invariant: I-013 I-022 I-032
- Hypothesis: CONFIRMED
- Open question: none
- Model violation: none
- New concept: none
- Workaround: none
- Decision: keep v0.1

### BS-026 — Impl PASS / Domain CONFIRMED

- Expected: offerValid=true; status=WAITING_SELLER
- Actual: offerValid=true; status=WAITING_SELLER
- Invariant: I-026
- Hypothesis: CONFIRMED
- Open question: none
- Model violation: none
- New concept: none
- Workaround: none
- Decision: keep v0.1

### BS-027 — Impl PASS / Domain OPEN (OQ-001)

- Expected: firstProductId=white_bread; firstKind=ALTERNATIVE; askRequiresBuyer=true
- Actual: firstProductId=white_bread; firstKind=ALTERNATIVE; askRequiresBuyer=true
- Invariant: I-014
- Hypothesis: OPEN
- Open question: OQ-001
- Model violation: none
- New concept: none
- Workaround: none
- Decision: keep v0.1

### BS-028 — Impl PASS / Domain CONFIRMED

- Expected: activeQty=5; agreedQty=5; status=STABLE; afterStockDropQty=2; originalOfferUnchanged=5
- Actual: activeQty=5; agreedQty=5; status=STABLE; afterStockDropQty=2; originalOfferUnchanged=5
- Invariant: I-017
- Hypothesis: CONFIRMED
- Open question: none
- Model violation: none
- New concept: none
- Workaround: none
- Decision: keep v0.1

## Final decision

```text
Model version: v0.1.10
Status: experiment implemented; production architecture not started

Scope of this evidence: every CONFIRMED below confirms a SPECIFIC experimental behavior
under the mock clock, mock catalog and example policies — NOT the basket model as a whole.
The model as a whole cannot be declared confirmed while expiration/silence/stock-allocation
questions (OQ-009, OQ-011, OQ-012, OQ-016) remain open.

Changes in this PR (already implemented and tested):
- I-033: BasketWorld hands out frozen projections; state changes only via domain commands
- I-030: List and catalog inputs validated like Offer items (finite, > 0 / ≥ 0)
- I-032: Substitution lifecycle PROPOSED → ACCEPTED|REJECTED is one-way
- I-034: setCatalog stores a defensive copy; stock changes go through setStock
- I-031: (sellerId, productId) unique inside a SellerPurchase
- I-019: mockFulfill checks delivered quantity and honours partialFulfillmentAllowed
- Advice is a discriminated union naming its exact target (offerId / substitutionId / counterOfferId + items)
- AdviceBasis is time-aware (active Offer validity) and covers Offer content + catalog rows of the negotiated products (canonical JSON)
- WAIT and REJECT both carry machine-readable reasons
- COUNTER is admissible only against the still-valid countered Offer and may change prices, not lines
- every Offer named by an Advice must belong to the target SellerPurchase (checked at the assistant boundary, and inside basis fingerprints)
- catalog reference / baseline is a lookup, not a price policy: ambiguous rows (same line, different prices) yield NO reference instead of the cheapest one
- REJECT is generated by the assistants themselves via policy thresholds (rejectOverReference / rejectBelowCatalog), not only crafted by hand
- the positive substitution-vs-offer choice is a policy parameter (substitutionPreference), both branches tested
- AdviceBasis fingerprints pending substitutions with CONTENT (not only IDs) and records the effective policy as an audit fact
- rejectReason is validated semantically at apply: a REJECT may not claim a ground (substitution, unavailability, priced offer) that does not exist
- the COUNTER guard compares every item field except price, so future PurchaseItem fields are protected automatically
- OQ-009 assumption pinned by test: an expired agreed Offer still provides the price baseline; validUntil gates the ACTIVE Offer only
- combination matrix test: multi-item x missing catalog x substitution x expired x offer author x advisor — kind invariants, determinism, and the SEMANTIC end state after apply for every combination
- ACCEPT_SUBSTITUTION requires the accepting actor to be the counterparty of proposedBy
- I-035: countering an expired Offer is forbidden in the domain (symmetric with I-028)
- Buyer/Seller assistants evaluate EVERY Offer item; baselines and catalog references are per (product, unit, quantity) line
- Policies are injected parameters, not fixed behavior
- Seller emulators only rewrite their own proposals, never a buyer Offer
- I-027: acceptOffer rejects non-active Offers
- I-028: acceptOffer rejects expired Offers
- OQ-007 closed: activeOfferId is a required projection pointer
- OQ-006 / OQ-008 closed
- PartialAvailabilitySeller offers min(requested, stock)
- Stock race records combined claims (stock=6, A→4, B→3) at OFFER_CREATION
- stock claim = valid active Offer quantity; REJECTED/CANCELLED/expired excluded
- I-029: only the counterparty may accept an Offer
- Offer items: quantity > 0, finite price/qty; applyAdvice requires matching snapshot basis
- TZ-001…004 ship as four dependent PRs (domain → assistants → runtime → /sim), each with its own runner
- removed duplicate SellerPurchase.rejected; REJECTED is FSM status only

Still open after this experiment (future domain work, not blockers for TZ-001…004):
- OQ-001, OQ-002 — resolution / price policy
- OQ-009 — pointer/status when an *already agreed* Offer later expires without a replacement
- OQ-011, OQ-012 — silence / waiting facts

Known dependency: the assistant layer uses Offer validity (isOfferValid) in its decisions and
in AdviceBasis, while OQ-009 (agreed-Offer expiration) is still open. Assistant semantics for
that case is therefore an ASSUMPTION and must be revisited when OQ-009 is resolved.

No new domain concepts required. Existing model required several invariant/behavior corrections.
IMPORTANT: the model is NOT final. Implementation PASS here does not close the open OQs above;
OQ-009/OQ-011/OQ-012 (agreed-Offer expiration, silence semantics) must be resolved before the
model is transferred to production architecture. The assistant layer is validated against ONE
deterministic example policy family: this PR proves the Advice/basis/apply contract is executable
and safe for THAT family — it does NOT prove the contract sufficient for arbitrary LLM/real
policies. 'Policy-agnostic' refers to the contract shape (injected parameters), not to evidence.
Recommended next step: resolve OQ-009/OQ-011/OQ-012 as a separate domain iteration
```
