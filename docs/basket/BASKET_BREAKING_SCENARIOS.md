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

Offer A is active. Buyer does nothing. `time < validUntil`. Status, `activeOfferId`, `agreedOfferId`, `waitingSince`, and `lastSellerActivity` stay; Offer remains valid (I-039). A derived `waitMs` is computed from `waitingSince` + clock. This is not a full domain command log.

## BS-030 — Silence until expiration

Offer A is active. Buyer does nothing. `time > validUntil`. Same pointers and status; `isOfferValid` is false. Not implicit REJECT (I-039 / I-028).

## BS-031 — Accepted Offer expires

Offer A is accepted (`agreedOfferId = A`, `activeOfferId = A`). Time passes `validUntil`. No replacement Offer. SellerPurchase stays STABLE; both pointers stay A; A is no longer valid as a standing proposal (I-037 / I-038). COUNTER of A is still forbidden (I-035). `stockClaims` shows A while valid and drops A after expiry (I-025). A second SellerPurchase B proposing 3 kg on stock=6 is a real OFFER_CREATION checkpoint: after A expired, B is the only claim and no detection event is written; a live control (A still valid) records `combined=7`. `advance` creates no new facts (I-040).

## BS-032 — Accepted Offer expires, then a new Offer appears

A accepted → A expires → B created. `agreedOfferId` stays A; `activeOfferId` becomes B; B may be accepted if valid. After ACCEPT(B): STABLE, both pointers B.

## BS-033 — Expired Offer cannot be revived

Expired A, then ACCEPT(A). Blocked by I-028. No Acceptance recorded.

## BS-034 — Expired Offer cannot be countered

Expired A, then a **counter** (`isCounterReason`: `BUYER_CHANGE` and `SELLER_COUNTEROFFER`) is blocked by I-035. A non-counter replacement (`PRICE_CHANGE`) is allowed. The test must use the domain counter mark, not an incidental `proposeOffer` reason.

## BS-035 — Silence must not create a fake FSM state

Long silence after expiration does not invent `EXPIRED` or any other new lifecycle status (I-039 / I-041).

## BS-036 — Time determinism

Same initial snapshot + same commands + same timestamps → identical full observable world (I-040). Determinism regression only — not a proof that every source of nondeterminism is absent.

## PRICE-UNIT-001 — Unit price

`Tomatoes × 2 kg @ 15` is stored as those three facts. No `linePrice` field is materialized. Derived total is `2 × 15 = 30` (I-042).

## PRICE-UNIT-002 — Line vs unit distinguishability

`(2 kg, 15)` and `(1 kg, 30)` are different stored facts. A shared derived total is arithmetic, not commercial equivalence.

## PRICE-OFFER-001 — Immutable Offer price

Offer A `2 kg @ 15`, then Offer B `2 kg @ 12`. A ≠ B. ACCEPT(A) does not mutate A. `agreedOfferId` stays A until B is accepted (I-044).

## PRICE-QTY-001 — Quantity does not redefine price

Offer `2 kg @ 15` then `4 kg @ 15` is a new Offer. Price stays 15 per kg; it is not reread as “15 for 4 kg” (I-043).

## PRICE-ABSENT-001 — Missing price

A PurchaseItem without `price` has no derived total. The model does not invent `0` or `linePrice`. A second priceless Offer is not a bypass to agreed/STABLE.

## PRICE-CATALOG-QTY-001 — Catalog quantity is not requested quantity

List asks 2 kg. Catalog row `quantity = 20`. PurchaseItem.quantity is 2, not 20 (I-045). A ListItem without quantity is `MISSING_QUANTITY`, not silent `1`.

## PACKAGE-001 — Package as a unit

`1 package @ 60` is representable as a unit (CONFIRMED). This scenario does not decide package contents.

## PACKAGE-002 — Package size vs unit price

Two catalog rows `5 kg @ 12` and `20 kg @ 12` share one reference. `5 kg @ 12` and `20 kg @ 9` are `AMBIGUOUS_PRICE`. Volume pricing is a MODEL GAP.

## PACKAGE-003 — Hidden package basis

Current identity `(sellerId, productId, unit)` cannot represent two catalog package bases (5 vs 20). That is a MODEL GAP, not a decision that those rows must be different commercial offers.

