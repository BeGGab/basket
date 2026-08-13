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
  createSellerEmulator("seller-a", "CooperativeSeller").respondToBuyerOffer(w, sp, items);
  assert.equal(w.offerById(offer.id).items[0].price, frozen, "I-006 Offer immutable after accept");
  assert.ok(w.acceptances.some((a) => a.offerId === offer.id), "I-008 Acceptance is a separate fact");
  assert.equal(w.requireSp(sp).status, "STABLE");
  w.mockFulfill(sp, 5);
  assert.equal(w.requireSp(sp).status, "STABLE", "I-018 STABLE survives mock fulfillment");
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
