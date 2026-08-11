# Knowledge Delta — CART-003

## Что нового узнала команда?

1. Undo (BR-006) удобнее держать в контроллере: снимок `StoredBasketItem[]` до деструктивной операции + `BasketStore.replaceAll` при «Отменить»; в localStorage откат не пишется отдельным ключом.
2. Степпер количества в Design System отсутствует — локальный `CartQuantityStepper` в `screens/cart/` достаточен для Stage 1.
3. `DialogContainer` + `DialogSurface` покрывают confirm очистки без `window.confirm`.

## Что следует добавить или изменить в документации?

1. BR-006: уточнить UI-контракт (Snackbar 5 с, снимок в памяти контроллера, сброс при следующей операции).
2. GM-UX-012: confirm перед clearBasket — обязателен.

## Что стоит использовать в следующих задачах?

1. Паттерн `armUndo` / `dismissUndo` из `useCartController` для других обратимых действий Stage 1.
2. `ListItem static` + внутренние кнопки — чтобы степпер не конфликтовал с click строки.