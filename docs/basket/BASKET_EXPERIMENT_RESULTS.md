# GreenMarket — Basket Experiment Results

**Status:** Evidence from TZ-BASKET-001…005 mock run  
**Experiment version:** v0.1  
**Model version:** v0.1.15 / SPEC v0.4 (price is per unit; catalog quantity is Stage-1 reference size; package/volume business semantics remain OPEN)

## How to read results

- **Impl `PASS`** — the mock matches the current experimental expectation (code + invariants in force).
- **Domain `CONFIRMED`** — the scenario closes or supports a *specific tested invariant*, not an entire future subsystem (e.g. Allocation).
- **Domain `OPEN`** — the run is deterministic, but the *business* question stays open. PACKAGE-002/003 and ALT-PRICE-002 are in this bucket: they prove a Stage-1 limitation, not a policy.
- Do not treat Impl PASS as confirmation of an unresolved OQ.
- Expected/Actual are serialized from the fact map `prove()` asserted on live world state. A scenario cannot record a hand-written result: `prove()` is the only evidence builder.
- All 55 scenarios are programmatically exercised; Domain OPEN rows are still run, not skipped. Evidence strength is not uniform: OPEN rows must not be read as CONFIRMED.

## Purpose

Record evidence from the mock domain and seller emulator.

## Scenario results

| Scenario | Impl | Domain | Model issue | Decision |
|---|---|---|---|---|
| ALT-PACK-001 | PASS | CONFIRMED | none | projection exposes list 2 kg vs alt catalog pack 5 kg; no silent pack rewrite and no policy |
| ALT-PRICE-001 | PASS | CONFIRMED | none | BasketWorld lifecycle: primary 15 and alt 24 are both visible; PRIMARY_ONLY does not switch |
| ALT-PRICE-002 | PASS | OPEN (SPEC-OQ-008) | none | FIRST_AVAILABLE ≠ hypothetical cheapest across catalog order; BEST_PRICE policy remains OPEN |
| ALT-STABILITY-001 | PASS | CONFIRMED | none | snapshot alternatives stay bound to the List + offer history when current items change |
| ALT-UNIT-001 | PASS | CONFIRMED | none | alternative priced in pcs is not converted into the list kg line |
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
| BS-012 | PASS | CONFIRMED | none | I-037/I-038: agreed expiry keeps STABLE and pointers |
| BS-013 | PASS | CONFIRMED | none | I-039/I-041: silence + time do not invent EXPIRED |
| BS-014 | PASS | CONFIRMED | none | keep v0.1 |
| BS-015 | PASS | CONFIRMED | none | keep v0.1 |
| BS-016 | PASS | CONFIRMED | none | keep v0.1 |
| BS-017 | PASS | CONFIRMED | none | close OQ-008: only active Offer is acceptable |
| BS-018 | PASS | CONFIRMED | none | keep v0.1 |
| BS-019 | PASS | CONFIRMED | none | close OQ-006: Resolution before seller partitioning |
| BS-020 | PASS | CONFIRMED | none | keep v0.1 |
| BS-021 | PASS | CONFIRMED | none | I-011: new Offer becomes active; expired Offer stays historical |
| BS-022 | PASS | CONFIRMED | none | I-039: silence after expiration is not a command — status stays WAITING_BUYER |
| BS-023 | PASS | OPEN (OQ-016) | none | detection-event log only; Allocation/Reservation remain OQ-016 |
| BS-024 | PASS | CONFIRMED | none | keep v0.1 |
| BS-025 | PASS | CONFIRMED | none | keep v0.1 |
| BS-026 | PASS | CONFIRMED | none | I-039: silence while valid is not expiration and does not change status |
| BS-027 | PASS | OPEN (OQ-001) | none | keep v0.1 |
| BS-028 | PASS | CONFIRMED | none | keep v0.1 |
| BS-029 | PASS | CONFIRMED | none | silence while valid: status/pointers/waiting facts unchanged; waitMs derived from waitingSince + clock |
| BS-030 | PASS | CONFIRMED | none | silence until expiration is not implicit REJECT; validUntil is exclusive |
| BS-031 | PASS | CONFIRMED | none | accepted Offer expiry keeps STABLE; stockClaims drops A; B is the only claim; live control checkpoint records combined=7 |
| BS-032 | PASS | CONFIRMED | none | new Offer after agreed expiry becomes active; A stays agreed until B is accepted |
| BS-033 | PASS | CONFIRMED | none | expired Offer cannot be revived by ACCEPT |
| BS-034 | PASS | CONFIRMED | none | I-035: isCounterReason (BUYER_CHANGE / SELLER_COUNTEROFFER) cannot reply to an expired Offer; PRICE_CHANGE may replace it |
| BS-035 | PASS | CONFIRMED | none | silence must not create a fake FSM state or rewrite waiting facts; waitMs is derived from clock |
| BS-036 | PASS | CONFIRMED | none | determinism regression: same start + same commands → same snapshot; not a proof of all nondeterminism sources |
| PACKAGE-001 | PASS | CONFIRMED | none | package is representable as a unit |
| PACKAGE-002 | PASS | OPEN (SPEC-OQ-002) | none | Stage-1: different catalog qty + different unit price is AMBIGUOUS. Volume-pricing policy is not decided |
| PACKAGE-003 | PASS | OPEN (SPEC-OQ-002) | none | two catalog package sizes (5 and 20) at the same unit price collapse to one Offer 1@60; basis policy OPEN |
| PRICE-ABSENT-001 | PASS | CONFIRMED | none | priceless Offer has no derived total, cannot be accepted, and is not treated as a priced proposal |
| PRICE-CATALOG-QTY-001 | PASS | CONFIRMED | none | requested PurchaseItem.quantity is not catalog reference quantity |
| PRICE-LIST-QTY-ABSENT-001 | PASS | CONFIRMED | none | ListItem without quantity cannot become a PurchaseItem; MISSING_QUANTITY, not silent 1 |
| PRICE-OFFER-001 | PASS | CONFIRMED | none | price lives on the Offer item; ACCEPT does not mutate A; agreed stays A until B is accepted |
| PRICE-QTY-001 | PASS | CONFIRMED | none | quantity change is a new Offer; price stays per-unit and is not reread as a line total |
| PRICE-REGRESSION-001 | PASS | CONFIRMED | none | existing hike/discount paths treat 15 as MAD/kg, not as a 30 MAD line total |
| PRICE-SNAPSHOT-001 | PASS | CONFIRMED | none | canonical snapshot: agreed 15 / current 12 / alternative 24 — representation only |
| PRICE-TOTAL-001 | PASS | CONFIRMED | none | unitLineTotal yields null for qty 0/<0/NaN/Infinity and price <0/NaN/Infinity; 2×15=30 |
| PRICE-UNIT-001 | PASS | CONFIRMED | none | price is per kg; derived total is not a stored linePrice |
| PRICE-UNIT-002 | PASS | CONFIRMED | none | 2kg@15 vs 1kg@30 are different Offers; equal derived totals are arithmetic, not commercial equivalence |
| PRICE-ZERO-001 | PASS | CONFIRMED | none | price 0 is a real unit price; derived total 0 is not a missing price |

