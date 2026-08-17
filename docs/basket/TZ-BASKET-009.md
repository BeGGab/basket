# ТЗ-BASKET-009 — Business Flow Observation for Package Contents & Standing Volume Pricing

**Проект:** GreenMarket  
**Stage:** 1 — экспериментальный Basket Domain  
**Тип:** business-flow experiment / evidence for SPEC OQ-002A + OQ-002B  
**Приёмка:** Pull Request (отдельный от PR-11 / TZ-BASKET-008)  
**Статус:** Implemented  
**Основание:** TZ-BASKET-008, `docs/domain/GREENMARKET_DOMAIN_SPEC.md` v0.6 → v0.7  
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

Не начинать с проектирования новой сущности. Новые I-* только после evidence. Этого PR **не добавляет** I-051+.

Не менять CONFIRMED: I-042…I-050.

Experiment-log OQ-001 / OQ-002 (resolution / alt *policy*) не трогать.

## Цель

TZ-BASKET-008 установил Stage-1 ограничения на *synthetic* catalog facts. Следующий вопрос:

Существует ли **реальный** бизнес-поток GreenMarket, в котором текущей модели недостаточно для совершения или однозначного представления коммерческой сделки?

Источники observation (не experimenter `1 package = 5 kg`):

- `react-vite-bootstrap-project/src/platform-core/map/repository/mockSellerCatalog.ts` — Stage-1 seller catalog
- `docs/specifications/09_tz010_glossariy_greenmarket.md` — Product = конкретный товар продавца
- `docs/specifications/05_tz006_user_flow_povsednevnaya_pokupka.md` — покупатель закрывает listed products
- `docs/specifications/27_tz025_kartochka_prodavtsa_detalnaya.md` — seller announcement как свободный текст
- `docs/specifications/14_tz016_informatsionnaya_model.md` — смена цены это событие, не schedule object

## Главное правило

«Модель не умеет это представить» само по себе только MODEL GAP (уже TZ-008).

Нужно: business fact + реальный/реалистично воспроизведённый flow + невозможность/неоднозначность сделки без дополнительного понятия.

Только после этого — новый domain concept.

## Вне scope

- production Basket / API / БД / Platform Core / Customer UI / `/cart` / Payment / Order / Allocation / Reservation
- `class Package | PackageContents | UnitConversion | PriceSchedule | PriceTier | VolumePrice`
- поля `packageContents`, `conversionFactor`, `minQuantity`, `maxQuantity`, `tierPrice`, `derivedFromSchedule`, `scheduleVersion`
- повтор synthetic PACKAGE-008-003…006 / VOLUME-008-001 как «новое» evidence
- закрытие OQ-002A / OQ-002B только потому, что observed flows *могут* завершиться
- выводы про UI display из domain tests
- изменение `mockSellerCatalog.ts` (observation read-only)

## Pre-execution review (дыры закрыты до кода)

### H1. Не повторять TZ-008 под новым ID

2 kg vs `1 package = 5 kg` — synthetic MODEL GAP. Если этот flow **не найден** в GreenMarket, не плодить PACKAGE-BIZ-009, которые снова показывают UNRESOLVED.

**Закрытие:** H1-A/B ниже = NOT OBSERVED. Executable scenarios только для listed-unit / listed-product flows.

### H2. Mock catalog ≠ «фермеры никогда не продают ящики»

Observation: Stage-1 GreenMarket catalog/specs. Не universal market claim. OQ остаётся OPEN для будущего crate/schedule рынка.

### H3. «250 г» — commercial unit, не contents-in-another-unit

Production `unit: "250 г"` — цена за listed pack, не `unit=package` + stored `= 0.25 kg`. Не конвертировать в kg. Не добавлять `packageContents`.

### H4. Разные фасовки мёда — разные Product, не Package bases

`Мёд цветочный 500 г` и `Мёд с пергой 350 г` — разные имена/id в catalog. Не коллапсировать в `(seller, tomatoes, package)` как PACKAGE-008-006.

