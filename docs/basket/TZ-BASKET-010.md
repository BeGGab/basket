# ТЗ-BASKET-010 — Stage-1 source search for OQ-002A / OQ-002B

**Проект:** GreenMarket  
**Stage:** 1 — экспериментальный Basket Domain  
**Тип:** Stage-1 source search / evidence acquisition (primary goal not met)  
**Приёмка:** GitHub Pull Request #13  
**Статус:** Implemented — **primary goal NOT MET**; Stage-1 source search only  
**Основание:** TZ-BASKET-009 (catalog/spec reconstruction ≠ observation); SPEC v0.6 (не bump)  
**Ветка:** `basket-pr-25` (git branch name; not the GitHub PR number)  
**Контекст ревью:** first review increment of this GitHub PR was PR-25; later increments are successive diffs of the same PR #13

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

## Два разных результата (не смешивать)

| Результат | Что это значит | Что это не значит |
|---|---|---|
| **SOURCE ABSENT** | В прочитанных Stage-1 файлах нет такого listing / механизма / текста | Продавец на рынке этого не делает |
| **BUSINESS-FLOW OBSERVATION NOT OBTAINED** | Buyer/seller flow с commercial problem не воспроизведён | Seller «промолчал» в сделке |

Первый результат **не** является вторым. Отсутствие механизма в emulator **не** есть evidence отсутствия business fact.

Запрещённая формулировка после review PR-25: называть source search **NOT OBSERVED** как business-flow finding.

## Результат эксперимента

```text
PRIMARY GOAL: NOT MET
BUSINESS-FLOW OBSERVATION: NOT OBTAINED
STAGE-1 SOURCE SEARCH: recorded (SOURCE ABSENT in the inspected files)
OQ-002A OPEN
OQ-002B OPEN
NO NEW CONCEPT
NO MODEL CHANGE
SPEC v0.6
```

Это **не** вариант A («модели достаточно для observed flows»): flows не наблюдались.  
Это **не** закрытие OQ.  
Это **не** доказательство, что Package / PriceSchedule не нужны на рынке.  
Это честная фиксация: в текущем Stage-1 контуре нет материала, из которого можно получить требуемое observation, и synthetic CooperativeSeller это не заменяет.

TZ допускал «documented absence» как Variant 1. После review это означает **source absence**, а не выполненную главную цель ТЗ.

## Вне scope

- production Basket / API / БД / Platform Core / Customer UI / `/cart` / Payment / Order / Allocation
- `class Package | PackageContents | UnitConversion | PriceSchedule | PriceTier | VolumePrice`
- поля `packageContents`, `conversionFactor`, `minQuantity`, `maxQuantity`, `tierPrice`, `derivedFromSchedule`, `scheduleVersion`
- изменение `mockSellerCatalog.ts` / production ADD_TO_BASKET
- инъекция `1 мешок = 5 kg` или таблицы `1–4 / 5–9 / 10+` как experimenter catalog facts
- `new BasketWorld()` + ручной catalog + CooperativeSeller как «observation»
- повтор PACKAGE-008 / VOLUME-008 / PACKAGE-BIZ-009 как «новое» observation
- закрытие OQ-002A / OQ-002B
- Domain CONFIRMED на SOURCE-010 rows
- bump SPEC v0.7
- I-051+

## PR-25 review holes (закрыты этим исправлением)

### H1. Synthetic BasketWorld ≠ GreenMarket business flow

`observeCooperativeAccept()` создавал новый world, ручной catalog и `seller-a`. Это конструкция теста, не воспроизведение существующего flow. **Удалено.**

### H2. Hardcoded 55 / 180 / 380 ≠ чтение `mockSellerCatalog.ts`

Тесты должны читать сам файл. SOURCE-010-CATALOG-KG парсит lexical object seeds из `mockSellerCatalog.ts`.

### H3. CooperativeSeller заранее предсказуем

`respondToBuyerOffer` с теми же `items`, что сформировал buyer, проверяет только accept-as-is. Из этого нельзя получить evidence о pack-contents или quantity-range. **Удалено. Не используется как seller business decision.**

### H4. NOT OBSERVED смешивал два результата

«В коде fact не найден» ≠ «seller в flow не сообщил fact». Сейчас: SOURCE ABSENT vs BUSINESS-FLOW NOT OBTAINED.

### H5. A3 с одним `honey_flower` не проверяет гипотезу