## Scenario records

### ALT-PACK-001 — Impl PASS / Domain CONFIRMED

- Expected: requestedQty=2; catalogQty=5; unitCompatible=true; referenceQtyMatches=false; catalogPrice=24
- Actual: requestedQty=2; catalogQty=5; unitCompatible=true; referenceQtyMatches=false; catalogPrice=24
- Invariant: I-023 I-045
- Hypothesis: CONFIRMED
- Open question: none
- Model violation: none
- New concept: none
- Workaround: none
- Decision: projection exposes list 2 kg vs alt catalog pack 5 kg; no silent pack rewrite and no policy

### ALT-PRICE-001 — Impl PASS / Domain CONFIRMED

- Expected: resolved=tomatoes; offerPrice=15; altProduct=tomato_b; altCatalogPrice=24; switchedToAlt=false
- Actual: resolved=tomatoes; offerPrice=15; altProduct=tomato_b; altCatalogPrice=24; switchedToAlt=false
- Invariant: I-014 I-042 I-023
- Hypothesis: CONFIRMED
- Open question: none
- Model violation: none
- New concept: none
- Workaround: none
- Decision: BasketWorld lifecycle: primary 15 and alt 24 are both visible; PRIMARY_ONLY does not switch

### ALT-PRICE-002 — Impl PASS / Domain OPEN (SPEC-OQ-008)

- Expected: firstIgnoresCatalogOrder=true; hypotheticalBest=tomato_b; firstPickedBest=false; worldResolved=tomatoes; altVisible=15
- Actual: firstIgnoresCatalogOrder=true; hypotheticalBest=tomato_b; firstPickedBest=false; worldResolved=tomatoes; altVisible=15
- Invariant: I-014 I-023
- Hypothesis: OPEN
- Open question: SPEC-OQ-008
- Model violation: none
- New concept: none
- Workaround: none
- Decision: FIRST_AVAILABLE ≠ hypothetical cheapest across catalog order; BEST_PRICE policy remains OPEN

### ALT-STABILITY-001 — Impl PASS / Domain CONFIRMED

