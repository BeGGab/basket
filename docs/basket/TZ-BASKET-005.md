# ТЗ-BASKET-005 — Разрешение семантики истечения Offer и молчания

**Проект:** GreenMarket  
**Stage:** 1 — Customer UI / экспериментальный Basket Domain  
**Тип:** domain iteration / закрытие открытых вопросов  
**Приёмка:** Pull Request  
**Статус:** Implemented  
**Основание:** `docs/domain/GREENMARKET_DOMAIN_SPEC.md` v0.2 → v0.3, PR-12, `BASKET_INVARIANTS.md`, BS-012 / BS-021 / BS-022 / BS-026

## Domain Contract

Before implementation, the executor MUST read:

`docs/domain/GREENMARKET_DOMAIN_SPEC.md`

The implementation MUST comply with the current version of this specification.

If the task conflicts with the specification, do not resolve the conflict implicitly in code. Report the conflict and update the domain specification first.

See `AGENTS.md` Rule 49:

```text
Observation → Domain decision → SPEC update → Invariant → Scenario → Implementation → Regression test
```

GREENMARKET_DOMAIN_SPEC.md is the canonical source. This PR updates SPEC first, then invariants, then scenarios, then code.

## Цель

Закрыть три вопроса, которые PR-12 оставил открытыми:

| Experiment | SPEC | Вопрос |
|---|---|---|
| OQ-009 | OQ-004 | что происходит с уже согласованным Offer после `validUntil` |
| OQ-011 | — | что означает молчание участника |
| OQ-012 | — | как представлять ожидание и переход времени |

Главный вопрос: может ли доменная модель однозначно описать SellerPurchase, когда Offer истёк, участник молчит или проходит время ожидания?

## Вне scope

- новый AI / смена формы Advice / внешний LLM
- production Basket / Platform Core / backend / UI
- политика скидок
- OQ-001 / OQ-002 / SPEC OQ-005 (negotiation TTL)
- автоматический timeout workflow только ради тестов

## Принятые решения

### OQ-009 / SPEC OQ-004 — истечение уже согласованного Offer

`validUntil` / `isOfferValid` — validity **стоящего предложения**: можно ли *сейчас* принять или counter'ить **active** Offer. Это не отзыв Acceptance.

После `ACCEPT(A)` и `time > A.validUntil`, если нового Offer нет:

| Вопрос | Ответ |
|---|---|
| `agreedOfferId` | остаётся A |
| `activeOfferId` | остаётся A |
| A исторический? | да (Offer immutable) |
| A всё ещё baseline? | да (Acceptance — коммерческий факт) |
| STABLE? | да, если A всё ещё active и нет pending mandatory substitutions |
| Новое FSM-состояние? | нет |
| Можно предложить новый Offer? | да, с non-counter reason |
| Появление B | `active=B`, `agreed=A`; B можно принять, если valid |
| Stock claim? | нет — expired Offer не claim (I-025); STABLE ≠ stock guarantee |

I-028 / I-035 по-прежнему запрещают ACCEPT / COUNTER истёкшего standing proposal.

### OQ-011 — молчание

Silence = **отсутствие domain command**, не сущность и не FSM-состояние. Не становится REJECT / CANCEL / EXPIRED без явной команды.

Достаточные факты: `waitingSince`, `lastSellerActivity`, clock. Silence до и после expiration отличается только вычисленным `isOfferValid`.

### OQ-012 — время

1. Источник времени — `DeterministicClock` мира (`Clock.now()`). Domain operations читают часы, не принимают timestamp.
2. `advance(durationMs)` — domain operation: двигает **только** часы. Не создаёт Offers / Acceptances / stock-conflict events / статусы и не чистит pointers. STABLE от часов не зависит (I-038). `validUntil` — exclusive end (`now === validUntil` уже expired).
3. Emulator/runtime `tick()` — **не** domain operation.
4. Passage of time меняет только computed `isOfferValid`. Не входит в `EXPIRED` / `REJECTED` / `CANCELLED`.
5. `SELLER_UNRESPONSIVE` — не domain state.

