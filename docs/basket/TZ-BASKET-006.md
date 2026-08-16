# ТЗ-BASKET-006 — Price Semantics & Package Quantity

**Проект:** GreenMarket  
**Stage:** 1 — экспериментальный Basket Domain  
**Тип:** domain experiment / закрытие SPEC OQ-001; Stage-1 constraint для catalog quantity; OQ-002 остаётся OPEN  
**Приёмка:** Pull Request (отдельный от PR-15 / TZ-BASKET-005)  
**Статус:** Implemented  
**Основание:** `docs/domain/GREENMARKET_DOMAIN_SPEC.md` v0.3 → v0.4

## Domain Contract

Before implementation, the executor MUST read:

`docs/domain/GREENMARKET_DOMAIN_SPEC.md`

See `AGENTS.md` Rule 49:

```text
Observation → Domain decision → SPEC update → Invariant → Scenario → Implementation → Regression test
```

GREENMARKET_DOMAIN_SPEC.md is the canonical source. This PR updates SPEC first, then invariants, then scenarios, then code.

Номера I-038…I-041 уже заняты TZ-BASKET-005. Новые инварианты: **I-042…I-045**.

Experiment-log OQ-001 / OQ-002 (`BASKET_OPEN_QUESTIONS.md`: resolution policies / alternative *policy*) — **другие вопросы**. Их это ТЗ не закрывает. Закрывается **SPEC OQ-001**. **SPEC OQ-002** остаётся OPEN для бизнес-семантики package/volume; Stage-1 фиксирует только constraint I-045.

## Цель

Экспериментально определить семантику `price` в PurchaseItem / Offer / Catalog и связь между `quantity`, `unit`, `price` и catalog/reference `quantity`.

Не изобретать бизнес-политику выбора цены или альтернативы.

## Вне scope

- production pricing / currency / discount engine
- BEST_PRICE / PRICE_OPTIMIZATION / MAX_PRICE / REFERENCE_PRICE_THRESHOLD
- новая сущность `Price` или `Package`
- AUTO_ACCEPT / ASK_BUYER как domain rule для дорогой альтернативы
- SPEC OQ-003 (duplicate ListItems), OQ-005 (TTL), OQ-006 (allocation)
- production Customer UI

## Принятые решения

### SPEC OQ-001 — Price semantics — CLOSED

`PurchaseItem.price` и `CatalogOffer.price` — цена **одной** `unit`.

```
Tomatoes  quantity=2  unit=kg  price=15
→ 2 × 15 MAD/kg = 30 MAD   (derived; поле linePrice не существует)
```

`(2 kg, 15)` и `(1 kg, 30)` — разные stored facts. Одинаковый derived total появляется только после unit-price правила. Сырой triple `(quantity, unit, price)` сам по себе не подписывает «line» vs «unit»; это делает I-042.

Смена `quantity` не превращает `price` в line price (I-043). Смена quantity/price — новый Offer (I-044).

### SPEC OQ-002 — Package / volume — Stage-1 constraint; бизнес OPEN

**Stage-1 (CONFIRMED, I-045):** catalog `quantity` не multiplier и не conversion. `1 package @ 60` = 60 за package.

**Бизнес-семантика (OPEN):** volume pricing и package contents (`1 package = 5 kg`) текущая модель не представляет. Это ограничение representation, не решение «volume pricing не должен существовать».

`PurchaseItem.quantity` обязателен; List без quantity → `MISSING_QUANTITY`.

Alternative **policy** остаётся **OPEN — SPEC OQ-008**.

## Invariants

- **I-042** — `price` всегда относительно `unit`
- **I-043** — смена `quantity` не меняет семантику `price`
- **I-044** — Offer хранит `(product, quantity, unit, price)`; изменение требует нового Offer
- **I-045** — catalog `quantity` не identity, не multiplier, не conversion (Stage-1; OQ-002 OPEN)
- **I-046** — ACCEPT требует finite price; `unitLineTotal` — IEEE-754 в границах I-030

## Сценарии

| ID | Что проверяет |
|---|---|
| PRICE-UNIT-001 | 2 kg × 15; нет stored `linePrice`; derived total = 30 |
| PRICE-UNIT-002 | 2 kg × 15 vs 1 kg × 30 различимы; одинаковый derived total только после I-042 |
| PRICE-OFFER-001 | 15 → 12: immutable Offer, agreed указывает на A |
| PRICE-QTY-001 | 2 kg @ 15 → 4 kg @ 15: новый Offer, price всё ещё per-unit |
| PRICE-ABSENT-001 | нет price → нет derived total, поле не изобретается |
| PRICE-CATALOG-QTY-001 | catalog.quantity не становится PurchaseItem.quantity |
| PACKAGE-001 | package representable as a unit (CONFIRMED); contents/conversion OPEN — SPEC-OQ-002 |
| PACKAGE-002 | 5→20 при той же / разной unit price |
| PACKAGE-003 | одинаковая quantity, разный внешний package basis — basis невидим |
| ALT-PRICE-001 | primary дешевле alternative — representation only |
| ALT-PRICE-002 | primary дороже alternative — representation only, не BEST_PRICE |
| PRICE-SNAPSHOT-001 | agreed / current / alternative одновременно |
| PRICE-ZERO-001 | price 0 ≠ missing price |
| PRICE-LIST-QTY-ABSENT-001 | omitted List quantity ≠ catalog package size |
| ALT-UNIT-001 | alternative в другой unit не конвертируется |

## Implementation

- `unitLineTotal()` — derived `quantity * price`, не stored field
- `snapshot().alternatives` — проекция List alternatives + catalog unit price; без выбора
- `createPurchaseFromList` больше не подставляет catalog `quantity` как requested quantity

## Запрещённые решения (не использованы)

- сущность Price / Package
- AUTO_ACCEPT / BEST_PRICE / ASK_BUYER как domain rule
- поле `linePrice`
- скрытый пересчёт 60 MAD/package → 12 MAD/kg
- закрытие experiment OQ-001 / OQ-002 (resolution / alt *policy*)

## Критерии приёмки

- [x] SPEC OQ-001 CLOSED (unit price)
- [x] SPEC OQ-002 остаётся OPEN для бизнеса; Stage-1 constraint записан (I-045)
- [x] executable tests на unit/package ambiguity
- [x] Offer price semantics
- [x] canonical snapshot
- [x] alternative price policy не реализована
- [x] новые invariants только после эксперимента
- [x] `BASKET_EXPERIMENT_RESULTS.md` + `tests/domain/README.md`
- [x] domain runner + `npm run build`
- [x] PR-15 scenarios без регрессии
- [x] production Customer UI не менялся

## Итоговый отчёт

```text
TZ-BASKET-006
Status: PASS for Stage-1 representation / OQ-001

OQ-001: CLOSED     price = price of one unit
Stage-1:           catalog quantity is not a multiplier/conversion
OQ-002: OPEN       package/volume business semantics

Model change required: YES
New concept required: YES if/when OQ-002 is closed — NOT introduced
Production architecture changed: NO
```