### H5. «Сегодня скидка на сыр» — не PriceSchedule

TZ-025 announcement — unstructured seller text. Не парсить в tiers. Не давать id. Не accept.

### H6. Buyer 3/7/12 kg помидоров — listed kg unit price, не fake schedule

Mock tomatoes: `1 кг` @ 180. Concrete Offers at that unit price. Не подставлять 20/17/14 из TZ-008.

### H7. Не закрыть OQ, потому что сделка *может* состояться

TZ-008: close требует flow, где сделка *не может* состояться без contents/schedule. TZ-009 нашёл обратное. OQ остаётся OPEN. NEW CONCEPT JUSTIFIED: no.

### H8. Не вводить I-051 «GreenMarket never needs contents»

Это запрет на будущее, не observation. I-049 / I-050 достаточны.

### H9. Domain tests не заключают про UI

Не писать «UI показывает 250 г». Facts: Offer / PurchaseItem / derived total / Acceptance / catalog identity.

### H10. Impl PASS ≠ Domain CONFIRMED для NOT OBSERVED гипотез

H1-A/B остаются OPEN как unobserved, не как CONFIRMED «policy must not exist».

### H11. Не менять production architecture

Scenarios копируют facts в `BasketWorld`. `mockSellerCatalog.ts` не редактируется.

### H12. Один observation → один минимальный scenario

Максимум четыре executable ID. Не «покрытие» всех веток H3/H4, уже закрытых I-044.

## Observed GreenMarket Stage-1 selling

| Listed product (mock catalog) | unit string | price | Domain mapping |
|---|---|---|---|
| Томаты | 1 кг | 180 | `unit=kg`, unit price 180 |
| Творог | 250 г | 140 | commercial unit `250 g`, price 140 per unit |
| Сыр молодой | 200 г | 320 | commercial unit `200 g`, price 320 per unit |
| Мёд цветочный | 500 г | 380 | Product `honey_flower`, unit `500 g` |
| Мёд с пергой | 350 г | 450 | Product `honey_perga`, unit `350 g` |
| Укроп | 1 пучок | 40 | commercial unit `bunch` (not used in 009 scenarios) |
| Пирог | 1 шт | 220 | commercial unit `pcs` (not used in 009 scenarios) |

Нет строк `unit=package` + contents kg. Нет quantity-range price table.

## H1 — Package contents (OQ-002A)

### H1-A. Buyer wants less than a package — NOT OBSERVED

**Кандидат:** Buyer 2 kg vs Seller 1 package = 5 kg.

**Observation:** в Stage-1 catalog овощи listed per kg; фасованные товары listed своим pack unit. Нет продавца, который продаёт томаты только ящиком 5 kg против kg-потребности.

**Q1:** для *этого* GreenMarket flow вопроса нет — flow не выполняется.  
**Q2–Q4:** не применимы. Не выбирать oversupply / split / 1 package policy.

**Conclusion:** OPEN остаётся для гипотетического crate market. Не NEW CONCEPT. Не executable scenario.

### H1-B. Buyer wants more than one package — NOT OBSERVED

**Кандидат:** Buyer 6 kg vs 5 kg package. То же: нет такого listed seller. Не выбирать 1 pack / 2 packs / split.

### H1-C. Distinct package bases — OBSERVED as distinct Products

**Observation:** разные фасовки — разные Product (глоссарий ТЗ-010), не один `productId` с двумя catalog `quantity`.

**Q1:** сделка однозначна: покупатель берёт listed Product.  
**Q2:** отсутствующий fact для *этого* flow — нет.  
**Q3:** fact живёт в Catalog / Product identity.  
**Q4:** existing CatalogLine `(sellerId, productId, unit)` достаточен. Package entity не требуется.

**Scenario:** PACKAGE-BIZ-009-002.

### H1-D. Pack size and price — OBSERVED as ordinary Offers

**Observation:** `1 × 250 g @ 140` и `1 × 500 g @ 380` — listed-unit Offers, не volume tiers и не Package variants одного id.

