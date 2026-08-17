# ТЗ-BASKET-009 — Business Flow Observation for Package Contents & Standing Volume Pricing

**Проект:** GreenMarket  
**Stage:** 1 — экспериментальный Basket Domain  
**Тип:** business-flow experiment / evidence for SPEC OQ-002A + OQ-002B  
**Приёмка:** Pull Request (отдельный от PR-11 / TZ-BASKET-008)  
**Статус:** Implemented — **no business-flow observation obtained**  
**Основание:** TZ-BASKET-008, `docs/domain/GREENMARKET_DOMAIN_SPEC.md` v0.6 (не bump)  
**Ветка:** `basket-pr-22`

## Domain Contract

Before implementation, the executor MUST read:

- `docs/domain/GREENMARKET_DOMAIN_SPEC.md`
- `docs/basket/BASKET_OPEN_QUESTIONS.md`
- `docs/basket/BASKET_INVARIANTS.md`
- `docs/basket/BASKET_BREAKING_SCENARIOS.md`
- `docs/basket/BASKET_EXPERIMENT_RESULTS.md`
- `docs/basket/TZ-BASKET-008.md`

Ключевая цепочка:

```text
Observation → Business Flow → Domain Problem → Evidence → SPEC decision → Invariant → Scenario → Implementation
```

Не начинать с проектирования новой сущности. Новые I-* только после **business-flow** evidence. Этого PR **не добавляет** I-051+.

Не менять CONFIRMED: I-042…I-050.

Experiment-log OQ-001 / OQ-002 (resolution / alt *policy*) не трогать.

Canonical SPEC **не** повышается: catalog/spec reconstruction не является новым domain fact.

## Цель

TZ-BASKET-008 установил Stage-1 ограничения на synthetic catalog facts. Следующий вопрос:

Существует ли **реальный** бизнес-поток GreenMarket, в котором текущей модели недостаточно для совершения или однозначного представления коммерческой сделки?

Правило evidence:

```text
business fact
+ real or realistically reproduced business flow
+ impossibility/ambiguity of the deal without an extra concept
```

Чтение `mockSellerCatalog.ts` / ТЗ-025 / глоссария **само по себе** этим правилом не является. Это catalog/spec observation.

## Результат эксперимента

**NO BUSINESS-FLOW OBSERVATION.**

Найдены только Stage-1 catalog/spec listings. Из них построены synthetic reconstructions в `BasketWorld`. Они показывают representability текущей модели. Они **не** наблюдают существующий buyer/seller flow и **не** отвечают, достаточна ли модель для однозначной сделки.

Это **не** вариант A («текущей модели достаточно для observed flows»): flows не наблюдались.  
Это **не** вариант C.  
**NEW CONCEPT JUSTIFIED: no** — отсутствие observation не обосновывает Package / PriceSchedule.

OQ-002A / OQ-002B остаются OPEN. Дальнейшее закрытие по-прежнему требует business-flow observation, не очередной synthetic model test.

## Вне scope

- production Basket / API / БД / Platform Core / Customer UI / `/cart` / Payment / Order / Allocation / Reservation
- `class Package | PackageContents | UnitConversion | PriceSchedule | PriceTier | VolumePrice`
- поля `packageContents`, `conversionFactor`, `minQuantity`, `maxQuantity`, `tierPrice`, `derivedFromSchedule`, `scheduleVersion`
- повтор synthetic PACKAGE-008-003…006 / VOLUME-008-001 как «новое» evidence
- закрытие OQ-002A / OQ-002B
- Domain CONFIRMED для reconstruction tests
- bump SPEC на основании catalog/spec reading
- выводы про UI display
- изменение `mockSellerCatalog.ts`

## Pre-execution / post-review holes

### H1. Catalog/spec reading ≠ business-flow observation

Копирование `250 г @ 140` в `setCatalog` + `createPurchaseFromList` — synthetic reconstruction. Не называть это «observed commerce».

### H2. Не инжектировать Offer.price и потом «наблюдать» его

VOLUME lookup должен идти из catalog matcher / PurchaseItem, не из `proposeOffer({ price: listed })`.

### H3. Два заранее заданных productId — не правило «фасовки должны быть Products»

Если catalog уже split — identity keys = 2 это тавтология. Не evidence для OQ-002A.

### H4. `acceptOffer("Сегодня скидка на сыр")` не исследует OQ-002B

Это I-050 на произвольной строке. Сценарий VOLUME-BIZ-009-002 **удалён**.

### H5. H3 schedule change = NOT OBSERVED

Не использовать «не вводить version/provenance» как основание по OQ-002B. Нет executable schedule-change flow. I-044 / VOLUME-008-004 не заменяют observation.

### H6. Impl PASS ≠ Domain CONFIRMED

Reconstruction rows — Domain **OPEN**.

### H7. Не bump SPEC v0.7

SPEC фиксирует catalog/spec observation как таковое, без статуса CONFIRMED commerce.

### H8. Не закрыть OQ, потому что модель *может представить* listing

Representability ≠ достаточность для сделки.

### H9. Mock catalog ≠ «фермеры никогда не продают ящики»

### H10. Не вводить I-051

### H11. Production architecture unchanged

### H12. H1-A/B crate flows = NOT OBSERVED; не плодить UNRESOLVED repeats TZ-008

## Catalog/spec source (not a business flow)

