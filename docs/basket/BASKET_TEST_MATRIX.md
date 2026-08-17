# GreenMarket — Basket Experiment Test Matrix

**Status:** Experimental Baseline v0.1

`/sim` is a **demo/training viewer**, not the acceptance interface for BS-001…036 or PRICE-*/PACKAGE-*/ALT-*. All 93 scenarios are **programmatically exercised** by `npx tsx experiments/basket/tests/run.ts` (Model column). Impl PASS does not mean Domain CONFIRMED — some rows stay Domain OPEN. The `/sim demo` column is ✓ only when a named scenario on `/sim` covers that check for a human.

| ID | Scenario | Model | Emulator | /sim demo | Main check |
|---|---|:---:|:---:|:---:|---|
| BS-001 | List → Purchase | ✓ |  |  | List/Purchase |
| BS-002 | Multiple sellers | ✓ | ✓ | ✓ | SellerPurchase switcher (TZ002-THREE-SELLERS) |
| BS-003 | Independent lifecycle | ✓ | ✓ | ✓ | A STABLE / B counter / C silence |
| BS-004 | Long negotiation | ✓ | ✓ |  | Offer history |
| BS-005 | Price change | ✓ | ✓ |  | immutability |
| BS-006 | Time discount | ✓ | ✓ | ✓ | TZ002-TIME_DISCOUNT |
| BS-007 | Quantity reduction | ✓ | ✓ |  | agreement |
| BS-008 | Composition change | ✓ | ✓ |  | history |
| BS-009 | Alternatives | ✓ | ✓ |  | resolution |
| BS-010 | Expensive alternative | ✓ | ✓ |  | resolution policy |
| BS-011 | Stock race | ✓ | ✓ |  | boundary |
| BS-012 | Expiration | ✓ | ✓ |  | I-028 cannot accept expired; I-037/I-038 agreed expiry keeps STABLE |
| BS-013 | Silence | ✓ | ✓ | ✓ | TZ002-SILENCE |
| BS-014 | Partial fulfillment | ✓ | ✓ |  | STABLE/fulfillment |
| BS-015 | List → multiple Purchases | ✓ |  |  | reuse |
| BS-016 | Snapshot conflict | ✓ | ✓ | ✓ | TZ002-SNAPSHOT |
| BS-017 | Accept previous Offer | ✓ | ✓ |  | acceptance semantics |
| BS-018 | Substitution | ✓ | ✓ |  | substitution |
| BS-019 | Alternative across sellers | ✓ | ✓ |  | resolution ordering |
| BS-020 | Simultaneous seller changes | ✓ | ✓ | ✓ | TZ002-THREE-SELLERS |
| BS-021 | Expired + new Offer | ✓ | ✓ |  | new Offer becomes active; expired stays historical (I-011) |
| BS-022 | Silence after expiration | ✓ | ✓ |  | I-039 not a command; status stays WAITING_BUYER |
| BS-023 | Conflicting promises | ✓ | ✓ |  | stock=6 combined=7 OFFER_CREATION; both STABLE |
| BS-024 | Accepted + new Offer | ✓ | ✓ | ✓ | TZ002-SNAPSHOT agreed ≠ current |
| BS-025 | Accepted substitution + new Offer | ✓ | ✓ |  | history |
| BS-026 | Silence while valid | ✓ | ✓ | ✓ | TZ002-SILENCE |
| BS-027 | Unacceptable alternative price | ✓ | ✓ |  | policy |
| BS-028 | Partial availability before STABLE | ✓ | ✓ |  | agreed/active qty=5 |
| BS-029 | Silence while valid | ✓ |  |  | I-039 pointers/status unchanged |
| BS-030 | Silence until expiration | ✓ |  |  | I-039 not implicit REJECT |
| BS-031 | Accepted Offer expires | ✓ |  |  | I-037/I-038 STABLE + pointers stay |
| BS-032 | Expiry then new Offer | ✓ |  |  | agreed=A, active=B, B acceptable |
| BS-033 | Expired cannot be revived | ✓ |  |  | I-028 |
| BS-034 | Expired cannot be countered | ✓ |  |  | I-035 isCounterReason blocked; PRICE_CHANGE allowed |
| BS-035 | Silence invents no FSM state | ✓ |  |  | I-039 / I-041 |
| BS-036 | Time determinism | ✓ |  |  | I-040 identical full snapshot |
| PRICE-UNIT-001 | 2 kg × 15 | ✓ |  |  | I-042 unit price; no linePrice |
| PRICE-UNIT-002 | 1 kg × 30 vs 2 kg × 15 | ✓ |  |  | distinguishable facts |
| PRICE-OFFER-001 | 15 → 12 | ✓ |  |  | I-044 immutable Offer |
| PRICE-QTY-001 | 2 kg → 4 kg @ 15 | ✓ |  |  | I-043 quantity ≠ line price |
| PRICE-ABSENT-001 | missing price | ✓ |  |  | no invented total |
| PRICE-CATALOG-QTY-001 | catalog qty 20, request 2 | ✓ |  |  | I-045 |
| PACKAGE-001 | 1 package @ 60 | ✓ |  |  | representable as a unit |
| PACKAGE-002 | 5 kg → 20 kg | ✓ |  |  | same price ok; volume AMBIGUOUS |
| PACKAGE-003 | same qty, different basis | ✓ |  |  | identity cannot represent bases |
| PACKAGE-004 | package contents | ✓ |  |  | contents/conversion OPEN |
| ALT-PRICE-001 | primary cheaper | ✓ |  |  | representation only |
| ALT-PRICE-002 | primary dearer | ✓ |  |  | not BEST_PRICE; policy OPEN |
| PRICE-SNAPSHOT-001 | agreed/current/alt | ✓ |  |  | I-023 |
| PRICE-ZERO-001 | 2 kg @ 0 | ✓ |  |  | 0 is a unit price |
| PRICE-LIST-QTY-ABSENT-001 | omitted list qty | ✓ |  |  | default 1 ≠ catalog qty |
| ALT-UNIT-001 | alt in pcs, list in kg | ✓ |  |  | no unit conversion |
| ALT-PACK-001 | list 2 kg vs alt pack 5 kg | ✓ |  |  | projection, no policy |
| ALT-STABILITY-001 | offer/sub/replace | ✓ |  |  | List alt after primary replaced |
| PRICE-REGRESSION-001 | hike/discount | ✓ |  |  | 15 is MAD/kg |
| PRICE-TOTAL-001 | invalid qty/price | ✓ |  |  | I-030/I-046; absence named |
| PACKAGE-SEM-001 | 1 package @ 60 accept | ✓ |  |  | package as unit |
| PACKAGE-SEM-002 | 5 vs 20 package basis | ✓ |  |  | contents not stored |
| PACKAGE-SEM-003 | catalog size ≠ requested | ✓ |  |  | I-045 / I-047 |
| PACKAGE-SEM-004 | 2 kg vs package catalog | ✓ |  |  | no conversion |
| PACKAGE-SEM-005 | 2 kg < external 5 kg pack | ✓ |  |  | no partial package |
| PACKAGE-SEM-006 | 6 kg > external 5 kg pack | ✓ |  |  | no split / whole-only |
| VOLUME-PRICE-001 | 5@15 and 20@15 | ✓ |  |  | linear baseline |
| VOLUME-PRICE-002 | 5@15 vs 20@12 | ✓ |  |  | two Offers |
| VOLUME-PRICE-003 | 20@15 then 20@12 | ✓ |  |  | A immutable |
| VOLUME-PRICE-004 | same total 100 | ✓ |  |  | not Offer identity |
| VOLUME-PRICE-005 | 3@20 / 7@17 / 12@14 | ✓ |  |  | concrete Offers |
| VOLUME-PRICE-005B | standing tier schedule | ✓ |  |  | schedule OPEN |
| VOLUME-PRICE-006 | qty 5→10 | ✓ |  |  | new Offer |
| VOLUME-PRICE-007 | 5@15 → 10@12 | ✓ |  |  | seller reprice |
| VOLUME-PRICE-008 | 20 kg @ 12 in snapshot | ✓ |  |  | price basis kept |
| SNAPSHOT-VOL-001 | canonical vol snapshot | ✓ |  |  | contents absent |
| PACKAGE-008-001 | 1 package @ 60 | ✓ |  |  | no extra fields |
| PACKAGE-008-002 | contents vs deal | ✓ |  |  | not Offer terms |
| PACKAGE-008-003 | 2 kg vs 5 kg pack | ✓ |  |  | no conversion |
| PACKAGE-008-004 | 2 kg < pack | ✓ |  |  | no partial policy |
| PACKAGE-008-005 | 6 kg > pack | ✓ |  |  | no 1/2/split |
| PACKAGE-008-006 | 5 vs 20 bases | ✓ |  |  | identity GAP |
| VOLUME-008-001 | 3/7/12 kg vs tiers | ✓ |  |  | no schedule lookup |
| VOLUME-008-002 | announcement | ✓ |  |  | not an Offer |
| VOLUME-008-003 | 7@17 | ✓ |  |  | no provenance |
| VOLUME-008-004 | 17→16 | ✓ |  |  | new Offer |
| VOLUME-008-005 | 5→8 @17 | ✓ |  |  | no schedule link |
| VOLUME-008-006 | equal tier prices | ✓ |  |  | two Offers |
| VOLUME-008-007 | totals 100=100 | ✓ |  |  | I-048 regression |
| PACKAGE-BIZ-009-001 | listed 250 g representable | ✓ |  |  | OPEN reconstruction |
| PACKAGE-BIZ-009-002 | pre-split productIds | ✓ |  |  | OPEN; not OQ-002A evidence |
| VOLUME-BIZ-009-001 | listed price on 3/7/12 kg | ✓ |  |  | OPEN; not seller pricing |
| SOURCE-010-CATALOG | read mockSellerCatalog.ts | ✓ |  |  | OPEN; source inspection, not I-047/I-050 |
| SOURCE-010-EMULATOR | read sellers.ts | ✓ |  |  | OPEN; source inspection, not I-047/I-050 |
| SOURCE-010-BASKET | read ADD_TO_BASKET | ✓ |  |  | OPEN; source inspection, not I-045 |
| SOURCE-010-TZ025 | read TZ-025 | ✓ |  |  | OPEN; source inspection, not I-050 |
| SOURCE-010-TREE | experiments/basket **/*.ts | ✓ |  |  | OPEN; cleanup of two historical FLOW-010 names, not all synthetic flow |

TZ-004 assistant demos on `/sim` (DISCOUNT / HIKE / SELLER) are training overlays, not rows in this BS matrix.

## Mandatory acceptance scenarios

Exercised in the Model column (programmatic), not by `/sim`:

1. BS-003
2. BS-006
3. BS-009
4. BS-010
5. BS-011
6. BS-012
7. BS-013
8. BS-014
9. BS-016
10. BS-024
11. BS-028

Passing all scenarios is not sufficient. Record model gaps, overloaded entities, duplicated state and artificial workarounds.
