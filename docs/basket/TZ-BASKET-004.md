# ТЗ-BASKET-004 — Buyer / Seller AI Assistants

**Проект:** GreenMarket  
**Основание:** ТЗ-BASKET-001…003  
**Приёмка:** детерминированные ассистенты + UI на `/sim`  
**Статус:** Implemented

## Domain Contract

Before implementation, the executor MUST read:

`docs/domain/GREENMARKET_DOMAIN_SPEC.md`

The implementation MUST comply with the current version of this specification.

If the task conflicts with the specification, do not resolve the conflict implicitly in code. Report the conflict and update the domain specification first.

See `AGENTS.md` for the mandatory AI workflow.

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
  WAIT{waitReason} |
  REJECT{rejectReason, offerId? (PRICE_UNACCEPTABLE/POLICY_DECLINED) | substitutionId? (SUBSTITUTION_IMPOSSIBLE)} |
  ACCEPT_ACTIVE{offerId} |
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
- `REJECT` — не свободный enum: каждый `rejectReason` обязан НАЗВАТЬ и ДОКАЗАТЬ своё основание
  против текущего мира на apply, отдельный негативный тест на каждый reason:
  - `PRICE_UNACCEPTABLE` и `POLICY_DECLINED` отклоняют стоящее предложение counterparty — обязаны
    нести `offerId`, совпадающий с active Offer, чей actor — counterparty (POLICY_DECLINED больше
    не отклоняет произвольный SP «по политике» без конкретного предложения);
  - `SUBSTITUTION_IMPOSSIBLE` обязан нести `substitutionId` реально pending substitution, и actor
    не может отклонять свою же substitution;
  - `PRODUCT_UNAVAILABLE` требует строку, недоступную по ТОМУ ЖЕ matcher'у `(seller, product,
    unit, stock)`, что и референс-цена — единый `catalogLineAvailable`, а не проверка
    по одному `productId` (строка в другом `unit` не считается доступностью).
- `REJECT` генерируется самими ассистентами (пороги `rejectOverReference` / `rejectBelowCatalog`),
  а не только конструируется вручную: набор решений ассистента полон —
  WAIT / ACCEPT_ACTIVE / ACCEPT_SUBSTITUTION / COUNTER / REJECT.
- Ассистенты оценивают **каждую** позицию Offer, не только `items[0]`; counter несёт цену на
  каждую позицию, единого поля «цена совета» нет намеренно.
- **Единая коммерческая идентичность каталожной строки живёт в домене** (`domain/catalog`), а не в
  ассистентах: `(sellerId, productId, unit)`. `price` — цена за ОДНУ единицу `unit` (листинг
  «20 kg @ 15» = 15 MAD/kg), каталожный `quantity` — только референсный/упаковочный размер и НЕ
  входит в идентичность строки и не масштабирует цену. Эту идентичность используют `resolve`,
  `createPurchaseFromList`, `setStock`, детектор stock-конфликтов И ассистенты — домен не может быть
  «мягче» ассистентов в вопросе коммерческой сопоставимости.
- Каталожная референс-цена (`catalogReferencePrice`) и каталожная доступность (`catalogLineAvailable`)
  — тонкие адаптеры над `domain/catalog` (`catalogUnitPrice` / `isCatalogLineAvailable`): строка в
  `pcs` не является доступностью для запроса в `kg`; если строки одной линии `(seller, product, unit)`
  расходятся в цене, референса **нет** (неоднозначность), «выбрать самую дешёвую» — скрытая
  PRICE_OPTIMIZATION и она запрещена (домен на создании Purchase помечает такую линию
  `AMBIGUOUS_PRICE` и не создаёт SellerPurchase, а не выбирает первую строку по порядку массива).
- Agreed baseline берётся как цена за единицу по ТОЧНОМУ `(productId, unit, quantity)` agreed Offer;
  при смене `quantity` точного baseline нет и линия оценивается по каталожной референс-цене за
  единицу (обе — цены за единицу того же `unit`, `kg`-baseline никогда не сравнивается с `pcs`-линией).
- Fingerprint'ы basis — каноничный JSON (без самодельных разделителей); поля active/agreed Offer
  называются `activeOfferFingerprint` / `agreedOfferFingerprint` и включают ПОЛНЫЕ неизменяемые
  метаданные Offer (actor, reason, createdAt, validUntil) вместе с items, а не только коммерческие
  позиции — Advice ссылается на целостный наблюдаемый факт (важно для будущей подстановки LLM);
  pending substitutions входят в basis с СОДЕРЖИМЫМ (id, original, replacement, proposedBy),
  отсортированные по id —
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

## Технический долг модели

- **Идентичность строки PurchaseItem.** `assertAdmissibleCounter` сравнивает все поля, кроме
  `price`, как мультимножество, поэтому две **идентичные** строки (`tomatoes 2 kg`, `tomatoes 2 kg`),
  различающиеся только ценой, считаются взаимозаменяемыми — counter может обменять цены между ними.
  Для текущей модели это допустимо, так как identity строки определяется именно этими полями и
  отдельного `lineId` у `PurchaseItem` нет. Долг: если появятся две одинаковые товарные строки
  разного коммерческого происхождения, multiset-равенство потеряет их identity — тогда потребуется
  явный `lineId`.

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
- шаг Scenario Engine (`assertAdvice` проверяет kind, цену single-line counter, ПОЛНЫЙ `items[]` для multi-line counter, цель ACCEPT_ACTIVE, waitReason) и demo-сценарии
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
- [x] `basis` включает ПОЛНЫЕ метаданные active/agreed Offer (`activeOfferFingerprint`/`agreedOfferFingerprint`: actor/reason/createdAt/validUntil + items): тот же ID с другим содержимым — stale
- [x] `basis` включает весь каталог продавца (цена/сток/количество): любое изменение каталога делает Advice stale
- [x] мульти-товарные Offer: рост цены только второй позиции детектируется; counter несёт цену на каждую позицию
- [x] политики — параметры: другой допуск меняет решение на тех же данных
- [x] buyer без agreed baseline не принимает первый оффер выше каталожной референс-цены
- [x] pending substitution не подавляет ценовой анализ: при росте цены возвращается COUNTER
- [x] `WAIT` различим по `waitReason`; `REJECT` — по `rejectReason` и отклоняется для терминального SellerPurchase
- [x] basis учитывает время: advise → сдвиг часов за `validUntil` → apply отклоняется как stale
- [x] `COUNTER` именует `counterOfferId`; items с другим составом строк (не только ценой) отклоняются
- [x] Offer, названный в Advice, принадлежит целевому `sellerPurchaseId` — чужой `offerId`/`counterOfferId` отклоняется на границе ассистентного слоя
- [x] неоднозначные каталожные строки (одна линия `(seller, product, unit)`, разные цены) не дают референса — домен на создании Purchase помечает линию `AMBIGUOUS_PRICE` и не создаёт SellerPurchase; для уже созданного SP ассистент отвечает WAIT, а не «самая дешёвая»
- [x] `REJECT` генерируется ассистентами по порогам политики и применяется (SP → REJECTED)
- [x] положительный выбор substitution vs Offer задаётся политикой (`substitutionPreference`), обе ветви покрыты тестами
- [x] матричный тест: multi-item × missing catalog × substitution × expired × автор Offer × советник — инварианты kind'ов, детерминизм, и СЕМАНТИЧЕСКИЙ результат apply для каждой комбинации (WAIT ничего не меняет; REJECT → REJECTED; ACCEPT_ACTIVE → agreed = named Offer; ACCEPT_SUBSTITUTION убирает из pending; COUNTER создаёт ровно один Offer с items совета)
- [x] `REJECT` не свободный enum: negative-тест на каждый reason (PRICE_UNACCEPTABLE/POLICY_DECLINED без `offerId` или чужой Offer; SUBSTITUTION_IMPOSSIBLE без `substitutionId`; PRODUCT_UNAVAILABLE при доступном товаре) + positive-тесты (unit-mismatch kg vs pcs → PRODUCT_UNAVAILABLE; counterparty substitution → SUBSTITUTION_IMPOSSIBLE)
- [x] ОДНА коммерческая идентичность каталожной строки `(sellerId, productId, unit)` живёт в `domain/catalog` (I-036) и используется `resolve`, `createPurchaseFromList`, `setStock`, детектором stock-конфликтов И ассистентами — домен не мягче ассистентов
- [x] `price` — цена за единицу `unit`; каталожный `quantity` — референсный/упаковочный размер, не идентичность строки и не множитель цены (формулировка «цена всей позиции» исправлена)
- [x] `resolve()` unit-aware: kg-ListItem не разрешается pcs-каталогом (граница List → Resolution, до разбиения по продавцам)
- [x] `createPurchaseFromList()` цену линии берёт через общий matcher; продавец с расходящимися по цене строками → `AMBIGUOUS_PRICE`, без SellerPurchase (порядок массива не бизнес-политика)
- [x] `setStock(sellerId, productId, unit, stock)` требует уникальную строку линии — бросает при неоднозначности/отсутствии, а не правит первую
- [x] stock-конфликт группирует claim'ы по `(productId, unit)` — pcs-claim не тянет из kg-пула
- [x] `PRODUCT_UNAVAILABLE` использует единый `(seller, product, unit, stock)` matcher (`catalogLineAvailable`), общий с референс-ценой; строка в другом `unit` не считается доступностью
- [x] agreed-цена служит baseline только для идентичной `(product, unit, quantity)` линии; при смене `quantity` линия оценивается по каталожной цене за единицу (decision-тест: agreed 20 kg @ 25 → active 10 kg @ 20 = COUNTER@15, а не ACCEPT)
- [x] decision-тесты (world → ожидаемый Advice) отделены от execution-тестов (Advice → изменение домена): выбор правильного kind/reason проверяется явной таблицей, а не только безопасностью apply
- [x] детерминизм runtime: повторный прогон каждого демо-сценария из свежего runtime воспроизводит поток событий И канонический снапшот ВСЕГО observable world (offers, acceptances, substitutions, catalog, stock-конфликты, fulfillments, SellerPurchases, purchases) байт-в-байт
- [x] multi-line COUNTER проверяется движком по всем `items` (цена каждой позиции по `(productId, unit, quantity)`) — неверная цена на не-первой позиции не проходит
- [x] `/sim` (TZ-003): интерактив — только Design System; layout/container HTML и scoped `sim.css` допустимы для экспериментального viewer'а
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