## PACKAGE-004 — Package contents / conversion

`1 package = 5 kg` is not in the model (**OPEN — SPEC OQ-002**). Separate from PACKAGE-001 representation.

## ALT-PRICE-001 — Primary cheaper than alternative

Primary 15 and alternative 24 are both visible. PRIMARY_ONLY does not switch. No AUTO_ACCEPT.

## ALT-PRICE-002 — Primary dearer than alternative

Primary 24 and alternative 15 are both visible. FIRST_AVAILABLE / PRIMARY_ONLY are not BEST_PRICE in this run. That does not prove price never affects resolution (**OPEN — SPEC OQ-008**).

## PRICE-SNAPSHOT-001 — Canonical price snapshot

Agreed `2 kg @ 15`, current `2 kg @ 12`, alternative `Tomato B × 2 kg @ 24` are visible together. Representation only.

## ALT-STABILITY-001 — List alternatives survive item replacement

After the current commercial item is replaced (primary gone from `sp.items`), snapshot alternatives still come from the original List — requested qty/unit included.

## PRICE-TOTAL-001 — Derived total bounds

`unitLineTotal` only multiplies. Quantity `> 0` is I-030. Invalid I-030/I-046 inputs yield no derived total; `lineTotalAbsence` names the reason. Not a new TZ-006 quantity rule.

## PACKAGE-SEM-001 — Package as a unit through Acceptance

`1 package @ 60` can be offered, accepted, and snapshotted. Derived total is 60. Contents are not claimed.

## PACKAGE-SEM-002 — Package bases are not stored

External `5 kg` vs `20 kg` package bases are experimenter knowledge. Current identity cannot represent them. Different prices distinguish Offers, not contents (**OPEN — SPEC OQ-002A**).

## PACKAGE-SEM-003 — Catalog package size ≠ requested quantity

List `1 package` / `2 package` stays 1 / 2. Catalog `quantity = 5` is not copied and not converted to kg.

## PACKAGE-SEM-004 — No kg↔package conversion

List `2 kg` against a `package` catalog is UNRESOLVED. No automatic `1 PACKAGE` and no ASK_BUYER policy (**OPEN — SPEC OQ-002A**).

## PACKAGE-SEM-005 — No partial package

Requested `2 kg` vs external `5 kg` package has no `partialPackage` concept (**OPEN — SPEC OQ-002A**).

## PACKAGE-SEM-006 — No whole-package-only / split

Requested `6 kg` vs external `5 kg` package has no split or whole-only concept (**OPEN — SPEC OQ-002A**).

## VOLUME-PRICE-001 — Linear unit pricing

`5 kg @ 15 = 75` and `20 kg @ 15 = 300`. Existing model, no change.

## VOLUME-PRICE-002 — Volume discount as two Offers

`5 kg @ 15` and `20 kg @ 12` are distinct Offers. No `VolumePrice` entity.

## VOLUME-PRICE-003 — Same quantity, different price

Agreed `20 kg @ 15`, current `20 kg @ 12`. Offer A is not mutated.

## VOLUME-PRICE-004 — Same total, different basis

`5×20` and `10×10` both derive 100 and remain different Offers.

## VOLUME-PRICE-005 — Concrete quantity-dependent Offers

`3@20`, `7@17`, `12@14` are Offers. This does not introduce a tier schedule.

## VOLUME-PRICE-005B — Standing schedule absent

A quantity-range price list is not a domain object (**OPEN — SPEC OQ-002B**).

## VOLUME-PRICE-006 — Quantity change is a new Offer

Buyer `5 kg → 10 kg` does not mutate Offer #1.

## VOLUME-PRICE-007 — Reprice after quantity increase

`5 kg @ 15` then `10 kg @ 12`. Offer #1 stays `5 kg @ 15`.

## VOLUME-PRICE-008 — Price basis in snapshot

Snapshot shows `20 kg @ 12`, not stored `price = 240`. Derived total is 240.

## SNAPSHOT-VOL-001 — Canonical volume snapshot

Requested 20 kg, agreed 15, current 12, alternative 14, derived totals visible. Package contents field is absent (**OPEN — SPEC OQ-002A**).

## PACKAGE-008-001 — Package-unit Offer triple

`1 package @ 60` needs no extra package fields.

