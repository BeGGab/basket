# GreenMarket — Basket Experiment Results

**Status:** Evidence from TZ-BASKET-001…004 mock run  
**Experiment version:** v0.1  
**Model version:** v0.1.3 (expired accept forbidden; rejected flag removed; stronger BS-023/028)

## How to read results

- **Impl `PASS`** — the mock matches the current experimental expectation (code + invariants in force).
- **Domain `CONFIRMED`** — the scenario closes or supports a domain hypothesis.
- **Domain `OPEN`** — implementation is deterministic, but the business semantics are still an open question (see `openQuestion`).
- Do not treat Impl PASS as confirmation of an unresolved OQ.

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
| BS-011 | PASS | CONFIRMED | none | keep v0.1 |
| BS-012 | PASS | OPEN (OQ-009) | none | keep v0.1 |
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
| BS-023 | PASS | CONFIRMED | none | keep v0.1 |
| BS-024 | PASS | CONFIRMED | none | keep v0.1 |
| BS-025 | PASS | CONFIRMED | none | keep v0.1 |
| BS-026 | PASS | CONFIRMED | none | keep v0.1 |
| BS-027 | PASS | OPEN (OQ-001) | none | keep v0.1 |
| BS-028 | PASS | CONFIRMED | none | keep v0.1 |

## Scenario records

### BS-001 — Impl PASS / Domain CONFIRMED

- Expected: List survives; two independent Purchases
- Actual: list-1 → purchase-3, purchase-5
- Invariant: I-001 I-002
- Hypothesis: CONFIRMED
- Open question: none
- Model violation: none
- New concept: none
- Workaround: none
- Decision: keep v0.1

### BS-002 — Impl PASS / Domain CONFIRMED

- Expected: One Purchase, three SellerPurchases
- Actual: 3 SP
- Invariant: I-004
- Hypothesis: CONFIRMED
- Open question: none
- Model violation: none
- New concept: none
- Workaround: none
- Decision: keep v0.1

### BS-003 — Impl PASS / Domain CONFIRMED

- Expected: A STABLE, B NEGOTIATING, C REJECTED independently
- Actual: MIXED
- Invariant: I-005 I-020
- Hypothesis: CONFIRMED
- Open question: none
- Model violation: none
- New concept: none
- Workaround: none
- Decision: keep v0.1

### BS-004 — Impl PASS / Domain CONFIRMED

- Expected: Unlimited bidirectional Offer history
- Actual: 16 offers
- Invariant: I-006 I-007
- Hypothesis: CONFIRMED
- Open question: none
- Model violation: none
- New concept: none
- Workaround: none
- Decision: keep v0.1

### BS-005 — Impl PASS / Domain CONFIRMED

- Expected: Each price is a new immutable Offer; earlier Offer items stay frozen
- Actual: offer-5/offer-6/offer-7
- Invariant: I-006
- Hypothesis: CONFIRMED
- Open question: none
- Model violation: none
- New concept: none
- Workaround: none
- Decision: keep v0.1

### BS-006 — Impl PASS / Domain CONFIRMED

- Expected: SYSTEM TIME_DISCOUNT 15→12 MAD
- Actual: SYSTEM TIME_DISCOUNT 12
- Invariant: I-006
- Hypothesis: CONFIRMED
- Open question: none
- Model violation: none
- New concept: none
- Workaround: none
- Decision: keep v0.1

### BS-007 — Impl PASS / Domain CONFIRMED

- Expected: Buyer accepts reduced 6 kg
- Actual: agreed qty 6 STABLE
- Invariant: I-017
- Hypothesis: CONFIRMED
- Open question: none
- Model violation: none
- New concept: none
- Workaround: none
- Decision: keep v0.1

### BS-008 — Impl PASS / Domain CONFIRMED

- Expected: Composition A+B+C → A+C → A+C+D as new Offers
- Actual: 3 immutable offers
- Invariant: I-007
- Hypothesis: CONFIRMED
- Open question: none
- Model violation: none
- New concept: none
- Workaround: none
- Decision: keep v0.1

### BS-009 — Impl PASS / Domain CONFIRMED

