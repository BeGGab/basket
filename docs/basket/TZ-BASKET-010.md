# ТЗ-BASKET-010 — Real business-flow observation for OQ-002A / OQ-002B

**Проект:** GreenMarket  
**Stage:** 1 — экспериментальный Basket Domain  
**Тип:** business-flow experiment / evidence acquisition  
**Приёмка:** Pull Request `basket-pr-25`  
**Статус:** Implemented — **Variant 1: OQ remains OPEN**  
**Основание:** TZ-BASKET-009 (catalog/spec reconstruction ≠ observation); SPEC v0.6 (не bump)  
**Ветка:** `basket-pr-25`

## Domain Contract

Before implementation, the executor MUST read:

- `docs/domain/GREENMARKET_DOMAIN_SPEC.md`
- `docs/basket/BASKET_OPEN_QUESTIONS.md`
- `docs/basket/BASKET_INVARIANTS.md`
- `docs/basket/BASKET_BREAKING_SCENARIOS.md`
- `docs/basket/BASKET_EXPERIMENT_RESULTS.md`
- `docs/basket/TZ-BASKET-009.md`

Ключевая цепочка:

```text
business fact
  + buyer/seller flow
  + конкретная коммерческая проблема
  + невозможность однозначно завершить сделку
→ только затем domain representation
```

Не начинать с предлагаемой модели. Этот PR **не добавляет** Package / PackageContents / UnitConversion / PriceSchedule / PriceTier / VolumePrice, поля `packageContents` / `conversionFactor` / `minQuantity` / `maxQuantity` / `tierPrice`, I-051+, и **не** повышает SPEC.

Не менять CONFIRMED: I-042…I-050.

Experiment-log OQ-001 / OQ-002 (resolution / alt *policy*) не трогать.

## Цель

Ответить на вопрос, который TZ-BASKET-009 оставил открытым:

Существуют ли в реальном (или реалистично воспроизведённом) GreenMarket business flow коммерческие ситуации, которые текущая Basket-модель **действительно не может** однозначно представить?

Две независимые гипотезы:

- **OQ-002A — Package.** Товар продаётся как package/pack, покупатель и продавец оперируют другой единицей, и без этого отношения сделку нельзя однозначно завершить.
- **OQ-002B — Quantity-range pricing.** Цена зависит от диапазона количества, и без отдельного schedule/tier business fact нельзя однозначно определить цену конкретного заказа.

## Результат эксперимента

**Вариант 1.**

```text
OQ-002A OPEN
OQ-002B OPEN
NO NEW CONCEPT
NO MODEL CHANGE
SPEC v0.6
```

В доступных Stage-1 источниках **не найден** seller, который:

- заявляет pack-contents в другой единице (`1 мешок = 5 kg`) и отвечает на запрос в kg; или
- заявляет standing quantity-range цену и применяет её к заказу; или
- классифицирует «мёд 500 g / мёд 1 kg» как один товар + упаковки vs два товара; или
- меняет structured schedule `5–9 kg → 17` на `16` с различимым эффектом на существующий vs новый заказ.

Найденные buyer/seller traces (CooperativeSeller на Stage-1 listed-unit listings) завершают сделку **в той же единице и по listed unit price**. Это не закрывает OQ-002A/B: prerequisite seller fact для обеих гипотез отсутствует.

Это **не** доказательство, что Package / PriceSchedule не нужны на рынке.  
Это **не** закрытие OQ.  
Это документированное **отсутствие** требуемого business-flow evidence в текущем Stage-1 контуре.

## Вне scope

- production Basket / API / БД / Platform Core / Customer UI / `/cart` / Payment / Order / Allocation
- `class Package | PackageContents | UnitConversion | PriceSchedule | PriceTier | VolumePrice`
- поля `packageContents`, `conversionFactor`, `minQuantity`, `maxQuantity`, `tierPrice`, `derivedFromSchedule`, `scheduleVersion`
- изменение `mockSellerCatalog.ts` / production ADD_TO_BASKET
- инъекция `1 мешок = 5 kg` или таблицы `1–4 / 5–9 / 10+` как experimenter catalog facts
- повтор PACKAGE-008 / VOLUME-008 / PACKAGE-BIZ-009 как «новое» observation
- закрытие OQ-002A / OQ-002B
- Domain CONFIRMED на FLOW-010 rows
- bump SPEC v0.7
- I-051+

## Правило, зафиксированное после TZ-009

Нельзя:

