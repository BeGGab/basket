# ТЗ-BASKET-001 — Экспериментальный домен корзины и эмулятор продавцов

**Проект:** GreenMarket  
**Stage:** 1 — Customer UI  
**Тип:** экспериментальная инфраструктура доменной модели  
**Приёмка:** Pull Request  
**Статус:** Implemented 
**Основание:** `BASKET_DOMAIN_MODEL.md`, `BASKET_EXPERIMENT.md`, `BASKET_INVARIANTS.md`, `BASKET_BREAKING_SCENARIOS.md`

Уточнение scope (владелец задачи): UI **не входит в обязательный scope** ТЗ-001. Все сценарии должны выполняться **программно и детерминированно**. Debug/demo viewer допустим как помощь разработчику, но PR не принимается и не отклоняется по наличию или качеству UI. Не формулировать требование как «без участия человека».

Последовательность следующих ТЗ (вне обязательного scope ТЗ-001 как отдельного PR): ТЗ-001 Domain Experiment → ТЗ-002 Actor/Simulation Runtime → ТЗ-003 Human-facing Simulation UI → ТЗ-004 Buyer/Seller AI Assistants. В текущем GitHub PR лестница 001…004 собрана сознательно в один reviewable unit.

Первый PR отвечает только на вопрос: «Работает ли сама модель закупки и переговоров?» — не «Удобно ли человеку пользоваться корзиной?»

---

## 1. Цель задачи

Реализовать изолированный mock-эксперимент, позволяющий проверить рабочую модель корзины GreenMarket на сценариях реального поведения покупателей и продавцов.

На этом этапе не реализуется production-корзина GreenMarket и не выполняется интеграция с реальным API, БД или Platform Core.

Результатом PR должен быть работающий экспериментальный контур:

```text
List
  ↓
Resolution
  ↓
Purchase
  ↓
SellerPurchase[*]
  ↓
Offer / Acceptance / Substitution
  ↓
STABLE
```

с возможностью воспроизводить breaking-сценарии через Seller Emulator.

Главный критерий: реализация должна позволить проверить, насколько естественно предложенная доменная модель описывает процесс закупки GreenMarket, и зафиксировать места, где модель требует изменения.

Контур исполнения сценария:

```text
Scenario
  ↓
Mock Buyer / test commands
  ↓
Domain
  ↓
Seller Emulator
  ↓
Domain events/state
  ↓
Assertions
```

Результат должен быть виден в тестах, логах и snapshot'ах.

---

## 2. Что является результатом PR

1. mock domain model;
2. Seller Emulator;
3. механизм запуска сценариев;
4. автоматические тесты доменных инвариантов;
5. реализация breaking-сценариев;
6. snapshot-test для AGREED / CURRENT OFFER / PENDING SUBSTITUTION;
7. механизм фиксации результатов эксперимента;
8. документация по запуску эксперимента.

---

## 3. Жёсткая граница задачи

**Реализовать:** List, ListItem, Alternative, Purchase, SellerPurchase, PurchaseItem, Offer, Acceptance, Substitution, Resolution, Seller Emulator и необходимую state/projection логику.

**Не реализовать** production-семантику: Order, Checkout, Payment, Reservation, Allocation, Fulfillment, Delivery, Production Stock Management, Real Seller Accounts, Production ACL, Production Backend API, Production Database.

Mock-события после STABLE допускаются только как внешние заглушки сценария (`STABLE → mockPay()`), реализация Payment в задачу не входит.

**UI не входит в обязательный scope.** Обязательный путь — программные команды и assertions, например:

```text
createList()
addItem(TOMATOES, 20kg)
createPurchase()
seller.proposeOffer(20kg, 15 MAD)
buyer.acceptOffer()
assert sellerPurchase == STABLE
```

и отдельно:

```text
seller.proposeSubstitution(...)
assert substitution.status == PROPOSED
buyer.acceptSubstitution(...)
assert substitution.status == ACCEPTED
```

---

## 4. Требование к изоляции

Экспериментальный код должен быть изолирован от production Customer UI.

Не допускается изменение существующей production-модели корзины только для того, чтобы встроить эксперимент.

