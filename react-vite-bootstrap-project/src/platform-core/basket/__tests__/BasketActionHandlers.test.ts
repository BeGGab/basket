import assert from "node:assert/strict";
import { asProductId, asSellerId } from "../../contracts/Action";

/** Формат — как в SellerHistory.test.ts: node:assert, без test runner'а.
 *  Запуск: npx tsx src/platform-core/basket/__tests__/BasketActionHandlers.test.ts */

const storage = new Map<string, string>();
(globalThis as Record<string, unknown>).localStorage = {
  getItem: (key: string) => storage.get(key) ?? null,
  setItem: (key: string, value: string) => {
    storage.set(key, value);
  },
  removeItem: (key: string) => {
    storage.delete(key);
  },
  clear: () => {
    storage.clear();
  },
  key: (index: number) => Array.from(storage.keys())[index] ?? null,
  get length() {
    return storage.size;
  },
} as Storage;

const {
  BasketStore,
  normalizeBasketItems,
} = await import("../persistence/BasketStore");
const {
  basketActionHandlers,
  getBasketViewModel,
  __resetBasketTouchedForTests,
} = await import("../BasketActionHandlers");

const sellerA = asSellerId("seller-a");
const sellerB = asSellerId("seller-b");
const product1 = asProductId("product-1");
const product2 = asProductId("product-2");

function addPayload(overrides: Partial<{
  sellerId: typeof sellerA;
  productId: typeof product1;
  name: string;
  unit: string;
  price: number;
}> = {}) {
  return {
    sellerId: overrides.sellerId ?? sellerA,
    productId: overrides.productId ?? product1,
    name: overrides.name ?? "Морковь",
    unit: overrides.unit ?? "кг",
    price: overrides.price ?? 100,
    photo: null as null,
  };
}

function run() {
  storage.clear();
  __resetBasketTouchedForTests();

  // ---- normalizeBasketItems ----
  assert.deepEqual(normalizeBasketItems(null), [], "normalize: null → []");
  assert.deepEqual(normalizeBasketItems("x"), [], "normalize: не массив → []");
  assert.deepEqual(
    normalizeBasketItems([{ sellerId: "s", productId: "p", name: "n", unit: "кг", price: 1, quantity: 0 }]),
    [],
    "normalize: quantity ≤ 0 отбрасывается"
  );

  // idle до первой операции
  assert.equal(getBasketViewModel().state, "idle", "getBasketViewModel: пусто и не трогали → idle");

  // Двойной ADD → одна строка, quantity суммируется
  basketActionHandlers.handle(
    { type: "ADD_TO_BASKET", payload: addPayload() },
    "Basket"
  );
  basketActionHandlers.handle(
    { type: "ADD_TO_BASKET", payload: addPayload() },
    "Basket"
  );
  let items = BasketStore.load();
  assert.equal(items.length, 1, "двойной ADD: одна строка");
  assert.equal(items[0].quantity, 2, "двойной ADD: quantity суммируется");
  assert.equal(getBasketViewModel().state, "success", "getBasketViewModel: есть позиции → success");
  assert.equal(getBasketViewModel().totalPrice, 200, "subtotal = price × quantity");

  // Тот же товар у другого продавца — отдельная строка
  basketActionHandlers.handle(
    { type: "ADD_TO_BASKET", payload: addPayload({ sellerId: sellerB, name: "Морковь B" }) },
    "Basket"
  );
  items = BasketStore.load();
  assert.equal(items.length, 2, "другой sellerId → отдельная строка");

  // CHANGE_QUANTITY до 0 → удаление
  basketActionHandlers.handle(
    {
      type: "CHANGE_QUANTITY",
      payload: { sellerId: sellerA, productId: product1, quantity: 0 },
    },
    "Basket"
  );
  items = BasketStore.load();
  assert.equal(
    items.find((i) => i.sellerId === sellerA && i.productId === product1),
    undefined,
    "CHANGE_QUANTITY ≤ 0 → позиция исчезает"
  );

  // Добавим снова и очистим
  basketActionHandlers.handle(
    { type: "ADD_TO_BASKET", payload: addPayload({ productId: product2, name: "Свёкла" }) },
    "Basket"
  );
  basketActionHandlers.handle({ type: "CLEAR_BASKET" }, "Basket");
  assert.deepEqual(BasketStore.load(), [], "CLEAR_BASKET → []");
  assert.equal(getBasketViewModel().state, "empty", "getBasketViewModel: пусто после операции → empty");

  // REFRESH_BASKET — no-op, не бросает
  basketActionHandlers.handle({ type: "REFRESH_BASKET" }, "Basket");

  // Недоступный localStorage не бросает наружу
  const broken = {
    getItem: () => {
      throw new Error("blocked");
    },
    setItem: () => {
      throw new Error("quota");
    },
    removeItem: () => {
      throw new Error("blocked");
    },
    clear: () => {
      throw new Error("blocked");
    },
    key: () => null,
    length: 0,
  } as Storage;
  (globalThis as Record<string, unknown>).localStorage = broken;
  assert.doesNotThrow(() => BasketStore.load(), "load при недоступном storage не бросает");
  assert.doesNotThrow(() => BasketStore.replaceAll([]), "replaceAll при недоступном storage не бросает");
  assert.doesNotThrow(() => BasketStore.clear(), "clear при недоступном storage не бросает");
  assert.doesNotThrow(
    () =>
      basketActionHandlers.handle(
        { type: "ADD_TO_BASKET", payload: addPayload() },
        "Basket"
      ),
    "handlers при недоступном storage не бросают"
  );

  // Восстановим мок для чистоты
  (globalThis as Record<string, unknown>).localStorage = {
    getItem: (key: string) => storage.get(key) ?? null,
    setItem: (key: string, value: string) => {
      storage.set(key, value);
    },
    removeItem: (key: string) => {
      storage.delete(key);
    },
    clear: () => {
      storage.clear();
    },
    key: (index: number) => Array.from(storage.keys())[index] ?? null,
    get length() {
      return storage.size;
    },
  } as Storage;

  console.log("BasketActionHandlers.test.ts: OK");
}

run();
