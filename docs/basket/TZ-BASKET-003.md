# ТЗ-BASKET-003 — Human-facing Simulation UI

**Проект:** GreenMarket  
**Основание:** ТЗ-BASKET-001/002 и решение после ТЗ-002  
**Приёмка:** demo/training экран; production `/cart` не заменяется  
**Статус:** Implemented

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

- маршрут `/sim`, изолированный от Platform Core ScreenId (browser-only, как `/product/:id`)
- только компоненты Design System
- список demo-сценариев ТЗ-002
- Run all / Step / Reset
- ручные Buyer respond / Seller respond / Tick +1h
- панель snapshot и event log
- не менять production `platform-core/basket` и `/cart`

## Вне scope

- Buyer/Seller AI Assistants (ТЗ-004+)
- production checkout/payment
- замена экрана «Корзина» покупателя
- обязательная красота marketing-лендинга

## Критерии приёмки

- [x] `/sim` открывается и не редиректится на `/catalog`
- [x] `/cart` по-прежнему production-корзина
- [x] demo-сценарий STABLE / TIME_DISCOUNT / SNAPSHOT запускается с экрана
- [x] шаг сценария двигает состояние без перезагрузки
- [x] snapshot показывает agreed ≠ current при расхождении
- [x] ТЗ-001/002 `npx tsx experiments/basket/tests/run.ts` зелёные
- [x] `npm run build` проходит