## PACKAGE-008-002 — Contents are not Offer terms

External `1 package = 5 kg` does not change Offer, PurchaseItem, derived total, or Acceptance.

## PACKAGE-008-003 — No kg↔package conversion

`2 kg` vs external `5 kg` package stays UNRESOLVED. No `0.4 package` / `24 MAD` (**OPEN — SPEC OQ-002A**).

## PACKAGE-008-004 — No partial-package policy

`2 kg < 5 kg` package: no partial / whole-only / split / oversupply policy (**OPEN — SPEC OQ-002A**).

## PACKAGE-008-005 — No 1-pack / 2-pack / split choice

`6 kg > 5 kg` package does not choose 1 pack, 2 packs, split, or exact 6 kg (**OPEN — SPEC OQ-002A**).

## PACKAGE-008-006 — Package bases vs identity

`quantity=5 @60` vs `quantity=20 @200` share `(seller, product, package)` and become `AMBIGUOUS_PRICE`. No evidence yet justifies a `Package` entity (**OPEN — SPEC OQ-002A**).

## VOLUME-008-001 — No schedule lookup

Buyer 3 / 7 / 12 kg does not read external tiers `20 / 17 / 14` from the domain (**OPEN — SPEC OQ-002B**).

## VOLUME-008-002 — Announcement is not an Offer

A pre-negotiation tier list has no Offer id and cannot be accepted.

## VOLUME-008-003 — Concrete Offer without provenance

`7 kg @ 17` is an Offer. No `derivedFromSchedule`.

## VOLUME-008-004 — Price change is a new Offer

`7@17` then `7@16`. Offer #1 unchanged. No schedule versioning.

## VOLUME-008-005 — Quantity change without schedule link

`5@17` → `8@17` is a new Offer.

## VOLUME-008-006 — Equal unit price, two Offers

External `1–5` and `6–10` both at 15 still produce distinct Offers. Bounds are not stored.

## VOLUME-008-007 — Equal totals regression

`5×20` and `10×10` both derive 100 and remain different Offers.

## PACKAGE-BIZ-009-001 — Listed unit representability

Catalog/spec reconstruction: PurchaseItem can store `250 g` without a contents field. Does not prove pack contents are not a business fact (**OPEN — SPEC OQ-002A**).

## PACKAGE-BIZ-009-002 — Pre-split productIds

Two pre-split `productId`s yield two identity keys. This does not prove pack sizes must be Products (**OPEN — SPEC OQ-002A**).

## VOLUME-BIZ-009-001 — Quantity-agnostic listed unit price

`createPurchaseFromList` copies listed kg unit price onto 3 / 7 / 12 kg PurchaseItems. This is not observed seller pricing behavior (**OPEN — SPEC OQ-002B**).

## SOURCE-010-CATALOG — Stage-1 catalog source search

Reads `mockSellerCatalog.ts`. A `1 кг` listing exists; honey category was found and parsed; no `1 кг` honey-block row; sack/range tokens SOURCE ABSENT in this file. Not a potato/tomato price snapshot. Not a business-flow observation (**OPEN — SPEC OQ-002A / OQ-002B**).

## SOURCE-010-EMULATOR — Stage-1 emulator source search

Reads `sellers.ts`. Identifier tokens `minQuantity` / `maxQuantity` / `tierPrice` / `PriceSchedule` are SOURCE ABSENT in this file. Not a CooperativeSeller call-shape test. Token miss is not a market finding (**OPEN — SPEC OQ-002B**).

## SOURCE-010-BASKET — ADD_TO_BASKET source search

Reads `BasketActionHandlers.ts`. Copies listed `unit` and `price`. **No conversion/tier lookup found in ADD_TO_BASKET itself.** Conversion or pricing could occur before this call (**OPEN — SPEC OQ-002A**).

## SOURCE-010-TZ025 — TZ-025 source search

Free-text «Сегодня скидка на сыр». Quantity-range tokens SOURCE ABSENT in this file. Not B3 observation (**OPEN — SPEC OQ-002B**).

## SOURCE-010-TREE — FLOW-010 absent from experiments/basket TypeScript

`experiments/basket/**/*.ts` has no `run("FLOW-010-…")` and no `function observeCooperativeAccept`. Does not search `docs/` (**OPEN — SPEC OQ-002A**).
