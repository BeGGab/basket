# TZ-BASKET-011 — OQ-002A / OQ-002B observation report

Not a SOURCE scanner. SPEC remains **v0.6**. Package / PriceSchedule are not introduced.

This report separates four layers:

```text
what was observed
        ↓
what the tool allowed
        ↓
what was NOT observed
        ↓
which conclusions are therefore impossible
```

Executable evidence: `FLOW-011-*` in `experiments/basket/tests/scenarios.ts`.
`FLOW-011-A-CONFIG-CAPABILITY` is a **capability/coverage check**, not a seller-config business-flow observation.

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

That chain was **not obtained**. The seller-config step is not executable on the inspected Stage-1 surfaces. Buyer-flow rows below run **without** a seller-configured constraint.

## Evidence boundary

| Surface | How verified in this TZ | Result | What this is not |
|---|---|---|---|
| `SellerEmulator` | **Direct runtime** `FLOW-011-A-CONFIG-CAPABILITY` | Own functions: `respondToBuyerOffer`, `tick` | Not a claim that a future emulator method cannot be added |
| `SimulationRuntime` | **Direct runtime** same scenario | Has `setCatalog` / `sellerRespond`; `configureProduct` is not a function | Not a browser session of `/sim` |
| `/sim` player catalog | **Direct runtime** unique `op` from `DEMO_SCENARIOS` | Has `catalog` / `sellerRespond`; no `configureProduct` / `setMinQuantity` op | Not every possible engine op name under another identifier |
| `/sim` view buttons | **Code inspection** of `SimulationScreenView.tsx` (this TZ; not a driven click-through) | Controls: scenario load, Run all / Step / Reset, Buyer respond, Seller respond, Tick +1h, Apply buyer / Apply seller | Not a live browser session |
| Production seller card | **Code inspection** of `SellerCardScreenView.tsx`, `SellerCardActions.tsx`, `SellerCardProducts.tsx` (this TZ; not a driven click-through) | Actions: favorite, route, share. Products render name / unit / description / price. No product-config control on those components | Not proof a seller-admin screen exists elsewhere. **Not** a driven UI test |

Do not read the last two rows as “production UI is read-only” as a market fact. They are inspections of those files/components.

## What this flow can and cannot execute

| Step | Executable in inspected Stage-1? | How |
|---|---|---|
| Seller creates/configures product (min/max/tier) | **No** | Capability check: emulator/runtime/demo ops have no configure-product operation. `/sim` view and seller-card presentation layer show no such control (code inspection). Catalog in buyer-flow runs is test `setCatalog`. |
| Catalog publication | Partial | Test fixture `setCatalog` / production `PRODUCT_SEEDS` — not a seller command |
| Buyer selects quantity | **Yes** | `addItem({ quantity })` then buyer Offer |
| Seller responds | **Yes** | programmed emulator profiles |
| Observe unit price / agreed qty | **Yes** | SellerPurchase / Offer items after accept or counter |

Limitation of the **inspected tool/flow**, not a market interview. This TZ does not extend Stage-1.

---

## OQ-002A

**Status: INCONCLUSIVE**

### Observed

- Seller-config is **not executable** on `SellerEmulator`, `SimulationRuntime`, or `DEMO_SCENARIOS` (`FLOW-011-A-CONFIG-CAPABILITY`). That row is a coverage check.
- Buyer quantities **1**, **100**, **2 / 5 / 12** kg of listed tomatoes@kg@15 are accepted at unit price 15 (`FLOW-011-A1`, `A2`, `A3`). Catalog in those runs is `setCatalog`. CooperativeSeller only accepted.
- Stage-1 catalog row and PurchaseItem in that run have no `minQuantity` / `maxQuantity` own-properties (`FLOW-011-A4-STAGE1-STATE`). Fixture-model state only.
- Available stock snapshot 1000 **before and after** a 100 kg CooperativeSeller accept; accept does not decrement catalog stock (`FLOW-011-A2`). Not inventory reservation.
- `PartialAvailabilitySeller` capping 10 kg to **stock 5** is `AVAILABILITY_CHANGE` — stock, not a product max rule (`FLOW-011-A-STOCK`).
- Quantity **0** is rejected by **I-030** at `addItem` — a domain bound, not a seller min of N (`FLOW-011-A-ZERO`).

### Evidence

