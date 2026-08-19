# ТЗ-BASKET-011 — Business-flow observation for OQ-002A / OQ-002B

**Проект:** GreenMarket  
**Stage:** 1 — экспериментальный Basket Domain  
**Тип:** business-flow observation (продолжение TZ-BASKET-010)  
**Приёмка:** тот же GitHub PR, что TZ-010 (`basket-pr-25`)  
**Статус:** Implemented — observation **INCONCLUSIVE** for both OQs  
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
```

Существующий Stage-1 buyer/seller path **исполнен**. Шаг «seller configures quantity/price rules» **не исполняется** текущим emulator/UI. Отсутствие этого шага не заменяется SOURCE ABSENT и не объявляется NOT SUPPORTED.

## Executable scenarios

| ID | Hypothesis | Что наблюдалось |
|---|---|---|
| FLOW-011-A-CONFIG | OPEN | STABLE deal; catalog = `setCatalog`; seller only accepted |
| FLOW-011-A1 | OPEN | qty 1 accepted at listed unit price |
| FLOW-011-A2 | OPEN | qty 100 accepted (stock 1000) |
| FLOW-011-A3 | OPEN | 2 / 5 / 12 accepted, same unit price; seller range not set |
| FLOW-011-A4 | OPEN | stored listing/item have no minQuantity/maxQuantity |
| FLOW-011-A-STOCK | OPEN | stock cap ≠ product max |
| FLOW-011-A-ZERO | OPEN | I-030 qty 0 ≠ seller min |
| FLOW-011-B-LEVELS | OPEN | 1 / 5 / 10 kg linear unit price |
| FLOW-011-B-TIME | OPEN | time discount ≠ qty tier |
| FLOW-011-B-COUNTER | OPEN | negotiating +1 ≠ qty tier |

88 TZ-009 + 7 SOURCE-010 + 10 FLOW-011 = **105** scenarios.

## Pre-closed holes

### H1. SOURCE-010 is not this evidence

Token absence of `minQuantity` / `PriceSchedule` is TZ-010. FLOW-011 does not grep those names as proof.

### H2. `setCatalog` is not seller configuration

Catalog in FLOW-011 is a test fixture. Decision text says so. Not a seller utterance.

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

## Definition of Done

- [x] OQ-002A researched through business flow (INCONCLUSIVE)
- [x] OQ-002B researched through business flow (INCONCLUSIVE)
- [x] Reproducible FLOW-011 scenarios, or documented why a required step cannot run
- [x] Conclusions from observed behavior
- [x] SOURCE token absence not used as business evidence
- [x] Platform Core unchanged
- [x] No new scanner
- [x] SPEC remains v0.6
- [x] OQ-002A/B not closed
