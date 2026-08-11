# Knowledge Delta — CART-006

## Что нового узнала команда?

1. `buyer_mvp` уже внутри `GreenMarketRuntimeProvider` (App Shell) — хук доступен.
2. `/product/:id` нет в `routeMapping` → Runtime остаётся на `Catalog`. У `CatalogScreen` не было `ADD_TO_BASKET` в `availableActions` — dispatch молча отклонялся. Добавлен `ADD_TO_BASKET` в Catalog.
3. `productId` в корзине = `ProductDetail.id` (сущность товара), не `seller_product_id`.

## Что следует добавить или изменить в документации?

1. Связка buyer_mvp ↔ platform-core Action Catalog: маппинг полей и правило парсинга `price`.
2. Зафиксировать, что ScreenId для buyer_mvp product — фактически Catalog, пока нет отдельного маршрута.

## Что стоит использовать в следующих задачах?

1. Паттерн `dispatch` из `useGreenMarketRuntime` на buyer_mvp-экранах работает при корректном `availableActions`.
2. Для имён продавцов в группах корзины позже стоит расширить payload/`StoredBasketItem` полем `sellerName` (сейчас в UI только sellerId).