Источник listings (read-only):

- `mockSellerCatalog.ts` — `Томаты 1 кг @ 180`, `Творог 250 г @ 140`, `Мёд цветочный 500 г`, `Мёд с пергой 350 г`
- ТЗ-025 — текст «Сегодня скидка на сыр» (не domain object; executable scenario не строится)
- ТЗ-010 — Product = конкретный товар продавца (spec text, не observed seller behavior)

Нет crate `1 package = 5 kg`. Нет quantity-range price table. Это **отсутствие в mock/spec**, не observation рынка.

## H1 — Package contents (OQ-002A)

### H1-A / H1-B — NOT OBSERVED

Buyer 2 kg vs 5 kg crate / 6 kg vs 5 kg crate в catalog/spec не найден. Не executable scenario. Не policy.

### H1-C — catalog/spec reconstruction only

Mock lists two differently named honeys. Reconstruction with two `productId`s shows the model distinguishes pre-split Products. **Не** доказывает, что фасовки должны быть Products. PACKAGE-BIZ-009-002 = OPEN, not OQ-002A evidence.

### H1-D — representability only

`unit = "250 g"` хранится без contents field. **Не** доказывает, что pack contents не отдельный business fact. PACKAGE-BIZ-009-001 = OPEN.

## H2–H4 — Standing volume pricing (OQ-002B)

### H2 — catalog lookup is quantity-agnostic (reconstruction)

`createPurchaseFromList` копирует listed unit price на 3 / 7 / 12 kg. Это не ответ системы «какая цена должна применяться к 7 kg?» от продавца. VOLUME-BIZ-009-001 = OPEN.

### H3 — NOT OBSERVED

Structured schedule `5–9 kg → 17` затем `→ 16` в catalog/spec нет. **Не** основание для OQ-002B. Не executable. Не дублировать VOLUME-008-004 как TZ-009 evidence.

### H4 — not re-tested

Quantity change = I-044, уже CONFIRMED ранее. Не 009 scenario.

### Seller «скидка» text — catalog/spec only

ТЗ-025 text не является Offer. I-050 уже это фиксирует для announcements. Нового OQ-002B evidence нет. Executable не добавляется.

## Evidence cards

### PACKAGE-BIZ-009-001

| Field | Value |
|---|---|
| Source | catalog/spec reconstruction of mock `Творог / 250 г / 140` |
| What was tested | PurchaseItem can store `unit = "250 g"` without a contents field |
| What was **not** tested | whether pack contents are a business fact; any real buyer/seller deal |
| Hypothesis | **OPEN** |
| Conclusion | representability only |

### PACKAGE-BIZ-009-002

| Field | Value |
|---|---|
| Source | catalog/spec reconstruction of two named honey listings as two `productId`s |
| What was tested | two pre-split identity keys |
| What was **not** tested | that pack sizes must be Products |
| Hypothesis | **OPEN** |
| Conclusion | tautological if catalog already splits; **not OQ-002A evidence** |

### VOLUME-BIZ-009-001

| Field | Value |
|---|---|
| Source | catalog/spec reconstruction of mock `Томаты / 1 кг / 180` |
| What was tested | `createPurchaseFromList` copies listed unit price onto 3/7/12 kg PurchaseItems |
| What was **not** tested | seller pricing rule for 7 kg; standing schedule behavior |
| Hypothesis | **OPEN** |
| Conclusion | quantity-agnostic lookup; **not** absence of standing pricing semantics |

## Принятые решения

```text
TZ-BASKET-009
NO BUSINESS-FLOW OBSERVATION
OQ-002A: OPEN
OQ-002B: OPEN
H3: NOT OBSERVED (not used as OQ-002B evidence)
NEW CONCEPT JUSTIFIED: no
NO MODEL CHANGE: yes
NO NEW INVARIANT: yes
SPEC VERSION: remains v0.6
```

## Invariants

I-042…I-050 unchanged. No I-051.

## Сценарии

| ID | Hypothesis | Что проверяет |
|---|---|---|
| PACKAGE-BIZ-009-001 | OPEN (OQ-002A) | representability of listed unit `250 g` without contents field |
| PACKAGE-BIZ-009-002 | OPEN (OQ-002A) | pre-split productIds → two keys; not pack-as-Product policy |
| VOLUME-BIZ-009-001 | OPEN (OQ-002B) | listed unit price copied onto 3/7/12 kg PurchaseItems |

VOLUME-BIZ-009-002 удалён (I-050 duplicate, не business observation).

85 prior + 3 reconstruction = 88 total.

## Implementation

Нет новых entities и canonical fields. Production architecture unchanged. Production UI is out of scope.

## Definition of Done

- [ ] Минимум одно реальное business observation — **не выполнено** (явно зафиксировано)
- [x] Catalog/spec reconstruction не выдаётся за business-flow observation
- [x] Domain CONFIRMED не ставится на reconstruction rows
- [x] H3 = NOT OBSERVED, не основание OQ-002B
- [x] SPEC не bump v0.7; фиксируется catalog/spec observation
- [x] Новые сущности не введены
- [x] Production architecture unchanged
- [x] Только reconstruction scenarios, без acceptOffer(string)
- [x] Предыдущие scenarios проходят
- [x] RESULTS / BREAKING / OPEN QUESTIONS обновлены честно
- [x] NEW CONCEPT JUSTIFIED: no
