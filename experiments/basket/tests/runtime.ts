import assert from "node:assert/strict";
import { canTransition, transition } from "../domain/fsm";
import { runScenario, type Scenario } from "../runtime/engine";
import { SimulationRuntime } from "../runtime/simulation";
import type { ProductCatalog } from "../domain/types";

const tomatoes: ProductCatalog = {
  names: { tomatoes: "Tomatoes", tomato_a: "Tomato A", tomato_b: "Tomato B" },
  availability: [
    { sellerId: "seller-a", productId: "tomatoes", quantity: 20, unit: "kg", price: 15, stock: 100 },
  ],
};

const stableViaActors: Scenario = {
  name: "TZ002-STABLE-actors",
  steps: [
    { op: "catalog", catalog: tomatoes },
    { op: "bindSeller", sellerId: "seller-a", profile: "CooperativeSeller" },
    { op: "bindBuyer", profile: "AcceptingBuyer" },
    { op: "createList", name: "weekly" },
    { op: "addItem", productId: "tomatoes", quantity: 20, unit: "kg" },
    { op: "createPurchase", policy: "PRIMARY_ONLY", sellerIds: ["seller-a"] },
    { op: "buyerOffer", sellerIndex: 0, productId: "tomatoes", quantity: 20, unit: "kg", price: 15 },
    { op: "sellerRespond", sellerIndex: 0 },
    { op: "assertStatus", sellerIndex: 0, status: "STABLE" },
  ],
};

const timeDiscountViaEngine: Scenario = {
  name: "TZ002-TIME_DISCOUNT",
  steps: [
    { op: "catalog", catalog: tomatoes },
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
};

const snapshotViaEngine: Scenario = {
  name: "TZ002-SNAPSHOT",
  steps: [
    { op: "catalog", catalog: tomatoes },
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
};

const silenceNotExpired: Scenario = {
  name: "TZ002-SILENCE",
  steps: [
    { op: "catalog", catalog: tomatoes },
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
};

export function runTz002(): void {
  assert.equal(canTransition("REJECTED", "STABLE"), false);
  assert.throws(() => transition("REJECTED", "STABLE"), /Illegal FSM/);
  assert.equal(transition("WAITING_BUYER", "STABLE"), "STABLE");

  for (const scenario of [stableViaActors, timeDiscountViaEngine, snapshotViaEngine, silenceNotExpired]) {
    runScenario(scenario);
  }

  const runtime = new SimulationRuntime();
  runtime.bindBuyer("CounteringBuyer");
  assert.equal(runtime.events.some((e) => e.kind === "bindBuyer"), true);

  console.log("TZ-BASKET-002 runtime: OK");
}
