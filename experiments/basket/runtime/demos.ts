import type { ProductCatalog } from "../domain/types";
import type { Scenario } from "./engine";

export const DEMO_CATALOG: ProductCatalog = {
  names: { tomatoes: "Tomatoes", tomato_a: "Tomato A", tomato_b: "Tomato B" },
  availability: [{ sellerId: "seller-a", productId: "tomatoes", quantity: 20, unit: "kg", price: 15, stock: 100 }],
};

export const DEMO_SCENARIOS: Scenario[] = [
  {
    name: "TZ002-STABLE-actors",
    title: "Cooperative → STABLE",
    steps: [
      { op: "catalog", catalog: DEMO_CATALOG },
      { op: "bindSeller", sellerId: "seller-a", profile: "CooperativeSeller" },
      { op: "bindBuyer", profile: "AcceptingBuyer" },
      { op: "createList", name: "weekly" },
      { op: "addItem", productId: "tomatoes", quantity: 20, unit: "kg" },
      { op: "createPurchase", policy: "PRIMARY_ONLY", sellerIds: ["seller-a"] },
      { op: "buyerOffer", sellerIndex: 0, productId: "tomatoes", quantity: 20, unit: "kg", price: 15 },
      { op: "sellerRespond", sellerIndex: 0 },
      { op: "assertStatus", sellerIndex: 0, status: "STABLE" },
    ],
  },
  {
    name: "TZ002-TIME_DISCOUNT",
    title: "SYSTEM TIME_DISCOUNT 15→12",
    steps: [
      { op: "catalog", catalog: DEMO_CATALOG },
      { op: "bindSeller", sellerId: "seller-a", profile: "TimeDiscountSeller" },
      { op: "bindBuyer", profile: "AcceptingBuyer" },
      { op: "createList", name: "disc" },
      { op: "addItem", productId: "tomatoes", quantity: 2, unit: "kg" },
      { op: "createPurchase", policy: "PRIMARY_ONLY", sellerIds: ["seller-a"] },
      { op: "sellerOffer", sellerIndex: 0, productId: "tomatoes", quantity: 2, unit: "kg", price: 15, reason: "PRICE_CHANGE" },
      { op: "tick", ms: 3_600_000 },
      { op: "assertSnapshot", sellerIndex: 0, currentPrice: 12 },
      { op: "buyerRespond", sellerIndex: 0 },
      { op: "assertStatus", sellerIndex: 0, status: "STABLE" },
    ],
  },
  {
    name: "TZ002-SNAPSHOT",
    title: "AGREED / CURRENT / PENDING",
    steps: [
      { op: "catalog", catalog: DEMO_CATALOG },
      { op: "bindSeller", sellerId: "seller-a", profile: "CooperativeSeller" },
      { op: "bindBuyer", profile: "AcceptingBuyer" },
      { op: "createList", name: "snap" },
      { op: "addItem", productId: "tomatoes", quantity: 2, unit: "kg" },
      { op: "createPurchase", policy: "PRIMARY_ONLY", sellerIds: ["seller-a"] },
      { op: "sellerOffer", sellerIndex: 0, productId: "tomatoes", quantity: 2, unit: "kg", price: 15 },
      { op: "acceptActive", sellerIndex: 0, actor: "BUYER" },
      { op: "sellerOffer", sellerIndex: 0, productId: "tomatoes", quantity: 2, unit: "kg", price: 12, reason: "TIME_DISCOUNT" },
      { op: "proposeSubstitution", sellerIndex: 0, originalProductId: "tomato_a", replacementProductId: "tomato_b" },
      { op: "assertSnapshot", sellerIndex: 0, agreedPrice: 15, currentPrice: 12, pending: 1 },
    ],
  },
  {
    name: "TZ002-SILENCE",
    title: "Silence ≠ EXPIRED",
    steps: [
      { op: "catalog", catalog: DEMO_CATALOG },
      { op: "bindSeller", sellerId: "seller-a", profile: "SlowSeller" },
      { op: "bindBuyer", profile: "SlowBuyer" },
      { op: "createList", name: "slow" },
      { op: "addItem", productId: "tomatoes", quantity: 2, unit: "kg" },
      { op: "createPurchase", policy: "PRIMARY_ONLY", sellerIds: ["seller-a"] },
      { op: "buyerOffer", sellerIndex: 0, productId: "tomatoes", quantity: 2, unit: "kg", price: 15 },
      { op: "sellerRespond", sellerIndex: 0 },
      { op: "tick", ms: 86_400_000 },
      { op: "assertNotStatus", sellerIndex: 0, status: "EXPIRED" },
      { op: "assertStatus", sellerIndex: 0, status: "WAITING_SELLER" },
    ],
  },
];