**Q1:** сделка завершается однозначно.  
**Q2:** contents-in-another-unit не нужен.  
**Q3:** Catalog + Offer.  
**Q4:** existing Offer triple. No new entity.

**Scenario:** PACKAGE-BIZ-009-001.

## H2–H4 — Standing volume pricing (OQ-002B)

### H2. Buyer выбирает quantity — OBSERVED without schedule

**Observation:** томаты `1 кг @ 180`. Buyer 3 / 7 / 12 kg → concrete Offers at listed unit price. Domain читает catalog unit price, не quantity-range rule.

**Q1:** однозначно.  
**Q2:** «price applies to 5–9 kg» в этом flow отсутствует *и не требуется*.  
**Q3:** Catalog unit price + Offer.  
**Q4:** existing Offer. No PriceSchedule.

**Scenario:** VOLUME-BIZ-009-001.

### H3. Seller меняет schedule — NOT OBSERVED as schedule

**Observation:** ТЗ-016 — смена цены это событие; коммерческий факт — новый Offer (I-044). Structured `5–9 kg → 17` затем `→ 16` в catalog нет.

Не вводить schedule version / provenance. Не executable duplicate VOLUME-008-004.

### H4. Quantity меняется — already CONFIRMED (I-044)

`7 kg @ 17 → 8 kg @ 17` для GreenMarket kg vegetables: new Offer. Не новый 009 scenario.

### Seller «скидка» text — OBSERVED, not a schedule

**Observation:** ТЗ-025 «Сегодня скидка на сыр». Нет id, нельзя accept. Сделка — listed cheese Offer.

**Scenario:** VOLUME-BIZ-009-002.

## Evidence cards

### PACKAGE-BIZ-009-001 — listed pack unit deal

| Field | Value |
|---|---|
| Scenario ID | PACKAGE-BIZ-009-001 |
| Business observation | Stage-1 catalog lists cottage cheese as `250 г @ 140`, not as kg + package contents |
| Initial facts | CatalogLine `tvorog`, unit `250 g`, price 140, stock > 0 |
| Buyer action | List `1 × 250 g` |
| Seller action | Offer `1 × 250 g @ 140`; buyer accepts |
| Expected business outcome | Deal completes; derived total 140 |
| Actual outcome | Offer / PurchaseItem / Acceptance without contents field |
| Missing fact | none for this flow |
| Current model representation | Offer `(1, 250 g, 140)` |
| Ambiguity / impossibility | none |
| Conclusion | **CONFIRMED** — listed pack unit does not require Package contents. **NEW CONCEPT JUSTIFIED: no** |

### PACKAGE-BIZ-009-002 — distinct pack Products

| Field | Value |
|---|---|
| Scenario ID | PACKAGE-BIZ-009-002 |
| Business observation | Flower honey `500 г` and perga honey `350 г` are different Products |
| Initial facts | Two CatalogLines, two `productId`s, same seller |
| Buyer action | List flower honey `1 × 500 g` |
| Seller action | Resolve / Offer that product only |
| Expected business outcome | Unambiguous choice; no `AMBIGUOUS_PRICE` |
| Actual outcome | Two identity keys; requested line completes |
| Missing fact | none for this flow |
| Current model representation | `(seller, honey_flower, 500 g)` vs `(seller, honey_perga, 350 g)` |
| Ambiguity / impossibility | none in observed catalog (contrast synthetic PACKAGE-008-006) |
| Conclusion | **CONFIRMED** — observed pack variants are Products. **NEW CONCEPT JUSTIFIED: no** |

### VOLUME-BIZ-009-001 — listed kg unit price for 3 / 7 / 12 kg

