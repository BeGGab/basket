# TZ-BASKET-011 — OQ-002A / OQ-002B observation report

Stage-2 business-flow observation on the existing Stage-1 seller/buyer path.
Not a SOURCE scanner. SPEC remains **v0.6**. Package / PriceSchedule are not introduced.

Executable evidence: `FLOW-011-*` in `experiments/basket/tests/scenarios.ts`.

## Chain that was required

```text
Seller action
    → Product configuration
    → Stored / represented product state
    → Buyer sees product
    → Buyer selects quantity
    → System applies quantity rule / price rule
    → Observed result
```

## What this flow can and cannot execute

| Step | Executable in Stage-1? | How |
|---|---|---|
| Seller creates/configures product (min/max/tier) | **No** | `SellerEmulator` exposes `respondToBuyerOffer` and `tick` only. Production seller card is read-only. `/sim` has no product-config UI. Catalog in these runs is test `setCatalog`. |
| Catalog publication | Partial | Test fixture `setCatalog` / production `PRODUCT_SEEDS` — not a seller command |
| Buyer selects quantity | **Yes** | `addItem({ quantity })` then buyer Offer |
| Seller responds | **Yes** | programmed emulator profiles |
| Observe unit price / agreed qty | **Yes** | SellerPurchase / Offer items after accept or counter |

Limitation of the **tool/flow**, not a market interview: the seller-config step cannot be reproduced without extending Stage-1. This TZ does not extend Stage-1.

---

## OQ-002A

**Status: INCONCLUSIVE**

### Observed

- A complete Stage-1 deal (list → purchase → buyer Offer → CooperativeSeller accept) reaches **STABLE** without any seller product-configuration command (`FLOW-011-A-CONFIG`).
- Buyer quantities **1**, **100**, **2 / 5 / 12** kg of the same listed tomatoes@kg@15 are accepted at unit price 15 (`FLOW-011-A1`, `A2`, `A3`).
- Stored catalog row and PurchaseItem in that run have no `minQuantity` / `maxQuantity` own-properties (`FLOW-011-A4`).
- `PartialAvailabilitySeller` capping 10 kg to **stock 5** is `AVAILABILITY_CHANGE` — stock, not a product max rule (`FLOW-011-A-STOCK`).
- Quantity **0** is rejected by **I-030** at `addItem` — a domain bound, not a seller min of N (`FLOW-011-A-ZERO`).

### Evidence

| Stage | What | Kind |
|---|---|---|
| Seller input | Not executed. No configure-product command on `SellerEmulator`. | **No evidence** of seller-defined constraint |
| Product state | `CatalogOffer` `{ sellerId, productId, quantity, unit, price, stock }`; PurchaseItem `{ productId, quantity, unit, price }` | **Direct** (this run) |
| Publication | `setCatalog` in the test | **Not** a seller utterance |
| Buyer input | `addItem` quantities 1, 2, 5, 12, 100 | **Direct** |
| Observed result | STABLE at listed unit price; no min/max applied | **Direct** |
| Counter-examples | stock cap; I-030 zero | **Direct** (must not be read as min/max) |

### What this proves

In the **existing Stage-1 executable seller/buyer flow**, quantity constraints are not configured by a seller actor and are not applied to the observed purchases.

### What this does NOT prove

- That GreenMarket sellers cannot define quantity constraints in a flow that Stage-1 does not expose.
- That SOURCE ABSENT of `minQuantity` / `maxQuantity` tokens is a business fact (TZ-010; not reused here).
- That CooperativeSeller accept is a seller policy of “no minimum”.
- That stock capping is a product maxQuantity rule.
- That I-030 is a seller min=N rule.
- That OQ-002A is CONFIRMED or NOT SUPPORTED. SPEC OQ-002A stays **OPEN**.

---

## OQ-002B

**Status: INCONCLUSIVE**

### Observed

- Buyer 1 / 5 / 10 kg: unit price stayed **15**; totals **15 / 75 / 150**; all STABLE under CooperativeSeller (`FLOW-011-B-LEVELS`).
- `TimeDiscountSeller` dropped unit price 15→12 for **both** 2 kg and 10 kg (`FLOW-011-B-TIME`).
- `NegotiatingSeller` added **+1** unit price for **both** 1 kg and 10 kg (`FLOW-011-B-COUNTER`).

### Evidence

| Stage | What | Kind |
|---|---|---|
| Seller input | Seller did not configure a quantity-dependent price | **No evidence** of seller-defined schedule |
| Product state | Single listed unit price 15 | **Direct** (this run) |
| Buyer input | quantities 1, 5, 10 (and 2 vs 10 for time/counter) | **Direct** |
| Observed result | Linear `quantity × listed unit price`; other profiles change price by time or +1, not by qty table | **Direct** |

### What this proves

In this Stage-1 flow, **price application is quantity-agnostic unit price**. Time discount and negotiating +1 are not quantity-tier schedules.

### What this does NOT prove

- That a seller cannot define quantity-dependent prices in an unobserved flow.
- That VOLUME-BIZ-009-001 (catalog/spec reconstruction) is this observation — it is not; this run includes seller respond/accept.
- That CooperativeSeller, TimeDiscountSeller, or NegotiatingSeller encode a standing `PriceSchedule`.
- That OQ-002B is CONFIRMED or NOT SUPPORTED. SPEC OQ-002B stays **OPEN**.

---

## Scenario index

| ID | Maps to | Direct result |
|---|---|---|
| FLOW-011-A-CONFIG | Seller-config step | Deal STABLE; config step not executed |
| FLOW-011-A1 | A1 min | qty 1 accepted |
| FLOW-011-A2 | A2 max | qty 100 accepted (stock 1000) |
| FLOW-011-A3 | A3 range | 2 / 5 / 12 accepted, same unit price; seller range not set |
| FLOW-011-A4 | A4 unconstrained | no min/max fields on stored listing/item |
| FLOW-011-A-STOCK | hole close | stock ≠ maxQuantity |
| FLOW-011-A-ZERO | hole close | I-030 ≠ seller min |
| FLOW-011-B-LEVELS | Scenario B | 1 / 5 / 10 linear unit price |
| FLOW-011-B-TIME | hole close | time discount ≠ qty price |
| FLOW-011-B-COUNTER | hole close | +1 ≠ qty tier |

## Limitations

- Production buyer cart `CHANGE_QUANTITY` was not driven as a new Platform Core test (handlers were not modified). The Stage-1 analogue is `addItem` quantity.
- Live farmer interview is out of Stage-1.
- Closing OQ-002A/B as CONFIRMED or NOT SUPPORTED needs a seller-facing product-configuration flow that this engine does not have.

## Conclusions for SPEC

- OQ-002A: **OPEN** (observation **INCONCLUSIVE**)
- OQ-002B: **OPEN** (observation **INCONCLUSIVE**)
- NEW CONCEPT JUSTIFIED: **no**
- SPEC version: **v0.6** (no bump)
