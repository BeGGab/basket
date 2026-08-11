# Knowledge Delta — CART-002

## Что нового узнала команда?

1. `/cart` не был в `routeMapping.ts` — без `Basket` в PATH_TO_SCREEN Runtime оставался на предыдущем ScreenId, и `availableActions` корзины не действовали.
2. `getBasketViewModel().state === "idle"` нельзя отдавать в `BasketAdapter` as-is: idle → skeleton. Контроллер нормализует idle→empty для UI.
3. Имени продавца в `BasketItem` нет; группировка опирается на `sellerId` в хвосте `RowItem.subtitle` (минимальное расширение адаптера без смены типов).

## Что следует добавить или изменить в документации?

1. Карта маршрутов: `/cart` ↔ ScreenId `Basket` в описании Runtime↔Router моста.
2. GM-UX-012: группировка по продавцу — presentation-only поверх плоского `items[]`.

## Что стоит использовать в следующих задачах?

1. Узкий `CartBottomSheetContent` по образцу `MapBottomSheetContent` — не общий ContentBlockRenderer.
2. Для CART-006: `App` уже оборачивает buyer_mvp в `GreenMarketRuntimeProvider`; проверить `isActionAllowed` на текущем ScreenId при клике «В корзину» (маршрута `/product/:id` в routeMapping нет).
3. Для CART-003: степпер локально в `screens/cart/`, Snackbar-паттерн из SellerCard.