# ТЗ-BASKET-007 — Package Semantics & Volume Pricing Experiment

**Проект:** GreenMarket  
**Stage:** 1 — экспериментальный Basket Domain  
**Тип:** domain experiment / split SPEC OQ-002 → OQ-002A + OQ-002B  
**Приёмка:** Pull Request (отдельный от PR-19 / TZ-BASKET-006)  
**Статус:** Implemented  
**Основание:** `docs/domain/GREENMARKET_DOMAIN_SPEC.md` v0.4 → v0.5  
**Ветка:** `basket-pr-20`

## Domain Contract

Before implementation, the executor MUST read:

`docs/domain/GREENMARKET_DOMAIN_SPEC.md`

See `AGENTS.md` / SPEC §50:

```text
Observation → Domain decision → SPEC update → Invariant → Scenario → Implementation → Regression test
```

GREENMARKET_DOMAIN_SPEC.md is the canonical source. This PR updates SPEC only where the experiment changes canonical knowledge.

Номера I-038…I-046 уже заняты. Новые инварианты — только после evidence, начиная с **I-047**.

Experiment-log OQ-001 / OQ-002 (`BASKET_OPEN_QUESTIONS.md`: resolution policies / alternative *policy*) — **другие вопросы**. Их это ТЗ не закрывает и не перенумеровывает.

Документы живут в фактических путях:

- `docs/domain/GREENMARKET_DOMAIN_SPEC.md`
- `docs/basket/BASKET_*.md`
- `tests/domain/README.md`

Пути `docs/domain/BASKET_*.md` из черновика ТЗ не существуют — не создавать дубликаты.

## Цель

Разделить и проверить два разных вопроса внутри SPEC OQ-002, не выбирая решение заранее:

1. **OQ-002A — Package semantics.** Что означает `package` как единица, и может ли модель выразить содержимое/размер упаковки.
2. **OQ-002B — Volume pricing.** Достаточно ли immutable Offer `(quantity, unit, price)` для конкретного volume deal, или нужна отдельная сущность / standing schedule.

PR-19 baseline сохраняется:

```text
PurchaseItem / Offer item
├── product
├── quantity
├── unit
└── price          // I-042: price of one unit
lineTotal = quantity × price   // derived; not stored
```

`catalog.quantity` не multiplier и не conversion (I-045). Package contents и standing volume schedule остаются открытыми, пока evidence не скажет иначе.

Главная цель — **не усложнить модель**, а доказать, требуется ли усложнение.

## Вне scope

- Reservation / Allocation / Fulfillment / Payment / Order
- новая сущность `Package`, `Price`, `VolumePrice`, `PriceSchedule`
- production pricing / currency / discount engine
- BEST_PRICE / динамическое ценообразование / tier engine
- автоматическая конвертация `kg` ↔ `package`
- поле `contentsQuantity` / `packageContents` на Catalog/Offer/Snapshot
- production Customer UI
- SPEC OQ-003 / OQ-005 / OQ-006 / OQ-008
- закрытие experiment-log OQ-001 / OQ-002

Не менять `price = price per unit` (I-042), если эксперимент не покажет, что для конкретного типа товара она недостаточна.

## Pre-execution review (дыры закрыты до кода)

Ревью черновика ТЗ до реализации. Ниже — дыры, которые повторили бы ошибки PR-16…19, и как они закрыты.

### H1. Snapshot §18 не должен протащить Package entity

Черновик требовал canonical snapshot с строкой `PACKAGE 1 package = 20 kg`. Добавить `Snapshot.package` / `packageContents` = ввести concept молча.

**Закрытие:** snapshot scenario наблюдает requested / agreed / current / alternative / derived total. Package contents — **observed absent**. Поле в Snapshot не добавляется. Impl PASS при `contentsStored=false` есть Domain OPEN / MODEL GAP, не CONFIRMED contents.

### H2. «1 package = 5 kg» нельзя положить в текущий catalog

`CatalogOffer` имеет только `quantity + unit + price`. Внешний факт «5 kg в упаковке» — знание экспериментатора, не stored fact.