- Expected: afterOffer=true; afterNewOffer=true; afterSub=true; afterReplacement=true
- Actual: afterOffer=true; afterNewOffer=true; afterSub=true; afterReplacement=true
- Invariant: I-023
- Hypothesis: CONFIRMED
- Open question: none
- Model violation: none
- New concept: none
- Workaround: none
- Decision: snapshot alternatives stay bound to the List + offer history when current items change

### ALT-UNIT-001 — Impl PASS / Domain CONFIRMED

- Expected: altProduct=tomato_b; requestedUnit=kg; catalogUnit=null; catalogPrice=null; unitCompatible=false; converted=false
- Actual: altProduct=tomato_b; requestedUnit=kg; catalogUnit=null; catalogPrice=null; unitCompatible=false; converted=false
- Invariant: I-036 I-045 I-023
- Hypothesis: CONFIRMED
- Open question: none
- Model violation: none
- New concept: none
- Workaround: none
- Decision: alternative priced in pcs is not converted into the list kg line

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

### BS-012 — Impl PASS / Domain CONFIRMED

- Expected: laterStatus=STABLE; laterOfferValid=false; agreedIsLive=true; counterOverExpiredRejected=true
- Actual: laterStatus=STABLE; laterOfferValid=false; agreedIsLive=true; counterOverExpiredRejected=true
- Invariant: I-026 I-028 I-037 I-038
- Hypothesis: CONFIRMED
- Open question: none
- Model violation: none
- New concept: none
- Workaround: none
- Decision: I-037/I-038: agreed expiry keeps STABLE and pointers

### BS-013 — Impl PASS / Domain CONFIRMED

- Expected: status=WAITING_SELLER; hasWaitingSince=true
- Actual: status=WAITING_SELLER; hasWaitingSince=true
- Invariant: I-026 I-039 I-041
- Hypothesis: CONFIRMED
- Open question: none
- Model violation: none
- New concept: none
- Workaround: none
- Decision: I-039/I-041: silence + time do not invent EXPIRED

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

### BS-021 — Impl PASS / Domain CONFIRMED

- Expected: activeOfferId=offer-6; expiredStillValid=false; activeValid=true
- Actual: activeOfferId=offer-6; expiredStillValid=false; activeValid=true
- Invariant: I-011
- Hypothesis: CONFIRMED
- Open question: none
- Model violation: none
- New concept: none
- Workaround: none
- Decision: I-011: new Offer becomes active; expired Offer stays historical

### BS-022 — Impl PASS / Domain CONFIRMED

- Expected: offerValid=false; status=WAITING_BUYER; hasWaitingSince=true; invented=false
- Actual: offerValid=false; status=WAITING_BUYER; hasWaitingSince=true; invented=false
- Invariant: I-026 I-039 I-040
- Hypothesis: CONFIRMED
- Open question: none
- Model violation: none
- New concept: none
- Workaround: none
- Decision: I-039: silence after expiration is not a command — status stays WAITING_BUYER

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

- Expected: offerValid=true; status=WAITING_BUYER
- Actual: offerValid=true; status=WAITING_BUYER
- Invariant: I-039 I-026 I-040
- Hypothesis: CONFIRMED
- Open question: none
- Model violation: none
- New concept: none
- Workaround: none
- Decision: I-039: silence while valid is not expiration and does not change status

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

### BS-029 — Impl PASS / Domain CONFIRMED

- Expected: status=WAITING_BUYER; active=offer-5; agreed=null; valid=true; sameActive=true; sameAgreed=true; sameOfferCount=true; sameAcceptanceCount=true; sameWaitingSince=true; sameLastSellerActivity=true; hasWaitingSince=true; hasLastSellerActivity=true; waitMs=1800000
- Actual: status=WAITING_BUYER; active=offer-5; agreed=null; valid=true; sameActive=true; sameAgreed=true; sameOfferCount=true; sameAcceptanceCount=true; sameWaitingSince=true; sameLastSellerActivity=true; hasWaitingSince=true; hasLastSellerActivity=true; waitMs=1800000
- Invariant: I-039
- Hypothesis: CONFIRMED
- Open question: none
- Model violation: none
- New concept: none
- Workaround: none
- Decision: silence while valid: status/pointers/waiting facts unchanged; waitMs derived from waitingSince + clock

### BS-030 — Impl PASS / Domain CONFIRMED

- Expected: status=WAITING_BUYER; active=offer-5; agreed=null; valid=false; rejected=false; expiredState=false; atExactValidUntil=true
- Actual: status=WAITING_BUYER; active=offer-5; agreed=null; valid=false; rejected=false; expiredState=false; atExactValidUntil=true
- Invariant: I-039 I-028 I-040
- Hypothesis: CONFIRMED
- Open question: none
- Model violation: none
- New concept: none
- Workaround: none
- Decision: silence until expiration is not implicit REJECT; validUntil is exclusive