- Expected: Primary unavailable → authorized alternative
- Actual: ALTERNATIVE white_bread
- Invariant: I-014 I-015
- Hypothesis: CONFIRMED
- Open question: none
- Model violation: none
- New concept: none
- Workaround: none
- Decision: keep v0.1

### BS-010 — Impl PASS / Domain OPEN (OQ-002)

- Expected: Expensive alternative still selected; no hidden price threshold
- Actual: white_bread price=999 vs referencePrice=10
- Invariant: I-014
- Hypothesis: OPEN
- Open question: OQ-002
- Model violation: none
- New concept: none
- Workaround: none
- Decision: keep v0.1

### BS-011 — Impl PASS / Domain CONFIRMED

- Expected: True race stock=6 A→4 B→3: first conflict at second Offer creation; no allocation
- Actual: first=OFFER_CREATION combined=7 vs stock=6
- Invariant: I-025
- Hypothesis: CONFIRMED
- Open question: none
- Model violation: none
- New concept: none
- Workaround: none
- Decision: keep v0.1

### BS-012 — Impl PASS / Domain OPEN (OQ-009)

- Expected: Expired Offer cannot be accepted; after later expiry of an agreed Offer, SP is not auto-EXPIRED
- Actual: no-accept-expired; later status=WAITING_BUYER
- Invariant: I-026 I-028
- Hypothesis: OPEN
- Open question: OQ-009
- Model violation: none
- New concept: none
- Workaround: none
- Decision: keep v0.1

### BS-013 — Impl PASS / Domain OPEN (OQ-012)

- Expected: Silence recorded as waitingSince, not new FSM state
- Actual: WAITING_SELLER waitingSince=2026-01-01T00:00:00.000Z
- Invariant: I-026
- Hypothesis: OPEN
- Open question: OQ-012
- Model violation: none
- New concept: none
- Workaround: none
- Decision: keep v0.1

### BS-014 — Impl PASS / Domain CONFIRMED

- Expected: agreed 20 / actual 5 keeps STABLE; fulfillment is mock
- Actual: STABLE + mockFulfill 5
- Invariant: I-018 I-019 I-024
- Hypothesis: CONFIRMED
- Open question: none
- Model violation: none
- New concept: none
- Workaround: none
- Decision: keep v0.1

### BS-015 — Impl PASS / Domain CONFIRMED

- Expected: Same List → Purchase #101 and #102
- Actual: purchase-3 purchase-5
- Invariant: I-002
- Hypothesis: CONFIRMED
- Open question: none
- Model violation: none
- New concept: none
- Workaround: none
- Decision: keep v0.1

### BS-016 — Impl PASS / Domain CONFIRMED

- Expected: AGREED #18 15 MAD + CURRENT #19 12 MAD + PENDING Tomato A→B
- Actual: agreed=offer-5 current=offer-7 pending=1
- Invariant: I-022 I-023
- Hypothesis: CONFIRMED
- Open question: none
- Model violation: none
- New concept: none
- Workaround: none
- Decision: keep v0.1

### BS-017 — Impl PASS / Domain CONFIRMED

- Expected: Older Offer cannot be accepted once a newer Offer is active; history stays immutable
- Actual: rejected offer-5; agreed=offer-6
- Invariant: I-007 I-011 I-027
- Hypothesis: CONFIRMED
- Open question: none
- Model violation: none
- New concept: none
- Workaround: none
- Decision: close OQ-008: only active Offer is acceptable

### BS-018 — Impl PASS / Domain CONFIRMED

- Expected: Baguette outside alternatives → Substitution PROPOSED
- Actual: PROPOSED baguette
- Invariant: I-012
- Hypothesis: CONFIRMED
- Open question: none
- Model violation: none
- New concept: none
- Workaround: none
- Decision: keep v0.1

### BS-019 — Impl PASS / Domain CONFIRMED

- Expected: Resolution is catalog-global and precedes partitioning; not per-seller product choice
- Actual: A=black_bread B=black_bread kind=PRIMARY
- Invariant: I-015
- Hypothesis: CONFIRMED
- Open question: none
- Model violation: none
- New concept: none
- Workaround: none
- Decision: close OQ-006: Resolution before seller partitioning

### BS-020 — Impl PASS / Domain CONFIRMED

