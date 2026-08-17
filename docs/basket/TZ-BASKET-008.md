# ТЗ-BASKET-008 — Package Contents & Standing Volume Pricing Experiment

**Проект:** GreenMarket  
**Stage:** 1 — экспериментальный Basket Domain  
**Тип:** domain experiment / evidence for SPEC OQ-002A + OQ-002B without new entities  
**Приёмка:** Pull Request (отдельный от PR-20 / TZ-BASKET-007)  
**Статус:** Implemented  
**Основание:** `docs/domain/GREENMARKET_DOMAIN_SPEC.md` v0.5 → v0.6  
**Ветка:** `basket-pr-21`

## Domain Contract

Before implementation, the executor MUST read:

`docs/domain/GREENMARKET_DOMAIN_SPEC.md`

See SPEC §50:

```text
Observation → Domain decision → SPEC update → Invariant → Scenario → Implementation → Regression test
```

Не начинать с проектирования новой сущности. Новые I-* только после evidence, начиная с **I-049**.

Не менять CONFIRMED: I-042, I-043, I-044, I-045, I-046, I-048.

Experiment-log OQ-001 / OQ-002 (resolution / alt *policy*) не трогать.

Документы: `docs/domain/GREENMARKET_DOMAIN_SPEC.md`, `docs/basket/BASKET_*.md`, `tests/domain/README.md`.

## Цель

Проверить, **нужны ли** домену новые понятия, а не добавить поля «на всякий случай».

**OQ-002A.** Нужны ли contents / conversion / whole / partial package как domain facts, или для Stage-1 сделки достаточно `Offer(quantity, unit, price)` при `unit=package`?

**OQ-002B.** Нужен ли самостоятельный standing `quantity range → price`, или коммерческая семантика остаётся последовательностью конкретных immutable Offers?

## Вне scope

- production Basket / API / БД / Platform Core / UI / AI Assistant
- Reservation / Allocation / Payment / Order / Seller inventory / checkout
- `class Package | PackageContents | UnitConversion | PriceSchedule | VolumePrice | PriceTier`
- поля `packageContents`, `conversionFactor`, `minQuantity`, `maxQuantity`, `tierPrice` в canonical model
- автоматическая конвертация `2 kg → 0.4 package`
- заранее выбранные политики partial / whole / split
- закрытие experiment-log OQ-001 / OQ-002

Разрешено: внешние test facts (`externalPackageKg = 5`, `externalSchedule`) как experimenter knowledge.

## Pre-execution review (дыры закрыты до кода)

### H1. External 5 kg must not become a stored domain term

**Закрытие:** PACKAGE-008-002 проверяет только domain terms: Offer / PurchaseItem / snapshot / derived total. External `5 kg` among them is absent. Domain tests do not conclude anything about UI display. Production UI is out of scope.

### H2. PACKAGE-008-003 не выбирать conversion policy

Не реализовывать 0.4 package / 24 MAD. Observed: UNRESOLVED, no conversion. Domain OPEN — не decision «conversion must not exist».

### H3. PACKAGE-008-004/005 не выбирать partial / 1 pack / 2 packs / split

Фиксировать отсутствие понятий. Не вводить policy.

### H4. PACKAGE-008-006: collapse identity ≠ «надо ввести Package»

Различие external basis — MODEL GAP catalog representation. No evidence yet justifies a Package entity: ambiguous purchase не завершается, и это не доказательство сущности Package. Same as PR-20, plus: contents still not required to complete a *package-unit* deal (008-002).

### H5. VOLUME-008-001 не писать lookup по фейковому schedule

Buyer asks 3/7/12 kg. Domain не отвечает schedule-ценой. Catalog unit price ≠ external tier. Не helper `priceForQty`.

### H6. VOLUME-008-002: announcement ≠ Offer

Нет id, нельзя accept. Не вводить standing-proposal type.

### H7. VOLUME-008-003/005 не добавлять `derivedFromSchedule`

Concrete Offer существует без provenance на schedule.

### H8. VOLUME-008-004 не изобретать schedule versioning

Нет объекта — нет lifecycle. Смена цены = новый Offer. Offer #1 immutable.

### H9. Не закрыть OQ только потому, что снова показали GAP

PR-20 уже OPEN. TZ-008 уточняет: contents не нужен для package-unit transaction; schedule не Offer и не provenance. Оба OQ остаются OPEN (заключение **B**).

### H10. Impl PASS ≠ Domain CONFIRMED

OPEN rows остаются OPEN.

### H11. Не регрессировать 72 сценария PR-20

Новые ID: `PACKAGE-008-*`, `VOLUME-008-*`.

### H12. Canonical snapshot

Не добавлять package/schedule в Snapshot. SNAPSHOT-VOL-001 остаётся; при необходимости факты в VOLUME-008-002.

