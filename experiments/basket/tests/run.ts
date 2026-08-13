import assert from "node:assert/strict";
import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { BasketWorld } from "../domain/world";
import { createSellerEmulator, buyerOffer } from "../emulator/sellers";
import { formatResults, runAllScenarios } from "./scenarios";
import { runTz004 } from "./assistants";
import { runTz002 } from "./runtime";

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
  runTz002();
  runTz004();
}

run();