### BS-031 — Impl PASS / Domain CONFIRMED

- Expected: status=STABLE; agreed=offer-5; active=offer-5; valid=false; expiredState=false; timeCreatesConflicts=false; counterBlocked=true; aClaimedWhileValid=4; aClaimedAfterExpire=0; bClaimedAfterPropose=3; aClaimedAfterB=0; expiredCheckpointConflicts=0; liveAStillClaimed=4; liveBClaimed=3; liveCheckpointConflicts=1; liveCombined=7
- Actual: status=STABLE; agreed=offer-5; active=offer-5; valid=false; expiredState=false; timeCreatesConflicts=false; counterBlocked=true; aClaimedWhileValid=4; aClaimedAfterExpire=0; bClaimedAfterPropose=3; aClaimedAfterB=0; expiredCheckpointConflicts=0; liveAStillClaimed=4; liveBClaimed=3; liveCheckpointConflicts=1; liveCombined=7
- Invariant: I-037 I-038 I-025 I-035 I-040
- Hypothesis: CONFIRMED
- Open question: none
- Model violation: none
- New concept: none
- Workaround: none
- Decision: accepted Offer expiry keeps STABLE; stockClaims drops A; B is the only claim; live control checkpoint records combined=7

### BS-032 — Impl PASS / Domain CONFIRMED

- Expected: agreedStaysA=true; activeIsB=true; waitingOnB=true; bAcceptable=true; agreedAfterB=offer-7; statusAfterB=STABLE; history=2
- Actual: agreedStaysA=true; activeIsB=true; waitingOnB=true; bAcceptable=true; agreedAfterB=offer-7; statusAfterB=STABLE; history=2
- Invariant: I-011 I-037
- Hypothesis: CONFIRMED
- Open question: none
- Model violation: none
- New concept: none
- Workaround: none
- Decision: new Offer after agreed expiry becomes active; A stays agreed until B is accepted

### BS-033 — Impl PASS / Domain CONFIRMED

- Expected: blocked=true; acceptances=0; agreed=null
- Actual: blocked=true; acceptances=0; agreed=null
- Invariant: I-028
- Hypothesis: CONFIRMED
- Open question: none
- Model violation: none
- New concept: none
- Workaround: none
- Decision: expired Offer cannot be revived by ACCEPT

### BS-034 — Impl PASS / Domain CONFIRMED

- Expected: buyerCounterBlocked=true; sellerCounterBlocked=true; bothAreCounters=true; replacementIsNotCounter=true; countersLeftNoOffer=true; replacementCreated=true
- Actual: buyerCounterBlocked=true; sellerCounterBlocked=true; bothAreCounters=true; replacementIsNotCounter=true; countersLeftNoOffer=true; replacementCreated=true
- Invariant: I-035
- Hypothesis: CONFIRMED
- Open question: none
- Model violation: none
- New concept: none
- Workaround: none
- Decision: I-035: isCounterReason (BUYER_CHANGE / SELLER_COUNTEROFFER) cannot reply to an expired Offer; PRICE_CHANGE may replace it

### BS-035 — Impl PASS / Domain CONFIRMED

- Expected: before=WAITING_BUYER; after=WAITING_BUYER; expiredState=false; invented=false; sameActive=true; sameAgreed=true; sameWaitingSince=true; sameLastSellerActivity=true; waitMs=86400000
- Actual: before=WAITING_BUYER; after=WAITING_BUYER; expiredState=false; invented=false; sameActive=true; sameAgreed=true; sameWaitingSince=true; sameLastSellerActivity=true; waitMs=86400000
- Invariant: I-039 I-041
- Hypothesis: CONFIRMED
- Open question: none
- Model violation: none
- New concept: none
- Workaround: none
- Decision: silence must not create a fake FSM state or rewrite waiting facts; waitMs is derived from clock

### BS-036 — Impl PASS / Domain CONFIRMED

- Expected: same=true
- Actual: same=true
- Invariant: I-040
- Hypothesis: CONFIRMED
- Open question: none
- Model violation: none
- New concept: none
- Workaround: none
- Decision: determinism regression: same start + same commands → same snapshot; not a proof of all nondeterminism sources

### PACKAGE-001 — Impl PASS / Domain CONFIRMED

- Expected: quantity=1; unit=package; price=60; derivedTotal=60; kgConversion=null; contentsInModel=false
- Actual: quantity=1; unit=package; price=60; derivedTotal=60; kgConversion=null; contentsInModel=false
- Invariant: I-045 I-042
- Hypothesis: CONFIRMED
- Open question: SPEC-OQ-002
- Model violation: none
- New concept: package contents / conversion (not introduced)
- Workaround: none
- Decision: package is representable as a unit

