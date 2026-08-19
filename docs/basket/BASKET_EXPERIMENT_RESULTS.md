# GreenMarket — Basket Experiment Results

**Status:** Evidence from TZ-BASKET-001…011 mock run  
**Experiment version:** v0.1  
**Model version:** v0.1.17 / SPEC v0.6 (TZ-011 Stage-1 buyer/seller flow observation is INCONCLUSIVE for OQ-002A/B; SPEC unchanged)

## How to read results

- **Impl `PASS`** — the mock matches the current experimental expectation (code + invariants in force).
- **Domain `CONFIRMED`** — the scenario closes or supports a *specific tested invariant*, not an entire future subsystem (e.g. Allocation).
- **Domain `OPEN`** — the run is deterministic, but the *business* question stays open. PACKAGE-002/003/004, PACKAGE-SEM-002/004/005/006, PACKAGE-008-003/004/005/006, PACKAGE-BIZ-009-001/002, SOURCE-010-CATALOG-KG/HONEY/TOKENS/BASKET/TREE, VOLUME-PRICE-005B, VOLUME-008-001, VOLUME-BIZ-009-001, SOURCE-010-EMULATOR/TZ025, SNAPSHOT-VOL-001, ALT-PRICE-002, and FLOW-011-* are in this bucket. FLOW-011 rows are Stage-1 buyer/seller flow observations whose OQ status is INCONCLUSIVE — not CONFIRMED commerce, not SOURCE search, and not a policy.
- Do not treat Impl PASS as confirmation of an unresolved OQ.
- Expected/Actual are serialized from the fact map `prove()` asserted on live world state. A scenario cannot record a hand-written result: `prove()` is the only evidence builder.
- All 105 scenarios are programmatically exercised; Domain OPEN rows are still run, not skipped. Evidence strength is not uniform: OPEN rows must not be read as CONFIRMED.

## Purpose

Record evidence from the mock domain and seller emulator.

## Scenario results