1. начать с сущности, затем доказать, что она работает;
2. назвать catalog/spec reconstruction observation;
3. превратить Impl PASS в Domain CONFIRMED;
4. считать два заранее заданных `productId` доказательством pack-as-Products;
5. инжектировать Offer.price и «наблюдать» его как seller pricing.

Если flow не найден — **NOT OBSERVED**, без выдуманной seller policy в коде.

## Search log (read-only)

Источники просмотрены **до** любых executable scenarios. В catalog/spec **не** создавались pack-contents или quantity-range таблицы.

| Source | What was looked for | What was found |
|---|---|---|
| `react-vite-bootstrap-project/src/platform-core/map/repository/mockSellerCatalog.ts` | seller fact `1 мешок = 5 kg`; quantity-range price table; honey 500 g vs 1 kg as pack sizes of one product | Vegetables (картофель, томаты, …) listed as `1 кг` with a unit price. Dairy/meat/bakery/honey/nuts use listed unit strings (`250 г`, `500 г`, `1 шт`, `1 пучок`). Honeys are **differently named** listings (цветочный 500 г, липовый 500 г, с пергой 350 г). **No** `1 кг` honey. **No** sack=kg contents. **No** `1–4 / 5–9 / 10+` table. |
| Production `ADD_TO_BASKET` (`BasketActionHandlers.ts`) | conversion / tier lookup at add-to-basket | Copies listed `price` and `unit`. No conversion. No quantity-range. |
| `experiments/basket/emulator/sellers.ts` | pack-contents response; quantity-range pricing; schedule version | CooperativeSeller accepts the buyer Offer as-is. NegotiatingSeller adds +1 to unit price (not a range). TimeDiscountSeller subtracts 3 over **time** from a seller-side Offer (not a standing quantity-range change). PartialAvailabilitySeller reduces to same-unit stock. SubstitutionSeller substitutes `baguette`. **None** states pack contents or a quantity-range table. |
| ТЗ-025 (`docs/specifications/27_tz025_kartochka_prodavtsa_detalnaya.md`) | structured schedule | Free-text example «Сегодня скидка на сыр». Not a quantity-range object. |
| TZ-BASKET-009 search | crate / schedule in Stage-1 | Already recorded: no crate `1 package = 5 kg`; no quantity-range table. Reconstruction only. |
| Live seller / buyer interview in this repo | real farm-gate dialogue | **Not present.** Stage-1 has mock catalog + deterministic emulators only. |

Interpretation is separated from fact: absence in these sources is **not** a market-wide claim that farmers never sell by the sack or never give quantity discounts.

## Часть A — OQ-002A

### A1 — buyer 2 kg vs pack seller

**Prerequisite:** seller who actually sells by pack and states contents in another unit.

**Search result:** no such seller fact. Potatoes are listed as `1 кг @ 55`, not `1 мешок = 5 kg @ 500`.

Executable FLOW-010-A1 therefore does **not** plant `externalPackageKg = 5`. It runs the Stage-1 flow that **does** exist:

- Business fact (listing): картофель listed `kg` @ 55 (mapped from mock `1 кг @ 55`; this is listed-unit mapping, **not** pack conversion).
- Buyer action: request 2 kg.
- Seller action: CooperativeSeller accepts 2 kg @ 55.
- Observed outcome: same-unit kg deal completes. Seller does not state pack contents and does not refuse partial pack (there is no pack).
- A1 classification: **NOT OBSERVED** (pack-selling seller fact absent). This is **not** `A1 = NO PROBLEM` for the package-contents hypothesis.

### A2 — buyer 6 kg vs pack seller

**Prerequisite:** same pack seller as A1.

**Search result:** absent. Executable FLOW-010-A2 runs 6 kg against the same kg potato listing. CooperativeSeller accepts 6 kg @ 55. No 1+1 kg / 2 packages / refuse / other-stock policy is invented.

A2 classification: **NOT OBSERVED**.

### A3 — honey 500 g vs 1 kg: seller self-description

**Search result:** mock has three differently named honeys; there is no `мёд 1 kg` listing. No seller API or emulator method classifies «один товар + разные упаковки» vs «два самостоятельных товара».

Executable FLOW-010-A3: buyer requests listed flower honey `500 g`; CooperativeSeller accepts that line; no substitution to another honey; no pack-vs-product classification field. Identity-key counting of pre-split `productId`s is **not** used (TZ-009 H3).

A3 classification: **NOT OBSERVED** (seller self-description absent).

## Часть B — OQ-002B

### B1 — quantity-dependent listed price

**Prerequisite:** seller who states a quantity-range price as a business fact.