Один listing 500 g не различает «один товар + упаковки» vs «два товара». A3 = **NOT TESTABLE** из Stage-1 sources. SOURCE-010-CATALOG-HONEY фиксирует: honey block has no `unit: "1 кг"` token. Не seller classification.

### H6. B2 180/180/180/180 неизбежен без механизма range

Корректный вывод: в текущем emulator **нет механизма**, позволяющего наблюдать quantity-range decision. Не: «это не quantity-range pricing decision».

### H7. Absence of mechanism ≠ absence of business fact

Search log «No quantity-range table / No sack=kg / No live interview» доказывает только: Stage-1 implementation currently contains no such evidence.

### H9. Net diff vs main has no FLOW-010 deletion hunks

FLOW-010 never existed on `main`. The first commit of this PR added them; the review commit removed them. `git diff main...HEAD` therefore shows only SOURCE-010. SOURCE-010-TREE scans `experiments/basket/**/*.ts` for `run("FLOW-010-…")` and `function observeCooperativeAccept`.

### H10. `extractFunction("function name(")` was syntax-fragile

Replaced by `extractNamedDeclaration` from **lexical tokens**: `function` / `export function` / `const|let|var name = (` with brace matching; strings, comments, and regex literals skipped; `{` inside `Extract<…, { … }>` skipped by a paren/angle heuristic. This is **not** a TypeScript parser (template interpolations and arbitrary `<`/`>` in defaults are unsupported). Empty extract is fail-closed. SOURCE-010-BASKET requires `declarationFound=true`. `copiesUnit` / `copiesPrice` match the token sequence `field` `:` `payload` `.` `field`. `usesBasketStore` is **not** OQ-002A evidence.

### H11. Exact seed names are not OQ-002 evidence

Potato 55 / tomato 180 / three honey names were removed from catalog evidence. Catalog search is three rows: SOURCE-010-CATALOG-KG (`hasKgListedSeed` from lexical `{ name, price, unit }` object tokens — not from string interiors), SOURCE-010-CATALOG-HONEY (`honeyCategoryFound` / `honeySeedsPresent` / `honeyKgUnitInBlock`), SOURCE-010-CATALOG-TOKENS (sack/range identifier tokens). `honeySeedsPresent` means at least one lexical object seed in the honey block. Absence of 1 kg honey is `unit:` followed by a string literal `1 кг` in that block. Category `honey:` `[` is found in lexical code, not by raw-text regex. Comment/string gaps cannot glue `min/*x*/Quantity` into `minQuantity`. This is still SOURCE ABSENT of that token, not a business-flow observation.

### H12. Quantity-range detector is a token heuristic

`mentionsQuantityRangeTokens` answers only whether those **whole identifier tokens** (or the numeric sequences `1-4` / `5-9` / `10+`) appear in TypeScript lexical code. Substrings (`minQuantityFactory`) and regex interiors do not count. A miss is SOURCE ABSENT of those tokens, not absence of a quantity-range mechanism under another name. TZ-025 is markdown prose; that row uses `mentionsQuantityRangeInProse`, not the TypeScript lexer.

### H13. ADD_TO_BASKET claims are scoped to that function

Wording is: **No conversion/tier lookup found in ADD_TO_BASKET itself.** Conversion or a pricing decision may happen before `addToBasket` writes `payload.unit` / `payload.price`. `copiesUnit` / `copiesPrice` are lexical-code matches, not comment/string matches. This row does not claim the whole basket path. The scenario field is `source inspection — not a domain invariant`; it does **not** confirm I-045.

### H14. CooperativeSeller call-shape is not OQ-002B evidence

SOURCE-010-EMULATOR records **whole identifier tokens** (`minQuantity`, `maxQuantity`, `tierPrice`, `PriceSchedule`, `VolumePrice`) in lexical code. It does not search substrings, regex interiors, or other names (`quantityPrices`, `getPrice`, `ranges`). It does not regex `acceptOffer(latestBuyer.id, "SELLER")`.

### H15. FLOW-010 scan covers experiments/basket TypeScript

SOURCE-010-TREE walks `experiments/basket/**/*.ts` and checks the two historical FLOW-010 artifacts: `run("FLOW-010-…")` as lexical `run(` + string, and `function observeCooperativeAccept` in lexical code. Comments and strings do not count. `walkComplete` means the recursive listing finished and every listed `.ts` file was inspected — not a floor such as `scannedFiles >= 8`. This is a **cleanup check** of those two names, not a proof that synthetic business-flow is absent. It does not search `docs/` (TZ-010 may mention the old ids) and does not treat PACKAGE-008 experimenter facts (`1 package = 5 kg`) as FLOW-010 leftovers. `seller-a` is not a FLOW-010 artifact.

