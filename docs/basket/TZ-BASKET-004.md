# ТЗ-BASKET-004 — Buyer / Seller AI Assistants

**Проект:** GreenMarket  
**Основание:** ТЗ-BASKET-001…003  
**Приёмка:** детерминированные ассистенты + UI на `/sim`  
**Статус:** Implemented

## Цель

Добавить слой **советов**, а не заменить эмуляторы и не звать внешний LLM в этом PR.

Эмулятор = актор, который ходит.  
Ассистент = политика, которая смотрит snapshot и предлагает следующий ход с rationale.

Вопрос PR: «Можно ли поверх симуляции получать объяснимый совет покупателю и продавцу и применять его тем же runtime?»

## Контур

```text
Snapshot (AGREED / CURRENT / PENDING)
  ↓
BuyerAssistant / SellerAssistant  →  Advice { kind, rationale }
  ↓
applyAdvice → Domain commands (accept / counter / reject / wait)
```

Внешний LLM не входит: тесты должны быть воспроизводимы без сети. Контракт `Advice` оставляем таким, чтобы позже подставить модель.

## В scope

- `adviseBuyer(spId)` / `adviseSeller(spId)`
- `applyAdvice(spId, advice)`
- политики по умолчанию:
  - Buyer: принять уценку; контрпредложение, если цена выросла относительно agreed; иначе принять первый оффер продавца; pending substitution — принять
  - Seller: принять оффер покупателя, если цена ≥ каталожной или отличается не больше чем на 1 MAD; иначе counter каталожной ценой
- журнал `assistantAdvice` / `assistantApply` в Simulation Runtime
- шаг Scenario Engine и demo-сценарий
- блок на `/sim`: совет + Apply
- без изменений production `/cart`

## Вне scope

- вызовы OpenAI/других API
- обучение моделей
- автопилот без кнопки Apply в UI (в engine apply по шагу допустим)
- production ACL / оплата

## Критерии приёмки

- [x] совет детерминирован на одном snapshot
- [x] applyAdvice меняет domain state
- [x] buyer принимает TIME_DISCOUNT (12 < agreed 15)
- [x] buyer не принимает молча рост цены относительно agreed
- [x] ТЗ-001…003 тесты зелёные
- [x] `npm run build` проходит