| Scenario | Impl | Domain | Model issue | Decision |
|---|---|---|---|---|
| ALT-PACK-001 | PASS | CONFIRMED | none | projection exposes list 2 kg vs alt catalog pack 5 kg; no silent pack rewrite and no policy |
| ALT-PRICE-001 | PASS | CONFIRMED | none | BasketWorld lifecycle: primary 15 and alt 24 are both visible; PRIMARY_ONLY does not switch |
| ALT-PRICE-002 | PASS | OPEN (SPEC-OQ-008) | none | FIRST_AVAILABLE and PRIMARY_ONLY are not BEST_PRICE in this run; this does not prove price never affects resolution. SPEC OQ-008 remains OPEN |
| ALT-STABILITY-001 | PASS | CONFIRMED | none | alternatives are a List projection: they remain after the current commercial item is replaced |
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
| FLOW-011-A-CONFIG | PASS | OPEN (SPEC-OQ-002A) | none | Stage-1 deal reached STABLE. Catalog came from test setCatalog, not a seller product-config command. CooperativeSeller only accepted the buyer Offer. Seller min/max/tier configuration was not executed. Not SOURCE search and not a claim that sellers cannot define constraints in an unobserved flow |
| FLOW-011-A-STOCK | PASS | OPEN (SPEC-OQ-002A) | none | PartialAvailabilitySeller capped 10 kg to catalog stock 5 with AVAILABILITY_CHANGE. That is stock, not a seller-defined product maxQuantity. Do not read this row as OQ-002A NOT SUPPORTED |
| FLOW-011-A-ZERO | PASS | OPEN (SPEC-OQ-002A) | none | quantity 0 is rejected by I-030 at addItem. That is a domain bound on every quantity, not a seller-configured minimum of N. Not OQ-002A min-quantity evidence |
| FLOW-011-A1 | PASS | OPEN (SPEC-OQ-002A) | none | Buyer requested 1 kg; programmed CooperativeSeller accepted 1 kg at listed unit price. No minimum-quantity rule was applied in this flow. Seller never set a min. Not proof that a seller cannot define min in an unobserved flow |
| FLOW-011-A2 | PASS | OPEN (SPEC-OQ-002A) | none | Buyer requested 100 kg against stock 1000; programmed CooperativeSeller accepted 100 kg. No product maximum-quantity rule was applied. This is not PartialAvailabilitySeller stock capping. Seller never set a max |
| FLOW-011-A3 | PASS | OPEN (SPEC-OQ-002A) | none | Buyer 2 / 5 / 12 kg all reached STABLE at the same listed unit price. A seller-defined min/max range was not set and was not applied. A3 as 'seller set min=N and max=M' is not executable in this engine |
| FLOW-011-A4 | PASS | OPEN (SPEC-OQ-002A) | none | Ordinary unconstrained listing: stored catalog row and PurchaseItem have no minQuantity/maxQuantity fields. This is observed product state in this run, not a source-file token scan and not proof sellers lack such rules elsewhere |
| FLOW-011-B-COUNTER | PASS | OPEN (SPEC-OQ-002B) | none | NegotiatingSeller added +1 unit price for both 1 kg and 10 kg. Same offset, not a quantity-tier table. Programmed profile, not a seller-defined schedule |
| FLOW-011-B-LEVELS | PASS | OPEN (SPEC-OQ-002B) | none | Buyer 1 / 5 / 10 kg: listed unit price stayed 15; totals 15 / 75 / 150. Programmed CooperativeSeller accepted each. This flow applied linear unit price. Seller never defined a quantity-dependent price. Not VOLUME-BIZ-009 reconstruction labeled as seller pricing |
| FLOW-011-B-TIME | PASS | OPEN (SPEC-OQ-002B) | none | TimeDiscountSeller lowered unit price 15→12 for both 2 kg and 10 kg. Same unit-price drop regardless of quantity. This is a time profile, not a quantity-dependent price rule. Not OQ-002B CONFIRMED or NOT SUPPORTED |
| PACKAGE-001 | PASS | CONFIRMED | none | package is representable as a unit |
| PACKAGE-002 | PASS | OPEN (SPEC-OQ-002) | none | Stage-1: different catalog qty + different unit price is AMBIGUOUS. Volume-pricing policy is not decided |
| PACKAGE-003 | PASS | OPEN (SPEC-OQ-002) | none | MODEL GAP: current identity cannot represent distinct package bases |
| PACKAGE-004 | PASS | OPEN (SPEC-OQ-002) | none | MODEL GAP: package contents / conversion are not in the model; business semantics remain OPEN |
| PACKAGE-008-001 | PASS | CONFIRMED | none | regression: 1 package @ 60 is a complete Offer triple with no extra package fields |
| PACKAGE-008-002 | PASS | CONFIRMED | none | external 5 kg is not an Offer term: package-unit deal completes without stored contents |
| PACKAGE-008-003 | PASS | OPEN (SPEC-OQ-002A) | none | 2 kg vs 5 kg package is unresolved; no 0.4 package and no 24 MAD conversion |
| PACKAGE-008-004 | PASS | OPEN (SPEC-OQ-002A) | none | MODEL GAP: 2 kg < 5 kg package has no partial/whole/split/oversupply policy |
| PACKAGE-008-005 | PASS | OPEN (SPEC-OQ-002A) | none | MODEL GAP: 6 kg > 5 kg package does not choose 1 pack, 2 packs, split, or exact 6 kg |
| PACKAGE-008-006 | PASS | OPEN (SPEC-OQ-002A) | none | MODEL GAP: distinct package bases are a catalog-identity limitation; no evidence yet justifies a Package entity |
| PACKAGE-BIZ-009-001 | PASS | OPEN (SPEC-OQ-002A) | none | catalog/spec reconstruction: listed unit 250 g is representable without a contents field; this does not prove pack contents are not a business fact |
| PACKAGE-BIZ-009-002 | PASS | OPEN (SPEC-OQ-002A) | none | catalog/spec reconstruction: two pre-split productIds yield two identity keys; this does not prove pack sizes must be Products and is not OQ-002A evidence |
| PACKAGE-SEM-001 | PASS | CONFIRMED | none | package is representable as a unit through Offer, Acceptance, and snapshot; contents are not claimed |
| PACKAGE-SEM-002 | PASS | OPEN (SPEC-OQ-002A) | none | MODEL GAP: current identity cannot represent distinct package bases |
| PACKAGE-SEM-003 | PASS | CONFIRMED | none | catalog package size is not requested quantity and is not converted into kg |
| PACKAGE-SEM-004 | PASS | OPEN (SPEC-OQ-002A) | none | 2 kg vs package catalog is unresolved; no auto-conversion and no conversion policy decided |
| PACKAGE-SEM-005 | PASS | OPEN (SPEC-OQ-002A) | none | MODEL GAP: requested 2 kg vs external 5 kg package has no partial-package concept |
| PACKAGE-SEM-006 | PASS | OPEN (SPEC-OQ-002A) | none | MODEL GAP: requested 6 kg vs external 5 kg package has no whole-package-only or split concept |
| PRICE-ABSENT-001 | PASS | CONFIRMED | none | priceless Offer has no derived total; a second priceless Offer is not a bypass to agreed/STABLE |
| PRICE-CATALOG-QTY-001 | PASS | CONFIRMED | none | requested PurchaseItem.quantity is not catalog reference quantity |
| PRICE-LIST-QTY-ABSENT-001 | PASS | CONFIRMED | none | ListItem without quantity cannot become a PurchaseItem; MISSING_QUANTITY, not silent 1 |
| PRICE-OFFER-001 | PASS | CONFIRMED | none | price lives on the Offer item; ACCEPT does not mutate A; agreed stays A until B is accepted |
| PRICE-QTY-001 | PASS | CONFIRMED | none | quantity change is a new Offer; price stays per-unit and is not reread as a line total |
| PRICE-REGRESSION-001 | PASS | CONFIRMED | none | existing hike/discount paths treat 15 as MAD/kg, not as a 30 MAD line total |
| PRICE-SNAPSHOT-001 | PASS | CONFIRMED | none | canonical snapshot: agreed 15 / current 12 / alternative 24 — representation only |
| PRICE-TOTAL-001 | PASS | CONFIRMED | none | unitLineTotal only multiplies; quantity > 0 is I-030, price bounds are I-046; null is no derived total, not a new TZ-006 rule |
| PRICE-UNIT-001 | PASS | CONFIRMED | none | price is per kg; derived total is not a stored linePrice |
| PRICE-UNIT-002 | PASS | CONFIRMED | none | 2kg@15 vs 1kg@30 are different Offers; equal derived totals are arithmetic, not commercial equivalence |
| PRICE-ZERO-001 | PASS | CONFIRMED | none | price 0 is a real unit price; derived total 0 is not a missing price |
| SNAPSHOT-VOL-001 | PASS | OPEN (SPEC-OQ-002A) | none | canonical snapshot distinguishes requested/agreed/current/alt/derived; package contents remain absent |
| SOURCE-010-BASKET | PASS | OPEN (SPEC-OQ-002A) | none | No conversion/tier lookup found in ADD_TO_BASKET itself. The function copies payload.unit and payload.price. Conversion or pricing could occur before this call; this row does not claim the whole basket path |
| SOURCE-010-CATALOG-HONEY | PASS | OPEN (SPEC-OQ-002A) | none | honey category block found with at least one array-element seed; no ListedSeed.unit 1 кг in that block (nested metadata, even with name/price/unit, does not count). Not A3 seller classification and not a business-flow observation |
| SOURCE-010-CATALOG-KG | PASS | OPEN (SPEC-OQ-002A) | none | PRODUCT_SEEDS category-array listings include at least one unit 1 кг. Nested metadata and assignment example objects are not listings. Not a business-flow observation |
| SOURCE-010-CATALOG-TOKENS | PASS | OPEN (SPEC-OQ-002A) | none | whole identifier мешок, pack-contents 1 мешок/package = 5 kg, and range tokens minQuantity/maxQuantity/tierPrice/PriceSchedule/VolumePrice / 1-4 / 5-9 / 10+ are SOURCE ABSENT in mockSellerCatalog.ts lexical code. Substrings, regex interiors, and 1 package = 5 apples do not count. Token miss is not a market finding |
| SOURCE-010-EMULATOR | PASS | OPEN (SPEC-OQ-002B) | none | Stage-1 source search of sellers.ts: the identifier tokens minQuantity/maxQuantity/tierPrice/PriceSchedule/VolumePrice are SOURCE ABSENT in this file. This does not claim sellers.ts has no quantity-range mechanism under another name (quantityPrices, getPrice, ranges, ...). Not a CooperativeSeller call-shape test and not a market finding |
| SOURCE-010-TREE | PASS | OPEN (SPEC-OQ-002A) | none | experiments/basket **/*.ts has no FLOW-010 run() and no observeCooperativeAccept helper. Cleanup check of those two historical artifacts only. Does not prove synthetic business-flow is absent. Does not search docs or PACKAGE-008 experimenter facts. Not a business-flow observation |
| SOURCE-010-TZ025 | PASS | OPEN (SPEC-OQ-002B) | none | Stage-1 markdown prose search of TZ-025: free-text cheese discount is present; quantity-range names as whole words are SOURCE ABSENT in this file. This is not a TypeScript lexical scan. Token miss is not a business fact and not B3 observation |
| VOLUME-008-001 | PASS | OPEN (SPEC-OQ-002B) | none | Buyer 3/7/12 kg does not read an external tier schedule from the domain |
| VOLUME-008-002 | PASS | CONFIRMED | none | a pre-negotiation tier announcement is not an Offer, has no id, and cannot be accepted |
| VOLUME-008-003 | PASS | CONFIRMED | none | 7 kg @ 17 is a concrete Offer; schedule is not stored as provenance |
| VOLUME-008-004 | PASS | CONFIRMED | none | 17→16 is a new Offer; there is no schedule object to mutate or version |
| VOLUME-008-005 | PASS | CONFIRMED | none | 5 kg → 8 kg is a new Offer at the same unit price; no Offer←schedule link |
| VOLUME-008-006 | PASS | CONFIRMED | none | equal unit price across external 1–5 / 6–10 tiers is still two Offers; bounds are not stored |
| VOLUME-008-007 | PASS | CONFIRMED | none | I-048 regression: equal derived totals are not Offer identity |
| VOLUME-BIZ-009-001 | PASS | OPEN (SPEC-OQ-002B) | none | catalog/spec reconstruction: createPurchaseFromList copies listed unit price onto 3/7/12 kg items; lookup is quantity-agnostic. This does not observe which price a seller would apply to 7 kg |
| VOLUME-PRICE-001 | PASS | CONFIRMED | none | linear unit pricing: 5×15=75 and 20×15=300; no model change |
| VOLUME-PRICE-002 | PASS | CONFIRMED | none | concrete volume discount is two Offers; VolumePrice entity is not required for this deal |
| VOLUME-PRICE-003 | PASS | CONFIRMED | none | same quantity, different unit price: agreed=A current=B; Offer A is not mutated |
| VOLUME-PRICE-004 | PASS | CONFIRMED | none | equal derived totals are arithmetic, not Offer identity |
| VOLUME-PRICE-005 | PASS | CONFIRMED | none | concrete quantity-dependent deals are Offers; this does not introduce a tier schedule |
| VOLUME-PRICE-005B | PASS | OPEN (SPEC-OQ-002B) | none | MODEL GAP: a standing quantity-range price schedule is not a domain object |
| VOLUME-PRICE-006 | PASS | CONFIRMED | none | quantity change is a new Offer; Offer #1 is not mutated |
| VOLUME-PRICE-007 | PASS | CONFIRMED | none | seller reprice after quantity increase is a new Offer; Offer #1 stays 5 kg @ 15 |
| VOLUME-PRICE-008 | PASS | CONFIRMED | none | snapshot keeps unit-price basis 20 kg @ 12; derived total 240 is not stored as price |

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
- Decision: FIRST_AVAILABLE and PRIMARY_ONLY are not BEST_PRICE in this run; this does not prove price never affects resolution. SPEC OQ-008 remains OPEN

### ALT-STABILITY-001 — Impl PASS / Domain CONFIRMED

- Expected: afterOffer=true; afterNewOffer=true; afterSub=true; afterReplacementOffer=true; currentProduct=baguette; currentHasPrimary=false; currentHasAlt=false; currentItemsAloneWouldShowAlt=false; listStillHasAlt=true; snapshotHasListAlt=true; requestedQty=2; requestedUnit=kg
- Actual: afterOffer=true; afterNewOffer=true; afterSub=true; afterReplacementOffer=true; currentProduct=baguette; currentHasPrimary=false; currentHasAlt=false; currentItemsAloneWouldShowAlt=false; listStillHasAlt=true; snapshotHasListAlt=true; requestedQty=2; requestedUnit=kg
- Invariant: I-023 I-014
- Hypothesis: CONFIRMED
- Open question: none
- Model violation: none
- New concept: none
- Workaround: none
- Decision: alternatives are a List projection: they remain after the current commercial item is replaced

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

### FLOW-011-A-CONFIG — Impl PASS / Domain OPEN (SPEC-OQ-002A)

- Expected: status=STABLE; quantity=1; unitPrice=15
- Actual: status=STABLE; quantity=1; unitPrice=15
- Invariant: business-flow observation — not a domain invariant
- Hypothesis: OPEN
- Open question: SPEC-OQ-002A
- Model violation: none
- New concept: INCONCLUSIVE Stage-1 flow — seller product-config step not executable; does not justify Package
- Workaround: none
- Decision: Stage-1 deal reached STABLE. Catalog came from test setCatalog, not a seller product-config command. CooperativeSeller only accepted the buyer Offer. Seller min/max/tier configuration was not executed. Not SOURCE search and not a claim that sellers cannot define constraints in an unobserved flow

### FLOW-011-A-STOCK — Impl PASS / Domain OPEN (SPEC-OQ-002A)

- Expected: offeredQty=5; reason=AVAILABILITY_CHANGE; stock=5
- Actual: offeredQty=5; reason=AVAILABILITY_CHANGE; stock=5
- Invariant: business-flow observation — not a domain invariant
- Hypothesis: OPEN
- Open question: SPEC-OQ-002A
- Model violation: none
- New concept: stock cap is not a product quantity-constraint rule
- Workaround: none
- Decision: PartialAvailabilitySeller capped 10 kg to catalog stock 5 with AVAILABILITY_CHANGE. That is stock, not a seller-defined product maxQuantity. Do not read this row as OQ-002A NOT SUPPORTED

### FLOW-011-A-ZERO — Impl PASS / Domain OPEN (SPEC-OQ-002A)

- Expected: zeroRejected=true
- Actual: zeroRejected=true
- Invariant: business-flow observation — not a domain invariant
- Hypothesis: OPEN
- Open question: SPEC-OQ-002A
- Model violation: none
- New concept: I-030 zero-quantity reject is not a seller min rule
- Workaround: none
- Decision: quantity 0 is rejected by I-030 at addItem. That is a domain bound on every quantity, not a seller-configured minimum of N. Not OQ-002A min-quantity evidence

### FLOW-011-A1 — Impl PASS / Domain OPEN (SPEC-OQ-002A)

- Expected: status=STABLE; quantity=1; unitPrice=15
- Actual: status=STABLE; quantity=1; unitPrice=15
- Invariant: business-flow observation — not a domain invariant
- Hypothesis: OPEN
- Open question: SPEC-OQ-002A
- Model violation: none
- New concept: INCONCLUSIVE — observed unconstrained qty 1; not NOT SUPPORTED of seller min
- Workaround: none
- Decision: Buyer requested 1 kg; programmed CooperativeSeller accepted 1 kg at listed unit price. No minimum-quantity rule was applied in this flow. Seller never set a min. Not proof that a seller cannot define min in an unobserved flow

### FLOW-011-A2 — Impl PASS / Domain OPEN (SPEC-OQ-002A)

- Expected: status=STABLE; quantity=100; unitPrice=15; stock=1000
- Actual: status=STABLE; quantity=100; unitPrice=15; stock=1000
- Invariant: business-flow observation — not a domain invariant
- Hypothesis: OPEN
- Open question: SPEC-OQ-002A
- Model violation: none
- New concept: INCONCLUSIVE — observed unconstrained qty 100; not a product max rule
- Workaround: none
- Decision: Buyer requested 100 kg against stock 1000; programmed CooperativeSeller accepted 100 kg. No product maximum-quantity rule was applied. This is not PartialAvailabilitySeller stock capping. Seller never set a max

### FLOW-011-A3 — Impl PASS / Domain OPEN (SPEC-OQ-002A)

- Expected: lowStatus=STABLE; midStatus=STABLE; highStatus=STABLE; lowPrice=15; midPrice=15; highPrice=15
- Actual: lowStatus=STABLE; midStatus=STABLE; highStatus=STABLE; lowPrice=15; midPrice=15; highPrice=15
- Invariant: business-flow observation — not a domain invariant
- Hypothesis: OPEN
- Open question: SPEC-OQ-002A
- Model violation: none
- New concept: INCONCLUSIVE — range could not be seller-configured; unconstrained qtys observed
- Workaround: none
- Decision: Buyer 2 / 5 / 12 kg all reached STABLE at the same listed unit price. A seller-defined min/max range was not set and was not applied. A3 as 'seller set min=N and max=M' is not executable in this engine

### FLOW-011-A4 — Impl PASS / Domain OPEN (SPEC-OQ-002A)

- Expected: status=STABLE; catalogHasMinQuantity=false; catalogHasMaxQuantity=false; itemHasMinQuantity=false; itemHasMaxQuantity=false
- Actual: status=STABLE; catalogHasMinQuantity=false; catalogHasMaxQuantity=false; itemHasMinQuantity=false; itemHasMaxQuantity=false
- Invariant: business-flow observation — not a domain invariant
- Hypothesis: OPEN
- Open question: SPEC-OQ-002A
- Model violation: none
- New concept: INCONCLUSIVE — stored Stage-1 listing shape has no quantity-constraint fields
- Workaround: none
- Decision: Ordinary unconstrained listing: stored catalog row and PurchaseItem have no minQuantity/maxQuantity fields. This is observed product state in this run, not a source-file token scan and not proof sellers lack such rules elsewhere

### FLOW-011-B-COUNTER — Impl PASS / Domain OPEN (SPEC-OQ-002B)

- Expected: price1=16; price10=16; qty1=1; qty10=10
- Actual: price1=16; price10=16; qty1=1; qty10=10
- Invariant: business-flow observation — not a domain invariant
- Hypothesis: OPEN
- Open question: SPEC-OQ-002B
- Model violation: none
- New concept: negotiating +1 is not quantity-dependent pricing
- Workaround: none
- Decision: NegotiatingSeller added +1 unit price for both 1 kg and 10 kg. Same offset, not a quantity-tier table. Programmed profile, not a seller-defined schedule

### FLOW-011-B-LEVELS — Impl PASS / Domain OPEN (SPEC-OQ-002B)

- Expected: price1=15; price5=15; price10=15; total1=15; total5=75; total10=150; status1=STABLE; status5=STABLE; status10=STABLE
- Actual: price1=15; price5=15; price10=15; total1=15; total5=75; total10=150; status1=STABLE; status5=STABLE; status10=STABLE
- Invariant: business-flow observation — not a domain invariant
- Hypothesis: OPEN
- Open question: SPEC-OQ-002B
- Model violation: none
- New concept: INCONCLUSIVE — linear unit price observed; seller did not configure a tier
- Workaround: none
- Decision: Buyer 1 / 5 / 10 kg: listed unit price stayed 15; totals 15 / 75 / 150. Programmed CooperativeSeller accepted each. This flow applied linear unit price. Seller never defined a quantity-dependent price. Not VOLUME-BIZ-009 reconstruction labeled as seller pricing

### FLOW-011-B-TIME — Impl PASS / Domain OPEN (SPEC-OQ-002B)

- Expected: afterQty2=12; afterQty10=12
- Actual: afterQty2=12; afterQty10=12
- Invariant: business-flow observation — not a domain invariant
- Hypothesis: OPEN
- Open question: SPEC-OQ-002B
- Model violation: none
- New concept: time discount is not quantity-tier pricing
- Workaround: none
- Decision: TimeDiscountSeller lowered unit price 15→12 for both 2 kg and 10 kg. Same unit-price drop regardless of quantity. This is a time profile, not a quantity-dependent price rule. Not OQ-002B CONFIRMED or NOT SUPPORTED

### PACKAGE-001 — Impl PASS / Domain CONFIRMED

- Expected: quantity=1; unit=package; price=60; derivedTotal=60
- Actual: quantity=1; unit=package; price=60; derivedTotal=60
- Invariant: I-045 I-042
- Hypothesis: CONFIRMED
- Open question: none
- Model violation: none
- New concept: none
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

- Expected: catalogRows=2; catalogQtys=5,20; sharedIdentity=seller-a|tomatoes|package; identityKeyCount=1; offerHasCatalogQty=false
- Actual: catalogRows=2; catalogQtys=5,20; sharedIdentity=seller-a|tomatoes|package; identityKeyCount=1; offerHasCatalogQty=false
- Invariant: I-045 I-036
- Hypothesis: OPEN
- Open question: SPEC-OQ-002
- Model violation: none
- New concept: distinct package-base identity (not introduced)
- Workaround: none
- Decision: MODEL GAP: current identity cannot represent distinct package bases

### PACKAGE-004 — Impl PASS / Domain OPEN (SPEC-OQ-002)

- Expected: kgConversion=null; contentsInModel=false
- Actual: kgConversion=null; contentsInModel=false
- Invariant: I-045
- Hypothesis: OPEN
- Open question: SPEC-OQ-002
- Model violation: none
- New concept: package contents / conversion (not introduced)
- Workaround: none
- Decision: MODEL GAP: package contents / conversion are not in the model; business semantics remain OPEN

### PACKAGE-008-001 — Impl PASS / Domain CONFIRMED

- Expected: quantity=1; unit=package; price=60; derivedTotal=60; extraPackageField=false
- Actual: quantity=1; unit=package; price=60; derivedTotal=60; extraPackageField=false
- Invariant: I-045 I-042 I-047
- Hypothesis: CONFIRMED
- Open question: none
- Model violation: none
- New concept: none
- Workaround: none
- Decision: regression: 1 package @ 60 is a complete Offer triple with no extra package fields

### PACKAGE-008-002 — Impl PASS / Domain CONFIRMED

- Expected: externalKg=5; offerContents=false; itemContents=false; snapshotContents=false; derivedTotal=60; derivedIgnoresExternalKg=true; accepted=true; domainSuppliesContents=false
- Actual: externalKg=5; offerContents=false; itemContents=false; snapshotContents=false; derivedTotal=60; derivedIgnoresExternalKg=true; accepted=true; domainSuppliesContents=false
- Invariant: I-049 I-047 I-042 I-046
- Hypothesis: CONFIRMED
- Open question: none
- Model violation: none
- New concept: none
- Workaround: none
- Decision: external 5 kg is not an Offer term: package-unit deal completes without stored contents

### PACKAGE-008-003 — Impl PASS / Domain OPEN (SPEC-OQ-002A)

- Expected: requestedKg=2; externalPackageKg=5; sellerPurchases=0; convertedFraction=false; convertedPrice=false; unresolved=true
- Actual: requestedKg=2; externalPackageKg=5; sellerPurchases=0; convertedFraction=false; convertedPrice=false; unresolved=true
- Invariant: I-047 I-049 I-036
- Hypothesis: OPEN
- Open question: SPEC-OQ-002A
- Model violation: none
- New concept: kg↔package conversion (not introduced)
- Workaround: none
- Decision: 2 kg vs 5 kg package is unresolved; no 0.4 package and no 24 MAD conversion

### PACKAGE-008-004 — Impl PASS / Domain OPEN (SPEC-OQ-002A)

- Expected: requestedKg=2; externalPackageKg=5; sellerPurchases=0; partialPolicy=false; wholeOnlyPolicy=false; splitPolicy=false; oversupplyPolicy=false
- Actual: requestedKg=2; externalPackageKg=5; sellerPurchases=0; partialPolicy=false; wholeOnlyPolicy=false; splitPolicy=false; oversupplyPolicy=false
- Invariant: I-047
- Hypothesis: OPEN
- Open question: SPEC-OQ-002A
- Model violation: none
- New concept: partial / whole package policy (not introduced)
- Workaround: none
- Decision: MODEL GAP: 2 kg < 5 kg package has no partial/whole/split/oversupply policy

### PACKAGE-008-005 — Impl PASS / Domain OPEN (SPEC-OQ-002A)

- Expected: requestedKg=6; externalPackageKg=5; sellerPurchases=0; onePackageChosen=false; twoPackagesChosen=false; splitChosen=false; exactSixKg=false
- Actual: requestedKg=6; externalPackageKg=5; sellerPurchases=0; onePackageChosen=false; twoPackagesChosen=false; splitChosen=false; exactSixKg=false
- Invariant: I-047
- Hypothesis: OPEN
- Open question: SPEC-OQ-002A
- Model violation: none
- New concept: contents quantity vs package quantity (not introduced)
- Workaround: none
- Decision: MODEL GAP: 6 kg > 5 kg package does not choose 1 pack, 2 packs, split, or exact 6 kg

### PACKAGE-008-006 — Impl PASS / Domain OPEN (SPEC-OQ-002A)

- Expected: externalBases=5kg,20kg; identityKeyCount=1; unresolved=true; reason=AMBIGUOUS_PRICE; packageEntity=false
- Actual: externalBases=5kg,20kg; identityKeyCount=1; unresolved=true; reason=AMBIGUOUS_PRICE; packageEntity=false
- Invariant: I-047 I-036 I-049
- Hypothesis: OPEN
- Open question: SPEC-OQ-002A
- Model violation: none
- New concept: package-base identity (not introduced)
- Workaround: none
- Decision: MODEL GAP: distinct package bases are a catalog-identity limitation; no evidence yet justifies a Package entity

### PACKAGE-BIZ-009-001 — Impl PASS / Domain OPEN (SPEC-OQ-002A)

- Expected: unit=250 g; catalogPrice=140; contentsField=false
- Actual: unit=250 g; catalogPrice=140; contentsField=false
- Invariant: I-045 I-049
- Hypothesis: OPEN
- Open question: SPEC-OQ-002A
- Model violation: none
- New concept: catalog/spec reconstruction — not a business-flow observation
- Workaround: none
- Decision: catalog/spec reconstruction: listed unit 250 g is representable without a contents field; this does not prove pack contents are not a business fact

### PACKAGE-BIZ-009-002 — Impl PASS / Domain OPEN (SPEC-OQ-002A)

- Expected: identityKeyCount=2; unresolved=false
- Actual: identityKeyCount=2; unresolved=false
- Invariant: I-036
- Hypothesis: OPEN
- Open question: SPEC-OQ-002A
- Model violation: none
- New concept: catalog/spec reconstruction — not a business-flow observation
- Workaround: none
- Decision: catalog/spec reconstruction: two pre-split productIds yield two identity keys; this does not prove pack sizes must be Products and is not OQ-002A evidence

### PACKAGE-SEM-001 — Impl PASS / Domain CONFIRMED

- Expected: quantity=1; unit=package; price=60; derivedTotal=60; accepted=true; agreedQty=1; agreedUnit=package; agreedPrice=60; stable=true
- Actual: quantity=1; unit=package; price=60; derivedTotal=60; accepted=true; agreedQty=1; agreedUnit=package; agreedPrice=60; stable=true
- Invariant: I-045 I-042 I-046
- Hypothesis: CONFIRMED
- Open question: none
- Model violation: none
- New concept: none
- Workaround: none
- Decision: package is representable as a unit through Offer, Acceptance, and snapshot; contents are not claimed

### PACKAGE-SEM-002 — Impl PASS / Domain OPEN (SPEC-OQ-002A)

- Expected: externalBases=5kg,20kg; identityKeyCount=1; samePriceOfferHasContents=false; differentPriceUnresolved=true; differentPriceReason=AMBIGUOUS_PRICE; offersDistinguishPriceNotContents=true
- Actual: externalBases=5kg,20kg; identityKeyCount=1; samePriceOfferHasContents=false; differentPriceUnresolved=true; differentPriceReason=AMBIGUOUS_PRICE; offersDistinguishPriceNotContents=true
- Invariant: I-047 I-045 I-036
- Hypothesis: OPEN
- Open question: SPEC-OQ-002A
- Model violation: none
- New concept: package contents / basis (not introduced)
- Workaround: none
- Decision: MODEL GAP: current identity cannot represent distinct package bases

### PACKAGE-SEM-003 — Impl PASS / Domain CONFIRMED

- Expected: catalogQty=5; requestedOne=1; purchasedOne=1; requestedTwo=2; purchasedTwo=2; copiedFromCatalog=false; convertedToKg=false
- Actual: catalogQty=5; requestedOne=1; purchasedOne=1; requestedTwo=2; purchasedTwo=2; copiedFromCatalog=false; convertedToKg=false
- Invariant: I-045 I-047
- Hypothesis: CONFIRMED
- Open question: none
- Model violation: none
- New concept: none
- Workaround: none
- Decision: catalog package size is not requested quantity and is not converted into kg

### PACKAGE-SEM-004 — Impl PASS / Domain OPEN (SPEC-OQ-002A)

- Expected: resolvedKind=UNRESOLVED; sellerPurchases=0; reason=UNAVAILABLE; convertedToPackage=false; askedBuyer=false
- Actual: resolvedKind=UNRESOLVED; sellerPurchases=0; reason=UNAVAILABLE; convertedToPackage=false; askedBuyer=false
- Invariant: I-036 I-047
- Hypothesis: OPEN
- Open question: SPEC-OQ-002A
- Model violation: none
- New concept: kg↔package conversion policy (not introduced)
- Workaround: none
- Decision: 2 kg vs package catalog is unresolved; no auto-conversion and no conversion policy decided

### PACKAGE-SEM-005 — Impl PASS / Domain OPEN (SPEC-OQ-002A)

- Expected: requested=2; requestedUnit=kg; externalPackageKg=5; sellerPurchases=0; partialPackageConcept=false
- Actual: requested=2; requestedUnit=kg; externalPackageKg=5; sellerPurchases=0; partialPackageConcept=false
- Invariant: I-047
- Hypothesis: OPEN
- Open question: SPEC-OQ-002A
- Model violation: none
- New concept: partial package (not introduced)
- Workaround: none
- Decision: MODEL GAP: requested 2 kg vs external 5 kg package has no partial-package concept

### PACKAGE-SEM-006 — Impl PASS / Domain OPEN (SPEC-OQ-002A)

- Expected: requested=6; requestedUnit=kg; externalPackageKg=5; sellerPurchases=0; wholePackageOnlyConcept=false; splitConcept=false
- Actual: requested=6; requestedUnit=kg; externalPackageKg=5; sellerPurchases=0; wholePackageOnlyConcept=false; splitConcept=false
- Invariant: I-047
- Hypothesis: OPEN
- Open question: SPEC-OQ-002A
- Model violation: none
- New concept: whole package / split (not introduced)
- Workaround: none
- Decision: MODEL GAP: requested 6 kg vs external 5 kg package has no whole-package-only or split concept

### PRICE-ABSENT-001 — Impl PASS / Domain CONFIRMED

- Expected: hasPrice=false; derivedTotal=null; absence=MISSING_PRICE; storedLinePrice=false; acceptBlocked=true; secondAcceptBlocked=true; firstAfterSecondBlocked=true; agreedOfferId=null; stable=false; adviceKind=WAIT; adviceReason=MISSING_ITEM_PRICE; catalogRefUnchanged=15
- Actual: hasPrice=false; derivedTotal=null; absence=MISSING_PRICE; storedLinePrice=false; acceptBlocked=true; secondAcceptBlocked=true; firstAfterSecondBlocked=true; agreedOfferId=null; stable=false; adviceKind=WAIT; adviceReason=MISSING_ITEM_PRICE; catalogRefUnchanged=15
- Invariant: I-042 I-046
- Hypothesis: CONFIRMED
- Open question: none
- Model violation: none
- New concept: none
- Workaround: none
- Decision: priceless Offer has no derived total; a second priceless Offer is not a bypass to agreed/STABLE

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

- Expected: qtyZeroTotal=null; qtyZeroReason=INVALID_QUANTITY; qtyNegReason=INVALID_QUANTITY; qtyNanReason=INVALID_QUANTITY; qtyInfReason=INVALID_QUANTITY; priceNegReason=INVALID_PRICE; priceNanReason=INVALID_PRICE; priceInfReason=INVALID_PRICE; missingReason=MISSING_PRICE; okTotal=30; okReason=null
- Actual: qtyZeroTotal=null; qtyZeroReason=INVALID_QUANTITY; qtyNegReason=INVALID_QUANTITY; qtyNanReason=INVALID_QUANTITY; qtyInfReason=INVALID_QUANTITY; priceNegReason=INVALID_PRICE; priceNanReason=INVALID_PRICE; priceInfReason=INVALID_PRICE; missingReason=MISSING_PRICE; okTotal=30; okReason=null
- Invariant: I-030 I-046 I-042
- Hypothesis: CONFIRMED
- Open question: none
- Model violation: none
- New concept: none
- Workaround: none
- Decision: unitLineTotal only multiplies; quantity > 0 is I-030, price bounds are I-046; null is no derived total, not a new TZ-006 rule

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

### SNAPSHOT-VOL-001 — Impl PASS / Domain OPEN (SPEC-OQ-002A)

- Expected: requestedQty=20; requestedUnit=kg; agreedPrice=15; agreedDerived=300; currentPrice=12; currentDerived=240; altProduct=tomato_b; altPrice=14; packageContentsStored=false; snapshotHasPackageField=false
- Actual: requestedQty=20; requestedUnit=kg; agreedPrice=15; agreedDerived=300; currentPrice=12; currentDerived=240; altProduct=tomato_b; altPrice=14; packageContentsStored=false; snapshotHasPackageField=false
- Invariant: I-023 I-042 I-047 I-048
- Hypothesis: OPEN
- Open question: SPEC-OQ-002A
- Model violation: none
- New concept: snapshot package contents (not introduced)
- Workaround: none
- Decision: canonical snapshot distinguishes requested/agreed/current/alt/derived; package contents remain absent

### SOURCE-010-BASKET — Impl PASS / Domain OPEN (SPEC-OQ-002A)

- Expected: declarationFound=true; copiesUnit=true; copiesPrice=true; hasConversion=false; hasTierPrice=false
- Actual: declarationFound=true; copiesUnit=true; copiesPrice=true; hasConversion=false; hasTierPrice=false
- Invariant: source inspection — not a domain invariant
- Hypothesis: OPEN
- Open question: SPEC-OQ-002A
- Model violation: none
- New concept: SOURCE ABSENT in ADD_TO_BASKET itself — not a business-flow observation
- Workaround: none
- Decision: No conversion/tier lookup found in ADD_TO_BASKET itself. The function copies payload.unit and payload.price. Conversion or pricing could occur before this call; this row does not claim the whole basket path

### SOURCE-010-CATALOG-HONEY — Impl PASS / Domain OPEN (SPEC-OQ-002A)

- Expected: honeyCategoryFound=true; honeySeedsPresent=true; honeyKgUnitInBlock=false
- Actual: honeyCategoryFound=true; honeySeedsPresent=true; honeyKgUnitInBlock=false
- Invariant: source inspection — not a domain invariant
- Hypothesis: OPEN
- Open question: SPEC-OQ-002A
- Model violation: none
- New concept: SOURCE ABSENT of 1 кг honey listing in mockSellerCatalog.ts honey block
- Workaround: none
- Decision: honey category block found with at least one array-element seed; no ListedSeed.unit 1 кг in that block (nested metadata, even with name/price/unit, does not count). Not A3 seller classification and not a business-flow observation

### SOURCE-010-CATALOG-KG — Impl PASS / Domain OPEN (SPEC-OQ-002A)

- Expected: hasKgListedSeed=true
- Actual: hasKgListedSeed=true
- Invariant: source inspection — not a domain invariant
- Hypothesis: OPEN
- Open question: SPEC-OQ-002A
- Model violation: none
- New concept: SOURCE ABSENT/present of listed kg unit in PRODUCT_SEEDS category-array listings
- Workaround: none
- Decision: PRODUCT_SEEDS category-array listings include at least one unit 1 кг. Nested metadata and assignment example objects are not listings. Not a business-flow observation

### SOURCE-010-CATALOG-TOKENS — Impl PASS / Domain OPEN (SPEC-OQ-002A)

- Expected: sackContentsTokens=false; quantityRangeTokens=false
- Actual: sackContentsTokens=false; quantityRangeTokens=false
- Invariant: source inspection — not a domain invariant
- Hypothesis: OPEN
- Open question: SPEC-OQ-002A
- Model violation: none
- New concept: SOURCE ABSENT of sack/range tokens in mockSellerCatalog.ts
- Workaround: none
- Decision: whole identifier мешок, pack-contents 1 мешок/package = 5 kg, and range tokens minQuantity/maxQuantity/tierPrice/PriceSchedule/VolumePrice / 1-4 / 5-9 / 10+ are SOURCE ABSENT in mockSellerCatalog.ts lexical code. Substrings, regex interiors, and 1 package = 5 apples do not count. Token miss is not a market finding

### SOURCE-010-EMULATOR — Impl PASS / Domain OPEN (SPEC-OQ-002B)

- Expected: hasMinQuantity=false; hasMaxQuantity=false; hasTierPrice=false; hasPriceSchedule=false; quantityRangeTokens=false
- Actual: hasMinQuantity=false; hasMaxQuantity=false; hasTierPrice=false; hasPriceSchedule=false; quantityRangeTokens=false
- Invariant: source inspection — not a domain invariant
- Hypothesis: OPEN
- Open question: SPEC-OQ-002B
- Model violation: none
- New concept: SOURCE ABSENT of quantity-range tokens in sellers.ts
- Workaround: none
- Decision: Stage-1 source search of sellers.ts: the identifier tokens minQuantity/maxQuantity/tierPrice/PriceSchedule/VolumePrice are SOURCE ABSENT in this file. This does not claim sellers.ts has no quantity-range mechanism under another name (quantityPrices, getPrice, ranges, ...). Not a CooperativeSeller call-shape test and not a market finding

### SOURCE-010-TREE — Impl PASS / Domain OPEN (SPEC-OQ-002A)

- Expected: walkComplete=true; flow010Run=false; observeCooperativeAcceptHelper=false
- Actual: walkComplete=true; flow010Run=false; observeCooperativeAcceptHelper=false
- Invariant: source inspection — not a domain invariant
- Hypothesis: OPEN
- Open question: SPEC-OQ-002A
- Model violation: none
- New concept: cleanup of two historical FLOW-010 artifacts — not proof that synthetic business-flow is absent
- Workaround: none
- Decision: experiments/basket **/*.ts has no FLOW-010 run() and no observeCooperativeAccept helper. Cleanup check of those two historical artifacts only. Does not prove synthetic business-flow is absent. Does not search docs or PACKAGE-008 experimenter facts. Not a business-flow observation

