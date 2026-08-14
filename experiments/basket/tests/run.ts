import assert from "node:assert/strict";
import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { BasketWorld } from "../domain/world";
import { createSellerEmulator, buyerOffer } from "../emulator/sellers";
import { formatResults, runAllScenarios } from "./scenarios";
import { runTz004 } from "./assistants";

function invariants() {
  const w = new BasketWorld();
  w.setCatalog({
    names: { tomatoes: "Tomatoes" },
    availability: [{ sellerId: "seller-a", productId: "tomatoes", quantity: 20, unit: "kg", price: 15, stock: 100 }],
  });
  const list = w.createList("inv");
  w.addItem(list.id, { productId: "tomatoes", quantity: 20, unit: "kg", alternatives: [] });
  const purchase = w.createPurchaseFromList(list.id, "PRIMARY_ONLY", ["seller-a"]);
  const sp = purchase.sellerPurchaseIds[0];
  const items = [{ productId: "tomatoes", quantity: 20, unit: "kg", price: 15 }];
  const offer = buyerOffer(w, sp, items);
  const frozen = offer.items[0].price;
  assert.throws(() => w.acceptOffer(offer.id, "BUYER"), /I-029/);
  createSellerEmulator("seller-a", "CooperativeSeller").respondToBuyerOffer(w, sp, items);
  assert.equal(w.offerById(offer.id).items[0].price, frozen, "I-006 Offer immutable after accept");
  assert.ok(w.acceptances.some((a) => a.offerId === offer.id), "I-008 Acceptance is a separate fact");
  assert.equal(w.requireSp(sp).status, "STABLE");
  createSellerEmulator("seller-a", "TimeDiscountSeller").tick(w, sp);
  assert.equal(w.requireSp(sp).status, "STABLE");
  assert.equal(w.lastOffer(sp, "SYSTEM"), null, "TIME_DISCOUNT does not rewrite a STABLE agreement");
  w.mockFulfill(sp, 5);
  assert.equal(w.requireSp(sp).status, "STABLE", "I-018 STABLE survives mock fulfillment");

  assert.throws(
    () => w.proposeOffer({ sellerPurchaseId: sp, actor: "SELLER", items: [{ productId: "tomatoes", quantity: 0, unit: "kg", price: 15 }], reason: "AVAILABILITY_CHANGE" }),
    /quantity/
  );
  assert.throws(
    () => w.proposeOffer({ sellerPurchaseId: sp, actor: "SELLER", items: [{ productId: "tomatoes", quantity: -1, unit: "kg", price: 15 }], reason: "AVAILABILITY_CHANGE" }),
    /quantity/
  );
  assert.throws(
    () => w.proposeOffer({ sellerPurchaseId: sp, actor: "SELLER", items: [{ productId: "tomatoes", quantity: Number.NaN, unit: "kg", price: 15 }], reason: "AVAILABILITY_CHANGE" }),
    /quantity/
  );

  // I-033: projections are frozen, so nothing can bypass transition()/invariants.
  const projection = w.requireSp(sp);
  assert.equal(Object.isFrozen(projection), true, "I-033 SellerPurchase projection is frozen");
  assert.equal(Object.isFrozen(projection.items), true);
  try {
    (projection as { status: string }).status = "DRAFT";
  } catch {
    /* frozen writes throw only in strict mode */
  }
  assert.equal(projection.status, "STABLE", "I-033 projection cannot be rewritten");
  assert.equal(w.requireSp(sp).status, "STABLE", "I-033 direct write cannot change FSM state");
  assert.equal(Object.isFrozen(w.acceptances[0]), true, "I-009 Acceptance is a frozen historical fact");
  assert.equal(Object.isFrozen(w.lists.get(list.id)), true);
  assert.equal(Object.isFrozen(w.purchases.get(purchase.id)), true);
  assert.equal(Object.isFrozen(w.catalog.availability[0]), true);

  // I-034: the catalog handed to setCatalog is copied, so outside mutation is not a silent domain change.
  const external = {
    names: { tomatoes: "Tomatoes" },
    availability: [{ sellerId: "seller-x", productId: "tomatoes", quantity: 5, unit: "kg", price: 15, stock: 7 }],
  };
  const copyWorld = new BasketWorld();
  copyWorld.setCatalog(external);
  external.availability[0].stock = 999;
  assert.equal(copyWorld.catalog.availability[0].stock, 7, "I-034 setCatalog stores a defensive copy");

  // I-030: List and catalog boundaries validate like Offer items.
  assert.throws(() => w.addItem(list.id, { productId: "tomatoes", quantity: 0, unit: "kg", alternatives: [] }), /quantity/);
  assert.throws(
    () => w.addItem(list.id, { productId: "tomatoes", quantity: Number.NaN, unit: "kg", alternatives: [] }),
    /quantity/
  );
  assert.throws(
    () => w.addItem(list.id, { productId: "tomatoes", quantity: 1, unit: "kg", referencePrice: -5, alternatives: [] }),
    /referencePrice/
  );
  assert.throws(
    () =>
      copyWorld.setCatalog({
        names: {},
        availability: [{ sellerId: "s", productId: "p", quantity: 1, unit: "kg", price: -1, stock: 1 }],
      }),
    /price/
  );
  assert.throws(
    () =>
      copyWorld.setCatalog({
        names: {},
        availability: [{ sellerId: "s", productId: "p", quantity: 1, unit: "kg", price: 1, stock: Number.NaN }],
      }),
    /stock/
  );

  // I-031: duplicate catalog rows of one seller/product do not duplicate the SellerPurchase line.
  const dup = new BasketWorld();
  dup.setCatalog({
    names: { tomatoes: "Tomatoes" },
    availability: [
      { sellerId: "seller-a", productId: "tomatoes", quantity: 20, unit: "kg", price: 15, stock: 50 },
      { sellerId: "seller-a", productId: "tomatoes", quantity: 20, unit: "kg", price: 14, stock: 50 },
    ],
  });
  const dupList = dup.createList("dup");
  dup.addItem(dupList.id, { productId: "tomatoes", quantity: 2, unit: "kg", alternatives: [] });
  const dupPurchase = dup.createPurchaseFromList(dupList.id, "PRIMARY_ONLY", ["seller-a"]);
  assert.equal(dupPurchase.sellerPurchaseIds.length, 1);
  assert.equal(dup.requireSp(dupPurchase.sellerPurchaseIds[0]).items.length, 1, "I-031 one line per (seller, product)");

  // I-032: a decided Substitution cannot be flipped back.
  const subWorld = new BasketWorld();
  subWorld.setCatalog({
    names: { tomatoes: "Tomatoes" },
    availability: [{ sellerId: "seller-a", productId: "tomatoes", quantity: 2, unit: "kg", price: 15, stock: 10 }],
  });
  const subList = subWorld.createList("sub-lifecycle");
  subWorld.addItem(subList.id, { productId: "tomatoes", quantity: 2, unit: "kg", alternatives: [] });
  const subSp = subWorld.createPurchaseFromList(subList.id, "PRIMARY_ONLY", ["seller-a"]).sellerPurchaseIds[0];
  const rejected = subWorld.proposeSubstitution({
    sellerPurchaseId: subSp,
    originalProductId: "tomatoes",
    replacementProductId: "tomato_b",
    proposedBy: "SELLER",
  });
  subWorld.rejectSubstitution(rejected.id);
  assert.throws(() => subWorld.acceptSubstitution(rejected.id), /already REJECTED/);

  // I-019: FULFILLMENT checkpoint uses the delivered quantity, and the policy flag has an effect.
  const fulfil = new BasketWorld();
  fulfil.setCatalog({
    names: { tomatoes: "Tomatoes" },
    availability: [{ sellerId: "seller-a", productId: "tomatoes", quantity: 20, unit: "kg", price: 15, stock: 4 }],
  });
  const fulfilList = fulfil.createList("fulfil");
  fulfil.addItem(fulfilList.id, { productId: "tomatoes", quantity: 4, unit: "kg", alternatives: [] });
  const fulfilSp = fulfil.createPurchaseFromList(fulfilList.id, "PRIMARY_ONLY", ["seller-a"]).sellerPurchaseIds[0];
  const fulfilOffer = fulfil.proposeOffer({
    sellerPurchaseId: fulfilSp,
    actor: "SELLER",
    items: [{ productId: "tomatoes", quantity: 4, unit: "kg", price: 15 }],
    reason: "SELLER_COUNTEROFFER",
  });
  fulfil.acceptOffer(fulfilOffer.id, "BUYER");
  fulfil.setStock("seller-a", "tomatoes", 1);
  fulfil.mockFulfill(fulfilSp, 1);
  assert.equal(fulfil.fulfillments[0].actualQuantity, 1);
  assert.equal(
    fulfil.stockConflicts.filter((c) => c.detectedAt === "FULFILLMENT").length,
    0,
    "delivered 1 within stock 1 is no conflict; agreed 4 would have been"
  );
  fulfil.partialFulfillmentAllowed = false;
  assert.throws(() => fulfil.mockFulfill(fulfilSp, 1), /Partial fulfillment is disabled/);

  // Seller emulators never rewrite a buyer proposal on tick().
  const tickWorld = new BasketWorld();
  tickWorld.setCatalog({
    names: { tomatoes: "Tomatoes" },
    availability: [{ sellerId: "seller-a", productId: "tomatoes", quantity: 20, unit: "kg", price: 15, stock: 2 }],
  });
  const tickList = tickWorld.createList("tick");
  tickWorld.addItem(tickList.id, { productId: "tomatoes", quantity: 20, unit: "kg", alternatives: [] });
  const tickSp = tickWorld.createPurchaseFromList(tickList.id, "PRIMARY_ONLY", ["seller-a"]).sellerPurchaseIds[0];
  const buyerProposal = buyerOffer(tickWorld, tickSp, [{ productId: "tomatoes", quantity: 20, unit: "kg", price: 15 }]);
  createSellerEmulator("seller-a", "TimeDiscountSeller").tick(tickWorld, tickSp);
  createSellerEmulator("seller-a", "PartialAvailabilitySeller").tick(tickWorld, tickSp);
  assert.equal(
    tickWorld.requireSp(tickSp).activeOfferId,
    buyerProposal.id,
    "tick() must not turn a BUYER Offer into a seller/system Offer"
  );

  const empty = w.createList("empty-stock");
  w.setCatalog({
    names: { tomatoes: "Tomatoes" },
    availability: [{ sellerId: "seller-z", productId: "tomatoes", quantity: 20, unit: "kg", price: 15, stock: 0 }],
  });
  w.addItem(empty.id, { productId: "tomatoes", quantity: 2, unit: "kg", alternatives: [] });
  const vacant = w.createPurchaseFromList(empty.id, "PRIMARY_ONLY", ["seller-z"]);
  assert.equal(vacant.sellerPurchaseIds.length, 0);
  assert.equal(w.derivedPurchaseStatus(vacant.id), "EMPTY");

  const race = new BasketWorld();
  race.setCatalog({
    names: { tomatoes: "Tomatoes" },
    availability: [{ sellerId: "seller-a", productId: "tomatoes", quantity: 6, unit: "kg", price: 15, stock: 6 }],
  });
  const la = race.createList("a");
  race.addItem(la.id, { productId: "tomatoes", quantity: 4, unit: "kg", alternatives: [] });
  const lb = race.createList("b");
  race.addItem(lb.id, { productId: "tomatoes", quantity: 3, unit: "kg", alternatives: [] });
  const spa = race.createPurchaseFromList(la.id, "PRIMARY_ONLY", ["seller-a"]).sellerPurchaseIds[0];
  const spb = race.createPurchaseFromList(lb.id, "PRIMARY_ONLY", ["seller-a"]).sellerPurchaseIds[0];
  race.proposeOffer({ sellerPurchaseId: spa, actor: "SELLER", items: [{ productId: "tomatoes", quantity: 4, unit: "kg", price: 15 }], reason: "SELLER_COUNTEROFFER" });
  race.cancelSellerPurchase(spa);
  race.proposeOffer({ sellerPurchaseId: spb, actor: "SELLER", items: [{ productId: "tomatoes", quantity: 3, unit: "kg", price: 15 }], reason: "SELLER_COUNTEROFFER" });
  assert.equal(race.stockConflicts.length, 0, "CANCELLED SellerPurchase is not a competing claim");

  console.log("invariants: OK");
}

function run() {
  invariants();
  const rows = runAllScenarios();
  const failed = rows.filter((r) => r.result === "FAIL");
  const here = dirname(fileURLToPath(import.meta.url));
  const resultsPath = join(here, "../../../docs/basket/BASKET_EXPERIMENT_RESULTS.md");
  writeFileSync(resultsPath, formatResults(rows), "utf8");
  console.log(`scenarios: ${rows.length} recorded, FAIL=${failed.length}`);
  for (const row of rows) {
    console.log(`  ${row.id} ${row.result}`);
  }
  if (failed.length) {
    for (const row of failed) console.error(`FAIL ${row.id}: ${row.actual}`);
    process.exit(1);
  }
  console.log("TZ-BASKET-001 experiment: OK");
  runTz004();
}

run();