### PACKAGE-002 — Impl PASS / Domain OPEN (SPEC-OQ-002)

- Expected: samePriceRef=12; sameCreated=true; volumeRef=null; volumeUnresolved=true; unresolvedReason=AMBIGUOUS_PRICE
- Actual: samePriceRef=12; sameCreated=true; volumeRef=null; volumeUnresolved=true; unresolvedReason=AMBIGUOUS_PRICE
- Invariant: I-045 I-036
- Hypothesis: OPEN
- Open question: SPEC-OQ-002
- Model violation: none
- New concept: volume-price schedule (not introduced)
- Workaround: none
- Decision: Stage-1: different catalog qty + different unit price is AMBIGUOUS. Volume-pricing policy is not decided

### PACKAGE-003 — Impl PASS / Domain OPEN (SPEC-OQ-002)

- Expected: catalogRows=2; catalogQtys=5,20; unitPrice=60; offerQty=1; offerUnit=package; offerPrice=60; identityCollapsesBasis=true
- Actual: catalogRows=2; catalogQtys=5,20; unitPrice=60; offerQty=1; offerUnit=package; offerPrice=60; identityCollapsesBasis=true
- Invariant: I-045
- Hypothesis: OPEN
- Open question: SPEC-OQ-002
- Model violation: none
- New concept: package basis / contents (not introduced)
- Workaround: none
- Decision: two catalog package sizes (5 and 20) at the same unit price collapse to one Offer 1@60; basis policy OPEN

### PRICE-ABSENT-001 — Impl PASS / Domain CONFIRMED

- Expected: hasPrice=false; derivedTotal=null; storedLinePrice=false; acceptBlocked=true; stable=false; adviceKind=WAIT; adviceReason=MISSING_ITEM_PRICE; catalogRefUnchanged=15
- Actual: hasPrice=false; derivedTotal=null; storedLinePrice=false; acceptBlocked=true; stable=false; adviceKind=WAIT; adviceReason=MISSING_ITEM_PRICE; catalogRefUnchanged=15
- Invariant: I-042 I-046
- Hypothesis: CONFIRMED
- Open question: none
- Model violation: none
- New concept: none
- Workaround: none
- Decision: priceless Offer has no derived total, cannot be accepted, and is not treated as a priced proposal

### PRICE-CATALOG-QTY-001 — Impl PASS / Domain CONFIRMED

- Expected: requested=2; catalogQty=20; itemQty=2; copiedFromCatalog=false
- Actual: requested=2; catalogQty=20; itemQty=2; copiedFromCatalog=false
- Invariant: I-045 I-043
- Hypothesis: CONFIRMED
- Open question: none
- Model violation: none
- New concept: none
- Workaround: none
- Decision: requested PurchaseItem.quantity is not catalog reference quantity

### PRICE-LIST-QTY-ABSENT-001 — Impl PASS / Domain CONFIRMED

- Expected: sellerPurchases=0; reason=MISSING_QUANTITY; inventedOne=false; copiedFromCatalog=false
- Actual: sellerPurchases=0; reason=MISSING_QUANTITY; inventedOne=false; copiedFromCatalog=false
- Invariant: I-045 I-030
- Hypothesis: CONFIRMED
- Open question: none
- Model violation: none
- New concept: none
- Workaround: none
- Decision: ListItem without quantity cannot become a PurchaseItem; MISSING_QUANTITY, not silent 1

### PRICE-OFFER-001 — Impl PASS / Domain CONFIRMED

- Expected: sameProduct=true; sameQuantity=true; sameUnit=true; differentPrice=true; aUnchanged=15; offersDistinct=true; agreed=offer-5; active=offer-7
- Actual: sameProduct=true; sameQuantity=true; sameUnit=true; differentPrice=true; aUnchanged=15; offersDistinct=true; agreed=offer-5; active=offer-7
- Invariant: I-006 I-008 I-044
- Hypothesis: CONFIRMED
- Open question: none
- Model violation: none
- New concept: none
- Workaround: none
- Decision: price lives on the Offer item; ACCEPT does not mutate A; agreed stays A until B is accepted

### PRICE-QTY-001 — Impl PASS / Domain CONFIRMED

- Expected: newOffer=true; priceStill=15; qtyA=2; qtyB=4; derivedA=30; derivedB=60; aUnchangedQty=2
- Actual: newOffer=true; priceStill=15; qtyA=2; qtyB=4; derivedA=30; derivedB=60; aUnchangedQty=2
- Invariant: I-043 I-044
- Hypothesis: CONFIRMED
- Open question: none
- Model violation: none
- New concept: none
- Workaround: none
- Decision: quantity change is a new Offer; price stays per-unit and is not reread as a line total

