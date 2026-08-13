import assert from "node:assert/strict";
import { BasketWorld } from "../domain/world";
import type { ProductCatalog, PurchaseItem } from "../domain/types";
import { createSellerEmulator, buyerOffer } from "../emulator/sellers";
import { resolve } from "../domain/resolution";

export type ScenarioResult = {
  id: string;
  result: "PASS" | "FAIL" | "MODEL GAP" | "WORKAROUND" | "OPEN";
  expected: string;
  actual: string;
  invariant: string;
  modelViolation: string;
  newConcept: string;
  workaround: string;
  decision: string;
};

function catalog(overrides?: Partial<ProductCatalog>): ProductCatalog {
  return {
    names: {
      tomatoes: "Tomatoes",
      tomato_a: "Tomato A",
      tomato_b: "Tomato B",
      black_bread: "Black Bread",
      white_bread: "White Bread",
      baguette: "Baguette",
      wholegrain: "Wholegrain",
    },
    availability: [
      { sellerId: "seller-a", productId: "tomatoes", quantity: 20, unit: "kg", price: 15, stock: 100 },
      { sellerId: "seller-b", productId: "tomatoes", quantity: 20, unit: "kg", price: 16, stock: 100 },
      { sellerId: "seller-c", productId: "tomatoes", quantity: 20, unit: "kg", price: 14, stock: 100 },
      { sellerId: "seller-a", productId: "black_bread", quantity: 1, unit: "pcs", price: 8, stock: 0 },
      { sellerId: "seller-a", productId: "white_bread", quantity: 1, unit: "pcs", price: 9, stock: 10 },
      { sellerId: "seller-a", productId: "baguette", quantity: 1, unit: "pcs", price: 11, stock: 10 },
      { sellerId: "seller-b", productId: "black_bread", quantity: 1, unit: "pcs", price: 8, stock: 10 },
      { sellerId: "seller-a", productId: "tomato_a", quantity: 2, unit: "kg", price: 15, stock: 10 },
      { sellerId: "seller-a", productId: "tomato_b", quantity: 2, unit: "kg", price: 12, stock: 10 },
    ],
    ...overrides,
  };
}

function tomatoes(qty: number, price: number): PurchaseItem[] {
  return [{ productId: "tomatoes", quantity: qty, unit: "kg", price }];
}

function pass(id: string, expected: string, actual: string, invariant: string, decision = "keep v0.1"): ScenarioResult {
  return {
    id,
    result: "PASS",
    expected,
    actual,
    invariant,
    modelViolation: "none",
    newConcept: "none",
    workaround: "none",
    decision,
  };
}

function run(id: string, fn: () => ScenarioResult): ScenarioResult {
  try {
    return fn();
  } catch (err) {
    return {
      id,
      result: "FAIL",
      expected: "scenario completes",
      actual: err instanceof Error ? err.message : String(err),
      invariant: "n/a",
      modelViolation: "test assertion failed",
      newConcept: "none",
      workaround: "none",
      decision: "fix implementation",
    };
  }
}