### H16. `codeText()` must not invent tokens across comment/string gaps

Deleting comments/strings without a separator would turn `min/*x*/Quantity` into `minQuantity`. `codeText()` inserts a space on a gap, except member access `payload./*x*/unit` stays `payload.unit`. Identifier accumulators and `tokenize()` flush on the same gap, so `hon/*x*/ey` is not `honey` and `na/*x*/me` is not `name`.

### H17. Listed seeds are lexical object tokens, not string interiors

`parseListedSeeds` walks `{ name: STRING, price: NUMBER, unit: STRING }` in code tokens. `const example = '{ name: "fake", ... }'` and `const r = /{ name: "fake", ... }/` are not ListedSeeds.

### H18. Category blocks are found in lexical code

`extractCategoryBlock` looks for identifier `category`, then `:`, then `[` in the lexical walk, then `extractBalanced` from that `[`. A raw-text regex over comments/strings does not choose the match.

### H19. Scanner contract covers glue and in-string seeds

`assertStage1ScannerContract()` includes `min/*x*/Quantity`, in-string fake seeds, glued `na/*x*/me`, regex interiors, identifier boundaries, `}` in regex, and true positives with comments between real tokens.

### H20. Catalog detectors are separate SOURCE-010 rows

KG / HONEY / TOKENS are separate `prove()` rows. One PASS is not a bundle of unrelated heuristics.

### H21. Regex literals are a lexical state

`/` starts a regex unless the previous token was an operand (identifier, number, string, regex, `]`, `++`, `--`). Interiors are not code. `const r = /\bminQuantity\b/` is not a `minQuantity` token. `/{ name: "fake", ... }/` is not a ListedSeed. `const r = /}/` cannot close `extractBalanced`. Division `a / minQuantity / b` still sees the identifier.

### H22. Token detectors use identifier boundaries

`hasIdent` / `mentionsQuantityRangeTokens` / `mentionsSackContents` match whole identifier tokens. `minQuantityFactory`, `myminQuantityBackup`, `мешокMetadata` are not hits.

### H23. Declaration search is token-level

`extractNamedDeclaration` walks lexical tokens for `function name (` / `const name = (`. Raw-source regex does not choose the match. `function addToBasketFactory` is not `addToBasket`.

### H24. TZ-025 is markdown prose, not TypeScript lexical code

SOURCE-010-TZ025 uses `mentionsQuantityRangeInProse` (whole-word names in markdown). It does not call `mentionsQuantityRangeTokens`.

### H25. Scanner contract covers regex, boundaries, and extraction

`assertStage1ScannerContract()` includes regex interiors, identifier boundaries, `}` in regex, `addToBasketFactory`, listTsFiles walk, and TREE scan of the live tree.

## Search log (enumerated files are executable; live interview is human)

Источники читаются тестами из `experiments/basket/tests/stage1SourceSearch.ts`. В catalog/spec **не** создавались pack-contents или quantity-range таблицы.

| Source | What was looked for | What was found | Result kind |
|---|---|---|---|
| `mockSellerCatalog.ts` | `1 мешок = 5 kg`; quantity-range table; honey 500 g vs 1 kg as pack sizes of one product | Vegetables listed as `1 кг` with a unit price (картофель 55, томаты 180). Honeys are differently named listings (цветочный 500 г, липовый 500 г, с пергой 350 г). No `1 кг` honey. No sack=kg contents. No `1–4 / 5–9 / 10+` table. | SOURCE ABSENT |
| Production `ADD_TO_BASKET` | conversion / tier lookup **in this function** | Copies listed `price` and `unit`. **No conversion/tier lookup found in ADD_TO_BASKET itself.** Conversion or pricing could occur before this call. | SOURCE ABSENT in this function |
| `experiments/basket/emulator/sellers.ts` | pack-contents response; quantity-range identifier tokens | `minQuantity` / `maxQuantity` / `tierPrice` / `PriceSchedule` are SOURCE ABSENT in this file. Human reading still notes CooperativeSeller / time-discount / +1 negotiator; those are not OQ-002B prove() facts. | SOURCE ABSENT of those tokens |
| ТЗ-025 | structured schedule | Free-text «Сегодня скидка на сыр». Not a quantity-range object. | SOURCE ABSENT |
| Live seller / buyer interview in this repo | farm-gate dialogue | Not present. Stage-1 has mock catalog + deterministic emulators only. | SOURCE ABSENT |

