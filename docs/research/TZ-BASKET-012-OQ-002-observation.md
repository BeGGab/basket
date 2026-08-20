# TZ-BASKET-012 — OQ-002A / OQ-002B seller-facing configuration observation

Continuation of TZ-BASKET-011. Not a SOURCE scanner. SPEC remains **v0.6**.
Package / PriceSchedule / minQuantity / maxQuantity fields / new invariants are not introduced.

`setCatalog` and `setStock` are **not** seller configuration.

Executable rows: `FLOW-012-*` in `experiments/basket/tests/scenarios.ts`.
Impl status of every FLOW-012 row: **NOT EXECUTABLE**.
OQ status: **INCONCLUSIVE** (not NOT SUPPORTED).

## Required chain

```text
Seller configures product
        ↓
configuration becomes product state
        ↓
Buyer sees configured product
        ↓
Buyer requests quantity
        ↓
System applies configured rule
        ↓
Seller/Buyer deal result
```

That chain was **not obtained**. The first step is not executable on inspected surfaces, so later stages were not run against a seller-configured state.

## Surfaces inspected

| Surface | How verified | Seller-facing product config? |
|---|---|---|
| `SellerEmulator` | **DIRECT** runtime `FLOW-012-*` | Own functions `respondToBuyerOffer`, `tick`. `configureProduct` is not a function |
| `BasketWorld` | **DIRECT** runtime | `setCatalog` / `setStock` exist and were **not** used as config. `setMinQuantity` / `setMaxQuantity` / `setPriceSchedule` are not functions |
| `SimulationRuntime` | **DIRECT** runtime | `configureProduct` is not a function |
| `DEMO_SCENARIOS` (`/sim` player catalog) | **DIRECT** runtime unique `op` | no `configureProduct` op |
| `SellerRepository` | **CODE INSPECTION** `SellerRepository.ts` | `get*` / `search*` / `find*` only. No save/update/configure |
| `SellerCatalogScreen` | **CODE INSPECTION** | actions: OPEN_PRODUCT, SELECT_CATEGORY, REFRESH_CATALOG, BACK, CLOSE_SCREEN |
| Production seller card | **CODE INSPECTION** (TZ-011, still valid) | favorite / route / share; products displayed; no config control |
| `/sim` view | **CODE INSPECTION** (TZ-011, still valid) | scenario run / buyer-seller respond / tick / apply advice |
| `buyer_mvp/api.ts` | **CODE INSPECTION** | `fetchGroups` / `fetchProducts` / `fetchProduct` — buyer read |

Priority order from the TZ: real seller flow → API/command → emulator → document impossibility.
No higher-priority surface provided an executable seller config step.

## What was observed / allowed / not observed / impossible

```text
observed: live objects have no seller configure-product operation
allowed: buyer/seller deals without seller-configured rules (TZ-011); inventory setStock
not observed: seller input that becomes product constraint/tier state
impossible from this TZ: CONFIRMED or NOT SUPPORTED for OQ-002A/B
```

---

## OQ-002A

**Status: INCONCLUSIVE**

Scenario-level status: **NOT EXECUTABLE** for FLOW-012-A-*.

### Evidence records

#### FLOW-012-A-CONFIG

- Seller action: set minimum N — **not executed**
- Seller configured state: **none**
- Buyer action: **not run**
- System result: **NOT EXECUTABLE**
- Evidence kind: **DIRECT** (emulator/world/runtime/demos) + **CODE INSPECTION** (repository/screens/API) in this report
- What this proves: inspected surfaces have no seller set-minimum command
- What this does NOT prove: that sellers cannot set a minimum in an unobserved flow; NOT SUPPORTED
- OQ: SPEC-OQ-002A
- Status: NOT EXECUTABLE

#### FLOW-012-A-BELOW-MIN

- Seller action: set min=N — **not executed**
- Seller configured state: **none**
- Buyer action: quantity N-1 against that state — **not run**
- System result: **NOT EXECUTABLE**
- Evidence kind: **DIRECT**
- What this proves: below-min buyer flow cannot be observed without prior seller config
- What this does NOT prove: I-030 qty 0; FLOW-011 unconstrained qty 1
- OQ: SPEC-OQ-002A
- Status: NOT EXECUTABLE

#### FLOW-012-A-AT-MIN

- Same gap: at-min buyer flow not run against configured min
- Status: NOT EXECUTABLE

#### FLOW-012-A-MAX-CONFIG

- Seller action: set maximum M — **not executed**
- `setStock` exists and is inventory, not this configuration
- Status: NOT EXECUTABLE

#### FLOW-012-A-ABOVE-MAX / FLOW-012-A-AT-MAX

- Buyer M+1 / M against configured max — **not run**
- Not PartialAvailabilitySeller stock cap
- Status: NOT EXECUTABLE

#### FLOW-012-A-RANGE

- Seller set min=N and max=M — **NOT EXECUTABLE**
- Not an artificial PASS of unconstrained 2/5/12
- Status: NOT EXECUTABLE

### What this proves

On inspected Stage-1 surfaces, a seller cannot execute a quantity-constraint configuration, so OQ-002A cannot be CONFIRMED or NOT SUPPORTED from this TZ.

### What this does NOT prove

- NOT SUPPORTED of quantity constraints as a market/business function
- That SOURCE token absence is a business fact
- That I-030, stock cap, stock snapshot, or FLOW-011 unconstrained quantities are this observation

---

## OQ-002B

**Status: INCONCLUSIVE**

Scenario-level status: **NOT EXECUTABLE** for FLOW-012-B-*.

### Evidence records

#### FLOW-012-B-CONFIG

- Seller action: set 1 kg→15 / 5 kg→13 / 10 kg→11 — **not executed**
- Seller configured state: **none**
- Buyer action: **not run**
- System result: **NOT EXECUTABLE**
- Evidence kind: **DIRECT** + **CODE INSPECTION**
- What this proves: inspected surfaces have no seller set-quantity-price-table command
- What this does NOT prove: NOT SUPPORTED of quantity-dependent pricing
- OQ: SPEC-OQ-002B
- Status: NOT EXECUTABLE

#### FLOW-012-B-Q1 / Q5 / Q10

- Buyer 1 / 5 / 10 kg against seller-configured prices — **not run**
- Not FLOW-011-B-LEVELS linear listed unit price
- Status: NOT EXECUTABLE

#### FLOW-012-B-CROSS-CHECK

- Cannot prove applied price tracks a seller-configured quantity table versus time/profile/counter/fixture, because no table was configured
- TimeDiscount and NegotiatingSeller +1 were **not** reused as this evidence
- Status: NOT EXECUTABLE

### What this proves

On inspected Stage-1 surfaces, a seller cannot execute quantity-dependent price configuration, so OQ-002B cannot be CONFIRMED or NOT SUPPORTED from this TZ.

### What this does NOT prove

- NOT SUPPORTED of quantity-dependent pricing as a business function
- Linear 15/15/15, TimeDiscount, or +1 as this observation

## Conclusions for SPEC

- OQ-002A: **OPEN** (observation **INCONCLUSIVE**; seller-configured-constraint flow **NOT OBTAINED**; scenarios **NOT EXECUTABLE**)
- OQ-002B: **OPEN** (observation **INCONCLUSIVE**; seller-configured-tier flow **NOT OBTAINED**; scenarios **NOT EXECUTABLE**)
- NEW CONCEPT JUSTIFIED: **no**
- SPEC version: **v0.6** (no bump)
- Next domain decision, if any, is a **separate** TZ. This TZ does not invent a seller-config API to manufacture evidence.