## Принятые решения (после evidence) — заключение B по обоим OQ

### OQ-002A — OPEN; MODEL GAP; NO NEW CONCEPT

**CONFIRMED:** `1 package @ 60` — полная коммерческая сделка без contents (Offer / PurchaseItem / derived total / ACCEPT). External `1 package = 5 kg` не влияет на эти факты (I-049).

**OPEN / MODEL GAP:** conversion kg↔package, partial/whole/split, различение package bases при той же identity. Не decision «эти вещи не должны существовать».

**NEW CONCEPT JUSTIFIED:** нет.

### OQ-002B — Stage-1 I-048 сохранён; standing schedule OPEN; NO NEW CONCEPT

**CONFIRMED:** конкретный deal = Offer. Pre-negotiation tier announcement не Offer, не accept, не id (I-050). Concrete Offer не хранит schedule provenance. Смена quantity/price = новый Offer без связи со schedule. Одинаковый unit price на разных qty — разные Offers; границы тиров не stored.

**OPEN / MODEL GAP:** самостоятельный standing schedule как объект до Offer.

**NEW CONCEPT JUSTIFIED:** нет.

## Invariants (только после evidence)

- **I-049** — Completing a package-unit deal does not require stored contents in another unit. External contents are not Offer terms. Does not close conversion / partial package (**OQ-002A OPEN**).
- **I-050** — A standing quantity-range price announcement is not an Offer: no Offer id, not acceptable. A concrete Offer does not store schedule provenance. Does not close whether a future schedule object is needed (**OQ-002B OPEN**).

I-042…I-046, I-048 unchanged.

## Сценарии

| ID | Hypothesis | Что проверяет |
|---|---|---|
| PACKAGE-008-001 | CONFIRMED | regression: 1 package @ 60, no extra fields |
| PACKAGE-008-002 | CONFIRMED | contents not required for Offer/item/total/ACCEPT; not a stored domain term |
| PACKAGE-008-003 | OPEN (OQ-002A) | 2 kg vs 5 kg package — no auto-conversion |
| PACKAGE-008-004 | OPEN (OQ-002A) | 2 kg < 5 kg — no partial/whole/split policy |
| PACKAGE-008-005 | OPEN (OQ-002A) | 6 kg > 5 kg — no 1-pack/2-pack/split policy |
| PACKAGE-008-006 | OPEN (OQ-002A) | 5 vs 20 package bases — identity GAP; no evidence yet justifies a Package entity |
| VOLUME-008-001 | OPEN (OQ-002B) | 3/7/12 kg do not read an external tier from the domain |
| VOLUME-008-002 | CONFIRMED | announcement is not an Offer / not acceptable |
| VOLUME-008-003 | CONFIRMED | 7 kg @ 17 exists without schedule provenance |
| VOLUME-008-004 | CONFIRMED | 17→16 is a new Offer; no schedule versioning |
| VOLUME-008-005 | CONFIRMED | 5@17 → 8@17 is a new Offer; no schedule link |
| VOLUME-008-006 | CONFIRMED | equal unit price across external tiers still two Offers |
| VOLUME-008-007 | CONFIRMED | 5×20=10×10=100; not Offer identity (I-048 regression) |

## Implementation

Нет новых entities и canonical fields. `unitLineTotal` / snapshot / resolution без изменения семантики. Production UI is out of scope.

## Критерий завершения

```text
TZ-BASKET-008
OQ-002A: OPEN / MODEL GAP / NO NEW CONCEPT
  CONFIRMED: package-unit deal does not require stored contents (I-049)
  OPEN: conversion, partial/whole, distinct package bases
OQ-002B: OPEN schedule object / NO NEW CONCEPT
  CONFIRMED: announcement is not an Offer (I-050); concrete Offers stay sufficient (I-048)
  OPEN: standing quantity-range schedule as a domain object

NEW CONCEPT JUSTIFIED: no — no evidence yet justifies a Package or PriceSchedule entity
NO MODEL CHANGE: yes (no Package / PriceSchedule)
Further closing OQ-002A/B requires a business observation, not another synthetic model test
```

Further closing OQ-002A/B requires a **business observation**, not another synthetic model test. The missing observation is a real business flow where a deal cannot complete without stored contents or without schedule-as-object. Experimenter knowledge and synthetic catalog facts are not that observation.

## Definition of Done

- [x] OQ-002A / OQ-002B executable scenarios
- [x] Contents / conversion / partial / schedule не введены
- [x] Concrete Offer + immutability сохранены
- [x] 72 PR-20 scenarios без регрессии
- [x] Invariants только из evidence (I-049, I-050)
- [x] SPEC v0.6, docs, results
- [x] Production architecture unchanged