### SOURCE-010-TZ025 — Impl PASS / Domain OPEN (SPEC-OQ-002B)

- Expected: cheeseDiscountText=true; quantityRangeTokens=false
- Actual: cheeseDiscountText=true; quantityRangeTokens=false
- Invariant: source inspection — not a domain invariant
- Hypothesis: OPEN
- Open question: SPEC-OQ-002B
- Model violation: none
- New concept: SOURCE ABSENT in TZ-025 — not a business-flow observation
- Workaround: none
- Decision: Stage-1 markdown prose search of TZ-025: free-text cheese discount is present; quantity-range names as whole words are SOURCE ABSENT in this file. This is not a TypeScript lexical scan. Token miss is not a business fact and not B3 observation

### VOLUME-008-001 — Impl PASS / Domain OPEN (SPEC-OQ-002B)

- Expected: externalTier3=20; externalTier7=17; externalTier12=14; domainPrice=15; scheduleApplied3=false; scheduleApplied7=false; scheduleApplied12=false
- Actual: externalTier3=20; externalTier7=17; externalTier12=14; domainPrice=15; scheduleApplied3=false; scheduleApplied7=false; scheduleApplied12=false
- Invariant: I-048 I-050
- Hypothesis: OPEN
- Open question: SPEC-OQ-002B
- Model violation: none
- New concept: quantity-range price schedule (not introduced)
- Workaround: none
- Decision: Buyer 3/7/12 kg does not read an external tier schedule from the domain

