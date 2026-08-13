# GreenMarket — Basket Experiment Results

**Status:** Evidence from TZ-BASKET-001 mock run  
**Experiment version:** v0.1  
**Model version:** v0.1.1 (OQ-006 / OQ-008 closed)

## Purpose

Record evidence from the mock domain and seller emulator.

## Scenario results

| Scenario | Result | Model issue | Decision |
|---|---|---|---|
| BS-001 | PASS | none | keep v0.1 |
| BS-002 | PASS | none | keep v0.1 |
| BS-003 | PASS | none | keep v0.1 |
| BS-004 | PASS | none | keep v0.1 |
| BS-005 | PASS | none | keep v0.1 |
| BS-006 | PASS | none | keep v0.1 |
| BS-007 | PASS | none | keep v0.1 |
| BS-008 | PASS | none | keep v0.1 |
| BS-009 | PASS | none | keep v0.1 |
| BS-010 | PASS | none | keep v0.1 |
| BS-011 | PASS | none | keep v0.1 |
| BS-012 | PASS | none | keep v0.1 |
| BS-013 | PASS | none | keep v0.1 |
| BS-014 | PASS | none | keep v0.1 |
| BS-015 | PASS | none | keep v0.1 |
| BS-016 | PASS | none | keep v0.1 |
| BS-017 | PASS | none | close OQ-008: only active Offer is acceptable |
| BS-018 | PASS | none | keep v0.1 |
| BS-019 | PASS | none | close OQ-006: Resolution before seller partitioning |
| BS-020 | PASS | none | keep v0.1 |
| BS-021 | PASS | none | keep v0.1 |
| BS-022 | PASS | none | keep v0.1 |
| BS-023 | PASS | none | keep v0.1 |
| BS-024 | PASS | none | keep v0.1 |
| BS-025 | PASS | none | keep v0.1 |
| BS-026 | PASS | none | keep v0.1 |
| BS-027 | PASS | none | keep v0.1 |
| BS-028 | PASS | none | keep v0.1 |

## Scenario records

### BS-001 — PASS

- Expected: List survives; two independent Purchases
- Actual: list-1 → purchase-3, purchase-5
- Invariant: I-001 I-002
- Model violation: none
- New concept: none
- Workaround: none
- Decision: keep v0.1

### BS-002 — PASS

- Expected: One Purchase, three SellerPurchases
- Actual: 3 SP
- Invariant: I-004
- Model violation: none
- New concept: none
- Workaround: none
- Decision: keep v0.1

### BS-003 — PASS

- Expected: A STABLE, B NEGOTIATING, C REJECTED independently
- Actual: MIXED
- Invariant: I-005 I-020
- Model violation: none
- New concept: none
- Workaround: none
- Decision: keep v0.1

### BS-004 — PASS

- Expected: Unlimited bidirectional Offer history
- Actual: 16 offers
- Invariant: I-006 I-007
- Model violation: none
- New concept: none
- Workaround: none
- Decision: keep v0.1

### BS-005 — PASS

- Expected: Each price is a new immutable Offer
- Actual: offer-5/offer-6/offer-7
- Invariant: I-006
- Model violation: none
- New concept: none
- Workaround: none
- Decision: keep v0.1

### BS-006 — PASS

- Expected: SYSTEM TIME_DISCOUNT 15→12 MAD
- Actual: SYSTEM TIME_DISCOUNT 12
- Invariant: I-006
- Model violation: none
- New concept: none
- Workaround: none
- Decision: keep v0.1

### BS-007 — PASS

- Expected: Buyer accepts reduced 6 kg
- Actual: agreed qty 6 STABLE
- Invariant: I-017
- Model violation: none
- New concept: none
- Workaround: none
- Decision: keep v0.1

### BS-008 — PASS

- Expected: Composition A+B+C → A+C → A+C+D as new Offers
- Actual: 3 immutable offers
- Invariant: I-007
- Model violation: none
- New concept: none
- Workaround: none
- Decision: keep v0.1

### BS-009 — PASS

- Expected: Primary unavailable → authorized alternative
- Actual: ALTERNATIVE white_bread
- Invariant: I-014 I-015
- Model violation: none
- New concept: none
- Workaround: none
- Decision: keep v0.1

### BS-010 — PASS

- Expected: Expensive alternative still selected; no hidden price threshold
- Actual: white_bread price=999 vs referencePrice=10
- Invariant: I-014; OQ-002 OPEN
- Model violation: none
- New concept: none
- Workaround: none
- Decision: keep v0.1

### BS-011 — PASS

- Expected: Conflict observed at Offer creation; no allocation
- Actual: conflicts=2 detectedAt=OFFER_CREATION
- Invariant: I-025
- Model violation: none
- New concept: none
- Workaround: none
- Decision: keep v0.1

### BS-012 — PASS

- Expected: Offer expires; SellerPurchase remains (not auto-EXPIRED)
- Actual: WAITING_BUYER
- Invariant: I-011 I-026
- Model violation: none
- New concept: none
- Workaround: none
- Decision: keep v0.1