| Field | Value |
|---|---|
| Scenario ID | VOLUME-BIZ-009-001 |
| Business observation | Tomatoes listed `1 кг @ 180`; buyer quantity is still kg |
| Initial facts | Catalog unit price 180 / kg |
| Buyer action | Request 3 kg, 7 kg, 12 kg |
| Seller action | Concrete Offers at listed unit price |
| Expected business outcome | `3@180`, `7@180`, `12@180`; derived 540 / 1260 / 2160 |
| Actual outcome | catalogUnitPrice=180 for each; no tier field |
| Missing fact | none for this flow |
| Current model representation | three Offers, I-042 / I-048 |
| Ambiguity / impossibility | none |
| Conclusion | **CONFIRMED** — observed kg pricing is not a standing schedule. **NEW CONCEPT JUSTIFIED: no** |

### VOLUME-BIZ-009-002 — unstructured seller discount

| Field | Value |
|---|---|
| Scenario ID | VOLUME-BIZ-009-002 |
| Business observation | TZ-025 announcement «Сегодня скидка на сыр» is seller text, not a quantity-range object |
| Initial facts | Cheese CatalogLine `200 g @ 320`; external announcement string |
| Buyer action | Cannot accept the announcement; buys listed cheese |
| Seller action | Offer `1 × 200 g @ 320` |
| Expected business outcome | Announcement has no Offer id; deal is the listed Offer |
| Actual outcome | accept(announcement) impossible; deal completes at listed price |
| Missing fact | none for this observed flow |
| Current model representation | Offer triple; announcement is external knowledge |
| Ambiguity / impossibility | none for completing the listed deal |
| Conclusion | **CONFIRMED** — observed discount talk is not PriceSchedule. **NEW CONCEPT JUSTIFIED: no** |

## Принятые решения — вариант A для observed flows

```text
TZ-BASKET-009
OQ-002A: OPEN
  CONFIRMED observation: listed pack-unit / listed-Product deals complete without stored contents
  NOT OBSERVED: 2 kg vs 5 kg crate; 6 kg vs 5 kg crate
  TZ-008 MODEL GAP (conversion / partial / same-id bases) remains for unobserved hypotheticals
OQ-002B: OPEN
  CONFIRMED observation: listed kg unit price + unstructured «скидка» text; concrete Offers suffice
  NOT OBSERVED: standing quantity-range schedule as a business object
NEW CONCEPT JUSTIFIED: no
NO MODEL CHANGE: yes (no Package / PriceSchedule)
NO NEW INVARIANT: yes
```

Это **не** закрытие OQ. Дальнейшее закрытие по-прежнему требует business observation, где сделка **не может** быть завершена однозначно без contents или schedule-as-object. Observed GreenMarket Stage-1 таким observation не является.

## Invariants

I-042…I-050 unchanged. No I-051.

## Сценарии

| ID | Hypothesis | Что проверяет |
|---|---|---|
| PACKAGE-BIZ-009-001 | CONFIRMED | listed `250 g @ 140` completes without contents-in-another-unit |
| PACKAGE-BIZ-009-002 | CONFIRMED | 500 g vs 350 g honey are distinct Products; no Package entity |
| VOLUME-BIZ-009-001 | CONFIRMED | 3/7/12 kg tomatoes use listed kg unit price; no schedule lookup |
| VOLUME-BIZ-009-002 | CONFIRMED | TZ-025 «скидка» text is not an Offer / not a schedule |

85 prior scenarios без регрессии → 89 total.

## Implementation

Нет новых entities и canonical fields. Production architecture unchanged. Production UI is out of scope.

## Definition of Done

- [x] Минимум одно реальное business observation по OQ-002A и по OQ-002B
- [x] Observation ≠ synthetic MODEL GAP TZ-008
- [x] Для каждого найденного flow зафиксирован business outcome
- [x] Установлен необходимый business fact (для observed flows: listed unit / Product / catalog unit price)
- [x] Fact представим существующей моделью
- [x] Новые сущности не введены
- [x] Production architecture unchanged
- [x] Только необходимые executable scenarios
- [x] Предыдущие scenarios проходят
- [x] RESULTS / BREAKING / OPEN QUESTIONS / SPEC обновлены
- [x] NEW CONCEPT JUSTIFIED: no