Absence in these sources is **not** a market-wide claim that farmers never sell by the sack or never give quantity discounts.

## Часть A — OQ-002A

### A1 — buyer 2 kg vs pack seller

**Prerequisite:** seller who sells by pack and states contents in another unit, then answers a kg request.

**Source search:** potatoes listed `1 кг @ 55`, not `1 мешок = 5 kg @ 500`.

**Business flow:** **NOT OBTAINED.** A1 is not executable as observation. No CooperativeSeller reconstruction.

**Classification:** SOURCE ABSENT in `mockSellerCatalog.ts`. Not `A1 = NO PROBLEM`. Not business-flow NOT OBSERVED.

### A2 — buyer 6 kg vs pack seller

**Prerequisite:** same pack seller as A1.

**Source search:** same potato listing. No 1+1 / 2-pack / refuse policy exists to observe.

**Business flow:** **NOT OBTAINED.** No policy invented in code.

**Classification:** SOURCE ABSENT. A2 pack policies are **NOT TESTABLE** without a pack seller.

### A3 — honey 500 g vs 1 kg: seller self-description

**Prerequisite:** seller states whether two pack sizes are one product or two goods.

**Source search:** three differently named honeys; no `мёд 1 kg`. No seller classification API.

**Business flow:** **NOT OBTAINED.** One listing cannot test the distinction. Pre-split `productId` counting is not used (TZ-009 H3).

**Classification:** SOURCE ABSENT + **NOT TESTABLE**. Not seller classification evidence.

## Часть B — OQ-002B

### B1 — quantity-dependent listed price

**Prerequisite:** seller states a quantity-range price as a business fact and applies it to an order.

**Source search:** tomatoes listed `1 кг @ 180`. No `1–4 → 20 / 5–9 → 17 / 10+ → 14`. Quantity-range identifier tokens are SOURCE ABSENT in `sellers.ts`.

**Business flow:** **NOT OBTAINED.** CooperativeSeller cannot produce this evidence.

**Classification:** SOURCE ABSENT (listing + no emulator mechanism).

### B2 — boundaries 4 / 5 / 9 / 10 kg

Without a seller-stated range, boundaries cannot show display vs commercial decision.

**Business flow:** **NOT OBTAINED.** Four synthetic offers at a pre-set price would be inevitable if the emulator has no range mechanism.

**Classification:** SOURCE ABSENT — current emulator has **no mechanism** that would allow observing such a decision.

### B3 — schedule change 17 → 16

**Source search:** no structured schedule to change. TimeDiscountSeller (`price − 3` over time) is not B3.

**Business flow:** **NOT OBTAINED.** No executable. Schedule version/provenance is not modelled.

**Classification:** SOURCE ABSENT. Not used as OQ-002B evidence.

## Evidence cards

### SOURCE-010-CATALOG-KG

| Field | Value |
|---|---|
| Scenario ID | SOURCE-010-CATALOG-KG |
| Kind | Stage-1 source search of `mockSellerCatalog.ts` lexical object seeds |
| Business fact | none observed — file is a listing seed, not a seller utterance in a deal |
| Source | `mockSellerCatalog.ts` (file read by the test) |
| Buyer action | none |
| Seller action | none |
| Recorded listing facts | lexical `{ name, price, unit }` object seeds include at least one `unit` `1 кг`. Seeds inside string or regex literals do not count. |
| Missing fact | pack-contents relation |
| Domain conclusion | listed kg unit is **present** as an object seed **in mockSellerCatalog.ts**. **Not** a business-flow observation. Not a snapshot of potato/tomato prices. |
| Open question | SPEC OQ-002A / OQ-002B |
| New concept justified? | **no** |

### SOURCE-010-CATALOG-HONEY

| Field | Value |
|---|---|
| Scenario ID | SOURCE-010-CATALOG-HONEY |
| Kind | Stage-1 source search of the `honey` category block in `mockSellerCatalog.ts` |
| Source | `mockSellerCatalog.ts` (file read by the test) |
| Recorded listing facts | honey category found in lexical code; at least one object seed in that block; honey block has no `unit: "1 кг"` token |
| Missing fact | seller classification of honey packs |
| Domain conclusion | SOURCE ABSENT of 1 kg honey listing **in the honey block**. Not A3 seller classification. Not a business-flow observation. |
| Open question | SPEC OQ-002A |
| New concept justified? | **no** |

