# Документация проекта GreenMarket Customer UI

В этой директории хранится документация уровня репозитория: технические задания, ревью, архитектурные заметки. Документация самого UI-модуля (Design System, UX, внутренняя архитектура кода) — отдельно, в `greenmarket/GreenMarket/docs/` (см. раздел «Структура репозитория» в README.md корня).

## Структура каталога docs/

- **[`specifications/`](./specifications/)** — технические задания (ТЗ-001…ТЗ-026), включая черновики и утверждённые версии.
- **[`architecture/`](./architecture/)** — подготовка к FSM Engine: промпт-инструкция и ТЗ-022.
- **[`reviews/`](./reviews/)** — ревью, рецензии архива, мета-разборы структуры.
- **[`domain/`](./domain/)** — каноническая доменная спецификация GreenMarket: [`GREENMARKET_DOMAIN_SPEC.md`](./domain/GREENMARKET_DOMAIN_SPEC.md). Обязательна к прочтению перед любой доменной работой (см. корневой [`AGENTS.md`](../AGENTS.md)).
- **[`basket/`](./basket/)** — экспериментальная модель корзины Stage 1; [`TZ-BASKET-001.md`](./basket/TZ-BASKET-001.md), [`TZ-BASKET-002.md`](./basket/TZ-BASKET-002.md), [`TZ-BASKET-003.md`](./basket/TZ-BASKET-003.md) (Simulation UI на `/sim`), [`TZ-BASKET-004.md`](./basket/TZ-BASKET-004.md) (Buyer/Seller assistants), [`TZ-BASKET-005.md`](./basket/TZ-BASKET-005.md) (expiration / silence / time), [`TZ-BASKET-006.md`](./basket/TZ-BASKET-006.md) (price / package semantics), [`TZ-BASKET-007.md`](./basket/TZ-BASKET-007.md) (package contents / volume pricing), [`TZ-BASKET-008.md`](./basket/TZ-BASKET-008.md) (contents vs standing schedule), [`TZ-BASKET-009.md`](./basket/TZ-BASKET-009.md) (catalog/spec reconstruction), [`TZ-BASKET-010.md`](./basket/TZ-BASKET-010.md) (Stage-1 source search), [`TZ-BASKET-011.md`](./basket/TZ-BASKET-011.md) (buyer/seller flow exercised; seller-config executability checked; OQ-002A/B **INCONCLUSIVE**; seller-configured constraint **NOT OBTAINED**; SPEC v0.6), [`TZ-BASKET-012.md`](./basket/TZ-BASKET-012.md) (seller-facing config attempted; FLOW-012 **NOT EXECUTABLE**; OQ-002A/B **INCONCLUSIVE**; SPEC v0.6).
- **[`research/`](./research/)** — observation reports; [`TZ-BASKET-011-OQ-002-observation.md`](./research/TZ-BASKET-011-OQ-002-observation.md), [`TZ-BASKET-012-OQ-002-observation.md`](./research/TZ-BASKET-012-OQ-002-observation.md).

Полный список документов с расшифровкой каждого — в [README.md корня репозитория](../README.md).

## Где ещё лежит документация

Помимо этой папки, в репозитории есть документация, которая живёт не под `docs/`:

- [`../greenmarket/GreenMarket/docs/`](../greenmarket/GreenMarket/docs/) — документация самого UI-модуля: Design System (DS-001, DS-002 + токены), UX-артефакты Stage 1 (GM-UX-001…013), архитектура (GM-010).
- [`../tests_folder/`](../tests_folder/) — методология и ТЗ на тестирование: `TEST_COVERAGE.md`, `TZ_TESTING_BUYER_MVP.md` (не связаны с серией ТЗ в `specifications/`).
- [`../_inventory/`](../_inventory/) — инвентаризация репозитория: `FILE_TREE.md`, `DOCUMENT_INDEX.md`, `CODE_INDEX.md`, `TRACEABILITY.md` (сверка кода с документацией).
- [`../react-vite-bootstrap-project/README.md`](../react-vite-bootstrap-project/README.md) — README исполняемого приложения Stage 1.
