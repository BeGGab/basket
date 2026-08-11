# Knowledge Delta — CART-001

## Что нового узнала команда?

1. `ADD_TO_BASKET` на момент реализации (2026-08-11) по-прежнему нигде не диспатчился — расширение payload безопасно; после CART-006 это уже не так.
2. `START_PURCHASE` в `GreenMarketRuntime.applyNavigation` делает `push(Basket)`, а не `PurchaseOptions` (туда ведёт `PICK_PURCHASE`). ТЗ CART-005 в плане-промпте описывает обратное — нужно сверить перед реализацией перехода.
3. Без добавления `CLEAR_BASKET` в `BasketScreen.availableActions` Runtime отклонит действие даже при живом handler — правка ScreenDefinition обязательна рядом с контрактом Action.
4. `BasketAdapter` рисует `idle` как skeleton; семантика `idle`/`empty` из `getBasketViewModel` потребует явного маппинга в `useCartController` (CART-002), иначе первая пустая корзина покажет скелетон.

## Что следует добавить или изменить в документации?

1. GM-UX-012 и ссылки на ТЗ-037: источник истины по структуре — `platform-core/basket/*`, не UX-спека; в TRACEABILITY уже отмечено отсутствие ТЗ-037.
2. Зафиксировать в Action Catalog / ScreenDefinition появление `CLEAR_BASKET` и расширенного payload `ADD_TO_BASKET`.
3. README «две копии»: рабочая копия изменена (`react-vite-bootstrap-project/`); эталон `greenmarket/GreenMarket/` не синхронизирован (открытый вопрос проекта).

## Что стоит использовать в следующих задачах?

1. Паттерн persistence: `getStorage()` + `normalize*` + молчаливый fail — как `SellerHistoryStore` / `MapSessionStore`.
2. Тесты: мок `localStorage` на `globalThis` **до** динамического `import`, запуск `npx tsx`.
3. Точка инъекции: `GreenMarketRuntimeProvider handlers={...}` в `App.tsx`, без правок ядра Runtime.
4. Для CART-002: `getBasketViewModel()` + подписка/`dispatch` → пересчёт; idle пустой корзины маппить в empty UI.