### SOURCE-010-CATALOG-TOKENS

| Field | Value |
|---|---|
| Scenario ID | SOURCE-010-CATALOG-TOKENS |
| Kind | Stage-1 token search of `mockSellerCatalog.ts` lexical code |
| Source | `mockSellerCatalog.ts` (file read by the test) |
| Recorded listing facts | sack/range identifier tokens SOURCE ABSENT in this file |
| Missing fact | quantity-range rule; sack-contents relation |
| Domain conclusion | SOURCE ABSENT of those tokens **in mockSellerCatalog.ts**. Token miss is not a market finding. |
| Open question | SPEC OQ-002A |
| New concept justified? | **no** |

### SOURCE-010-EMULATOR

| Field | Value |
|---|---|
| Scenario ID | SOURCE-010-EMULATOR |
| Kind | Stage-1 source search of `sellers.ts` |
| Source | `experiments/basket/emulator/sellers.ts` (file read by the test) |
| Buyer action | none |
| Seller action | none (mechanism inspection, not a deal) |
| Recorded facts | whole identifier tokens `minQuantity` / `maxQuantity` / `tierPrice` / `PriceSchedule` / `VolumePrice` are SOURCE ABSENT in this file |
| Missing fact | quantity-range pricing mechanism under any name; pack-contents response |
| Domain conclusion | SOURCE ABSENT of **those five tokens** **in sellers.ts**. Not a claim that no quantity-range mechanism exists under another name. Not a CooperativeSeller call-shape test. Not a market finding. |
| Open question | SPEC OQ-002A / OQ-002B |
| New concept justified? | **no** |

### SOURCE-010-BASKET

| Field | Value |
|---|---|
| Scenario ID | SOURCE-010-BASKET |
| Kind | Stage-1 source search of production ADD_TO_BASKET |
| Source | `BasketActionHandlers.ts` (file read by the test) |
| Recorded facts | `addToBasket` copies `payload.unit` and `payload.price`; those identifiers for conversion/tier are not in **this function body** |
| Domain conclusion | **No conversion/tier lookup found in ADD_TO_BASKET itself.** Not a claim that the whole basket path lacks conversion. Not a seller pricing observation. Does not confirm I-045. |
| Open question | SPEC OQ-002A / OQ-002B |
| New concept justified? | **no** |

### SOURCE-010-TZ025

| Field | Value |
|---|---|
| Scenario ID | SOURCE-010-TZ025 |
| Kind | Stage-1 **markdown prose** search of ТЗ-025 |
| Source | `docs/specifications/27_tz025_kartochka_prodavtsa_detalnaya.md` |
| Recorded facts | text «Сегодня скидка на сыр»; quantity-range names as whole words SOURCE ABSENT in this markdown file |
| Domain conclusion | SOURCE ABSENT for schedule-as-object in this prose file. Not a TypeScript lexical scan. Free-text is not an Offer (already I-050). Not B3 observation. |
| Open question | SPEC OQ-002B |
| New concept justified? | **no** |

### SOURCE-010-TREE

| Field | Value |
|---|---|
| Scenario ID | SOURCE-010-TREE |
| Kind | Cleanup check of two historical FLOW-010 artifacts in `experiments/basket/**/*.ts` |
| Recorded facts | no `run("FLOW-010-…")`; no `function observeCooperativeAccept(`; recursive walk of `experiments/basket` completed and every listed `.ts` file was inspected |
| Domain conclusion | Those two historical artifacts are absent from **experiments/basket TypeScript**. Cleanup check only. Does not prove synthetic business-flow is absent, a differently named helper is absent, or leftover logic is absent in `docs/` / other packages. Not a business-flow observation. |
| Open question | SPEC OQ-002A |
| New concept justified? | **no** |

Required flows A1–A3 / B1–B3 have **no** executable observation cards. They are documented above as SOURCE ABSENT / NOT TESTABLE / BUSINESS-FLOW NOT OBTAINED.

## Принятые решения

```text
TZ-BASKET-010
PRIMARY GOAL: NOT MET
BUSINESS-FLOW OBSERVATION: NOT OBTAINED
SOURCE SEARCH: SOURCE ABSENT in inspected Stage-1 files
OQ-002A: OPEN
OQ-002B: OPEN
A1/A2: SOURCE ABSENT; flow NOT OBTAINED
A3: SOURCE ABSENT + NOT TESTABLE
B1/B2: SOURCE ABSENT (no emulator mechanism); flow NOT OBTAINED
B3: SOURCE ABSENT; flow NOT OBTAINED
NEW CONCEPT JUSTIFIED: no
NO MODEL CHANGE: yes
NO NEW INVARIANT: yes
SPEC VERSION: remains v0.6
Production architecture changed: NO
```

