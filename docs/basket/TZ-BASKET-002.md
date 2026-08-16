# ТЗ-BASKET-002 — Actor / Simulation Runtime

**Проект:** GreenMarket  
**Основание:** ТЗ-BASKET-001, пояснение владельца задачи (очередность ТЗ-001 → 002 → 003 → 004+)  
**Приёмка:** программные сценарии, без обязательного UI  
**Статус:** Implemented

## Domain Contract

Before implementation, the executor MUST read:

`docs/domain/GREENMARKET_DOMAIN_SPEC.md`

The implementation MUST comply with the current version of this specification.

If the task conflicts with the specification, do not resolve the conflict implicitly in code. Report the conflict and update the domain specification first.

See `AGENTS.md` for the mandatory AI workflow.

## Цель

Собрать поверх доменного эксперимента ТЗ-001 **runtime симуляции**: акторы (Buyer Emulator + Seller Emulator) живут в одном детерминированном цикле, переходы SellerPurchase идут через явную FSM, сценарии описываются декларативно (Scenario Engine), а не только императивными тестами.

Вопрос этого PR: «Можно ли прогнать закупку как симуляцию акторов с воспроизводимым FSM, программно и детерминированно, не трогая production UI?»

## Контур

```text
Scenario script
  ↓
Scenario Engine
  ↓
Simulation Runtime (clock + event log)
  ├── Buyer Emulator
  ├── Seller Emulator
  └── SYSTEM (time discount / expiration facts)
  ↓
Domain (TZ-001 BasketWorld)
  ↓
FSM transitions + assertions
```

## В scope

- Buyer Emulator (минимум: Accepting, Countering, Rejecting, Slow, SubstitutionAccepting)
- подключение существующих Seller-профилей ТЗ-001 к runtime
- FSM SellerPurchase с явными разрешёнными переходами
- Scenario Engine: каталог шагов createList / addItem / createPurchase / actorRespond / tick / assert*
- event log runtime (кто что сделал и в какое clock-время)
- тесты: сценарии через engine; silence не становится EXPIRED; запрещённый FSM-переход отклоняется

## Вне scope

- Human-facing Simulation UI (это ТЗ-003)
- production Customer UI / Platform Core
- Buyer/Seller AI Assistants (ТЗ-004+)
- Payment / Reservation / Allocation / Fulfillment / Delivery
- «без участия человека» как формулировка приёмки — UI просто не обязателен; debug viewer не критерий

## FSM (SellerPurchase)

Разрешённые переходы (одинаковый статус — no-op):

- DRAFT → NEGOTIATING | WAITING_SELLER | WAITING_BUYER | REJECTED | CANCELLED
- NEGOTIATING / WAITING_SELLER / WAITING_BUYER → друг в друга, STABLE, REJECTED, CANCELLED
- STABLE → WAITING_SELLER | WAITING_BUYER | NEGOTIATING | CANCELLED (новый оффер после согласия)
- REJECTED, CANCELLED — терминальные
- EXPIRED **не** выставляется автоматически по silence или `advance`/`tick` (I-041; experiment OQ-012 CLOSED)

Purchase-level статус по-прежнему **производный** (I-020).

## Buyer Emulator

| Профиль | Поведение |
|---|---|
| AcceptingBuyer | принимает активный Offer продавца/системы |
| CounteringBuyer | отвечает новым Offer с ценой −1 |
| RejectingBuyer | REJECTED SellerPurchase |
| SlowBuyer | не отвечает на tick/respond |
| SubstitutionAcceptingBuyer | ACCEPTED на PROPOSED substitution, иначе как AcceptingBuyer |

## Scenario Engine

Сценарий — данные, не UI. Один и тот же script должен давать один результат при одном clock.

## Критерии приёмки

- [x] эксперимент по-прежнему изолирован (`experiments/basket/`)
- [x] ТЗ-001 suite не сломан
- [x] минимум один breaking-сценарий (happy-path STABLE + TIME_DISCOUNT + snapshot) прогоняется через Scenario Engine
- [x] Buyer Emulator и Seller Emulator вызываются runtime, а не копипастой в тесте
- [x] FSM отклоняет REJECTED → STABLE
- [x] tick при SlowSeller не создаёт состояние EXPIRED
- [x] UI не требуется для приёмки