Предпочтительно разместить эксперимент в отдельном модуле/пакете/директории. Не изменять архитектуру Platform Core ради удобства эксперимента.

---

## 5. Domain Model

### 5.1 List

```text
List
├── id
├── name
└── items[]
```

List не привязывается к продавцу. Создание Purchase не удаляет и не изменяет исходный List.

Обязательный тест: тот же List → Purchase #1 и Purchase #2, оба независимы.

### 5.2 ListItem

```text
ListItem
├── productId
├── quantity?
├── unit?
├── referencePrice?
└── alternatives[]
```

Alternative имеет однозначный `alternativePriority` (0 = primary).

---

## 6. Resolution

Отдельная функция/сервис. Не смешивать с SellerPurchase negotiation.

```text
resolve(ListItem, context) → ResolutionResult
```

Результат: `PRIMARY | ALTERNATIVE | UNRESOLVED`.

Политики: `PRIMARY_ONLY`, `FIRST_AVAILABLE`, `ASK_BUYER`.

- **PRIMARY_ONLY** — только primary; иначе UNRESOLVED.
- **FIRST_AVAILABLE** — primary, затем alternative #1, #2, … первый доступный.
- **ASK_BUYER** — если primary недоступен, автоматический выбор не производится.

**Не реализовывать** BEST_PRICE / PRICE_OPTIMIZATION / MAX_PRICE / REFERENCE_PRICE_THRESHOLD как готовую бизнес-логику. Сценарий дорогой альтернативы выявляет необходимость policy, а не получает заранее придуманное решение.

---

## 7–9. Purchase / SellerPurchase / PurchaseItem

`createPurchaseFromList(list, resolutionPolicy)` создаёт независимый Purchase; исходный List сохраняется. Purchase содержит один или несколько SellerPurchase.

Экспериментальный helper (не production API): без `sellerIds` выбирается один продавец (`pickSeller`); с `sellerIds` — **fan-out**, по одному SellerPurchase на каждого перечисленного продавца с строкой каталога. Это режим сценария, не «фильтр поиска».

SellerPurchase — независимая единица lifecycle: `id`, `purchaseId`, `sellerId`, `items[]`, `agreedOfferId?`, `activeOfferId?`, `status`. Lifecycle — только `status` (в т.ч. `REJECTED`); отдельного флага `rejected` нет.

Обязательно: A → STABLE, B → NEGOTIATING, C → REJECTED без взаимного блокирования.

PurchaseItem: `productId`, `quantity`, `unit`, `price?`, `discount?`, `resolvedFrom?`, `alternativePriority?`. Запрещён `PurchaseItem.priceHistory[]` — история в Offer.

---

## 10–13. Offer / Acceptance / Agreed vs Active

Offer immutable: `id`, `sellerPurchaseId`, `actor` (`BUYER|SELLER|SYSTEM`), `items[]`, `reason`, `createdAt`, `validUntil?`.

Reasons (минимальный набор, не production enum): `BUYER_CHANGE`, `SELLER_COUNTEROFFER`, `PRICE_CHANGE`, `TIME_DISCOUNT`, `AVAILABILITY_CHANGE`, `SYSTEM_ADJUSTMENT`. Допустимы дополнительные, если сценарий требует (`SUBSTITUTION`, `EXPIRATION`).

Acceptance — отдельный факт: `id`, `offerId`, `actor`, `createdAt`. Не мутирует Offer.

Обязательный сценарий: Offer #18 accepted, Offer #19 new seller proposal → `agreedOfferId = #18`, `activeOfferId = #19`.

---

## 14. Snapshot Test (обязательный приёмочный)

Одновременно:

- AGREED: Offer #18, Tomatoes × 2, 15 MAD
- CURRENT: Offer #19, Tomatoes × 2, 12 MAD
- PENDING SUBSTITUTION: Tomato A → Tomato B

Если этот тест нельзя выразить естественно — PR не принимается.

---

## 15–16. Substitution vs Alternatives

Substitution: `id`, `sellerPurchaseId`, `originalProductId`, `replacementProductId`, `proposedBy`, `reason?`, `status` (`PROPOSED|ACCEPTED|REJECTED`), `createdAt`.