**Закрытие:** PA-002 / PACKAGE-SEM-002 кодирует две catalog rows как `(quantity=5|20, unit=package, price=…)`. Тест явно помечает kg-contents как **external**, проверяет, что модель их не хранит. Новое поле catalog не вводится.

### H3. Разная цена ≠ представленный package basis

`1 package @ 60` vs `1 package @ 240` различимы как Offers по `price`. Это не доказательство, что модель знает 5 kg vs 20 kg.

**Закрытие:** PACKAGE-SEM-002 содержит оба случая (same price / different price). Decision: `MODEL GAP: current identity cannot represent distinct package bases`. Не писать «package должен моделироваться как X».

### H4. VP-005 смешивает concrete Offer и standing schedule

Три Offers `3@20 / 7@17 / 12@14` доказывают только, что конкретные deals представимы. Это не standing condition «цена зависит от диапазона до выбора quantity».

**Закрытие:** VOLUME-PRICE-005 = CONFIRMED representation of concrete Offers. VOLUME-PRICE-005B = OPEN (SPEC-OQ-002B) standing schedule not in the model.

### H5. Не закрывать OQ-002A целиком

Критерии закрытия OQ-002A требуют ответов про size, contents, conversion owner, partial package. Один CONFIRMED «package is a unit» этого не даёт.

**Закрытие:** OQ-002A остаётся OPEN. PACKAGE-SEM-001 CONFIRMED только unit representation (+ accept/snapshot). Contents / conversion / partial остаются OPEN.

### H6. OQ-002B закрывать только частично

`5 kg @ 15` и `20 kg @ 12` как два Offers — Stage-1 constraint (как I-045 для catalog qty). Standing `price depends on quantity range` — отдельный GAP.

**Закрытие:** OQ-002B не CLOSED. Stage-1: concrete volume deal = Offer (I-048). Standing schedule OPEN.

### H7. PA-004 не выбирать policy

`2 kg` vs catalog `package` сегодня unit-mismatch → UNRESOLVED. Не превращать это в правило «должен быть ASK_BUYER» или «1 PACKAGE».

**Закрытие:** PACKAGE-SEM-004 Domain OPEN. Observed: no conversion. Не decision «conversion must not exist».

### H8. PA-005 не вводить partial/whole package

**Закрытие:** PACKAGE-SEM-005 / 006 фиксируют `conceptPresent=false`. Не добавлять поле и не выбирать whole-only policy.

### H9. Impl PASS ≠ Domain CONFIRMED

OPEN rows (002A contents, conversion, oversupply, 002B schedule) остаются Domain OPEN при зелёном раннере.

### H10. Не регрессировать PR-19

PACKAGE-001…004, PRICE-*, ALT-* не переписывать. Новые ID: `PACKAGE-SEM-*`, `VOLUME-PRICE-*`, `SNAPSHOT-VOL-001`.

### H11. Нумерация OQ

SPEC: OQ-002 остаётся родителем; появляются **OQ-002A** и **OQ-002B**. Experiment-log OQ-030 уточняется, без коллизии с experiment OQ-001/002.

## Принятые решения (после evidence)

### SPEC OQ-002A — Package semantics — OPEN

**CONFIRMED (representation):** `unit = "package"` — коммерческая единица как `kg`. `1 package @ 60` представим, принимаем, виден в snapshot, derived total = 60.

**OPEN / MODEL GAP:** содержимое в другой unit (`1 package = 5 kg`), конвертация kg↔package, partial/whole package, кто владеет conversion. Текущая identity `(sellerId, productId, unit)` не хранит package basis.

Не введена сущность Package.

### SPEC OQ-002B — Volume pricing — Stage-1 constraint; standing schedule OPEN

**Stage-1 (CONFIRMED, I-048):** конкретный volume deal — это Offer `(quantity, unit, price)`. `5 kg @ 15` и `20 kg @ 12` — два Offers. Отдельная сущность `VolumePrice` на этом этапе не нужна.

**OPEN / MODEL GAP:** standing quantity-range schedule («1–4 kg → 20») как коммерческое условие *до* конкретного Offer.

I-042 не отменяется: price остаётся per unit. Одинаковый derived total не делает Offers одним (VP-004).