`EXPIRED` остаётся в union статусов, чтобы FSM мог отказать в автоматическом входе (I-041). Ни одна команда туда не входит.

## Invariants

Изменены: I-011, I-017, I-025.

Новые:

- **I-037** — `validUntil` ограничивает accept/counter active standing proposal; не отзывает Acceptance
- **I-038** — STABLE = `agreed == active` и нет pending mandatory substitutions; validity не вход/выход
- **I-039** — silence не меняет status / pointers и не изобретает REJECT/CANCEL/EXPIRED
- **I-040** — clock + `advance` двигает только часы; `tick()` не domain operation; `validUntil` — exclusive end
- **I-041** — time/silence не входят в `EXPIRED`

## Сценарии

Новые: BS-029…036 (все через `prove()`).

Regression: BS-012, BS-013, BS-021, BS-022, BS-024, BS-026, BS-028 — Domain CONFIRMED там, где вопрос закрыт.

## Implementation

Смысловые изменения кода:

- `refreshStatus` больше не требует `isOfferValid(agreed)` для STABLE (I-038);
- `advance()` двигает только часы и больше не вызывает `refreshStatus` (I-040) — время не пишет stock-conflict events и не пересчитывает FSM.

Assistant Advice shape не менялся: STABLE проверяется раньше validity → `WAIT(TERMINAL_STATUS)`; истёкший agreed Offer остаётся price baseline при живом следующем active Offer. Pre-expiry STABLE WAIT становится stale после expiry (`activeOfferValid` flipped); повторный advise снова `WAIT(TERMINAL_STATUS)`.

## Assistant compatibility

`isOfferValid` по-прежнему означает standing-proposal validity. `AdviceBasis.activeOfferValid` фиксирует валидность **active** Offer. Истечение agreed Offer basis не инвалидирует.

## Запрещённые решения (не использованы)

- скрытый workaround / expiry-семантика только в emulator /sim
- Assistant-only interpretation domain state
- автоматический REJECT при silence
- новый FSM status
- смена `activeOfferId` ради Assistant
- копирование domain rules в тесты вместо domain API

## Критерии приёмки

- [x] OQ-009 / OQ-011 / OQ-012 CLOSED в Domain Spec (decision + rationale + affected)
- [x] I-037…I-041 добавлены; I-011 / I-017 / I-025 уточнены
- [x] BS-029…036 реализованы через `prove()`
- [x] существующие expiration/silence scenarios зелёные
- [x] Assistant regression + I-037 / STABLE+expiry
- [x] determinism: BS-036 сравнивает полный observable snapshot
- [x] нет workaround / нового concept вне SPEC
- [x] `GREENMARKET_DOMAIN_SPEC.md` v0.3
- [x] OQ-001 / OQ-002 остаются OPEN

## Итоговый отчёт

```text
Domain decision
    ↓
SPEC v0.2 → v0.3
    ↓
Invariants I-011/I-017/I-025 + I-037…I-041
    ↓
BS-029…036
    ↓
Implementation (refreshStatus: STABLE independent of validity)
    ↓
Regression (BS-012/013/021/022/024/026/028)
    ↓
Assistant compatibility (Advice shape unchanged)
    ↓
Final domain status
```

```text
OQ-009 CLOSED    agreed Offer expiry keeps pointers and STABLE
OQ-011 CLOSED    waitingSince + lastSellerActivity + clock suffice
OQ-012 CLOSED    no SELLER_UNRESPONSIVE / auto-EXPIRED; advance is the time operation

OQ-001 OPEN      price semantics (unit vs line)
OQ-002 OPEN      package quantity vs unit price
```

После этого ТЗ не идти сразу в production Basket. Следующий шаг — review, затем SPEC достаточно стабилен для следующего экспериментального этапа.