export function runAllScenarios(): ScenarioResult[] {
  const results: ScenarioResult[] = [];

  results.push(
    run("BS-001", () => {
      const w = new BasketWorld();
      w.setCatalog(catalog());
      const list = w.createList("weekly");
      w.addItem(list.id, { productId: "tomatoes", quantity: 20, unit: "kg", alternatives: [] });
      const p1 = w.createPurchaseFromList(list.id, "PRIMARY_ONLY");
      const p2 = w.createPurchaseFromList(list.id, "PRIMARY_ONLY");
      assert.equal(w.lists.get(list.id)?.items.length, 1);
      assert.notEqual(p1.id, p2.id);
      assert.equal(p1.listId, list.id);
      return pass("BS-001", "List survives; two independent Purchases", `${list.id} → ${p1.id}, ${p2.id}`, "I-001 I-002");
    })
  );

  results.push(
    run("BS-002", () => {
      const w = new BasketWorld();
      w.setCatalog(catalog());
      const list = w.createList("multi");
      w.addItem(list.id, { productId: "tomatoes", quantity: 20, unit: "kg", alternatives: [] });
      const p = w.createPurchaseFromList(list.id, "PRIMARY_ONLY", ["seller-a", "seller-b", "seller-c"]);
      assert.equal(p.sellerPurchaseIds.length, 3);
      return pass("BS-002", "One Purchase, three SellerPurchases", `${p.sellerPurchaseIds.length} SP`, "I-004");
    })
  );

  results.push(
    run("BS-003", () => {
      const w = new BasketWorld();
      w.setCatalog(catalog());
      const list = w.createList("indep");
      w.addItem(list.id, { productId: "tomatoes", quantity: 20, unit: "kg", alternatives: [] });
      const p = w.createPurchaseFromList(list.id, "PRIMARY_ONLY", ["seller-a", "seller-b", "seller-c"]);
      const [a, b, c] = p.sellerPurchaseIds;
      const coop = createSellerEmulator("seller-a", "CooperativeSeller");
      const neg = createSellerEmulator("seller-b", "NegotiatingSeller");
      buyerOffer(w, a, tomatoes(20, 15));
      coop.respondToBuyerOffer(w, a, tomatoes(20, 15));
      buyerOffer(w, b, tomatoes(20, 15));
      neg.respondToBuyerOffer(w, b, tomatoes(20, 15));
      w.rejectSellerPurchase(c);
      assert.equal(w.requireSp(a).status, "STABLE");
      assert.equal(w.requireSp(b).status, "WAITING_BUYER");
      assert.equal(w.requireSp(c).status, "REJECTED");
      assert.equal(w.derivedPurchaseStatus(p.id), "MIXED");
      return pass("BS-003", "A STABLE, B NEGOTIATING, C REJECTED independently", w.derivedPurchaseStatus(p.id), "I-005 I-020");
    })
  );

  results.push(
    run("BS-004", () => {
      const w = new BasketWorld();
      w.setCatalog(catalog());
      const list = w.createList("neg");
      w.addItem(list.id, { productId: "tomatoes", quantity: 20, unit: "kg", alternatives: [] });
      const p = w.createPurchaseFromList(list.id, "PRIMARY_ONLY", ["seller-b"]);
      const sp = p.sellerPurchaseIds[0];
      const neg = createSellerEmulator("seller-b", "NegotiatingSeller");
      for (let i = 0; i < 8; i++) {
        buyerOffer(w, sp, tomatoes(20, 15 + i));
        neg.respondToBuyerOffer(w, sp, tomatoes(20, 15 + i));
      }
      const sellerOffers = w.offers.filter((o) => o.sellerPurchaseId === sp && o.actor === "SELLER");
      assert.equal(sellerOffers.length, 8);
      assert.ok(w.offers.every((o) => o.items));
      return pass("BS-004", "Unlimited bidirectional Offer history", `${w.offers.length} offers`, "I-006 I-007");
    })
  );

  results.push(
    run("BS-005", () => {
      const w = new BasketWorld();
      w.setCatalog(catalog());
      const list = w.createList("price");
      w.addItem(list.id, { productId: "tomatoes", quantity: 2, unit: "kg", alternatives: [] });
      const sp = w.createPurchaseFromList(list.id, "PRIMARY_ONLY", ["seller-a"]).sellerPurchaseIds[0];
      const o1 = w.proposeOffer({ sellerPurchaseId: sp, actor: "SELLER", items: tomatoes(2, 15), reason: "PRICE_CHANGE" });
      const o2 = w.proposeOffer({ sellerPurchaseId: sp, actor: "SELLER", items: tomatoes(2, 17), reason: "PRICE_CHANGE" });
      const o3 = w.proposeOffer({
        sellerPurchaseId: sp,
        actor: "SELLER",
        items: [{ ...tomatoes(2, 15.5)[0], discount: 5 }],
        reason: "PRICE_CHANGE",
      });
      assert.equal(o1.items[0].price, 15);
      assert.equal(o2.items[0].price, 17);
      assert.equal(o3.items[0].price, 15.5);
      assert.notEqual(o1.id, o2.id);
      return pass("BS-005", "Each price is a new immutable Offer", `${o1.id}/${o2.id}/${o3.id}`, "I-006");
    })
  );

  results.push(
    run("BS-006", () => {
      const w = new BasketWorld();
      w.setCatalog(catalog());
      const list = w.createList("disc");
      w.addItem(list.id, { productId: "tomatoes", quantity: 2, unit: "kg", alternatives: [] });
      const sp = w.createPurchaseFromList(list.id, "PRIMARY_ONLY", ["seller-a"]).sellerPurchaseIds[0];
      const emu = createSellerEmulator("seller-a", "TimeDiscountSeller");
      w.proposeOffer({ sellerPurchaseId: sp, actor: "SELLER", items: tomatoes(2, 15), reason: "PRICE_CHANGE" });
      w.advance(3_600_000);
      emu.tick(w, sp);
      const sys = w.lastOffer(sp, "SYSTEM");
      assert.equal(sys?.reason, "TIME_DISCOUNT");
      assert.equal(sys?.items[0].price, 12);
      return pass("BS-006", "SYSTEM TIME_DISCOUNT 15→12 MAD", `${sys?.actor} ${sys?.reason} ${sys?.items[0].price}`, "I-006");
    })
  );

  results.push(
    run("BS-007", () => {
      const w = new BasketWorld();
      w.setCatalog(catalog());
      const list = w.createList("qty");
      w.addItem(list.id, { productId: "tomatoes", quantity: 10, unit: "kg", alternatives: [] });
      const sp = w.createPurchaseFromList(list.id, "PRIMARY_ONLY", ["seller-a"]).sellerPurchaseIds[0];
      buyerOffer(w, sp, tomatoes(10, 15));
      const seller = w.proposeOffer({ sellerPurchaseId: sp, actor: "SELLER", items: tomatoes(6, 15), reason: "AVAILABILITY_CHANGE" });
      w.acceptOffer(seller.id, "BUYER");
      assert.equal(w.requireSp(sp).items[0].quantity, 6);
      assert.equal(w.requireSp(sp).status, "STABLE");
      return pass("BS-007", "Buyer accepts reduced 6 kg", "agreed qty 6 STABLE", "I-017");
    })
  );

  results.push(
    run("BS-008", () => {
      const w = new BasketWorld();
      w.setCatalog(catalog());
      const list = w.createList("comp");
      w.addItem(list.id, { productId: "tomatoes", quantity: 1, unit: "kg", alternatives: [] });
      const sp = w.createPurchaseFromList(list.id, "PRIMARY_ONLY", ["seller-a"]).sellerPurchaseIds[0];
      const abc = [
        { productId: "tomatoes", quantity: 1, unit: "kg", price: 15 },
        { productId: "white_bread", quantity: 1, unit: "pcs", price: 9 },
        { productId: "baguette", quantity: 1, unit: "pcs", price: 11 },
      ];
      w.proposeOffer({ sellerPurchaseId: sp, actor: "BUYER", items: abc, reason: "BUYER_CHANGE" });
      w.proposeOffer({ sellerPurchaseId: sp, actor: "BUYER", items: abc.slice(0, 2), reason: "BUYER_CHANGE" });
      w.proposeOffer({
        sellerPurchaseId: sp,
        actor: "BUYER",
        items: [...abc.slice(0, 2), { productId: "wholegrain", quantity: 1, unit: "pcs", price: 10 }],
        reason: "BUYER_CHANGE",
      });
      assert.equal(w.offers.filter((o) => o.sellerPurchaseId === sp).length, 3);
      return pass("BS-008", "Composition A+B+C → A+C → A+C+D as new Offers", "3 immutable offers", "I-007");
    })
  );

  results.push(
    run("BS-009", () => {
      const w = new BasketWorld();
      w.setCatalog(catalog());
      const onlyAlt: ProductCatalog = {
        names: { black_bread: "Black Bread", white_bread: "White Bread" },
        availability: [
          { sellerId: "seller-a", productId: "black_bread", quantity: 1, unit: "pcs", price: 8, stock: 0 },
          { sellerId: "seller-a", productId: "white_bread", quantity: 1, unit: "pcs", price: 9, stock: 10 },
        ],
      };
      const item = {
        id: "tmp",
        productId: "black_bread",
        quantity: 1,
        unit: "pcs",
        alternatives: [
          { productId: "black_bread", alternativePriority: 0 },
          { productId: "white_bread", alternativePriority: 1 },
        ],
      };
      const result = resolve(item, "FIRST_AVAILABLE", onlyAlt);
      assert.equal(result.kind, "ALTERNATIVE");
      assert.equal(result.productId, "white_bread");
      assert.equal(result.alternativePriority, 1);
      return pass("BS-009", "Primary unavailable → authorized alternative", `${result.kind} ${result.productId}`, "I-014 I-015");
    })
  );

  results.push(
    run("BS-010", () => {
      const expensive: ProductCatalog = {
        names: { black_bread: "Black", white_bread: "White" },
        availability: [
          { sellerId: "seller-a", productId: "black_bread", quantity: 1, unit: "pcs", price: 8, stock: 0 },
          { sellerId: "seller-a", productId: "white_bread", quantity: 1, unit: "pcs", price: 999, stock: 10 },
        ],
      };
      const item = {
        id: "tmp",
        productId: "black_bread",
        quantity: 1,
        unit: "pcs",
        referencePrice: 10,
        alternatives: [
          { productId: "black_bread", alternativePriority: 0 },
          { productId: "white_bread", alternativePriority: 1 },
        ],
      };
      const result = resolve(item, "FIRST_AVAILABLE", expensive);
      assert.equal(result.productId, "white_bread");
      assert.equal(result.kind, "ALTERNATIVE");
      return pass(
        "BS-010",
        "Expensive alternative still selected; no hidden price threshold",
        `${result.productId} price=999 vs referencePrice=10`,
        "I-014; OQ-002 OPEN"
      );
    })
  );

  results.push(
    run("BS-011", () => {
      const tight: ProductCatalog = {
        names: { tomatoes: "Tomatoes" },
        availability: [{ sellerId: "seller-a", productId: "tomatoes", quantity: 20, unit: "kg", price: 15, stock: 10 }],
      };
      const w = new BasketWorld();
      w.setCatalog(tight);
      const list = w.createList("race");
      w.addItem(list.id, { productId: "tomatoes", quantity: 20, unit: "kg", alternatives: [] });
      const pa = w.createPurchaseFromList(list.id, "PRIMARY_ONLY", ["seller-a"]);
      const pb = w.createPurchaseFromList(list.id, "PRIMARY_ONLY", ["seller-a"]);
      w.proposeOffer({
        sellerPurchaseId: pa.sellerPurchaseIds[0],
        actor: "BUYER",
        items: tomatoes(20, 15),
        reason: "BUYER_CHANGE",
      });
      w.proposeOffer({
        sellerPurchaseId: pb.sellerPurchaseIds[0],
        actor: "BUYER",
        items: tomatoes(20, 15),
        reason: "BUYER_CHANGE",
      });
      assert.ok(w.stockConflicts.some((c) => c.detectedAt === "OFFER_CREATION"));
      assert.equal(w.purchases.size, 2);
      return pass(
        "BS-011",
        "Conflict observed at Offer creation; no allocation",
        `conflicts=${w.stockConflicts.length} detectedAt=OFFER_CREATION`,
        "I-025"
      );
    })
  );

  results.push(
    run("BS-012", () => {
      const w = new BasketWorld();
      w.setCatalog(catalog());
      const list = w.createList("exp");
      w.addItem(list.id, { productId: "tomatoes", quantity: 2, unit: "kg", alternatives: [] });
      const sp = w.createPurchaseFromList(list.id, "PRIMARY_ONLY", ["seller-a"]).sellerPurchaseIds[0];
      const offer = w.proposeOffer({
        sellerPurchaseId: sp,
        actor: "SELLER",
        items: tomatoes(2, 15),
        reason: "PRICE_CHANGE",
        validUntil: "2026-01-01T00:00:01.000Z",
      });
      w.acceptOffer(offer.id, "BUYER");
      w.advance(5_000);
      assert.equal(w.isOfferValid(offer), false);
      assert.notEqual(w.requireSp(sp).status, "EXPIRED");
      assert.ok(w.sellerPurchases.has(sp));
      return pass("BS-012", "Offer expires; SellerPurchase remains (not auto-EXPIRED)", w.requireSp(sp).status, "I-011 I-026");
    })
  );

  results.push(
    run("BS-013", () => {
      const w = new BasketWorld();
      w.setCatalog(catalog());
      const list = w.createList("slow");
      w.addItem(list.id, { productId: "tomatoes", quantity: 2, unit: "kg", alternatives: [] });
      const sp = w.createPurchaseFromList(list.id, "PRIMARY_ONLY", ["seller-a"]).sellerPurchaseIds[0];
      const slow = createSellerEmulator("seller-a", "SlowSeller");
      buyerOffer(w, sp, tomatoes(2, 15));
      slow.respondToBuyerOffer(w, sp, tomatoes(2, 15));
      w.advance(86_400_000);
      const s = w.requireSp(sp);
      assert.ok(s.waitingSince);
      assert.notEqual(s.status, "REJECTED");
      assert.notEqual(s.status, "EXPIRED");
      return pass("BS-013", "Silence recorded as waitingSince, not new FSM state", `${s.status} waitingSince=${s.waitingSince}`, "I-026 OQ-012");
    })
  );

  results.push(
    run("BS-014", () => {
      const w = new BasketWorld();
      w.setCatalog(catalog());
      const list = w.createList("part");
      w.addItem(list.id, { productId: "tomatoes", quantity: 20, unit: "kg", alternatives: [] });
      const sp = w.createPurchaseFromList(list.id, "PRIMARY_ONLY", ["seller-a"]).sellerPurchaseIds[0];
      const offer = w.proposeOffer({ sellerPurchaseId: sp, actor: "SELLER", items: tomatoes(20, 15), reason: "SELLER_COUNTEROFFER" });
      w.acceptOffer(offer.id, "BUYER");
      assert.equal(w.requireSp(sp).status, "STABLE");
      w.mockFulfill(sp, 5);
      assert.equal(w.requireSp(sp).status, "STABLE");
      assert.equal(w.fulfillments[0].actualQuantity, 5);
      return pass("BS-014", "agreed 20 / actual 5 keeps STABLE; fulfillment is mock", "STABLE + mockFulfill 5", "I-018 I-019 I-024");
    })
  );

  results.push(
    run("BS-015", () => {
      const w = new BasketWorld();
      w.setCatalog(catalog());
      const list = w.createList("reuse");
      w.addItem(list.id, { productId: "tomatoes", quantity: 20, unit: "kg", alternatives: [] });
      const p101 = w.createPurchaseFromList(list.id, "PRIMARY_ONLY");
      const p102 = w.createPurchaseFromList(list.id, "PRIMARY_ONLY");
      assert.equal(w.lists.get(list.id)?.name, "reuse");
      assert.notEqual(p101.id, p102.id);
      return pass("BS-015", "Same List → Purchase #101 and #102", `${p101.id} ${p102.id}`, "I-002");
    })
  );

  results.push(
    run("BS-016", () => {
      const w = new BasketWorld();
      w.setCatalog(catalog());
      const list = w.createList("snap");
      w.addItem(list.id, { productId: "tomatoes", quantity: 2, unit: "kg", alternatives: [] });
      const sp = w.createPurchaseFromList(list.id, "PRIMARY_ONLY", ["seller-a"]).sellerPurchaseIds[0];
      const o18 = w.proposeOffer({
        sellerPurchaseId: sp,
        actor: "SELLER",
        items: [{ productId: "tomatoes", quantity: 2, unit: "kg", price: 15 }],
        reason: "PRICE_CHANGE",
      });
      w.acceptOffer(o18.id, "BUYER");
      const o19 = w.proposeOffer({
        sellerPurchaseId: sp,
        actor: "SELLER",
        items: [{ productId: "tomatoes", quantity: 2, unit: "kg", price: 12 }],
        reason: "TIME_DISCOUNT",
      });
      w.proposeSubstitution({
        sellerPurchaseId: sp,
        originalProductId: "tomato_a",
        replacementProductId: "tomato_b",
        proposedBy: "SELLER",
      });
      const snap = w.snapshot(sp);
      assert.equal(snap.agreed.offerId, o18.id);
      assert.equal(snap.agreed.items[0].price, 15);
      assert.equal(snap.current.offerId, o19.id);
      assert.equal(snap.current.items[0].price, 12);
      assert.equal(snap.pendingSubstitutions.length, 1);
      assert.equal(w.offerById(o18.id).items[0].price, 15);
      return pass(
        "BS-016",
        "AGREED #18 15 MAD + CURRENT #19 12 MAD + PENDING Tomato A→B",
        `agreed=${snap.agreed.offerId} current=${snap.current.offerId} pending=${snap.pendingSubstitutions.length}`,
        "I-022 I-023"
      );
    })
  );

  results.push(
    run("BS-018", () => {
      const w = new BasketWorld();
      w.setCatalog(catalog());
      const list = w.createList("sub");
      w.addItem(list.id, {
        productId: "black_bread",
        quantity: 1,
        unit: "pcs",
        alternatives: [
          { productId: "black_bread", alternativePriority: 0 },
          { productId: "white_bread", alternativePriority: 1 },
        ],
      });
      const sp = w.createPurchaseFromList(list.id, "PRIMARY_ONLY", ["seller-b"]).sellerPurchaseIds[0];
      const emu = createSellerEmulator("seller-b", "SubstitutionSeller");
      emu.respondToBuyerOffer(w, sp, [{ productId: "black_bread", quantity: 1, unit: "pcs", price: 8 }]);
      const sub = w.substitutions[0];
      assert.equal(sub.replacementProductId, "baguette");
      assert.equal(sub.status, "PROPOSED");
      const before = w.requireSp(sp).agreedOfferId;
      assert.equal(before, null);
      return pass("BS-018", "Baguette outside alternatives → Substitution PROPOSED", `${sub.status} ${sub.replacementProductId}`, "I-012");
    })
  );

  results.push(
    run("BS-020", () => {
      const w = new BasketWorld();
      w.setCatalog(catalog());
      const list = w.createList("sim");
      w.addItem(list.id, { productId: "tomatoes", quantity: 2, unit: "kg", alternatives: [] });
      const p = w.createPurchaseFromList(list.id, "PRIMARY_ONLY", ["seller-a", "seller-b"]);
      const [a, b] = p.sellerPurchaseIds;
      w.proposeOffer({ sellerPurchaseId: a, actor: "SELLER", items: tomatoes(2, 15), reason: "PRICE_CHANGE" });
      w.proposeOffer({ sellerPurchaseId: b, actor: "SELLER", items: tomatoes(2, 99), reason: "PRICE_CHANGE" });
      assert.equal(w.lastOffer(a)?.items[0].price, 15);
      assert.equal(w.lastOffer(b)?.items[0].price, 99);
      return pass("BS-020", "Independent seller offers do not overwrite", "15 vs 99", "I-005");
    })
  );

  results.push(
    run("BS-021", () => {
      const w = new BasketWorld();
      w.setCatalog(catalog());
      const list = w.createList("act");
      w.addItem(list.id, { productId: "tomatoes", quantity: 2, unit: "kg", alternatives: [] });
      const sp = w.createPurchaseFromList(list.id, "PRIMARY_ONLY", ["seller-a"]).sellerPurchaseIds[0];
      const old = w.proposeOffer({
        sellerPurchaseId: sp,
        actor: "SELLER",
        items: tomatoes(2, 15),
        reason: "PRICE_CHANGE",
        validUntil: "2026-01-01T00:00:01.000Z",
      });
      w.advance(5_000);
      const neu = w.proposeOffer({ sellerPurchaseId: sp, actor: "SELLER", items: tomatoes(2, 16), reason: "PRICE_CHANGE" });
      assert.equal(w.requireSp(sp).activeOfferId, neu.id);
      assert.equal(w.isOfferValid(old), false);
      assert.equal(w.isOfferValid(neu), true);
      return pass("BS-021", "activeOfferId points at currently applicable Offer", `${old.id} expired; active=${neu.id}`, "I-011; OQ-009 OPEN");
    })
  );

  results.push(
    run("BS-023", () => {
      const tight: ProductCatalog = {
        names: { tomatoes: "Tomatoes" },
        availability: [{ sellerId: "seller-a", productId: "tomatoes", quantity: 20, unit: "kg", price: 15, stock: 10 }],
      };
      const w = new BasketWorld();
      w.setCatalog(tight);
      const list = w.createList("prom");
      w.addItem(list.id, { productId: "tomatoes", quantity: 20, unit: "kg", alternatives: [] });
      const p1 = w.createPurchaseFromList(list.id, "PRIMARY_ONLY", ["seller-a"]);
      const p2 = w.createPurchaseFromList(list.id, "PRIMARY_ONLY", ["seller-a"]);
      const o1 = w.proposeOffer({
        sellerPurchaseId: p1.sellerPurchaseIds[0],
        actor: "SELLER",
        items: tomatoes(20, 15),
        reason: "SELLER_COUNTEROFFER",
      });
      const o2 = w.proposeOffer({
        sellerPurchaseId: p2.sellerPurchaseIds[0],
        actor: "SELLER",
        items: tomatoes(20, 15),
        reason: "SELLER_COUNTEROFFER",
      });
      w.acceptOffer(o1.id, "BUYER");
      w.acceptOffer(o2.id, "BUYER");
      assert.equal(w.requireSp(p1.sellerPurchaseIds[0]).status, "STABLE");
      assert.equal(w.requireSp(p2.sellerPurchaseIds[0]).status, "STABLE");
      assert.ok(w.stockConflicts.length > 0);
      return pass(
        "BS-023",
        "Both can STABLE; conflict recorded; no Reservation/Allocation",
        `both STABLE, conflicts=${w.stockConflicts.length}`,
        "I-025"
      );
    })
  );

  results.push(
    run("BS-024", () => {
      const w = new BasketWorld();
      w.setCatalog(catalog());
      const list = w.createList("acc");
      w.addItem(list.id, { productId: "tomatoes", quantity: 2, unit: "kg", alternatives: [] });
      const sp = w.createPurchaseFromList(list.id, "PRIMARY_ONLY", ["seller-a"]).sellerPurchaseIds[0];
      const o18 = w.proposeOffer({ sellerPurchaseId: sp, actor: "SELLER", items: tomatoes(2, 15), reason: "PRICE_CHANGE" });
      w.acceptOffer(o18.id, "BUYER");
      const o19 = w.proposeOffer({ sellerPurchaseId: sp, actor: "SELLER", items: tomatoes(2, 12), reason: "TIME_DISCOUNT" });
      assert.equal(w.requireSp(sp).agreedOfferId, o18.id);
      assert.equal(w.requireSp(sp).activeOfferId, o19.id);
      return pass("BS-024", "agreed=#18 active=#19", `agreed=${o18.id} active=${o19.id}`, "I-010 I-011");
    })
  );

  results.push(
    run("BS-025", () => {
      const w = new BasketWorld();
      w.setCatalog(catalog());
      const list = w.createList("sub2");
      w.addItem(list.id, { productId: "black_bread", quantity: 1, unit: "pcs", alternatives: [] });
      const sp = w.createPurchaseFromList(list.id, "PRIMARY_ONLY", ["seller-b"]).sellerPurchaseIds[0];
      const sub = w.proposeSubstitution({
        sellerPurchaseId: sp,
        originalProductId: "black_bread",
        replacementProductId: "baguette",
        proposedBy: "SELLER",
      });
      w.acceptSubstitution(sub.id);
      w.proposeOffer({
        sellerPurchaseId: sp,
        actor: "SELLER",
        items: [{ productId: "baguette", quantity: 1, unit: "pcs", price: 11 }],
        reason: "SUBSTITUTION",
      });
      assert.equal(w.substitutions[0].status, "ACCEPTED");
      assert.ok(w.lastOffer(sp));
      return pass("BS-025", "Accepted substitution and later Offer are separate facts", "sub ACCEPTED + new Offer", "I-013 I-022");
    })
  );

  results.push(
    run("BS-026", () => {
      const w = new BasketWorld();
      w.setCatalog(catalog());
      const list = w.createList("sil");
      w.addItem(list.id, { productId: "tomatoes", quantity: 2, unit: "kg", alternatives: [] });
      const sp = w.createPurchaseFromList(list.id, "PRIMARY_ONLY", ["seller-a"]).sellerPurchaseIds[0];
      w.proposeOffer({
        sellerPurchaseId: sp,
        actor: "SELLER",
        items: tomatoes(2, 15),
        reason: "PRICE_CHANGE",
        validUntil: "2026-12-31T00:00:00.000Z",
      });
      w.markWaiting(sp);
      w.advance(3_600_000);
      assert.equal(w.isOfferValid(w.lastOffer(sp)!), true);
      assert.notEqual(w.requireSp(sp).status, "EXPIRED");
      return pass("BS-026", "Silence while offer valid ≠ expiration", w.requireSp(sp).status, "I-026");
    })
  );

  results.push(
    run("BS-027", () => {
      const item = {
        id: "tmp",
        productId: "black_bread",
        quantity: 1,
        unit: "pcs",
        referencePrice: 10,
        alternatives: [
          { productId: "black_bread", alternativePriority: 0 },
          { productId: "white_bread", alternativePriority: 1 },
        ],
      };
      const expensive: ProductCatalog = {
        names: {},
        availability: [
          { sellerId: "s", productId: "black_bread", quantity: 1, unit: "pcs", price: 8, stock: 0 },
          { sellerId: "s", productId: "white_bread", quantity: 1, unit: "pcs", price: 999, stock: 5 },
        ],
      };
      const first = resolve(item, "FIRST_AVAILABLE", expensive);
      const ask = resolve(item, "ASK_BUYER", expensive);
      assert.equal(first.productId, "white_bread");
      assert.equal(ask.requiresBuyerDecision, true);
      return pass(
        "BS-027",
        "FIRST_AVAILABLE picks expensive alt; ASK_BUYER does not auto-pick",
        `FIRST=${first.kind} ASK_BUYER decision=${ask.requiresBuyerDecision}`,
        "OQ-001 OPEN"
      );
    })
  );

  results.push(
    run("BS-028", () => {
      const low: ProductCatalog = {
        names: { tomatoes: "Tomatoes" },
        availability: [{ sellerId: "seller-a", productId: "tomatoes", quantity: 20, unit: "kg", price: 15, stock: 5 }],
      };
      const w = new BasketWorld();
      w.setCatalog(low);
      w.partialFulfillmentAllowed = true;
      const list = w.createList("pre");
      w.addItem(list.id, { productId: "tomatoes", quantity: 20, unit: "kg", alternatives: [] });
      const sp = w.createPurchaseFromList(list.id, "PRIMARY_ONLY", ["seller-a"]).sellerPurchaseIds[0];
      const emu = createSellerEmulator("seller-a", "PartialAvailabilitySeller");
      buyerOffer(w, sp, tomatoes(20, 15));
      emu.respondToBuyerOffer(w, sp, tomatoes(20, 15));
      const offer = w.lastOffer(sp, "SELLER")!;
      w.acceptOffer(offer.id, "BUYER");
      assert.equal(w.requireSp(sp).status, "STABLE");
      assert.equal(w.requireSp(sp).items[0].quantity, 20);
      return pass("BS-028", "available=5 agreed=20 still STABLE", w.requireSp(sp).status, "I-017 I-018");
    })
  );

  results.push(
    run("BS-017", () => {
      const w = new BasketWorld();
      w.setCatalog(catalog());
      const list = w.createList("prev");
      w.addItem(list.id, { productId: "tomatoes", quantity: 2, unit: "kg", alternatives: [] });
      const sp = w.createPurchaseFromList(list.id, "PRIMARY_ONLY", ["seller-a"]).sellerPurchaseIds[0];
      const older = w.proposeOffer({
        sellerPurchaseId: sp,
        actor: "SELLER",
        items: tomatoes(2, 15),
        reason: "PRICE_CHANGE",
      });
      const newer = w.proposeOffer({
        sellerPurchaseId: sp,
        actor: "SELLER",
        items: tomatoes(2, 17),
        reason: "PRICE_CHANGE",
      });
      assert.equal(w.requireSp(sp).activeOfferId, newer.id);
      assert.throws(
        () => w.acceptOffer(older.id, "BUYER"),
        /only the active Offer/,
        "older Offer must not become agreed after a newer one exists"
      );
      assert.equal(w.requireSp(sp).agreedOfferId, null);
      assert.equal(w.offerById(older.id).items[0].price, 15);
      w.acceptOffer(newer.id, "BUYER");
      assert.equal(w.requireSp(sp).agreedOfferId, newer.id);
      assert.equal(w.requireSp(sp).status, "STABLE");
      return pass(
        "BS-017",
        "Older Offer cannot be accepted once a newer Offer is active; history stays immutable",
        `rejected ${older.id}; agreed=${newer.id}`,
        "I-007 I-011 I-027",
        "close OQ-008: only active Offer is acceptable"
      );
    })
  );

  results.push(
    run("BS-019", () => {
      const split: ProductCatalog = {
        names: { black_bread: "Black Bread", white_bread: "White Bread" },
        availability: [
          { sellerId: "seller-a", productId: "black_bread", quantity: 1, unit: "pcs", price: 8, stock: 0 },
          { sellerId: "seller-a", productId: "white_bread", quantity: 1, unit: "pcs", price: 9, stock: 10 },
          { sellerId: "seller-b", productId: "black_bread", quantity: 1, unit: "pcs", price: 8, stock: 10 },
        ],
      };
      const w = new BasketWorld();
      w.setCatalog(split);
      const list = w.createList("across");
      w.addItem(list.id, {
        productId: "black_bread",
        quantity: 1,
        unit: "pcs",
        alternatives: [
          { productId: "black_bread", alternativePriority: 0 },
          { productId: "white_bread", alternativePriority: 1 },
        ],
      });
      const purchase = w.createPurchaseFromList(list.id, "FIRST_AVAILABLE", ["seller-a", "seller-b"]);
      const bySeller = new Map(
        [...w.sellerPurchases.values()]
          .filter((sp) => purchase.sellerPurchaseIds.includes(sp.id))
          .map((sp) => [sp.sellerId, sp])
      );
      const itemA = bySeller.get("seller-a")?.items[0];
      const itemB = bySeller.get("seller-b")?.items[0];
      assert.equal(itemA?.productId, "black_bread", "seller A must not get a private alternative");
      assert.equal(itemB?.productId, "black_bread");
      assert.equal(itemA?.resolvedFrom, "black_bread");
      assert.equal(itemA?.alternativePriority, 0);
      return pass(
        "BS-019",
        "Resolution is catalog-global and precedes partitioning; not per-seller product choice",
        `A=${itemA?.productId} B=${itemB?.productId} kind=PRIMARY`,
        "I-015",
        "close OQ-006: Resolution before seller partitioning"
      );
    })
  );

  results.push(
    run("BS-022", () => {
      const w = new BasketWorld();
      w.setCatalog(catalog());
      const list = w.createList("sil2");
      w.addItem(list.id, { productId: "tomatoes", quantity: 2, unit: "kg", alternatives: [] });
      const sp = w.createPurchaseFromList(list.id, "PRIMARY_ONLY", ["seller-a"]).sellerPurchaseIds[0];
      w.proposeOffer({
        sellerPurchaseId: sp,
        actor: "SELLER",
        items: tomatoes(2, 15),
        reason: "PRICE_CHANGE",
        validUntil: "2026-01-01T00:00:01.000Z",
      });
      w.advance(10_000);
      w.markWaiting(sp);
      const s = w.requireSp(sp);
      assert.equal(w.isOfferValid(w.lastOffer(sp)!), false);
      assert.notEqual(s.status, "EXPIRED");
      assert.ok(s.waitingSince);
      return pass(
        "BS-022",
        "Expired offer + silence is waiting facts, not auto EXPIRED state",
        `${s.status} offerValid=false`,
        "OQ-011 OPEN"
      );
    })
  );

  return results;
}