### VOLUME-008-002 — Impl PASS / Domain CONFIRMED

- Expected: scheduleIsOffer=false; scheduleOfferId=null; offersCreated=0; snapshotHasSchedule=false; acceptable=false
- Actual: scheduleIsOffer=false; scheduleOfferId=null; offersCreated=0; snapshotHasSchedule=false; acceptable=false
- Invariant: I-050 I-048 I-027
- Hypothesis: CONFIRMED
- Open question: none
- Model violation: none
- New concept: none
- Workaround: none
- Decision: a pre-negotiation tier announcement is not an Offer, has no id, and cannot be accepted

### VOLUME-008-003 — Impl PASS / Domain CONFIRMED

- Expected: qty=7; price=17; derivedFromSchedule=false; isOffer=true
- Actual: qty=7; price=17; derivedFromSchedule=false; isOffer=true
- Invariant: I-050 I-048 I-044
- Hypothesis: CONFIRMED
- Open question: none
- Model violation: none
- New concept: none
- Workaround: none
- Decision: 7 kg @ 17 is a concrete Offer; schedule is not stored as provenance

### VOLUME-008-004 — Impl PASS / Domain CONFIRMED

- Expected: newOffer=true; aUnchanged=17; bPrice=16; scheduleVersion=false
- Actual: newOffer=true; aUnchanged=17; bPrice=16; scheduleVersion=false
- Invariant: I-006 I-044 I-050
- Hypothesis: CONFIRMED
- Open question: none
- Model violation: none
- New concept: none
- Workaround: none
- Decision: 17→16 is a new Offer; there is no schedule object to mutate or version

