# ТЗ-BASKET-012 — Seller-facing configuration observation for OQ-002A / OQ-002B

**Проект:** GreenMarket  
**Stage:** 1 — экспериментальный Basket Domain  
**Тип:** seller-facing configuration + buyer-flow observation  
**Продолжение:** TZ-BASKET-011  
**Приёмка:** GitHub PR from `basket-pr-27`  
**Статус:** Implemented — OQ-002A/B **INCONCLUSIVE**; FLOW-012 Impl **NOT EXECUTABLE**; seller-configured observation **NOT OBTAINED**  
**SPEC:** v0.6, **не bump**

Canonical observation report: [`docs/research/TZ-BASKET-012-OQ-002-observation.md`](../research/TZ-BASKET-012-OQ-002-observation.md).

Scenario count is produced by `npx tsx experiments/basket/tests/run.ts` (`rows.length` in RESULTS). Do not hand-edit a total here.

## Domain contract

Read before changing anything:

- `docs/domain/GREENMARKET_DOMAIN_SPEC.md` v0.6
- `docs/basket/TZ-BASKET-007.md` … `TZ-BASKET-011.md`
- `docs/basket/BASKET_OPEN_QUESTIONS.md`
- `docs/basket/BASKET_BREAKING_SCENARIOS.md`

Не реализовывать minQuantity / maxQuantity / PriceSchedule, чтобы затем доказать их своими тестами. `setCatalog` не seller configuration.

## Результат

```text
OQ-002A  Status: INCONCLUSIVE
OQ-002B  Status: INCONCLUSIVE
FLOW-012 Impl: NOT EXECUTABLE
SPEC     v0.6 unchanged
NEW CONCEPT JUSTIFIED: no
SELLER-CONFIGURED CONSTRAINT FLOW: NOT OBTAINED
SELLER-CONFIGURED TIER FLOW: NOT OBTAINED
```

Inspected Stage-1 surfaces were attempted in priority order (UI → API/command → emulator). None executes the required seller-config step. Absence of that capability is **not** NOT SUPPORTED of the business function.

## Executable scenarios

| ID | OQ | Impl | Meaning |
|---|---|---|---|
| FLOW-012-A-CONFIG | 002A | NOT EXECUTABLE | seller set min=N not executed |
| FLOW-012-A-BELOW-MIN | 002A | NOT EXECUTABLE | buyer N-1 against configured min not run |
| FLOW-012-A-AT-MIN | 002A | NOT EXECUTABLE | buyer N against configured min not run |
| FLOW-012-A-MAX-CONFIG | 002A | NOT EXECUTABLE | seller set max=M not executed |
| FLOW-012-A-ABOVE-MAX | 002A | NOT EXECUTABLE | buyer M+1 against configured max not run |
| FLOW-012-A-AT-MAX | 002A | NOT EXECUTABLE | buyer M against configured max not run |
| FLOW-012-A-RANGE | 002A | NOT EXECUTABLE | seller set min+max not executed |
| FLOW-012-B-CONFIG | 002B | NOT EXECUTABLE | seller set 1/5/10 kg prices not executed |
| FLOW-012-B-Q1 | 002B | NOT EXECUTABLE | buyer 1 kg against configured table not run |
| FLOW-012-B-Q5 | 002B | NOT EXECUTABLE | buyer 5 kg against configured table not run |
| FLOW-012-B-Q10 | 002B | NOT EXECUTABLE | buyer 10 kg against configured table not run |
| FLOW-012-B-CROSS-CHECK | 002B | NOT EXECUTABLE | cannot separate qty table from time/profile/counter |

## Pre-closed holes

### H1. `setCatalog` is not seller configuration

`BasketWorld.setCatalog` exists (`worldHasSetCatalog=true`) and was **not** used as FLOW-012 seller input.

### H2. `setStock` is not maxQuantity

`worldHasSetStock=true`. Inventory, not product max. Not used as FLOW-012-A-MAX-CONFIG.

### H3. NOT EXECUTABLE is not NOT SUPPORTED

Missing Stage-1 capability ≠ business function unsupported.

### H4. FLOW-011 buyer deals are not FLOW-012 evidence

Unconstrained 1/100/12 kg and linear 15/15/15 stay TZ-011. FLOW-012 does not re-run them as constraint/tier proof.

### H5. SOURCE tokens are not this evidence

No QUANTITY_RANGE_IDENTS / minQuantity scanner.

### H6. No speculative domain fields

No Package, PriceSchedule, minQuantity, maxQuantity, new invariants, SPEC bump.

### H7. Platform Core unchanged

No `BasketActionHandlers`, Customer UI, seller-card edits to manufacture evidence.

### H8. Did not implement then test

No fake configure-product API added to the emulator.

### H9. DIRECT vs CODE INSPECTION

Runtime method-presence is DIRECT. SellerRepository / SellerCatalogScreen / seller-card / `/sim` view / buyer API are CODE INSPECTION in the report.

### H10. Scenario count from the runner

`formatResults` uses `${rows.length}`. This file does not hardcode a total.

### H11. Calling a missing method is not seller action

`sellerActionExecuted=false`. No `(emu as any).configureProduct(...)` disguised as input.

### H12. I-030 / stock / time / +1 not reused

A-BELOW-MIN is not qty 0. A-ABOVE-MAX is not stock cap. B-CROSS-CHECK does not cite TimeDiscount or +1.

### H13. SellerRepository getters are not seller config

Read-only catalog/search.

### H14. `proposeOffer` is a deal act, not product configuration

Not used as FLOW-012 seller input.

### H15. Impl NOT EXECUTABLE ≠ Domain CONFIRMED

Domain stays OPEN. OQs stay OPEN.

## Definition of Done

### Evidence

- [x] seller-facing configuration mechanism identified (none executable on inspected surfaces)
- [x] seller configuration executed **or** impossibility documented
- [ ] seller-configured state captured (impossible without the command)
- [ ] buyer-flow executed against configured state (not run)
- [x] result captured directly (NOT EXECUTABLE)
- [x] evidence boundary documented
- [x] fixture configuration not presented as seller action

### OQ-002A

- [x] minimum constraint tested for executability
- [x] maximum constraint tested for executability
- [x] range tested for executability
- [x] status from evidence only: **INCONCLUSIVE**

### OQ-002B

- [x] seller quantity-dependent prices tested for executability
- [x] three quantity levels cannot run against configured state — documented
- [x] time/counter excluded
- [x] status from evidence only: **INCONCLUSIVE**

### Architecture / SPEC / Regression

- [x] Platform Core unchanged
- [x] no new scanner
- [x] no Package / PriceSchedule / speculative fields
- [x] SPEC v0.6
- [x] OQ not closed
- [x] existing scenarios still run; FLOW-012 returns documented NOT EXECUTABLE
