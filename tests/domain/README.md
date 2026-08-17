# Executable domain scenarios

Reserved location for domain-level executable scenarios of
[`docs/domain/GREENMARKET_DOMAIN_SPEC.md`](../../docs/domain/GREENMARKET_DOMAIN_SPEC.md).

Do **not** migrate the whole specification here. New confirmed rules get a scenario as they appear.
Until a dedicated runner lives in this folder, the Stage 1 basket experiment is the executable
evidence:

```
npx tsx experiments/basket/tests/run.ts
```

## Mapping (SPEC §44 → current tests)

| Scenario id | Rule | Current evidence |
| --- | --- | --- |
| `CATALOG-UNIT-001` | same product + different unit → independent catalog lines | `experiments/basket/tests/run.ts` unit-aware resolution (kg ListItem vs pcs catalog → `UNAVAILABLE`) |
| `PURCHASE-ITEM-UNIT-001` | same product + different unit → independent PurchaseItems | `run.ts` two-units SellerPurchase (`kg` + `pcs` both kept) |
| `CATALOG-AMBIGUOUS-001` | same seller+product+unit, different prices → ambiguous | `run.ts` `AMBIGUOUS_PRICE` (no SellerPurchase; array order is not a price policy) |
| `STOCK-UNIT-001` | same product + different units → independent stock lines | `run.ts` PartialAvailabilitySeller: kg stock=2, pcs stock=100, 5 kg request → offer 2 kg |
| `STOCK-RACE-001` | stock=6, A=4, B=3 → conflict detected, no allocation | `experiments/basket/tests/scenarios.ts` BS-011 / BS-023 |
| `ADVICE-STALE-OFFER-001` | same Offer id + changed content → stale | `experiments/basket/tests/assistants.ts` basis fingerprint |
| `ADVICE-STALE-TIME-001` | Advice → clock advances → apply → stale | `assistants.ts` time-race |
| `COUNTER-MULTI-001` | multi-item counter → every line validated | `experiments/basket/runtime/demos.ts` `TZ004-MULTI-COUNTER` |
| `PARTIAL-FULFILLMENT-001` | agreed 20 → fulfilled 5 when policy permits | `run.ts` I-019 mockFulfill |
| `SILENCE-VALID-001` | active Offer + no command + time < validUntil → same status/pointers | `scenarios.ts` BS-029 |
| `SILENCE-EXPIRED-001` | active Offer + no command + time > validUntil → same status/pointers, not REJECT | `scenarios.ts` BS-030 / BS-022 |
| `AGREED-EXPIRE-001` | accepted A expires, no replacement → STABLE, pointers stay A | `scenarios.ts` BS-031 / BS-012 |
| `AGREED-EXPIRE-NEW-001` | A accepted, A expires, B proposed → agreed=A, active=B, B acceptable | `scenarios.ts` BS-032 |
| `PRICE-UNIT-001` | 2 kg × 15 stored as unit price; no `linePrice` | `scenarios.ts` PRICE-UNIT-001 |
| `PRICE-UNIT-002` | 2 kg × 15 vs 1 kg × 30 distinguishable | `scenarios.ts` PRICE-UNIT-002 |
| `PRICE-OFFER-001` | price 15 → 12 is a new immutable Offer | `scenarios.ts` PRICE-OFFER-001 |
| `PRICE-QTY-001` | quantity change does not reread price as line total | `scenarios.ts` PRICE-QTY-001 |
| `PRICE-ABSENT-001` | missing price → no derived total | `scenarios.ts` PRICE-ABSENT-001 |
| `PRICE-CATALOG-QTY-001` | catalog `quantity` ≠ requested quantity | `scenarios.ts` PRICE-CATALOG-QTY-001 |
| `PACKAGE-001` | 1 package @ 60 representable as a unit | `scenarios.ts` PACKAGE-001 |
| `PACKAGE-002` | catalog qty 5→20: same price ok; different price AMBIGUOUS | `scenarios.ts` PACKAGE-002 |
| `PACKAGE-003` | current identity cannot represent distinct package bases | `scenarios.ts` PACKAGE-003 |
| `PACKAGE-004` | package contents / conversion = MODEL GAP (OPEN) | `scenarios.ts` PACKAGE-004 |
| `ALT-PRICE-001` | primary cheaper than alternative — representation only | `scenarios.ts` ALT-PRICE-001 |
| `ALT-PRICE-002` | FIRST_AVAILABLE / PRIMARY_ONLY ≠ BEST_PRICE; policy OPEN | `scenarios.ts` ALT-PRICE-002 |
| `PRICE-SNAPSHOT-001` | agreed / current / alternative together | `scenarios.ts` PRICE-SNAPSHOT-001 |
| `PRICE-ZERO-001` | price 0 is a unit price, not a missing price | `scenarios.ts` PRICE-ZERO-001 |
| `PRICE-LIST-QTY-ABSENT-001` | omitted List quantity defaults to 1, not catalog qty | `scenarios.ts` PRICE-LIST-QTY-ABSENT-001 |
| `ALT-UNIT-001` | alternative in another unit is not converted | `scenarios.ts` ALT-UNIT-001 |
| `ALT-PACK-001` | list qty vs alt catalog pack size exposed | `scenarios.ts` ALT-PACK-001 |
| `ALT-STABILITY-001` | List alternative remains after current item is replaced | `scenarios.ts` ALT-STABILITY-001 |
| `PRICE-REGRESSION-001` | hike/discount still use unit price | `scenarios.ts` PRICE-REGRESSION-001 |
| `PRICE-TOTAL-001` | I-030/I-046 bounds; `unitLineTotal` only multiplies | `scenarios.ts` PRICE-TOTAL-001 |
| `PACKAGE-SEM-001` | 1 package @ 60 offered, accepted, snapshotted | `scenarios.ts` PACKAGE-SEM-001 |
| `PACKAGE-SEM-002` | package bases not stored (OPEN OQ-002A) | `scenarios.ts` PACKAGE-SEM-002 |
| `PACKAGE-SEM-003` | catalog package size ≠ requested quantity | `scenarios.ts` PACKAGE-SEM-003 |
| `PACKAGE-SEM-004` | 2 kg vs package catalog — no conversion | `scenarios.ts` PACKAGE-SEM-004 |
| `PACKAGE-SEM-005` | no partial package | `scenarios.ts` PACKAGE-SEM-005 |
| `PACKAGE-SEM-006` | no whole-package-only / split | `scenarios.ts` PACKAGE-SEM-006 |
| `VOLUME-PRICE-001` | linear 5@15 and 20@15 | `scenarios.ts` VOLUME-PRICE-001 |
| `VOLUME-PRICE-002` | volume discount is two Offers | `scenarios.ts` VOLUME-PRICE-002 |
| `VOLUME-PRICE-003` | same qty, different price; A immutable | `scenarios.ts` VOLUME-PRICE-003 |
| `VOLUME-PRICE-004` | same derived total ≠ same Offer | `scenarios.ts` VOLUME-PRICE-004 |
| `VOLUME-PRICE-005` | concrete quantity-dependent Offers | `scenarios.ts` VOLUME-PRICE-005 |
| `VOLUME-PRICE-005B` | standing schedule absent (OPEN OQ-002B) | `scenarios.ts` VOLUME-PRICE-005B |
| `VOLUME-PRICE-006` | quantity change is a new Offer | `scenarios.ts` VOLUME-PRICE-006 |
| `VOLUME-PRICE-007` | seller reprice after qty increase | `scenarios.ts` VOLUME-PRICE-007 |
| `VOLUME-PRICE-008` | snapshot keeps unit-price basis | `scenarios.ts` VOLUME-PRICE-008 |
| `SNAPSHOT-VOL-001` | requested/agreed/current/alt; contents absent | `scenarios.ts` SNAPSHOT-VOL-001 |
| `PACKAGE-008-001` | 1 package @ 60, no extra fields | `scenarios.ts` PACKAGE-008-001 |
| `PACKAGE-008-002` | external 5 kg is not an Offer term | `scenarios.ts` PACKAGE-008-002 |
| `PACKAGE-008-003` | 2 kg vs package — no conversion | `scenarios.ts` PACKAGE-008-003 |
| `PACKAGE-008-004` | no partial/whole/split policy | `scenarios.ts` PACKAGE-008-004 |
| `PACKAGE-008-005` | 6 kg does not choose 1/2/split packs | `scenarios.ts` PACKAGE-008-005 |
| `PACKAGE-008-006` | package bases — identity GAP; no evidence yet justifies Package | `scenarios.ts` PACKAGE-008-006 |
| `VOLUME-008-001` | 3/7/12 kg do not read external tiers | `scenarios.ts` VOLUME-008-001 |
| `VOLUME-008-002` | tier announcement is not an Offer | `scenarios.ts` VOLUME-008-002 |
| `VOLUME-008-003` | 7@17 without schedule provenance | `scenarios.ts` VOLUME-008-003 |
| `VOLUME-008-004` | 17→16 is a new Offer | `scenarios.ts` VOLUME-008-004 |
| `VOLUME-008-005` | qty change without schedule link | `scenarios.ts` VOLUME-008-005 |
| `VOLUME-008-006` | equal unit price still two Offers | `scenarios.ts` VOLUME-008-006 |
| `VOLUME-008-007` | equal derived totals ≠ Offer identity | `scenarios.ts` VOLUME-008-007 |
| `PACKAGE-BIZ-009-001` | listed 250 g pack unit completes without contents | `scenarios.ts` PACKAGE-BIZ-009-001 |
| `PACKAGE-BIZ-009-002` | 500 g vs 350 g honey are distinct Products | `scenarios.ts` PACKAGE-BIZ-009-002 |
| `VOLUME-BIZ-009-001` | 3/7/12 kg tomatoes use listed kg unit price | `scenarios.ts` VOLUME-BIZ-009-001 |
| `VOLUME-BIZ-009-002` | TZ-025 discount text is not an Offer/schedule | `scenarios.ts` VOLUME-BIZ-009-002 |
| *(SPEC OQ-003)* | duplicate ListItems of same `(productId, unit)` | `run.ts` `DUPLICATE_LINE` (explicit, not silent collapse) |

A PR that confirms a new domain rule MUST add or update a row here **and** the executable test.