### VOLUME-008-005 — Impl PASS / Domain CONFIRMED

- Expected: newOffer=true; aQty=5; bQty=8; sameUnitPrice=true; scheduleLink=false
- Actual: newOffer=true; aQty=5; bQty=8; sameUnitPrice=true; scheduleLink=false
- Invariant: I-044 I-048 I-050
- Hypothesis: CONFIRMED
- Open question: none
- Model violation: none
- New concept: none
- Workaround: none
- Decision: 5 kg → 8 kg is a new Offer at the same unit price; no Offer←schedule link

### VOLUME-008-006 — Impl PASS / Domain CONFIRMED

- Expected: distinct=true; priceA=15; priceB=15; totalA=45; totalB=120; boundsStored=false
- Actual: distinct=true; priceA=15; priceB=15; totalA=45; totalB=120; boundsStored=false
- Invariant: I-044 I-048 I-042
- Hypothesis: CONFIRMED
- Open question: none
- Model violation: none
- New concept: none
- Workaround: none
- Decision: equal unit price across external 1–5 / 6–10 tiers is still two Offers; bounds are not stored

### VOLUME-008-007 — Impl PASS / Domain CONFIRMED

- Expected: totalA=100; totalB=100; sameTotal=true; sameOffer=false
- Actual: totalA=100; totalB=100; sameTotal=true; sameOffer=false
- Invariant: I-048 I-042 I-044
- Hypothesis: CONFIRMED
- Open question: none
- Model violation: none
- New concept: none
- Workaround: none
- Decision: I-048 regression: equal derived totals are not Offer identity

