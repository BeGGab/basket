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
| `PACKAGE-001` | 1 package @ 60 representable; contents = MODEL GAP | `scenarios.ts` PACKAGE-001 |
| `PACKAGE-002` | catalog qty 5→20: same price ok; different price AMBIGUOUS | `scenarios.ts` PACKAGE-002 |
| `PACKAGE-003` | same package quantity, different external basis invisible | `scenarios.ts` PACKAGE-003 |
| `ALT-PRICE-001` | primary cheaper than alternative — representation only | `scenarios.ts` ALT-PRICE-001 |
| `ALT-PRICE-002` | primary dearer than alternative — not BEST_PRICE | `scenarios.ts` ALT-PRICE-002 |
| `PRICE-SNAPSHOT-001` | agreed / current / alternative together | `scenarios.ts` PRICE-SNAPSHOT-001 |
| `PRICE-ZERO-001` | price 0 is a unit price, not a missing price | `scenarios.ts` PRICE-ZERO-001 |
| `PRICE-LIST-QTY-ABSENT-001` | omitted List quantity defaults to 1, not catalog qty | `scenarios.ts` PRICE-LIST-QTY-ABSENT-001 |
| `ALT-UNIT-001` | alternative in another unit is not converted | `scenarios.ts` ALT-UNIT-001 |
| *(SPEC OQ-003)* | duplicate ListItems of same `(productId, unit)` | `run.ts` `DUPLICATE_LINE` (explicit, not silent collapse) |

A PR that confirms a new domain rule MUST add or update a row here **and** the executable test.
