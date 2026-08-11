# Knowledge Delta — CART-004

## Что нового узнала команда?

1. Итоги уже почти полностью собирает `BasketAdapter` (metaLine / alerts / priceLine); отдельный React-«BasketSummaryCard» не потребовался — достаточно разнести экономию в свой metaLine.
2. В Stage 1 `previousPrice` всегда `null` → `savings` всегда 0 → блок экономии на практике не показывается (по критерию приёмки это корректно).

## Что следует добавить или изменить в документации?

1. GM-UX-012: сводка корзины = проекция Adapter→ContentBlock, не отдельный Domain Summary entity.

## Что стоит использовать в следующих задачах?

1. Условные блоки (`savings > 0`, `missingCount > 0`) оставлять в Adapter, не в React-ветвлениях по полям VM — так же, как MapSheetAdapter.