### VOLUME-BIZ-009-001 — Impl PASS / Domain OPEN (SPEC-OQ-002B)

- Expected: listedPrice=180; purchasePrice3=180; purchasePrice7=180; purchasePrice12=180
- Actual: listedPrice=180; purchasePrice3=180; purchasePrice7=180; purchasePrice12=180
- Invariant: I-042 I-045
- Hypothesis: OPEN
- Open question: SPEC-OQ-002B
- Model violation: none
- New concept: catalog/spec reconstruction — not a business-flow observation
- Workaround: none
- Decision: catalog/spec reconstruction: createPurchaseFromList copies listed unit price onto 3/7/12 kg items; lookup is quantity-agnostic. This does not observe which price a seller would apply to 7 kg

### VOLUME-PRICE-001 — Impl PASS / Domain CONFIRMED

- Expected: smallTotal=75; bulkTotal=300; sameUnitPrice=true; newOffer=true
- Actual: smallTotal=75; bulkTotal=300; sameUnitPrice=true; newOffer=true
- Invariant: I-042 I-048
- Hypothesis: CONFIRMED
- Open question: none
- Model violation: none
- New concept: none
- Workaround: none
- Decision: linear unit pricing: 5×15=75 and 20×15=300; no model change

### VOLUME-PRICE-002 — Impl PASS / Domain CONFIRMED

