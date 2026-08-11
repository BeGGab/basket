# Knowledge Delta — CART-005

## Что нового узнала команда?

1. В коде `START_PURCHASE` делает `push(Basket)`, а не `PurchaseOptions` (туда ведёт `PICK_PURCHASE`). План-промпт описывал обратное — факт сверен 2026-08-11.
2. React-view `src/screens/**/PurchaseOptions*` отсутствует; есть только `platform-core/screens/PurchaseOptionsScreen.ts` (ScreenDefinition) и эталонный прототип в `greenmarket/GreenMarket/purchase_options/`. Маршрута в `NavigationContainer` / `routeMapping` нет.
3. Кнопка «Начать покупку» disabled при пустой корзине; клик диспатчит `START_PURCHASE`. Фактическое поведение: Runtime пушит ScreenId `Basket` (пользователь уже на `/cart` — URL не меняется, т.к. `pathFromEntry(Basket) === '/cart'`). Отдельный экран Purchase Options не реализован (вне объёма).

## Что следует добавить или изменить в документации?

1. Исправить описание `START_PURCHASE` vs `PICK_PURCHASE` в навигационных документах / плане корзины.
2. Завести задачу на React-экран Purchase Options + routeMapping + возможно смену `applyNavigation` для `START_PURCHASE`.

## Что стоит использовать в следующих задачах?

1. Перед навигационными CTA всегда сверять `applyNavigation` и наличие React-route, не только ScreenDefinition в platform-core.