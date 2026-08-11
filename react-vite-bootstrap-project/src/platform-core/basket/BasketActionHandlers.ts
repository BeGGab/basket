import type { Action } from "@/platform-core/contracts/Action";
import type { ActionHandlers } from "@/platform-core/navigation-runtime-layer/runtime/GreenMarketRuntime";
import type { ScreenId } from "@/platform-core/navigation-runtime-layer/navigation/NavigationStack";
import type { BasketItem, BasketViewModel } from "@/platform-core/basket/viewmodels/BasketViewModel";
import { asBasketId } from "@/platform-core/basket/viewmodels/BasketViewModel";
import { BasketStore, type StoredBasketItem } from "@/platform-core/basket/persistence/BasketStore";

/* ============================================================================
 * BasketActionHandlers — конкретная реализация ActionHandlers для корзины
 * (ТЗ-022 требование 8: точка инъекции, не правка GreenMarketRuntime).
 *
 * Обрабатывает ADD_TO_BASKET / REMOVE_FROM_BASKET / CHANGE_QUANTITY /
 * CLEAR_BASKET / REFRESH_BASKET. Остальные Action пропускает (return void) —
 * их обработают другие handlers или останутся no-op.
 *
 * getBasketViewModel() — чистая проекция BasketStore → BasketViewModel для
 * экрана корзины (CART-002).
 * ========================================================================== */

const CURRENT_BASKET_ID = asBasketId("current");

/** true после любой мутации корзины в этом сеансе модуля.
 *  Нужен для различия idle (ещё не трогали) vs empty (очистили / удалили всё). */
let basketTouched = false;

function markTouched(): void {
  basketTouched = true;
}

function toBasketItem(stored: StoredBasketItem): BasketItem {
  return {
    productId: stored.productId,
    sellerId: stored.sellerId,
    name: stored.name,
    photo: stored.photo,
    quantity: stored.quantity,
    unit: stored.unit,
    currentPrice: stored.price,
    previousPrice: null,
    availability: "available",
    subtotal: stored.price * stored.quantity,
  };
}

function itemKey(sellerId: string, productId: string): string {
  return `${sellerId}:${productId}`;
}

/** Чистая проекция содержимого BasketStore в BasketViewModel.
 *  idle — пусто и не было операций; empty — пусто после операции; success — есть позиции. */
export function getBasketViewModel(): BasketViewModel {
  const stored = BasketStore.load();
  const items = stored.map(toBasketItem);
  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);
  const totalPrice = items.reduce((sum, item) => sum + item.subtotal, 0);
  const sellerIds = new Set(items.map((item) => item.sellerId));
  const missingCount = items.filter((item) => item.availability === "missing").length;
  const savings = items.reduce((sum, item) => {
    if (item.previousPrice === null) return sum;
    const delta = (item.previousPrice - item.currentPrice) * item.quantity;
    return delta > 0 ? sum + delta : sum;
  }, 0);

  let state: BasketViewModel["state"];
  if (items.length > 0) {
    state = "success";
  } else if (basketTouched) {
    state = "empty";
  } else {
    state = "idle";
  }

  const canPurchase = items.length > 0;

  return {
    basketId: CURRENT_BASKET_ID,
    items,
    totalItems,
    totalPrice,
    savings,
    purchaseSummary: {
      sellersCount: sellerIds.size,
      missingCount,
      totalCost: totalPrice,
    },
    state,
    availableActions: [
      {
        id: "start-purchase",
        action: { type: "START_PURCHASE" },
        label: "Начать покупку",
        variant: "primary",
        disabled: !canPurchase,
      },
    ],
  };
}

function addToBasket(payload: Extract<Action, { type: "ADD_TO_BASKET" }>["payload"]): void {
  const items = BasketStore.load();
  const key = itemKey(payload.sellerId, payload.productId);
  const existing = items.findIndex((item) => itemKey(item.sellerId, item.productId) === key);
  if (existing >= 0) {
    const current = items[existing];
    items[existing] = { ...current, quantity: current.quantity + 1 };
  } else {
    items.push({
      sellerId: payload.sellerId,
      productId: payload.productId,
      name: payload.name,
      unit: payload.unit,
      price: payload.price,
      photo: payload.photo,
      quantity: 1,
    });
  }
  BasketStore.replaceAll(items);
  markTouched();
}

function removeFromBasket(sellerId: string, productId: string): void {
  const next = BasketStore.load().filter(
    (item) => itemKey(item.sellerId, item.productId) !== itemKey(sellerId, productId)
  );
  BasketStore.replaceAll(next);
  markTouched();
}

function changeQuantity(sellerId: string, productId: string, quantity: number): void {
  if (quantity <= 0) {
    removeFromBasket(sellerId, productId);
    return;
  }
  const items = BasketStore.load();
  const key = itemKey(sellerId, productId);
  const index = items.findIndex((item) => itemKey(item.sellerId, item.productId) === key);
  if (index < 0) return;
  items[index] = { ...items[index], quantity: Math.floor(quantity) };
  BasketStore.replaceAll(items);
  markTouched();
}

function clearBasket(): void {
  BasketStore.clear();
  markTouched();
}

/** Обработчик корзины. Неизвестный Action → void (другие домены / no-op). */
export const basketActionHandlers: ActionHandlers = {
  handle(action: Action, _screen: ScreenId) {
    switch (action.type) {
      case "ADD_TO_BASKET":
        addToBasket(action.payload);
        return;
      case "REMOVE_FROM_BASKET":
        removeFromBasket(action.payload.sellerId, action.payload.productId);
        return;
      case "CHANGE_QUANTITY":
        changeQuantity(action.payload.sellerId, action.payload.productId, action.payload.quantity);
        return;
      case "CLEAR_BASKET":
        clearBasket();
        return;
      case "REFRESH_BASKET":
        // Зарезервировано под будущий backend — сейчас no-op (данные уже в BasketStore).
        return;
      default:
        return;
    }
  },
};

/** Сброс флага touched — только для тестов. */
export function __resetBasketTouchedForTests(): void {
  basketTouched = false;
}