- Expected: distinct=true; qtyA=5; priceA=15; totalA=75; qtyB=20; priceB=12; totalB=240; volumeEntity=false
- Actual: distinct=true; qtyA=5; priceA=15; totalA=75; qtyB=20; priceB=12; totalB=240; volumeEntity=false
- Invariant: I-044 I-048 I-042
- Hypothesis: CONFIRMED
- Open question: none
- Model violation: none
- New concept: none
- Workaround: none
- Decision: concrete volume discount is two Offers; VolumePrice entity is not required for this deal

### VOLUME-PRICE-003 — Impl PASS / Domain CONFIRMED

- Expected: aUnchanged=15; agreed=offer-5; active=offer-7; sameQty=true
- Actual: aUnchanged=15; agreed=offer-5; active=offer-7; sameQty=true
- Invariant: I-006 I-044 I-048
- Hypothesis: CONFIRMED
- Open question: none
- Model violation: none
- New concept: none
- Workaround: none
- Decision: same quantity, different unit price: agreed=A current=B; Offer A is not mutated

### VOLUME-PRICE-004 — Impl PASS / Domain CONFIRMED

- Expected: totalA=100; totalB=100; sameTotal=true; sameOffer=false; priceA=20; priceB=10
- Actual: totalA=100; totalB=100; sameTotal=true; sameOffer=false; priceA=20; priceB=10
- Invariant: I-042 I-044 I-048
- Hypothesis: CONFIRMED
- Open question: none
- Model violation: none
- New concept: none
- Workaround: none
- Decision: equal derived totals are arithmetic, not Offer identity

### VOLUME-PRICE-005 — Impl PASS / Domain CONFIRMED

- Expected: distinct=true; totalA=60; totalB=119; totalC=168; aUnchanged=20
- Actual: distinct=true; totalA=60; totalB=119; totalC=168; aUnchanged=20
- Invariant: I-048 I-044
- Hypothesis: CONFIRMED
- Open question: none
- Model violation: none
- New concept: none
- Workaround: none
- Decision: concrete quantity-dependent deals are Offers; this does not introduce a tier schedule

### VOLUME-PRICE-005B — Impl PASS / Domain OPEN (SPEC-OQ-002B)

- Expected: concreteOffer=true; scheduleOnOffer=false; scheduleOnSnapshot=false; scheduleOnWorld=false
- Actual: concreteOffer=true; scheduleOnOffer=false; scheduleOnSnapshot=false; scheduleOnWorld=false
- Invariant: I-048
- Hypothesis: OPEN
- Open question: SPEC-OQ-002B
- Model violation: none
- New concept: quantity-range price schedule (not introduced)
- Workaround: none
- Decision: MODEL GAP: a standing quantity-range price schedule is not a domain object

### VOLUME-PRICE-006 — Impl PASS / Domain CONFIRMED

- Expected: newOffer=true; aQty=5; aPrice=15; bQty=10; bPrice=15; aUnchangedQty=5
- Actual: newOffer=true; aQty=5; aPrice=15; bQty=10; bPrice=15; aUnchangedQty=5
- Invariant: I-006 I-044 I-048
- Hypothesis: CONFIRMED
- Open question: none
- Model violation: none
- New concept: none
- Workaround: none
- Decision: quantity change is a new Offer; Offer #1 is not mutated