export function formatResults(rows: ScenarioResult[]): string {
  const lines = [
    "# GreenMarket — Basket Experiment Results",
    "",
    "**Status:** Evidence from TZ-BASKET-001 mock run  ",
    "**Experiment version:** v0.1  ",
    "**Model version:** v0.1.1 (OQ-006 / OQ-008 closed)",
    "",
    "## Purpose",
    "",
    "Record evidence from the mock domain and seller emulator.",
    "",
    "## Scenario results",
    "",
    "| Scenario | Result | Model issue | Decision |",
    "|---|---|---|---|",
  ];
  for (const row of rows.sort((a, b) => a.id.localeCompare(b.id, undefined, { numeric: true }))) {
    lines.push(`| ${row.id} | ${row.result} | ${row.modelViolation} | ${row.decision} |`);
  }
  lines.push("", "## Scenario records", "");
  for (const row of rows.sort((a, b) => a.id.localeCompare(b.id, undefined, { numeric: true }))) {
    lines.push(`### ${row.id} — ${row.result}`, "");
    lines.push(`- Expected: ${row.expected}`);
    lines.push(`- Actual: ${row.actual}`);
    lines.push(`- Invariant: ${row.invariant}`);
    lines.push(`- Model violation: ${row.modelViolation}`);
    lines.push(`- New concept: ${row.newConcept}`);
    lines.push(`- Workaround: ${row.workaround}`);
    lines.push(`- Decision: ${row.decision}`, "");
  }
  lines.push("## Final decision", "");
  lines.push("```text");
  lines.push("Model version: v0.1.1");
  lines.push("Status: experiment implemented; production architecture not started");
  lines.push("Open questions: OQ-002, OQ-009, OQ-011, OQ-012");
  lines.push("Closed this run: OQ-006 (resolution before partition), OQ-008 (active Offer only)");
  lines.push("Required model changes: acceptOffer rejects non-active Offers (I-027)");
  lines.push("Recommended next step: none in the TZ-BASKET-001…004 ladder");
  lines.push("```");
  lines.push("");
  return lines.join("\n");
}