### PRICE-REGRESSION-001 — Impl PASS / Domain CONFIRMED

- Expected: hikeKind=COUNTER; hikeAt=15; hikeNotLineTotal=true; discountKind=ACCEPT_ACTIVE; catalogRef=15; agreedDerived=30
- Actual: hikeKind=COUNTER; hikeAt=15; hikeNotLineTotal=true; discountKind=ACCEPT_ACTIVE; catalogRef=15; agreedDerived=30
- Invariant: I-042 I-043
- Hypothesis: CONFIRMED
- Open question: none
- Model violation: none
- New concept: none
- Workaround: none
- Decision: existing hike/discount paths treat 15 as MAD/kg, not as a 30 MAD line total

### PRICE-SNAPSHOT-001 — Impl PASS / Domain CONFIRMED

- Expected: agreedProduct=tomatoes; agreedQty=2; agreedUnit=kg; agreedPrice=15; currentProduct=tomatoes; currentQty=2; currentUnit=kg; currentPrice=12; altProduct=tomato_b; requestedQty=2; requestedUnit=kg; catalogPrice=24; storedLinePrice=false
- Actual: agreedProduct=tomatoes; agreedQty=2; agreedUnit=kg; agreedPrice=15; currentProduct=tomatoes; currentQty=2; currentUnit=kg; currentPrice=12; altProduct=tomato_b; requestedQty=2; requestedUnit=kg; catalogPrice=24; storedLinePrice=false
- Invariant: I-023 I-042 I-044
- Hypothesis: CONFIRMED
- Open question: none
- Model violation: none
- New concept: none
- Workaround: none
- Decision: canonical snapshot: agreed 15 / current 12 / alternative 24 — representation only

### PRICE-TOTAL-001 — Impl PASS / Domain CONFIRMED

- Expected: qtyZero=null; qtyNeg=null; qtyNan=null; qtyInf=null; priceNeg=null; priceNan=null; priceInf=null; ok=30
- Actual: qtyZero=null; qtyNeg=null; qtyNan=null; qtyInf=null; priceNeg=null; priceNan=null; priceInf=null; ok=30
- Invariant: I-042 I-046 I-030
- Hypothesis: CONFIRMED
- Open question: none
- Model violation: none
- New concept: none
- Workaround: none
- Decision: unitLineTotal yields null for qty 0/<0/NaN/Infinity and price <0/NaN/Infinity; 2×15=30

### PRICE-UNIT-001 — Impl PASS / Domain CONFIRMED

- Expected: quantity=2; unit=kg; price=15; storedLinePrice=false; derivedTotal=30; snapshotLinePrice=false
- Actual: quantity=2; unit=kg; price=15; storedLinePrice=false; derivedTotal=30; snapshotLinePrice=false
- Invariant: I-042
- Hypothesis: CONFIRMED
- Open question: none
- Model violation: none
- New concept: none
- Workaround: none
- Decision: price is per kg; derived total is not a stored linePrice

### PRICE-UNIT-002 — Impl PASS / Domain CONFIRMED

- Expected: sameProduct=true; sameUnit=true; sameQuantity=false; samePrice=false; distinguishable=true; derivedA=30; derivedB=30; sameDerived=true; aUnchanged=15
- Actual: sameProduct=true; sameUnit=true; sameQuantity=false; samePrice=false; distinguishable=true; derivedA=30; derivedB=30; sameDerived=true; aUnchanged=15
- Invariant: I-042 I-043 I-044
- Hypothesis: CONFIRMED
- Open question: none
- Model violation: none
- New concept: none
- Workaround: none
- Decision: 2kg@15 vs 1kg@30 are different Offers; equal derived totals are arithmetic, not commercial equivalence

### PRICE-ZERO-001 — Impl PASS / Domain CONFIRMED

- Expected: price=0; derivedTotal=0; missing=false
- Actual: price=0; derivedTotal=0; missing=false
- Invariant: I-042 I-030
- Hypothesis: CONFIRMED
- Open question: none
- Model violation: none
- New concept: none
- Workaround: none
- Decision: price 0 is a real unit price; derived total 0 is not a missing price

## Final decision

