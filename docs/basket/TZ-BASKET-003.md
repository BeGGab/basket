# ТЗ-BASKET-003 — Human-facing Simulation UI

**Проект:** GreenMarket  
**Основание:** ТЗ-BASKET-001/002 и решение после ТЗ-002  
**Приёмка:** demo/training экран; production `/cart` не заменяется  
**Статус:** Implemented

## Domain Contract

Before implementation, the executor MUST read:

`docs/domain/GREENMARKET_DOMAIN_SPEC.md`

The implementation MUST comply with the current version of this specification.

If the task conflicts with the specification, do not resolve the conflict implicitly in code. Report the conflict and update the domain specification first.

See `AGENTS.md` for the mandatory AI workflow.

## Решение после ТЗ-002

Существующий Customer UI **не** является интерфейсом симуляции: `/cart` — Stage 1 корзина (`BasketStore` / `ADD_TO_BASKET`), а эксперимент — List → Purchase → SellerPurchase → Offer. Смешивать их нельзя.

ТЗ-003 поэтому отдельный этап: экран симуляции, не перенос модели в production-корзину.

## Цель

Дать человеку (разработчик, обучение, демо) смотреть и крутить уже существующий Simulation Runtime:

- Demo — прогон готового сценария целиком
- Training — AGREED / CURRENT / PENDING snapshot и журнал событий
- Scenario control — шаг за шагом, tick часов, ответы Buyer/Seller emulators

UI не доказывает модель (это ТЗ-001/002). Он только показывает уже проверенный контур.

## Контур

```text
/sim  →  ScenarioPlayer  →  SimulationRuntime (TZ-002)  →  BasketWorld (TZ-001)
```

## В scope

- маршрут `/sim`, изолированный от Platform Core ScreenId (browser-only, как `/product/:id`); **не** пункт Customer UI nav — только прямой URL
- интерактивные контролы и контент — **только** компоненты Design System (`Button`, `Card`, `Badge`, `Text`, `Row`/`Stack`); допустимы layout/container-обёртки (`div`, `header`, `ol`, `li`) и один scoped-файл `sim.css` для раскладки экспериментального viewer'а — это не production acceptance-слой, а инструмент наблюдения
- список demo-сценариев (включая трёх продавцов)
- Run all / Step / Reset
- выбор SellerPurchase внутри Purchase (snapshot и ручные ходы относятся к выбранному)
- ручные Buyer respond / Seller respond / Tick +1h
- панель snapshot и структурированный event log (`at`, seller, event, input, result, offer, SellerPurchase)
- не менять production `platform-core/basket` и `/cart`

## Вне scope

- Buyer/Seller AI Assistants (ТЗ-004+)
- production checkout/payment
- замена экрана «Корзина» покупателя
- обязательная красота marketing-лендинга

## Критерии приёмки

- [x] `/sim` открывается и не редиректится на `/catalog`
- [x] `/sim` не входит в основную навигацию Customer UI
- [x] `/cart` по-прежнему production-корзина
- [x] demo-сценарий STABLE / TIME_DISCOUNT / SNAPSHOT запускается с экрана
- [x] шаг сценария двигает состояние без перезагрузки
- [x] snapshot показывает agreed ≠ current при расхождении
- [x] несколько SellerPurchase переключаются на `/sim` (TZ002-THREE-SELLERS)
- [x] ТЗ-001/002 `npx tsx experiments/basket/tests/run.ts` зелёные
- [x] `npm run build` проходит