**Search result:** tomatoes listed `1 кг @ 180`. No `1–4 → 20 / 5–9 → 17 / 10+ → 14`. Emulators do not look up quantity.

Executable FLOW-010-B1: buyer requests 7 kg; CooperativeSeller accepts 7 kg @ listed 180. Seller does not state or apply a range.

B1 classification: **NOT OBSERVED**.

### B2 — boundaries 4 / 5 / 9 / 10 kg

Without a seller-stated range, boundaries cannot show whether a range is display-only or a commercial decision.

Executable FLOW-010-B2: CooperativeSeller accepts 4, 5, 9, and 10 kg, each at listed 180. That is listed-unit-price acceptance, **not** a quantity-range pricing decision.

B2 classification: **NOT OBSERVED**.

### B3 — schedule change 17 → 16

**Search result:** no structured schedule exists to change. TimeDiscountSeller (`price − 3` over time on a seller-side Offer) is **not** B3: it is not a standing quantity-range rule, has no 5–9 kg bound, and does not distinguish existing vs new orders via schedule version.

B3 classification: **NOT OBSERVED**. No executable scenario. Schedule version/provenance is **not** modelled.

## Evidence cards

### FLOW-010-A1

| Field | Value |
|---|---|
| Scenario ID | FLOW-010-A1 |
| Business fact | Stage-1 potato listing is `kg` @ 55. **No** seller fact `1 мешок = 5 kg`. |
| Source | `mockSellerCatalog.ts` vegetables «Картофель молодой» `1 кг @ 55`; CooperativeSeller |
| Buyer action | requests 2 kg |
| Seller action | accepts 2 kg @ 55 (same unit, listed unit price) |
| Observed outcome | kg deal STABLE; no pack contents stated |
| Current model representation | Offer `(potatoes, 2, kg, 55)` + Acceptance |
| Missing fact | seller pack-contents relation in another unit; partial-pack policy |
| Ambiguity / impossibility | pack-contents hypothesis cannot be tested; kg deal itself is representable |
| Domain conclusion | **NOT OBSERVED** for OQ-002A A1. Not `A1 = NO PROBLEM` on packages. |
| Open question | SPEC OQ-002A |
| New concept justified? | **no** |

### FLOW-010-A2

| Field | Value |
|---|---|
| Scenario ID | FLOW-010-A2 |
| Business fact | same kg potato listing as A1 |
| Source | same |
| Buyer action | requests 6 kg |
| Seller action | accepts 6 kg @ 55 |
| Observed outcome | kg deal STABLE; no 1+1 / 2-pack / refuse policy stated |
| Current model representation | Offer `(potatoes, 6, kg, 55)` + Acceptance |
| Missing fact | pack seller; oversupply / split / whole-only rule |
| Ambiguity / impossibility | A2 pack policies cannot be observed because the pack seller is absent |
| Domain conclusion | **NOT OBSERVED** for OQ-002A A2 |
| Open question | SPEC OQ-002A |
| New concept justified? | **no** |

### FLOW-010-A3

| Field | Value |
|---|---|
| Scenario ID | FLOW-010-A3 |
| Business fact | mock lists differently named honeys; no 1 kg honey; seller never classifies pack vs product |
| Source | `mockSellerCatalog.ts` honey seeds; CooperativeSeller |
| Buyer action | requests flower honey `500 g` |
| Seller action | accepts that listed line; no substitution; no classification |
| Observed outcome | listed-unit deal STABLE |
| Current model representation | Offer `(honey_flower, 1, 500 g, 380)` + Acceptance |
| Missing fact | seller self-description of 500 g vs 1 kg (one product + packs vs two products) |
| Ambiguity / impossibility | cannot conclude pack-as-Product or pack-as-contents from this flow |
| Domain conclusion | **NOT OBSERVED** for OQ-002A A3. Not TZ-009 identity-key tautology. |
| Open question | SPEC OQ-002A |
| New concept justified? | **no** |

### FLOW-010-B1

| Field | Value |
|---|---|
| Scenario ID | FLOW-010-B1 |
| Business fact | tomatoes listed `kg` @ 180. **No** seller quantity-range table. |
| Source | `mockSellerCatalog.ts` «Томаты» `1 кг @ 180`; CooperativeSeller |
| Buyer action | requests 7 kg |
| Seller action | accepts 7 kg @ 180 |
| Observed outcome | listed unit price applied; no range stated |
| Current model representation | Offer `(tomatoes, 7, kg, 180)` + Acceptance |
| Missing fact | seller-stated quantity-range rule that determines the 7 kg price |
| Ambiguity / impossibility | cannot tell what price a range-pricing seller would apply to 7 kg |
| Domain conclusion | **NOT OBSERVED** for OQ-002B B1 |
| Open question | SPEC OQ-002B |
| New concept justified? | **no** |