### VOLUME-PRICE-007 — Impl PASS / Domain CONFIRMED

- Expected: aQty=5; aPrice=15; bQty=10; bPrice=12; aUnchanged=15; newOffer=true
- Actual: aQty=5; aPrice=15; bQty=10; bPrice=12; aUnchanged=15; newOffer=true
- Invariant: I-006 I-044 I-048
- Hypothesis: CONFIRMED
- Open question: none
- Model violation: none
- New concept: none
- Workaround: none
- Decision: seller reprice after quantity increase is a new Offer; Offer #1 stays 5 kg @ 15

### VOLUME-PRICE-008 — Impl PASS / Domain CONFIRMED

- Expected: product=tomatoes; quantity=20; unit=kg; price=12; derivedTotal=240; storedLinePrice=false; priceIsNotTotal=true
- Actual: product=tomatoes; quantity=20; unit=kg; price=12; derivedTotal=240; storedLinePrice=false; priceIsNotTotal=true
- Invariant: I-042 I-023 I-048
- Hypothesis: CONFIRMED
- Open question: none
- Model violation: none
- New concept: none
- Workaround: none
- Decision: snapshot keeps unit-price basis 20 kg @ 12; derived total 240 is not stored as price

## Final decision

```text
Model version: v0.1.17 / SPEC v0.6
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
- GREENMARKET_DOMAIN_SPEC v0.6 is the canonical domain contract; TZ-BASKET-009 records catalog/spec reconstruction; TZ-BASKET-010 records Stage-1 source search (SOURCE ABSENT in inspected files); TZ-BASKET-011 records Stage-1 buyer/seller flow observation (INCONCLUSIVE for OQ-002A/B). None introduces Package or PriceSchedule
- I-042: price is the price of one unit; derived total = quantity * price; no stored linePrice
- I-043: changing quantity does not reread price as a line total
- I-044: Offer stores (product, quantity, unit, price); a change is a new Offer
- I-045: catalog quantity is Stage-1 reference size — not identity, multiplier, or conversion
- I-046: acceptOffer requires a finite price on every item; unitLineTotal only multiplies under I-030/I-046 bounds and is not a hidden validator
- I-047: package contents / size in another unit is not a stored fact; external 1 package = 5 kg is experimenter knowledge
- I-048: a concrete volume-priced deal is an Offer; a standing quantity-range schedule is not introduced
- I-049: a package-unit deal completes without stored contents; contents are not Offer terms
- I-050: a standing quantity-range announcement is not an Offer and a concrete Offer stores no schedule provenance
- snapshot.alternatives is a List projection (AlternativeProjection); current SP items are only a binding set
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
OQ-002: split by TZ-BASKET-007 into OQ-002A / OQ-002B

TZ-BASKET-007
Status: PASS for Stage-1 representation; no new entity
OQ-002A: OPEN — package is a unit; contents/conversion/partial remain MODEL GAP (I-047)
OQ-002B: Stage-1 — concrete volume deal = Offer (I-048); standing schedule OPEN
Model change required: NO new entity
New concept required: YES if/when OQ-002A contents or OQ-002B schedule is closed — NOT introduced
Production architecture changed: NO

TZ-BASKET-008
Status: PASS for Stage-1 evidence; conclusion B on both OQs; no new entity
OQ-002A: OPEN / MODEL GAP / NO NEW CONCEPT — package-unit deal does not require contents (I-049)
OQ-002B: OPEN schedule object / NO NEW CONCEPT — announcement is not an Offer (I-050); concrete Offers remain sufficient (I-048)
NEW CONCEPT JUSTIFIED: no — no evidence yet justifies a Package or PriceSchedule entity
NO MODEL CHANGE: yes
Production architecture changed: NO
Further closing OQ-002A/B requires a business observation, not another synthetic model test

TZ-BASKET-009
Status: catalog/spec reconstruction only; NO BUSINESS-FLOW OBSERVATION obtained
OQ-002A: OPEN — reconstruction shows listed unit 250 g is representable; pack-as-Products is tautological if catalog already splits ids
OQ-002B: OPEN — reconstruction shows listed unit price is copied onto 3/7/12 kg PurchaseItems; this is not seller pricing behavior
H3 schedule change: NOT OBSERVED — not used as OQ-002B evidence
NEW CONCEPT JUSTIFIED: no — absence of observation does not justify Package or PriceSchedule
NO MODEL CHANGE: yes
NO NEW INVARIANT: yes
SPEC version bump: no
Production architecture changed: NO
Further closing OQ-002A/B still requires a business-flow observation, not another synthetic model test

TZ-BASKET-010
Status: primary goal NOT MET — Stage-1 source search only; BUSINESS-FLOW OBSERVATION NOT OBTAINED
OQ-002A: OPEN — SOURCE ABSENT in mockSellerCatalog; no conversion/tier lookup found in ADD_TO_BASKET itself; A1/A2 flow NOT OBTAINED; A3 NOT TESTABLE (no seller classification); SOURCE-010-TREE is a cleanup check of two historical FLOW-010 artifacts, not proof synthetic business-flow is absent
OQ-002B: OPEN — named identifier tokens SOURCE ABSENT in sellers.ts; range names as whole words SOURCE ABSENT in TZ-025 markdown; B1/B2/B3 flow NOT OBTAINED. Not a claim that no quantity-range mechanism exists under another name. Token miss is not a CooperativeSeller call-shape test and not a market finding
NEW CONCEPT JUSTIFIED: no — source absence does not justify Package or PriceSchedule
NO MODEL CHANGE: yes
NO NEW INVARIANT: yes
SPEC version bump: no
Production architecture changed: NO
Further closing OQ-002A/B still requires a business-flow observation where a deal cannot complete without the extra fact

TZ-BASKET-011
Status: Stage-1 buyer/seller flow observed; OQ-002A/B INCONCLUSIVE; SPEC remains v0.6
OQ-002A: INCONCLUSIVE — seller product-config step is not executable in Stage-1 emulator/production mock; buyer quantities 1/100/2/5/12 were accepted without a min/max rule; stock cap and I-030 are not seller quantity constraints
OQ-002B: INCONCLUSIVE — this flow applied listed unit price linearly at 1/5/10 kg; TimeDiscount and NegotiatingSeller +1 are not quantity-tier rules; seller never configured a quantity-dependent price
NEW CONCEPT JUSTIFIED: no — INCONCLUSIVE observation does not justify Package or PriceSchedule
NO MODEL CHANGE: yes
NO NEW INVARIANT: yes
SPEC version bump: no
Production architecture changed: NO
SOURCE token absence was not used as business evidence

Still open:
- SPEC OQ-002A — conversion / partial-whole package / distinct package bases
- SPEC OQ-002B — standing quantity-range price schedule as a domain object
- SPEC OQ-003 — duplicate ListItems
- SPEC OQ-005 / experiment OQ-010 — negotiation TTL
- SPEC OQ-008 / experiment OQ-002 — alternative price *policy*
- experiment OQ-016 — allocation

Assistant compatibility: isOfferValid still means standing-proposal validity. STABLE is
checked first (WAIT TERMINAL_STATUS). An expired agreed Offer remains the price baseline
when a later live active Offer is evaluated (I-037). Assistants WAIT on MISSING_ITEM_PRICE.
Assistant unit-price comparisons are consistent with I-042; they are not the source of I-042.

The model is still experimental. PASS does not close remaining OPEN questions.
Recommended next step: a seller-facing product-configuration flow (outside the current Stage-1 emulator) is required to move OQ-002A/B off INCONCLUSIVE. OQ-003 may proceed independently
```