Source absence does **not** justify Package or PriceSchedule. Further closing still requires a business-flow observation in which a deal cannot complete without the extra fact. OQ-003 may proceed independently, but does not replace this observation. This PR is not another attempt to close OQ-002A/B.

## Invariants

I-042…I-050 unchanged. No I-051.

## Сценарии

| ID | Hypothesis | Что проверяет |
|---|---|---|
| SOURCE-010-CATALOG-KG | OPEN | `mockSellerCatalog.ts` lexical object seeds include at least one `1 кг` unit |
| SOURCE-010-CATALOG-HONEY | OPEN | honey block found; no `unit: "1 кг"` token in that block |
| SOURCE-010-CATALOG-TOKENS | OPEN | sack/range tokens SOURCE ABSENT in `mockSellerCatalog.ts` |
| SOURCE-010-EMULATOR | OPEN | `sellers.ts`: five named identifier tokens SOURCE ABSENT; not a claim no range mechanism exists under another name |
| SOURCE-010-BASKET | OPEN | no conversion/tier lookup found in ADD_TO_BASKET itself |
| SOURCE-010-TZ025 | OPEN | ТЗ-025 markdown prose: cheese-discount text; range names as whole words SOURCE ABSENT |
| SOURCE-010-TREE | OPEN | cleanup check of two historical FLOW-010 names; not proof synthetic business-flow is absent |

FLOW-010-A1/A2/A3/B1/B2 never existed on `main`; they were added in the first commit of this GitHub PR and removed after PR-25 review. SOURCE-010-TREE is a **cleanup check** of those two historical artifacts in `experiments/basket/**/*.ts`. It does not prove synthetic business-flow is absent.

88 TZ-009 scenarios + 7 SOURCE-010 = 95 total.

## Implementation

Нет новых entities и canonical fields. Production architecture unchanged. Production UI is out of scope.

## Definition of Done

- [ ] Минимум одно **business-flow** observation для OQ-002A — **не выполнено** (явно: NOT OBTAINED)
- [ ] Минимум одно **business-flow** observation для OQ-002B — **не выполнено** (явно: NOT OBTAINED)
- [x] Enumerated Stage-1 source search is executable against: `mockSellerCatalog.ts`; `experiments/basket/emulator/sellers.ts`; `BasketActionHandlers.ts` `addToBasket`; `docs/specifications/27_tz025_kartochka_prodavtsa_detalnaya.md`; `experiments/basket/**/*.ts` (TREE cleanup of two historical FLOW-010 names only). Not a complete Stage-1 evidence space; the search-log “live interview” row is a human finding, not an executable scan
- [x] SOURCE ABSENT отделён от BUSINESS-FLOW NOT OBTAINED
- [x] CooperativeSeller / handmade catalog не выдаются за observation
- [x] A3 не претендует на seller classification
- [x] B2 не выдаёт неизбежный 180/180/180/180 за pricing decision
- [x] Absence of mechanism не выдаётся за absence of business fact
- [x] Synthetic reconstruction не выдаётся за observation; pack/tier tables не инжектированы
- [x] Impl PASS не превращается в Domain CONFIRMED
- [x] OQ-002A не закрыт
- [x] OQ-002B не закрыт
- [x] Новая сущность не введена
- [x] SPEC остаётся v0.6
- [x] Production architecture не изменяется
- [x] historical FLOW-010 artifacts (`run("FLOW-010-…")`, `function observeCooperativeAccept`) removed from `experiments/basket` TypeScript; SOURCE-010-TREE is this cleanup check
- [ ] synthetic business-flow patterns absent — **не доказуемо** этим scanner; не выдавать TREE PASS за это утверждение
- [x] `addToBasket` extractor matches lexical tokens (`function` / `const` / `Extract<…,{…}>`), skips regex interiors, and fails closed if the declaration is not found
- [x] SOURCE-010-CATALOG-KG не использует snapshot цен/имён как OQ-002 evidence; seeds inside string or regex literals do not count
- [x] Quantity-range detector is whole-identifier tokens; miss = SOURCE ABSENT of those tokens, not of any range mechanism
- [x] scanner contract covers regex literals, identifier boundaries, `}` in regex, factory-name mismatch, listTsFiles, and TREE walk
