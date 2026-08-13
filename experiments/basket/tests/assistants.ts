import assert from "node:assert/strict";
import { adviseBuyer, adviseSeller, applyAdvice } from "../assistants";
import { BasketWorld } from "../domain/world";
import { DEMO_SCENARIOS } from "../runtime/demos";
import { runScenario } from "../runtime/engine";
import { SimulationRuntime } from "../runtime/simulation";

function tomatoesWorld(): { world: BasketWorld; spId: string } {
  const world = new BasketWorld();
  world.setCatalog({
    names: { tomatoes: "Tomatoes", tomato_a: "Tomato A", tomato_b: "Tomato B" },
    availability: [{ sellerId: "seller-a", productId: "tomatoes", quantity: 20, unit: "kg", price: 15, stock: 100 }],
  });
  const list = world.createList("assist");
  world.addItem(list.id, { productId: "tomatoes", quantity: 2, unit: "kg", alternatives: [] });
  const purchase = world.createPurchaseFromList(list.id, "PRIMARY_ONLY", ["seller-a"]);
  return { world, spId: purchase.sellerPurchaseIds[0] };
}

export function runTz004(): void {
  const discount = tomatoesWorld();
  discount.world.proposeOffer({
    sellerPurchaseId: discount.spId,
    actor: "SELLER",
    items: [{ productId: "tomatoes", quantity: 2, unit: "kg", price: 15 }],
    reason: "PRICE_CHANGE",
  });
  discount.world.acceptOffer(discount.world.requireSp(discount.spId).activeOfferId!, "BUYER");
  discount.world.proposeOffer({
    sellerPurchaseId: discount.spId,
    actor: "SELLER",
    items: [{ productId: "tomatoes", quantity: 2, unit: "kg", price: 12 }],
    reason: "TIME_DISCOUNT",
  });
  const takeDiscount = adviseBuyer(discount.world, discount.spId);
  assert.equal(takeDiscount.kind, "ACCEPT_ACTIVE");
  applyAdvice(discount.world, discount.spId, takeDiscount);
  assert.equal(discount.world.requireSp(discount.spId).status, "STABLE");
  assert.equal(discount.world.snapshot(discount.spId).agreed.items[0]?.price, 12);

  const hike = tomatoesWorld();
  hike.world.proposeOffer({
    sellerPurchaseId: hike.spId,
    actor: "SELLER",
    items: [{ productId: "tomatoes", quantity: 2, unit: "kg", price: 15 }],
    reason: "PRICE_CHANGE",
  });
  hike.world.acceptOffer(hike.world.requireSp(hike.spId).activeOfferId!, "BUYER");
  hike.world.proposeOffer({
    sellerPurchaseId: hike.spId,
    actor: "SELLER",
    items: [{ productId: "tomatoes", quantity: 2, unit: "kg", price: 17 }],
    reason: "PRICE_CHANGE",
  });
  const counterHike = adviseBuyer(hike.world, hike.spId);
  assert.equal(counterHike.kind, "COUNTER");
  assert.equal(counterHike.price, 15);
  applyAdvice(hike.world, hike.spId, counterHike);
  assert.equal(hike.world.snapshot(hike.spId).current.items[0]?.price, 15);
  assert.notEqual(hike.world.requireSp(hike.spId).status, "STABLE");

  const seller = tomatoesWorld();
  seller.world.proposeOffer({
    sellerPurchaseId: seller.spId,
    actor: "BUYER",
    items: [{ productId: "tomatoes", quantity: 2, unit: "kg", price: 13 }],
    reason: "BUYER_CHANGE",
  });
  const sellerCounter = adviseSeller(seller.world, seller.spId);
  assert.equal(sellerCounter.kind, "COUNTER");
  assert.equal(sellerCounter.price, 15);
  applyAdvice(seller.world, seller.spId, sellerCounter);
  assert.equal(seller.world.snapshot(seller.spId).current.items[0]?.price, 15);

  const sub = tomatoesWorld();
  sub.world.proposeOffer({
    sellerPurchaseId: sub.spId,
    actor: "SELLER",
    items: [{ productId: "tomatoes", quantity: 2, unit: "kg", price: 15 }],
    reason: "PRICE_CHANGE",
  });
  sub.world.proposeSubstitution({
    sellerPurchaseId: sub.spId,
    originalProductId: "tomato_a",
    replacementProductId: "tomato_b",
    proposedBy: "SELLER",
  });
  const takeSub = adviseBuyer(sub.world, sub.spId);
  assert.equal(takeSub.kind, "ACCEPT_SUBSTITUTION");
  applyAdvice(sub.world, sub.spId, takeSub);
  assert.equal(sub.world.snapshot(sub.spId).pendingSubstitutions.length, 0);

  for (const scenario of DEMO_SCENARIOS.filter((item) => item.name.startsWith("TZ004-"))) {
    const runtime = runScenario(scenario);
    assert.ok(
      runtime.events.some((event) => event.event === "assistantAdvice"),
      `${scenario.name} missing assistantAdvice`,
    );
    assert.ok(
      runtime.events.some((event) => event.event === "assistantApply"),
      `${scenario.name} missing assistantApply`,
    );
  }

  const runtime = new SimulationRuntime();
  runtime.setCatalog({
    names: { tomatoes: "Tomatoes" },
    availability: [{ sellerId: "seller-a", productId: "tomatoes", quantity: 2, unit: "kg", price: 15, stock: 100 }],
  });
  const list = runtime.world.createList("rt");
  runtime.world.addItem(list.id, { productId: "tomatoes", quantity: 2, unit: "kg", alternatives: [] });
  const purchase = runtime.world.createPurchaseFromList(list.id, "PRIMARY_ONLY", ["seller-a"]);
  const spId = purchase.sellerPurchaseIds[0];
  runtime.world.proposeOffer({
    sellerPurchaseId: spId,
    actor: "BUYER",
    items: [{ productId: "tomatoes", quantity: 2, unit: "kg", price: 15 }],
    reason: "BUYER_CHANGE",
  });
  runtime.applySellerAdvice(spId);
  assert.equal(runtime.world.requireSp(spId).status, "STABLE");

  const stale = tomatoesWorld();
  stale.world.proposeOffer({
    sellerPurchaseId: stale.spId,
    actor: "SELLER",
    items: [{ productId: "tomatoes", quantity: 2, unit: "kg", price: 15 }],
    reason: "PRICE_CHANGE",
  });
  const advice = adviseBuyer(stale.world, stale.spId);
  stale.world.proposeOffer({
    sellerPurchaseId: stale.spId,
    actor: "SELLER",
    items: [{ productId: "tomatoes", quantity: 2, unit: "kg", price: 12 }],
    reason: "PRICE_CHANGE",
  });
  assert.throws(() => applyAdvice(stale.world, stale.spId, advice), /stale/);

  console.log("TZ-BASKET-004 assistants: OK");
}