- Expected: Independent seller offers do not overwrite
- Actual: 15 vs 99
- Invariant: I-005
- Hypothesis: CONFIRMED
- Open question: none
- Model violation: none
- New concept: none
- Workaround: none
- Decision: keep v0.1

### BS-021 — Impl PASS / Domain OPEN (OQ-009)

- Expected: activeOfferId points at currently applicable Offer
- Actual: offer-5 expired; active=offer-6
- Invariant: I-011
- Hypothesis: OPEN
- Open question: OQ-009
- Model violation: none
- New concept: none
- Workaround: none
- Decision: keep v0.1

### BS-022 — Impl PASS / Domain OPEN (OQ-011)

- Expected: Expired offer + silence is waiting facts, not auto EXPIRED state
- Actual: WAITING_SELLER offerValid=false
- Invariant: I-026
- Hypothesis: OPEN
- Open question: OQ-011
- Model violation: none
- New concept: none
- Workaround: none
- Decision: keep v0.1

### BS-023 — Impl PASS / Domain CONFIRMED

- Expected: stock=6 A=4 B=3 combined=7 at OFFER_CREATION; both STABLE; no Allocation
- Actual: STABLE+STABLE first=OFFER_CREATION stock=6 combined=7 detections=5
- Invariant: I-025
- Hypothesis: CONFIRMED
- Open question: none
- Model violation: none
- New concept: none
- Workaround: none
- Decision: keep v0.1

### BS-024 — Impl PASS / Domain CONFIRMED

- Expected: agreed=#18 active=#19
- Actual: agreed=offer-5 active=offer-7
- Invariant: I-010 I-011
- Hypothesis: CONFIRMED
- Open question: none
- Model violation: none
- New concept: none
- Workaround: none
- Decision: keep v0.1

### BS-025 — Impl PASS / Domain CONFIRMED

- Expected: Accepted substitution and later Offer are separate facts
- Actual: sub ACCEPTED + new Offer
- Invariant: I-013 I-022
- Hypothesis: CONFIRMED
- Open question: none
- Model violation: none
- New concept: none
- Workaround: none
- Decision: keep v0.1

### BS-026 — Impl PASS / Domain CONFIRMED

- Expected: Silence while offer valid ≠ expiration
- Actual: WAITING_SELLER
- Invariant: I-026
- Hypothesis: CONFIRMED
- Open question: none
- Model violation: none
- New concept: none
- Workaround: none
- Decision: keep v0.1

### BS-027 — Impl PASS / Domain OPEN (OQ-001)

- Expected: FIRST_AVAILABLE picks expensive alt; ASK_BUYER does not auto-pick
- Actual: FIRST=ALTERNATIVE ASK_BUYER decision=true
- Invariant: I-014
- Hypothesis: OPEN
- Open question: OQ-001
- Model violation: none
- New concept: none
- Workaround: none
- Decision: keep v0.1

### BS-028 — Impl PASS / Domain CONFIRMED

- Expected: PartialAvailabilitySeller offers 5 kg of requested 20; agreed and active are 5 kg STABLE
- Actual: activeQty=5 agreedQty=5 STABLE
- Invariant: I-017
- Hypothesis: CONFIRMED
- Open question: none
- Model violation: none
- New concept: none
- Workaround: none
- Decision: keep v0.1

## Final decision

```text
Model version: v0.1.3
Status: experiment implemented; production architecture not started

Changes in this PR (already implemented and tested):
- I-027: acceptOffer rejects non-active Offers
- I-028: acceptOffer rejects expired Offers
- OQ-007 closed: activeOfferId is a required projection pointer
- OQ-006 / OQ-008 closed
- PartialAvailabilitySeller offers min(requested, stock)
- Stock race records combined claims (stock=6, A→4, B→3) at OFFER_CREATION
- removed duplicate SellerPurchase.rejected; REJECTED is FSM status only

Still open after this experiment (future domain work, not blockers for TZ-001…004):
- OQ-001, OQ-002 — resolution / price policy
- OQ-009 — pointer/status when an *already agreed* Offer later expires without a replacement
- OQ-011, OQ-012 — silence / waiting facts

No new domain concepts required. Existing model required several invariant/behavior corrections.
Recommended next step: none in TZ-BASKET-001…004; remaining OQs are separate
```