| Stage | What | Kind |
|---|---|---|
| Seller-config executability | Emulator/runtime/demo ops have no configure-product operation | **Direct** capability check |
| Seller input (configure min/max) | Not executed | **No evidence** of seller-defined constraint |
| Product state | `CatalogOffer` `{ sellerId, productId, quantity, unit, price, stock }`; PurchaseItem `{ productId, quantity, unit, price }` | **Direct** (this run; Stage-1 fixture) |
| Publication | `setCatalog` in the test | **Not** a seller utterance |
| Buyer input | `addItem` quantities 1, 2, 5, 12, 100 | **Direct** |
| Observed result | STABLE at listed unit price; no min/max applied | **Direct** (buyer flow without seller constraint) |
| Counter-examples | stock cap; I-030 zero; unchanged stock snapshot | **Direct** (must not be read as min/max) |

### What this proves

On the **inspected Stage-1 surfaces**, a seller cannot execute a product-config step. In the **existing buyer/seller deal path**, quantity constraints are not applied to the observed purchases.

### What this does NOT prove

- That the required OQ-002A business-flow observation (seller configures a constraint, then buyer is bound by it) was obtained. **It was not.**
- That GreenMarket sellers cannot define quantity constraints in a flow that Stage-1 does not expose.
- That SOURCE ABSENT of `minQuantity` / `maxQuantity` tokens is a business fact (TZ-010; not reused here).
- That CooperativeSeller accept is a seller policy of “no minimum”.
- That stock capping or an unchanged stock snapshot is a product maxQuantity rule.
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
| Seller input (configure quantity-dependent price) | Not executed | **No evidence** of seller-defined schedule |
| Product state | Single listed unit price 15 | **Direct** (this run) |
| Buyer input | quantities 1, 5, 10 (and 2 vs 10 for time/counter) | **Direct** |
| Observed result | Linear `quantity × listed unit price`; other profiles change price by time or +1, not by qty table | **Direct** |

### What this proves

In this Stage-1 **buyer flow**, price application is quantity-agnostic listed unit price. Time discount and negotiating +1 are not quantity-tier schedules.

### What this does NOT prove

- That a seller-configured quantity-dependent price was observed. **It was not.**
- That a seller cannot define quantity-dependent prices in an unobserved flow.
- That VOLUME-BIZ-009-001 (catalog/spec reconstruction) is this observation — it is not; this run includes seller respond/accept.
- That CooperativeSeller, TimeDiscountSeller, or NegotiatingSeller encode a standing `PriceSchedule`.
- That OQ-002B is CONFIRMED or NOT SUPPORTED. SPEC OQ-002B stays **OPEN**.

---

## Scenario index

| ID | Kind | Maps to | Direct result |
|---|---|---|---|
| FLOW-011-A-CONFIG-CAPABILITY | capability/coverage | seller-config executability | emulator/runtime/demo ops have no configure-product operation |
| FLOW-011-A1 | buyer flow, no seller constraint | A1 min | qty 1 accepted |
| FLOW-011-A2 | buyer flow, no seller constraint | A2 max | qty 100 accepted; stock snapshot 1000 before and after |
| FLOW-011-A3 | buyer flow, no seller constraint | A3 range | 2 / 5 / 12 accepted, same unit price; seller range not set |
| FLOW-011-A4-STAGE1-STATE | Stage-1 stored state | A4 unconstrained | no min/max own-properties on fixture listing/item |
| FLOW-011-A-STOCK | hole close | stock ≠ maxQuantity | AVAILABILITY_CHANGE to stock 5 |
| FLOW-011-A-ZERO | hole close | I-030 ≠ seller min | qty 0 rejected |
| FLOW-011-B-LEVELS | buyer flow, no seller tier | Scenario B | 1 / 5 / 10 linear unit price |
| FLOW-011-B-TIME | hole close | time ≠ qty price | 15→12 at qty 2 and 10 |
| FLOW-011-B-COUNTER | hole close | +1 ≠ qty tier | +1 at qty 1 and 10 |

## Limitations

- Production buyer cart `CHANGE_QUANTITY` was not driven as a new Platform Core test (handlers were not modified). The Stage-1 analogue is `addItem` quantity.
- `/sim` buttons and production seller card were **code-inspected**, not driven in a browser.
- Live farmer interview is out of Stage-1.
- Closing OQ-002A/B as CONFIRMED or NOT SUPPORTED needs a seller-facing product-configuration flow that the inspected surfaces do not have.

## Conclusions for SPEC

- OQ-002A: **OPEN** (observation **INCONCLUSIVE**; seller-configured-constraint flow **NOT OBTAINED**)
- OQ-002B: **OPEN** (observation **INCONCLUSIVE**; seller-configured-tier flow **NOT OBTAINED**)
- NEW CONCEPT JUSTIFIED: **no**
- SPEC version: **v0.6** (no bump)