### FLOW-010-B2

| Field | Value |
|---|---|
| Scenario ID | FLOW-010-B2 |
| Business fact | same listed `kg` @ 180; no range bounds exist to test |
| Source | same |
| Buyer action | requests 4, 5, 9, 10 kg |
| Seller action | accepts each at 180 |
| Observed outcome | same listed unit price at all four quantities |
| Current model representation | four Offers, each `(tomatoes, qty, kg, 180)` |
| Missing fact | seller range bounds and a pricing decision at those bounds |
| Ambiguity / impossibility | cannot classify a non-existent range as display vs commercial |
| Domain conclusion | **NOT OBSERVED** for OQ-002B B2 |
| Open question | SPEC OQ-002B |
| New concept justified? | **no** |

### FLOW-010-B3

| Field | Value |
|---|---|
| Scenario ID | FLOW-010-B3 (documentation only; no executable) |
| Business fact | none found |
| Source | search log; TimeDiscountSeller inspected and rejected as B3 |
| Buyer action | not observed |
| Seller action | not observed |
| Observed outcome | **NOT OBSERVED** |
| Current model representation | n/a — do not invent schedule version |
| Missing fact | seller changing `5–9 kg → 17` to `16`; existing vs new order effect; provenance |
| Ambiguity / impossibility | version/provenance must not be modelled without this flow |
| Domain conclusion | **NOT OBSERVED**. Not used as OQ-002B evidence. |
| Open question | SPEC OQ-002B |
| New concept justified? | **no** |

## Принятые решения

```text
TZ-BASKET-010
Variant 1
OQ-002A: OPEN
OQ-002B: OPEN
A1/A2/A3: NOT OBSERVED
B1/B2/B3: NOT OBSERVED
NEW CONCEPT JUSTIFIED: no
NO MODEL CHANGE: yes
NO NEW INVARIANT: yes
SPEC VERSION: remains v0.6
Production architecture changed: NO
```

Absence of observation does **not** justify Package or PriceSchedule. Further closing still requires a business-flow observation in which a deal cannot complete without the extra fact.

## Invariants

I-042…I-050 unchanged. No I-051.

## Сценарии

| ID | Hypothesis | Что проверяет |
|---|---|---|
| FLOW-010-A1 | OPEN (OQ-002A) | seller action on 2 kg potatoes; pack-contents seller fact absent |
| FLOW-010-A2 | OPEN (OQ-002A) | seller action on 6 kg potatoes; pack oversupply policy not invented |
| FLOW-010-A3 | OPEN (OQ-002A) | seller accepts listed honey; no pack-vs-product classification |
| FLOW-010-B1 | OPEN (OQ-002B) | seller action on 7 kg tomatoes; quantity-range seller fact absent |
| FLOW-010-B2 | OPEN (OQ-002B) | seller accepts 4/5/9/10 kg at listed unit price; not a range decision |

FLOW-010-B3 is documentation only.

88 prior + 5 FLOW-010 = 93 total.

Executable rows include buyer **and** seller actions. They are **not** catalog-only reconstruction. They still do **not** close OQ-002A/B: the hypothesised seller facts were not found.

## Implementation

Нет новых entities и canonical fields. Production architecture unchanged. Production UI is out of scope.

## Definition of Done

- [x] Минимум одно business-flow observation для OQ-002A **или** документированное отсутствие — отсутствие A1/A2/A3 зафиксировано; FLOW-010-A* run seller actions on the Stage-1 flow that exists
- [x] Минимум одно business-flow observation для OQ-002B **или** документированное отсутствие — отсутствие B1/B2/B3 зафиксировано; FLOW-010-B* run seller actions; B3 NOT OBSERVED without executable invention
- [x] В observation участвуют buyer/seller actions, не только catalog/spec
- [x] Business fact отделён от interpretation
- [x] Для каждого flow зафиксирован observed outcome
- [x] Synthetic reconstruction не выдаётся за observation; pack/tier tables не инжектированы
- [x] Impl PASS не превращается в Domain CONFIRMED
- [x] OQ-002A не закрыт
- [x] OQ-002B не закрыт
- [x] Новая сущность не введена
- [x] SPEC остаётся v0.6
- [x] Production architecture не изменяется