```text
Model version: v0.1.15 / SPEC v0.4
Status: experiment implemented; production architecture not started

Scope of this evidence: every CONFIRMED below confirms a SPECIFIC experimental behavior
under the mock clock, mock catalog and example policies — NOT the basket model as a whole.
The model as a whole cannot be declared confirmed while package/volume business semantics,
duplicate-line, negotiation-TTL and allocation questions (SPEC OQ-002/003; experiment OQ-010; OQ-016) remain open.

Changes in this PR (already implemented and tested):
- I-033: BasketWorld hands out frozen projections; state changes only via domain commands
- I-030: List and catalog inputs validated like Offer items (finite, > 0 / ≥ 0)
- I-032: Substitution lifecycle PROPOSED → ACCEPTED|REJECTED is one-way
- I-034: setCatalog stores a defensive copy; stock changes go through setStock
- I-031: SellerPurchase line unique per (sellerId, productId, unit) — tomatoes/kg and tomatoes/pcs are independent; a second ListItem of the same line is DUPLICATE_LINE (SPEC OQ-003), never silently dropped
- I-019: mockFulfill checks delivered quantity and honours partialFulfillmentAllowed
- Advice is a discriminated union naming its exact target (offerId / substitutionId / counterOfferId + items)
- AdviceBasis is time-aware (active Offer validity) and covers Offer content + catalog rows of the negotiated products (canonical JSON)
- WAIT and REJECT both carry machine-readable reasons
- COUNTER is admissible only against the still-valid countered Offer and may change prices, not lines
- every Offer named by an Advice must belong to the target SellerPurchase (checked at the assistant boundary, and inside basis fingerprints)
- I-036: ONE catalog-line identity (sellerId, productId, unit) lives in domain/catalog and is shared by resolve, createPurchaseFromList, setStock, stock-conflict detection AND the assistants — the domain is no longer laxer than the assistant layer
- price is the UNIT price (per one unit); the catalog quantity is a reference/package size, not part of the line identity and not a price multiplier — the earlier 'whole-line price' wording is corrected
- resolve() is unit-aware: a kg ListItem is not satisfied by a pcs-only catalog (fixed at the List -> Resolution boundary, before seller partitioning)
- createPurchaseFromList() prices lines through the shared matcher: a seller whose rows disagree on price/unit is reported AMBIGUOUS_PRICE and gets NO SellerPurchase — the array order is never a hidden price policy
- setStock(sellerId, productId, unit, stock) keys on the commercial line and requires a unique row, throwing on ambiguity instead of editing the first match
- stock-conflict claims compete only within (productId, unit) — a pcs claim is not a kg stock pool
- catalog reference / baseline is a lookup, not a price policy: ambiguous rows (same line, different prices) yield NO reference instead of the cheapest one
- REJECT is not a free enum: each reason must NAME and PROVE its ground at apply (PRICE_UNACCEPTABLE/POLICY_DECLINED name the declined active counterparty Offer; SUBSTITUTION_IMPOSSIBLE names a pending substitution; PRODUCT_UNAVAILABLE needs a line unbuyable under the SAME (seller, product, unit, stock) matcher as the reference price), one negative test per reason
- catalog availability and reference price are thin adapters over the domain matcher (catalogLineAvailable / catalogReferencePrice -> isCatalogLineAvailable / catalogUnitPrice); a row in another unit is not availability
- agreed baseline reuses the agreed price only for the identical (product, unit, quantity) line; a changed quantity defers to the catalog unit reference (both are per-unit prices of the same unit)
- basis stores the FULL immutable Offer metadata (actor/reason/createdAt/validUntil + items) under activeOfferFingerprint/agreedOfferFingerprint, not just the commercial items
- decision tests (world -> expected Advice) are separated from execution tests (Advice -> domain change); the policy's choice of kind/reason is pinned by its own table
- runtime determinism test: re-running each demo scenario from a fresh runtime reproduces the event stream AND a canonical snapshot of the WHOLE observable world (offers, acceptances, substitutions, catalog, stock conflicts, fulfillments, SellerPurchases, purchases)
- the scenario engine deeply checks a multi-line COUNTER (every item price by (productId, unit, quantity)), so a wrong price on a non-first line cannot pass as long as kind stays COUNTER
- model tech debt recorded: two identical PurchaseItem lines differing only in price are multiset-equal (no lineId) — acceptable now, would need an explicit lineId if such lines ever diverge commercially
- REJECT is generated by the assistants themselves via policy thresholds (rejectOverReference / rejectBelowCatalog), not only crafted by hand
- the positive substitution-vs-offer choice is a policy parameter (substitutionPreference), both branches tested
- AdviceBasis fingerprints pending substitutions with CONTENT (not only IDs) and records the effective policy as an audit fact
- rejectReason is validated semantically at apply: a REJECT may not claim a ground (substitution, unavailability, priced offer) that does not exist
- the COUNTER guard compares every item field except price, so future PurchaseItem fields are protected automatically
- expired agreed Offer still provides the price baseline (I-037, CONFIRMED — no longer an OQ-009 assumption)
- combination matrix test: multi-item x missing catalog x substitution x expired x offer author x advisor — kind invariants, determinism, and the SEMANTIC end state after apply for every combination
- ACCEPT_SUBSTITUTION requires the accepting actor to be the counterparty of proposedBy
- I-035: countering an expired Offer is forbidden in the domain (symmetric with I-028)
- Buyer/Seller assistants evaluate EVERY Offer item; catalog references are per (seller, product, unit) unit price and agreed baselines per exact (product, unit, quantity) line
- Policies are injected parameters, not fixed behavior
- Seller emulators only rewrite their own proposals, never a buyer Offer
- I-027: acceptOffer rejects non-active Offers
- I-028: acceptOffer rejects expired Offers
- OQ-007 closed: activeOfferId is a required projection pointer
- OQ-006 / OQ-008 closed
- PartialAvailabilitySeller offers min(requested, stock) of the SAME CatalogLine (sellerId, productId, unit) — a pcs pool is not kg stock
- cheapestAvailable() removed from domain catalog semantics (ambiguous ≠ cheapest); catalogUnitPrice returns null on disagreement
- GREENMARKET_DOMAIN_SPEC v0.4 is the canonical domain contract; TZ-BASKET-006 closed SPEC OQ-001/OQ-002
- I-042: price is the price of one unit; derived total = quantity * price; no stored linePrice
- I-043: changing quantity does not reread price as a line total
- I-044: Offer stores (product, quantity, unit, price); a change is a new Offer
- I-045: catalog quantity is Stage-1 reference size — not identity, multiplier, or conversion; SPEC OQ-002 business semantics remain OPEN
- I-046: acceptOffer requires a finite price on every item; unitLineTotal is IEEE-754 under I-030 bounds
- snapshot.alternatives is AlternativeProjection (requested vs catalog qty/unit/price), not a commercial entity
- createPurchaseFromList surfaces MISSING_QUANTITY instead of inventing quantity 1
- I-037: validUntil constrains accept/counter of the ACTIVE standing proposal only; it does not revoke Acceptance or agreed baseline
- I-038: STABLE is agreed==active and no pending substitutions — Offer validity is not a STABLE exit
- I-039: silence is the absence of a command; it does not REJECT/CANCEL/EXPIRED or move pointers
- I-040: DeterministicClock + advance() move only the clock; time creates no facts; validUntil is exclusive
- I-041: time/silence do not enter EXPIRED
- BS-029…036: silence-while-valid, silence-until-expiry, agreed expiry, new Offer after expiry, no revive, no counter, no fake FSM state, time determinism
- I-025 claims are the stockClaims() projection (same predicate as detection); stockConflicts is a detection-event log, not a claims registry
- BS-031: after A expires, stockClaims drops A and keeps B; the live control checkpoint records combined=7
- I-029: only the counterparty may accept an Offer
- Offer items: quantity > 0, finite price/qty; applyAdvice requires matching snapshot basis
- TZ-001…004 ship as four dependent PRs (domain → assistants → runtime → /sim), each with its own runner
- removed duplicate SellerPurchase.rejected; REJECTED is FSM status only

Closed in SPEC v0.3 / TZ-BASKET-005:
- OQ-009 CLOSED — agreed Offer expiry keeps pointers and STABLE; validity still forbids accept/counter
- OQ-011 CLOSED for Stage-1 silence — no command ⇒ no lifecycle change; waiting facts are observation, not a sufficiency proof
- OQ-012 CLOSED for passage of time — no SELLER_UNRESPONSIVE / auto-EXPIRED; negotiation TTL remains OQ-005

TZ-BASKET-006
Status: PASS for Stage-1 representation / OQ-001
OQ-001: CLOSED — price = price of one unit
Stage-1 representation: catalog quantity is not a multiplier/conversion (I-045)
OQ-002: OPEN — package/volume business semantics (PACKAGE-002/003 are limitation evidence)
Model change required: YES (projections, I-046, MISSING_QUANTITY)
New concept required: YES if/when OQ-002 is closed — NOT introduced
Production architecture changed: NO

Still open:
- SPEC OQ-002 — package/volume business semantics
- SPEC OQ-003 — duplicate ListItems
- SPEC OQ-005 / experiment OQ-010 — negotiation TTL
- SPEC OQ-008 / experiment OQ-002 — alternative price *policy*
- experiment OQ-016 — allocation

Assistant compatibility: isOfferValid still means standing-proposal validity. STABLE is
checked first (WAIT TERMINAL_STATUS). An expired agreed Offer remains the price baseline
when a later live active Offer is evaluated (I-037). Assistants WAIT on MISSING_ITEM_PRICE.
Assistant unit-price comparisons are consistent with I-042; they are not the source of I-042.

The model is still experimental. PASS does not close remaining OPEN questions.
Recommended next step: SPEC OQ-003 (duplicate ListItems), then OQ-005/TTL, then allocation
```