PROPOSED не меняет agreed state. Baguette вне alternatives → Substitution, не Resolution.

Black→White в alternatives при отсутствии Black → Resolution, не Substitution.

---

## 17–18. STABLE и Partial Availability

```text
STABLE =
  activeOffer == agreedOffer
  AND no unresolved mandatory substitution
  AND agreed offer is valid
```

`acceptOffer()` не принимает просроченный Offer (I-028) — проверка `isOfferValid` до записи Acceptance.

Запрещено добавлять `required quantity available` в условие STABLE. Не требуется reserved/paid/fulfilled/delivered.

Сценарий `requested=20, agreed=20, actual=5` не делает STABLE недействительным. `fulfilledQuantity` не добавляется в центральную модель — исполнение моделируется внешним mock-сценарием.

---

## 19–26. Seller Emulator

Поведенческий actor, не production seller service. Минимум профилей: Cooperative, Negotiating, TimeDiscount, Substitution, Slow, PartialAvailability.

Детерминированный запуск: контролируемое время, фиксированные решения, цены, availability. Не вводить автоматически `SELLER_UNRESPONSIVE`. Stock race не решать скрытой allocation. Claim для stock-conflict = quantity **active** Offer, не agreed. `PartialAvailabilitySeller` смотрит только catalog stock; competing claims / allocation вне эксперимента.

---

## 27–28. Breaking / acceptance scenarios

Автоматизировать минимум: BS-001…028 (programmatically exercised; Domain OPEN не значит «не гонялся»). BS-017: принимать можно только active Offer (I-027). BS-012: просроченный Offer нельзя принять (I-028). Acceptance только counterparty (I-029). Offer quantity > 0 (I-030). BS-019: Resolution до разбиения по продавцам; SellerPurchase только при stock > 0. BS-023: detection log, Domain OPEN (OQ-016). BS-028: qty 5 и реакция tick() на падение stock.

Обязательные приёмочные: Independent sellers; SYSTEM price drop; Alternatives; Expensive alternative (без скрытой ценовой логики); Stock race (точка конфликта, не allocation); Expiration; Silence; Partial fulfillment; Snapshot; Accepted+new Offer; Partial availability before STABLE.

---

## 29–30. Результаты и поломка модели

Обновить `BASKET_EXPERIMENT_RESULTS.md` по каждому сценарию (Result/Expected/Actual/Invariant/Model violation/New concept/Workaround/Decision). Нельзя ограничиться «BS-016 PASS».

Если сценарий нельзя выразить — не чинить скрытым workaround: зафиксировать, указать инвариант, записать в results, при необходимости изменить domain model и версию.

---

## 31. Архитектура кода

Логически разделить `domain` (entities, resolution, negotiation, projections), `emulator` (profiles, events, clock), `tests` (invariants, domain, breaking). Seller Emulator не смешивать с Domain Model.

---

## 32. Что не является критерием успеха

Не требуется: production UI; интеграция с реальным каталогом; backend; авторизация; БД; оплата; резервирование; production performance/deployment.

Ценность PR — проверка доменной модели. Наличие debug UI не является ни обязательным, ни достаточным критерием приёмки.

---

## 33–34. Требования и критерии приёмки PR

PR содержит: Summary; Domain mapping; Emulator profiles; Tests; Results (PASS/FAIL/MODEL GAP/WORKAROUND/OPEN); Model changes.

Чеклист приёмки — по разделу 34 исходного ТЗ: изоляция от Customer UI; List≠Purchase; Offer immutable; snapshot; alternatives≠substitution; STABLE без полного наличия; 6 профилей; воспроизводимость; stock race без allocation; silence не превращён в FSM state; production Order/Payment/Reservation не затянуты.

---

## 35. Что должно быть доказано этим PR

Не «Работает ли корзина?», а: «Может ли предложенная доменная модель естественно описать GreenMarket до момента коммерческой стабильности закупки?»

Только после этого результат становится основанием для следующего ТЗ — на перенос подтверждённой модели в архитектуру GreenMarket.