## Invariants (только после evidence)

- **I-047** — Package contents / size in another unit is not a stored Catalog, Offer, or PurchaseItem fact. External `1 package = 5 kg` is experimenter knowledge. Catalog `quantity` is not that fact (I-045).
- **I-048** — A concrete volume-priced deal is an Offer `(quantity, unit, price)`. A standing quantity-range price schedule is not an Offer and is not introduced.

## Сценарии

| ID | Hypothesis | Что проверяет |
|---|---|---|
| PACKAGE-SEM-001 | CONFIRMED | 1 package @ 60 representable + ACCEPT + snapshot + derived 60 |
| PACKAGE-SEM-002 | OPEN (OQ-002A) | 5 vs 20 package basis not stored; same/different price |
| PACKAGE-SEM-003 | CONFIRMED | catalog package size ≠ requested quantity |
| PACKAGE-SEM-004 | OPEN (OQ-002A) | 2 kg request vs package catalog — no auto-conversion |
| PACKAGE-SEM-005 | OPEN (OQ-002A) | requested 2 kg < external 5 kg package — no partial package |
| PACKAGE-SEM-006 | OPEN (OQ-002A) | requested 6 kg > external 5 kg package — no split/whole-only |
| VOLUME-PRICE-001 | CONFIRMED | 5@15=75 and 20@15=300 linear baseline |
| VOLUME-PRICE-002 | CONFIRMED | 5@15 and 20@12 are two Offers |
| VOLUME-PRICE-003 | CONFIRMED | 20@15 agreed, 20@12 current; A immutable |
| VOLUME-PRICE-004 | CONFIRMED | 5@20 and 10@10 share total 100, remain distinct Offers |
| VOLUME-PRICE-005 | CONFIRMED | concrete 3@20 / 7@17 / 12@14 are Offers |
| VOLUME-PRICE-005B | OPEN (OQ-002B) | standing tier schedule not in the model |
| VOLUME-PRICE-006 | CONFIRMED | qty 5→10 creates new Offer; #1 unchanged |
| VOLUME-PRICE-007 | CONFIRMED | qty 5@15 → 10@12; #1 unchanged |
| VOLUME-PRICE-008 | CONFIRMED | snapshot keeps 20 kg @ 12, not price=240 |
| SNAPSHOT-VOL-001 | mixed | requested/agreed/current/alt/derived visible; package contents absent |

## Implementation

- Новых domain entities нет.
- `unitLineTotal` / `lineTotalAbsence` без изменения семантики.
- `snapshot()` без нового package field.
- Resolution по-прежнему unit-aware; kg не резолвится в package.
- Assistants / production UI не меняются.

## Критерии закрытия (факт после эксперимента)

- OQ-002A: **не закрыт** — unit CONFIRMED, contents/conversion/partial OPEN.
- OQ-002B: **не закрыт целиком** — concrete Offers CONFIRMED (I-048); standing schedule OPEN.
- Вариант результата: **A для concrete volume Offers**, **B (MODEL GAP) для package contents и standing tiers**. Сущность не введена.

## Definition of Done

- [x] OQ-002A экспериментально проверен (оставлен OPEN)
- [x] OQ-002B экспериментально проверен (Stage-1 constraint + OPEN schedule)
- [x] Package-as-unit / contents / conversion / requested qty / oversupply
- [x] Linear pricing / volume discount / qty-dependent / qty change / price basis
- [x] Canonical snapshot
- [x] PR-19 scenarios без регрессии
- [x] Domain runner + `npm run build`
- [x] Документация синхронизирована
- [x] Новые invariants только из evidence
- [x] Reservation/Allocation/Payment/Order не введены

## Итоговый отчёт

```text
TZ-BASKET-007
Status: PASS for Stage-1 representation

OQ-002A: OPEN     package is a unit; contents/conversion/partial remain MODEL GAP
OQ-002B: Stage-1  concrete volume deal = Offer (I-048)
         OPEN     standing quantity-range schedule

Model change required: NO new entity
New concept required: YES if/when OQ-002A contents or OQ-002B schedule is closed — NOT introduced
Production architecture changed: NO
```
