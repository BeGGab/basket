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
BuyerAssistant / SellerAssistant  →  Advice (discriminated union — исполняемая команда):
  WAIT{waitReason} | REJECT{rejectReason} | ACCEPT_ACTIVE{offerId} |
  ACCEPT_SUBSTITUTION{substitutionId} | COUNTER{counterOfferId, items[] с ценой на каждую позицию}
  ↓
applyAdvice → Domain commands — цель действия берётся ИЗ Advice и не перевычисляется;
              текущий world используется только для ПЕРЕПРОВЕРКИ, что названная цель всё ещё
              применима (basis, active pointer, срок действия, counterparty), а не для вычисления
              новой цели
             (throws if basis ≠ current snapshot: pointer'ы, СОДЕРЖИМОЕ active/agreed Offer,
              ВРЕМЕННАЯ валидность active Offer, status, pending substitutions,
              каталожные строки обсуждаемых товаров)
```

Внешний LLM не входит: тесты должны быть воспроизводимы без сети. Контракт `Advice` оставляем таким, чтобы позже подставить модель.

## Контракт Advice

- `Advice` — команда, а не подсказка: каждый kind называет точный объект действия
  (`offerId`, `substitutionId`, `counterOfferId` + полный список `items` для counter).
  `applyAdvice` не выводит цель из мира: world используется только для перепроверки применимости
  названной цели (basis, active pointer, срок действия, counterparty), не для её вычисления.
- `WAIT` несёт машиночитаемый `waitReason` (`NO_ACTIVE_OFFER`, `OWN_OFFER_ACTIVE`, `OFFER_EXPIRED`,
  `TERMINAL_STATUS`, `NO_CATALOG_PRICE`); `REJECT` — машиночитаемый `rejectReason`
  (`PRICE_UNACCEPTABLE`, `PRODUCT_UNAVAILABLE`, `SUBSTITUTION_IMPOSSIBLE`, `POLICY_DECLINED`).
- `AdviceBasis` учитывает время: фиксируется валидность active Offer на момент совета,
  поэтому advise → сдвиг часов за `validUntil` → apply даёт stale-ошибку, а не изменение домена.
  В домене это продублировано инвариантом I-035: counter к истёкшему Offer запрещён.
- `COUNTER` допустим только против всё ещё валидного `counterOfferId`, совпадающего с текущим
  active Offer, и только от counterparty; items counter'а могут менять ТОЛЬКО `price` — guard
  сравнивает каноничный JSON всех остальных полей PurchaseItem как мультимножество, поэтому
  будущее расширение PurchaseItem автоматически попадает под защиту, а не становится молча
  изменяемым.
- Каждый Offer, названный в Advice (`offerId`, `counterOfferId`), обязан принадлежать тому
  `sellerPurchaseId`, к которому Advice применяется, — принадлежность проверяется явно на границе
  ассистентного слоя, а не «в конце концов упадёт в домене».
- `ACCEPT_SUBSTITUTION` требует, чтобы принимающий actor был counterparty от `proposedBy`;
  `REJECT` допустим только пока переговоры идут (не для терминального SellerPurchase).
- `rejectReason` валидируется семантически на apply, а не только типом: `PRICE_UNACCEPTABLE`
  требует active Offer, `SUBSTITUTION_IMPOSSIBLE` — существующей pending substitution,
  `PRODUCT_UNAVAILABLE` — строки SellerPurchase без каталожной доступности; исполняемая команда
  не может ссылаться на несуществующее основание.
- `REJECT` генерируется самими ассистентами (пороги `rejectOverReference` / `rejectBelowCatalog`),
  а не только конструируется вручную: набор решений ассистента полон —
  WAIT / ACCEPT_ACTIVE / ACCEPT_SUBSTITUTION / COUNTER / REJECT.
- Ассистенты оценивают **каждую** позицию Offer, не только `items[0]`; counter несёт цену на
  каждую позицию, единого поля «цена совета» нет намеренно.
- Baseline и каталожная референс-цена — это lookup, а не ценовая политика: сопоставимы только
  строки с тем же `unit`; при нескольких — предпочтение точному `quantity`; если совпадающие
  строки расходятся в цене, референса **нет** (неоднозначность), «выбрать самую дешёвую» —
  скрытая PRICE_OPTIMIZATION и она запрещена.
- Fingerprint'ы basis — каноничный JSON (без самодельных разделителей); pending substitutions
  входят в basis с СОДЕРЖИМЫМ (id, original, replacement, proposedBy), отсортированные по id —
  substitution с тем же ID, но другим содержимым была бы stale, snapshot полон даже при том, что
  текущий домен замораживает substitution после создания; каталожная часть basis охватывает ровно
  строки обсуждаемых товаров — изменение нерелевантного товара не инвалидирует Advice.
  Каждый факт basis привязан к своему SellerPurchase: Offer-факты проверяют принадлежность Offer
  этому SP и включают `sellerPurchaseId` в fingerprint, каталожные факты выводятся из `sellerId`
  самого SP.
- Basis несёт audit-поле `policy` — каноничный JSON эффективной политики (с actor'ом), по которой
  совет был рассчитан ("" для сконструированных вручную команд). Оно НЕ сравнивается в staleness
  (policy — не состояние мира), но делает Advice воспроизводимым: одинаковый world + разные policy
  дают различимые basis.

## Зависимость от открытых вопросов

Ассистенты используют `isOfferValid` в решениях и в basis, при этом OQ-009 (поведение уже
согласованного Offer после expiration) остаётся открытым. Принятое здесь допущение зафиксировано
явно и закреплено тестом:

- **истёкший agreed Offer продолжает служить ценовым baseline** — соглашение трактуется как факт
  переговоров, а `validUntil` ограничивает только принятие ACTIVE Offer (I-028/I-035);
- basis фиксирует временную валидность только active Offer; истечение agreed Offer basis не
  инвалидирует.

Это **допущение**, подлежащее пересмотру при закрытии OQ-009: результат PR не доказан для полного
жизненного цикла Offer. Слой ассистентов подтверждает конкретное экспериментальное поведение
поверх модели, а не завершённость модели корзины.

## Политики — параметры, но границы claim'а честные

Политики инжектируются (`BuyerPolicy`, `SellerPolicy`), дефолты — только примеры. Тесты фиксируют
дефолтные экземпляры и отдельно показывают, что другая политика меняет решение на тех же данных.

**Ограничение результата (важно):** этот PR проверяет контракт Advice/basis/apply на ОДНОМ
детерминированном семействе ценовых политик. Он **не** доказывает пригодность контракта для
произвольных LLM/реальных политик — доказана исполнимость и безопасность именно этой стратегии.
Утверждение «слой policy-agnostic» ограничено формой контракта (инжекция параметров), а не
подтверждено разнообразием политик.

- Buyer (дефолт `maxOverCatalog: 0`, `rejectOverReference: 10`, `substitutionPreference: SUBSTITUTION_FIRST`):
  counter на любое повышение цены относительно agreed по каждой позиции; повышение сверх
  `rejectOverReference` — REJECT (торговаться бессмысленно); без agreed baseline первый оффер НЕ
  принимается вслепую — каждая позиция сверяется с каталожной референс-ценой;
  ценовые проблемы (COUNTER/REJECT) всегда старше substitution; когда Offer коррекции не требует,
  положительный выбор между pending substitution и решением по Offer задаётся
  `substitutionPreference` (SUBSTITUTION_FIRST — принять substitution; OFFER_FIRST — завершить
  решение по Offer, substitution остаётся pending).
- Seller (дефолт `acceptBelowCatalog: 1`, `rejectBelowCatalog: 10`): принять, если каждая позиция
  в пределах допуска от каталожной цены; ниже `rejectBelowCatalog` от референса — REJECT;
  иначе counter с покаталожной ценой на каждую позицию.

## В scope

- `adviseBuyer(spId, policy?)` / `adviseSeller(spId, policy?)`
- `applyAdvice(spId, advice)` — единственный путь исполнения; runtime `applyBuyerAdvice`/`applySellerAdvice`
  и UI `applyDisplayedAdvice` используют один и тот же путь
- журнал `assistantAdvice` / `assistantApply` в Simulation Runtime
- шаг Scenario Engine (`assertAdvice` проверяет kind, цену counter, цель ACCEPT_ACTIVE, waitReason) и demo-сценарии
- блок на `/sim`: совет + Apply
- без изменений production `/cart`

## Вне scope

- вызовы OpenAI/других API
- обучение моделей
- автопилот без кнопки Apply в UI (в engine apply по шагу допустим)
- production ACL / оплата

## Критерии приёмки

- [x] совет детерминирован на одном snapshot
- [x] Advice — исполняемая команда: `ACCEPT_ACTIVE` несёт `offerId`, `ACCEPT_SUBSTITUTION` — `substitutionId`, `COUNTER` — полный `items[]`
- [x] applyAdvice отказывается применять Advice, чей `basis` не совпадает с текущим snapshot / `activeOfferId`
- [x] `basis` включает СОДЕРЖИМОЕ active/agreed Offer: тот же ID с другими items — stale
- [x] `basis` включает весь каталог продавца (цена/сток/количество): любое изменение каталога делает Advice stale
- [x] мульти-товарные Offer: рост цены только второй позиции детектируется; counter несёт цену на каждую позицию
- [x] политики — параметры: другой допуск меняет решение на тех же данных
- [x] buyer без agreed baseline не принимает первый оффер выше каталожной референс-цены
- [x] pending substitution не подавляет ценовой анализ: при росте цены возвращается COUNTER
- [x] `WAIT` различим по `waitReason`; `REJECT` — по `rejectReason` и отклоняется для терминального SellerPurchase
- [x] basis учитывает время: advise → сдвиг часов за `validUntil` → apply отклоняется как stale
- [x] `COUNTER` именует `counterOfferId`; items с другим составом строк (не только ценой) отклоняются
- [x] Offer, названный в Advice, принадлежит целевому `sellerPurchaseId` — чужой `offerId`/`counterOfferId` отклоняется на границе ассистентного слоя
- [x] неоднозначные каталожные строки (одинаковые seller/product/unit/quantity, разные цены) не дают референса — WAIT, а не «самая дешёвая»
- [x] `REJECT` генерируется ассистентами по порогам политики и применяется (SP → REJECTED)
- [x] положительный выбор substitution vs Offer задаётся политикой (`substitutionPreference`), обе ветви покрыты тестами
- [x] матричный тест: multi-item × missing catalog × substitution × expired × автор Offer × советник — инварианты kind'ов, детерминизм, и СЕМАНТИЧЕСКИЙ результат apply для каждой комбинации (WAIT ничего не меняет; REJECT → REJECTED; ACCEPT_ACTIVE → agreed = named Offer; ACCEPT_SUBSTITUTION убирает из pending; COUNTER создаёт ровно один Offer с items совета)
- [x] `rejectReason` валидируется семантически: SUBSTITUTION_IMPOSSIBLE без substitution / PRODUCT_UNAVAILABLE при доступном товаре / PRICE_UNACCEPTABLE без active Offer отклоняются
- [x] basis фиксирует содержимое pending substitutions (не только ID) и политику расчёта (audit)
- [x] COUNTER guard сравнивает все поля item кроме `price` (расширение PurchaseItem защищено автоматически)
- [x] допущение OQ-009 (истёкший agreed Offer остаётся baseline) закреплено отдельным тестом
- [x] `ACCEPT_SUBSTITUTION` отклоняется, если принимающий actor совпадает с `proposedBy`
- [x] после успешного apply COUNTER созданный Offer в точности равен advice.items / actor / reason
- [x] buyer принимает TIME_DISCOUNT (12 < agreed 15)
- [x] buyer не принимает молча рост цены относительно agreed
- [x] runtime и UI применяют Advice одним execution path (`applyDisplayedAdvice`)
- [x] tick журналирует результат каждого SellerPurchase; advise журналирует basis
- [x] ТЗ-001…003 тесты зелёные
- [x] `npm run build` проходит
