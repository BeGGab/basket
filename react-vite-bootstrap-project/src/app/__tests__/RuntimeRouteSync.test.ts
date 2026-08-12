import assert from "node:assert/strict";
import { entryFromPath, isBrowserOnlyPath } from "../routeMapping";

/**
 * Регрессия на баг deep-link: заход по /seller/seller-2 (или вставка такой
 * ссылки в браузер) раньше сбрасывался на /catalog, т.к. sellerId брался из
 * useParams(), а RuntimeRouteSync рендерится вне <Routes>. Теперь динамический
 * сегмент извлекается прямо из pathname (entryFromPath в routeMapping.ts).
 *
 * Запуск: npx tsx src/app/__tests__/RuntimeRouteSync.test.ts
 */
function run() {
  // Deep-link на страницу продавца: /seller/:sellerId → SellerCard с sellerId.
  assert.deepEqual(
    entryFromPath("/seller/seller-2"),
    { screen: "SellerCard", params: { sellerId: "seller-2" } },
    "deep-link /seller/seller-2 → SellerCard",
  );

  // Хвостовой слэш не должен ломать парсинг id.
  assert.deepEqual(
    entryFromPath("/seller/seller-2/"),
    { screen: "SellerCard", params: { sellerId: "seller-2" } },
    "trailing slash убирается",
  );

  // Пустой id — это не страница продавца.
  assert.equal(entryFromPath("/seller/"), null, "пустой id → null");

  // Статические пути не затронуты.
  assert.deepEqual(entryFromPath("/"), { screen: "Catalog", params: {} }, "/ → Catalog");
  assert.deepEqual(entryFromPath("/catalog"), { screen: "Catalog", params: {} }, "/catalog → Catalog");
  assert.deepEqual(entryFromPath("/map"), { screen: "Map", params: {} }, "/map → Map");
  assert.deepEqual(entryFromPath("/seller-list"), { screen: "SellerList", params: {} }, "/seller-list → SellerList");
  assert.deepEqual(entryFromPath("/cart"), { screen: "Basket", params: {} }, "/cart → Basket");

  // Неизвестный путь — null: RuntimeRouteSync ничего не синхронизирует.
  assert.equal(entryFromPath("/unknown"), null, "неизвестный путь → null");

  // buyer_mvp: /product/:id не в ScreenId-карте — Runtime не должен
  // переписывать URL обратно на /catalog (иначе «В корзину» недоступна).
  assert.equal(entryFromPath("/product/17"), null, "/product/17 вне Platform map");
  assert.equal(isBrowserOnlyPath("/product/17"), true, "/product/17 — browser-only");
  assert.equal(isBrowserOnlyPath("/catalog"), false, "/catalog — platform path");
  assert.equal(isBrowserOnlyPath("/cart"), false, "/cart — platform path");
  assert.equal(isBrowserOnlyPath("/profile"), true, "/profile — browser-only");

  console.log("RuntimeRouteSync entryFromPath: все проверки пройдены");
}

run();