### BS-013 — PASS

- Expected: Silence recorded as waitingSince, not new FSM state
- Actual: WAITING_SELLER waitingSince=2026-01-01T00:00:00.000Z
- Invariant: I-026 OQ-012
- Model violation: none
- New concept: none
- Workaround: none
- Decision: keep v0.1

### BS-014 — PASS

- Expected: agreed 20 / actual 5 keeps STABLE; fulfillment is mock
- Actual: STABLE + mockFulfill 5
- Invariant: I-018 I-019 I-024
- Model violation: none
- New concept: none
- Workaround: none
- Decision: keep v0.1

### BS-015 — PASS

- Expected: Same List → Purchase #101 and #102
- Actual: purchase-3 purchase-5
- Invariant: I-002
- Model violation: none
- New concept: none
- Workaround: none
- Decision: keep v0.1

### BS-016 — PASS

- Expected: AGREED #18 15 MAD + CURRENT #19 12 MAD + PENDING Tomato A→B
- Actual: agreed=offer-5 current=offer-7 pending=1
- Invariant: I-022 I-023
- Model violation: none
- New concept: none
- Workaround: none
- Decision: keep v0.1

### BS-017 — PASS

- Expected: Older Offer cannot be accepted once a newer Offer is active; history stays immutable
- Actual: rejected offer-5; agreed=offer-6
- Invariant: I-007 I-011 I-027
- Model violation: none
- New concept: none
- Workaround: none
- Decision: close OQ-008: only active Offer is acceptable

### BS-018 — PASS

- Expected: Baguette outside alternatives → Substitution PROPOSED
- Actual: PROPOSED baguette
- Invariant: I-012
- Model violation: none
- New concept: none
- Workaround: none
- Decision: keep v0.1

### BS-019 — PASS

- Expected: Resolution is catalog-global and precedes partitioning; not per-seller product choice
- Actual: A=black_bread B=black_bread kind=PRIMARY
- Invariant: I-015
- Model violation: none
- New concept: none
- Workaround: none
- Decision: close OQ-006: Resolution before seller partitioning

### BS-020 — PASS

- Expected: Independent seller offers do not overwrite
- Actual: 15 vs 99
- Invariant: I-005
- Model violation: none
- New concept: none
- Workaround: none
- Decision: keep v0.1

### BS-021 — PASS

- Expected: activeOfferId points at currently applicable Offer
- Actual: offer-5 expired; active=offer-6
- Invariant: I-011; OQ-009 OPEN
- Model violation: none
- New concept: none
- Workaround: none
- Decision: keep v0.1

### BS-022 — PASS

- Expected: Expired offer + silence is waiting facts, not auto EXPIRED state
- Actual: WAITING_SELLER offerValid=false
- Invariant: OQ-011 OPEN
- Model violation: none
- New concept: none
- Workaround: none
- Decision: keep v0.1

### BS-023 — PASS

- Expected: Both can STABLE; conflict recorded; no Reservation/Allocation
- Actual: both STABLE, conflicts=6
- Invariant: I-025
- Model violation: none
- New concept: none
- Workaround: none
- Decision: keep v0.1

### BS-024 — PASS

- Expected: agreed=#18 active=#19
- Actual: agreed=offer-5 active=offer-7
- Invariant: I-010 I-011
- Model violation: none
- New concept: none
- Workaround: none
- Decision: keep v0.1

### BS-025 — PASS

- Expected: Accepted substitution and later Offer are separate facts
- Actual: sub ACCEPTED + new Offer
- Invariant: I-013 I-022
- Model violation: none
- New concept: none
- Workaround: none
- Decision: keep v0.1

### BS-026 — PASS

- Expected: Silence while offer valid ≠ expiration
- Actual: WAITING_SELLER
- Invariant: I-026
- Model violation: none
- New concept: none
- Workaround: none
- Decision: keep v0.1

### BS-027 — PASS

- Expected: FIRST_AVAILABLE picks expensive alt; ASK_BUYER does not auto-pick
- Actual: FIRST=ALTERNATIVE ASK_BUYER decision=true
- Invariant: OQ-001 OPEN
- Model violation: none
- New concept: none
- Workaround: none
- Decision: keep v0.1

### BS-028 — PASS

- Expected: available=5 agreed=20 still STABLE
- Actual: STABLE
- Invariant: I-017 I-018
- Model violation: none
- New concept: none
- Workaround: none
- Decision: keep v0.1

## Final decision

```text
Model version: v0.1.1
Status: experiment implemented; production architecture not started
Open questions: OQ-002, OQ-009, OQ-011, OQ-012
Closed this run: OQ-006 (resolution before partition), OQ-008 (active Offer only)
Required model changes: acceptOffer rejects non-active Offers (I-027)
Recommended next step: none in the TZ-BASKET-001…004 ladder
```
