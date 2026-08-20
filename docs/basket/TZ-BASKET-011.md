# ТЗ-BASKET-011 — Business-flow observation for OQ-002A / OQ-002B

**Проект:** GreenMarket  
**Stage:** 1 — экспериментальный Basket Domain  
**Тип:** capability check + buyer-flow observation (продолжение TZ-BASKET-010)  
**Приёмка:** GitHub PR #14 (`basket-pr-26`)  
**Статус:** Implemented — observation **INCONCLUSIVE** for both OQs; seller-configured-constraint observation **NOT OBTAINED**  
**SPEC:** v0.6, **не bump**

Canonical observation report: [`docs/research/TZ-BASKET-011-OQ-002-observation.md`](../research/TZ-BASKET-011-OQ-002-observation.md).

## Domain contract

Read before changing anything:

- `docs/domain/GREENMARKET_DOMAIN_SPEC.md` v0.6
- `docs/basket/TZ-BASKET-010.md`
- `docs/basket/BASKET_OPEN_QUESTIONS.md`

Это **не** SOURCE scanner. Не расширять `QUANTITY_RANGE_IDENTS`. Не менять Platform Core / `BasketActionHandlers`. Не реализовывать min/max/tier. Не вводить Package / PriceSchedule. Не закрывать OQ-002A/B.

## Результат

```text
OQ-002A  Status: INCONCLUSIVE
OQ-002B  Status: INCONCLUSIVE
SPEC     v0.6 unchanged
NEW CONCEPT JUSTIFIED: no
SELLER-CONFIGURED CONSTRAINT FLOW: NOT OBTAINED
```

Существующий Stage-1 buyer/seller path **исполнен**. Шаг «seller configures quantity/price rules» **не исполняется** на inspected surfaces. Это фиксируется capability-check `FLOW-011-A-CONFIG-CAPABILITY`, а не как business-flow observation seller configuration. Отсутствие шага не заменяется SOURCE ABSENT и не объявляется NOT SUPPORTED.

## Executable scenarios

| ID | Kind | Hypothesis | Что наблюдалось |
|---|---|---|---|
| FLOW-011-A-CONFIG-CAPABILITY | capability | OPEN | emulator/runtime/demo ops: no configure-product operation |
| FLOW-011-A1 | buyer flow | OPEN | qty 1 accepted at listed unit price |
| FLOW-011-A2 | buyer flow | OPEN | qty 100 accepted; stock snapshot 1000 before and after |
| FLOW-011-A3 | buyer flow | OPEN | 2 / 5 / 12 accepted, same unit price; seller range not set |
| FLOW-011-A4-STAGE1-STATE | Stage-1 state | OPEN | fixture listing/item have no minQuantity/maxQuantity own-properties |
| FLOW-011-A-STOCK | hole close | OPEN | stock cap ≠ product max |
| FLOW-011-A-ZERO | hole close | OPEN | I-030 qty 0 ≠ seller min |
| FLOW-011-B-LEVELS | buyer flow | OPEN | 1 / 5 / 10 kg linear unit price |
| FLOW-011-B-TIME | hole close | OPEN | time discount ≠ qty tier |
| FLOW-011-B-COUNTER | hole close | OPEN | negotiating +1 ≠ qty tier |

88 TZ-009 + 7 SOURCE-010 + 10 FLOW-011 = **105** scenarios.

## Pre-closed holes

### H1. SOURCE-010 is not this evidence

Token absence of `minQuantity` / `PriceSchedule` is TZ-010. FLOW-011 does not grep those names as proof.

### H2. `setCatalog` is not seller configuration

Catalog in buyer-flow rows is a test fixture. Decision text says so. Not a seller utterance.

### H3. CooperativeSeller accept is not a seller policy

Programmed accept. Not “seller chose no minimum”.

### H4. Stock cap is not maxQuantity

`FLOW-011-A-STOCK` is `AVAILABILITY_CHANGE` to catalog stock. Explicitly not OQ-002A NOT SUPPORTED.

### H5. I-030 is not seller min=N

`FLOW-011-A-ZERO` rejects quantity 0 for every list item.

### H6. TimeDiscount / +1 are not quantity-dependent price

Same unit-price change at qty 2 and qty 10 (time) and at qty 1 and qty 10 (+1).

### H7. Linear 15/15/15 is not NOT SUPPORTED of seller tiers

Seller never configured a tier. Status is INCONCLUSIVE, not NOT SUPPORTED.

### H8. Do not close OQs / bump SPEC / add I-051

Impl PASS, Domain OPEN.

### H9. Do not change Platform Core

No edits to `BasketActionHandlers` or seller-card UI.

### H10. Do not add a scanner or QUANTITY_RANGE_IDENTS

No new lexical detectors.

### H11. A3 “seller set min and max” is not executable

Recorded as engine limitation; unconstrained 2/5/12 observed instead.

### H12. VOLUME-BIZ-009-001 is reconstruction; FLOW-011-B-LEVELS is a deal with seller respond

Do not relabel the 009 row as this observation.

### H13. Impl PASS ≠ Domain CONFIRMED

FLOW-011 rows stay Domain OPEN.

### H14. FLOW-011-A-CONFIG-CAPABILITY is not seller-config observation

It is an executability/coverage check. Do not cite it as “OQ-002A researched through a seller-configured business flow”.

### H15. Evidence boundary for UI

`SellerEmulator` / `SimulationRuntime` / `DEMO_SCENARIOS` are direct runtime. `/sim` buttons and production seller card are **code inspection** of named files, not a driven browser session, not a market fact that “UI is read-only”.

### H16. FLOW-011-A2 stock is a snapshot, not reservation

`stockBefore` / `stockAfter` stay 1000. CooperativeSeller accept does not decrement catalog stock.

### H17. FLOW-011-A4-STAGE1-STATE is fixture-model state

Own-properties of this run’s catalog row / PurchaseItem. Not “seller configuration cannot be stored elsewhere”.

## Definition of Done

- [x] Existing buyer/seller flow exercised
- [x] Required seller-config step tested for executability
- [x] Limitation documented
- [ ] OQ-002A business-flow observation with seller-configured constraint obtained
- [ ] OQ-002B business-flow observation with seller-configured quantity-dependent price obtained
- [x] Reproducible FLOW-011 scenarios, or documented why a required step cannot run
- [x] Conclusions from observed behavior (including what was **not** observed)
- [x] SOURCE token absence not used as business evidence
- [x] Platform Core unchanged
- [x] No new scanner
- [x] SPEC remains v0.6
- [x] OQ-002A/B not closed
