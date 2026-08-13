import assert from "node:assert/strict";
import { BasketWorld } from "../domain/world";
import type { ProductCatalog, PurchaseItem } from "../domain/types";
import { createSellerEmulator, buyerOffer } from "../emulator/sellers";
import { resolve } from "../domain/resolution";

export type ScenarioResult = {
  id: string;
  result: "PASS" | "FAIL" | "MODEL GAP" | "WORKAROUND";
  hypothesis: "CONFIRMED" | "OPEN";
  openQuestion: string;
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

type Fact = string | number | boolean | null;

function record(
  id: string,
  expected: string,
  actual: string,
  invariant: string,
  decision = "keep v0.1",
  hypothesis: "CONFIRMED" | "OPEN" = "CONFIRMED",
  openQuestion = "none"
): ScenarioResult {
  return {
    id,
    result: "PASS",
    hypothesis,
    openQuestion,
    expected,
    actual,
    invariant,
    modelViolation: "none",
    newConcept: "none",
    workaround: "none",
    decision,
  };
}

/**
 * The only way a scenario can produce evidence: every expected fact is asserted against a
 * live actual, and the recorded Expected/Actual strings are serialized from those same maps.
 * No scenario writes its own narrative result.
 */
function prove(
  id: string,
  invariant: string,
  expected: Record<string, Fact>,
  actual: Record<string, Fact>,
  decision = "keep v0.1",
  hypothesis: "CONFIRMED" | "OPEN" = "CONFIRMED",
  openQuestion = "none"
): ScenarioResult {
  const keys = Object.keys(expected);
  assert.ok(keys.length > 0, `${id}: prove() requires facts`);
  for (const key of keys) {
    assert.equal(actual[key], expected[key], `${id}.${key}`);
  }
  const fmt = (row: Record<string, Fact>) => keys.map((key) => `${key}=${row[key]}`).join("; ");
  return record(id, fmt(expected), fmt(actual), invariant, decision, hypothesis, openQuestion);
}

function threw(fn: () => unknown, pattern: RegExp): boolean {
  try {
    fn();
    return false;
  } catch (err) {
    return pattern.test(err instanceof Error ? err.message : String(err));
  }
}

function run(id: string, fn: () => ScenarioResult): ScenarioResult {
  try {
    return fn();
  } catch (err) {
    return {
      id,
      result: "FAIL",
      hypothesis: "OPEN",
      openQuestion: "n/a",
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
      return prove(
        "BS-001",
        "I-001 I-002",
        { listItems: 1, purchasesDiffer: true, purchaseListId: list.id },
        {
          listItems: w.lists.get(list.id)?.items.length ?? 0,
          purchasesDiffer: p1.id !== p2.id,
          purchaseListId: p1.listId,
        }
      );
    })
  );

  results.push(
    run("BS-002", () => {
      const w = new BasketWorld();
      w.setCatalog(catalog());
      const list = w.createList("multi");
      w.addItem(list.id, { productId: "tomatoes", quantity: 20, unit: "kg", alternatives: [] });
      const p = w.createPurchaseFromList(list.id, "PRIMARY_ONLY", ["seller-a", "seller-b", "seller-c"]);
      return prove("BS-002", "I-004", { sellerPurchases: 3 }, { sellerPurchases: p.sellerPurchaseIds.length });
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
      return prove(
        "BS-003",
        "I-005 I-020",
        { a: "STABLE", b: "WAITING_BUYER", c: "REJECTED", purchase: "MIXED" },
        {
          a: w.requireSp(a).status,
          b: w.requireSp(b).status,
          c: w.requireSp(c).status,
          purchase: w.derivedPurchaseStatus(p.id),
        }
      );
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
      return prove(
        "BS-004",
        "I-006 I-007",
        { sellerOffers: 8, buyerOffers: 8, everyOfferHasItems: true },
        {
          sellerOffers: sellerOffers.length,
          buyerOffers: w.offers.filter((o) => o.sellerPurchaseId === sp && o.actor === "BUYER").length,
          everyOfferHasItems: w.offers.every((o) => o.items.length > 0),
        }
      );
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
      const originalQty = o1.items[0].quantity;
      try {
        (o1.items[0] as { quantity: number }).quantity = 99;
      } catch {
        /* freeze may throw in strict mode */
      }
      // Historical Offers must be unchanged when re-read through the PUBLIC API after later domain
      // operations — this checks the immutability semantics, not the freezing mechanism.
      w.proposeOffer({ sellerPurchaseId: sp, actor: "SELLER", items: tomatoes(9, 20), reason: "PRICE_CHANGE" });
      const o1Reread = w.offerById(o1.id);
      const o2Reread = w.offerById(o2.id);
      return prove(
        "BS-005",
        "I-006",
        {
          firstPrice: 15,
          secondPrice: 17,
          thirdPrice: 15.5,
          idsDiffer: true,
          firstPriceAfterLaterOps: 15,
          firstQtyAfterLaterOps: 2,
          secondPriceAfterLaterOps: 17,
          qtyAfterMutationAttempt: originalQty,
        },
        {
          firstPrice: o1.items[0].price ?? null,
          secondPrice: o2.items[0].price ?? null,
          thirdPrice: o3.items[0].price ?? null,
          idsDiffer: o1.id !== o2.id,
          firstPriceAfterLaterOps: o1Reread.items[0].price ?? null,
          firstQtyAfterLaterOps: o1Reread.items[0].quantity,
          secondPriceAfterLaterOps: o2Reread.items[0].price ?? null,
          qtyAfterMutationAttempt: o1.items[0].quantity,
        }
      );
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
      return prove(
        "BS-006",
        "I-006",
        { actor: "SYSTEM", reason: "TIME_DISCOUNT", price: 12 },
        { actor: sys?.actor ?? null, reason: sys?.reason ?? null, price: sys?.items[0].price ?? null }
      );
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
      return prove(
        "BS-007",
        "I-017",
        { agreedQty: 6, status: "STABLE" },
        { agreedQty: w.requireSp(sp).items[0].quantity, status: w.requireSp(sp).status }
      );
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
      const composed = w.offers.filter((o) => o.sellerPurchaseId === sp);
      return prove(
        "BS-008",
        "I-007",
        { offers: 3, firstSize: 3, secondSize: 2, thirdSize: 3 },
        {
          offers: composed.length,
          firstSize: composed[0]?.items.length ?? 0,
          secondSize: composed[1]?.items.length ?? 0,
          thirdSize: composed[2]?.items.length ?? 0,
        }
      );
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
      return prove(
        "BS-009",
        "I-014 I-015",
        { kind: "ALTERNATIVE", productId: "white_bread", priority: 1 },
        { kind: result.kind, productId: result.productId, priority: result.alternativePriority }
      );
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
      const chosenPrice = expensive.availability.find((row) => row.productId === result.productId)?.price ?? null;
      return prove(
        "BS-010",
        "I-014",
        { productId: "white_bread", kind: "ALTERNATIVE", chosenPrice: 999, referencePrice: 10 },
        {
          productId: result.productId,
          kind: result.kind,
          chosenPrice,
          referencePrice: item.referencePrice,
        },
        "keep v0.1",
        "OPEN",
        "OQ-002"
      );
    })
  );

  results.push(
    run("BS-011", () => {
      const race: ProductCatalog = {
        names: { tomatoes: "Tomatoes" },
        availability: [{ sellerId: "seller-a", productId: "tomatoes", quantity: 6, unit: "kg", price: 15, stock: 6 }],
      };
      const w = new BasketWorld();
      w.setCatalog(race);
      const listA = w.createList("race-a");
      w.addItem(listA.id, { productId: "tomatoes", quantity: 4, unit: "kg", alternatives: [] });
      const listB = w.createList("race-b");
      w.addItem(listB.id, { productId: "tomatoes", quantity: 3, unit: "kg", alternatives: [] });
      const pa = w.createPurchaseFromList(listA.id, "PRIMARY_ONLY", ["seller-a"]);
      const pb = w.createPurchaseFromList(listB.id, "PRIMARY_ONLY", ["seller-a"]);
      w.proposeOffer({
        sellerPurchaseId: pa.sellerPurchaseIds[0],
        actor: "BUYER",
        items: tomatoes(4, 15),
        reason: "BUYER_CHANGE",
      });
      assert.equal(w.stockConflicts.length, 0, "4 kg alone is within stock=6");
      w.proposeOffer({
        sellerPurchaseId: pb.sellerPurchaseIds[0],
        actor: "BUYER",
        items: tomatoes(3, 15),
        reason: "BUYER_CHANGE",
      });
      const first = w.stockConflicts[0];
      assert.ok(first, "4+3 exceeds stock=6");
      assert.equal(first.detectedAt, "OFFER_CREATION");
      assert.equal(first.combined, 7);
      assert.equal(first.stock, 6);
      assert.equal(w.purchases.size, 2);
      return prove(
        "BS-011",
        "I-025",
        { detectedAt: "OFFER_CREATION", combined: 7, stock: 6 },
        { detectedAt: first.detectedAt, combined: first.combined, stock: first.stock },
        "detection layer only; Allocation remains OQ-016",
        "OPEN",
        "OQ-016"
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
      const expired = w.proposeOffer({
        sellerPurchaseId: sp,
        actor: "SELLER",
        items: tomatoes(2, 15),
        reason: "PRICE_CHANGE",
        validUntil: "2026-01-01T00:00:01.000Z",
      });
      w.advance(5_000);
      assert.equal(w.isOfferValid(expired), false);
      assert.throws(() => w.acceptOffer(expired.id, "BUYER"), /expired/);
      assert.equal(w.acceptances.length, 0);
      assert.equal(w.requireSp(sp).agreedOfferId, null);

      // I-035: countering an expired Offer is forbidden, symmetric with acceptOffer (I-028);
      // replacing it requires an explicit new proposal with a non-counter reason (below).
      const counterOverExpiredRejected = threw(
        () =>
          w.proposeOffer({
            sellerPurchaseId: sp,
            actor: "BUYER",
            items: tomatoes(2, 14),
            reason: "BUYER_CHANGE",
          }),
        /I-035|expired/
      );
      assert.equal(counterOverExpiredRejected, true);

      const live = w.proposeOffer({
        sellerPurchaseId: sp,
        actor: "SELLER",
        items: tomatoes(2, 15),
        reason: "PRICE_CHANGE",
        validUntil: "2026-01-01T00:00:10.000Z",
      });
      w.acceptOffer(live.id, "BUYER");
      assert.equal(w.requireSp(sp).status, "STABLE");
      w.advance(5_000);
      assert.equal(w.isOfferValid(live), false);
      assert.equal(w.requireSp(sp).status, "STABLE");
      assert.notEqual(w.requireSp(sp).status, "EXPIRED");
      return prove(
        "BS-012",
        "I-026 I-028",
        { laterStatus: "STABLE", laterOfferValid: false, agreedIsLive: true, counterOverExpiredRejected: true },
        {
          laterStatus: w.requireSp(sp).status,
          laterOfferValid: w.isOfferValid(live),
          agreedIsLive: w.requireSp(sp).agreedOfferId === live.id,
          counterOverExpiredRejected,
        },
        "domain does not auto-drop STABLE on agreed expiry (OQ-009 OPEN)",
        "OPEN",
        "OQ-009"
      );
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
      return prove(
        "BS-013",
        "I-026",
        { status: "WAITING_SELLER", hasWaitingSince: true },
        { status: s.status, hasWaitingSince: Boolean(s.waitingSince) },
        "keep v0.1",
        "OPEN",
        "OQ-012"
      );
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
      const beforeFulfillment = w.requireSp(sp).status;
      w.mockFulfill(sp, 5);
      return prove(
        "BS-014",
        "I-018 I-019 I-024",
        { beforeFulfillment: "STABLE", afterFulfillment: "STABLE", agreedQty: 20, actualQty: 5 },
        {
          beforeFulfillment,
          afterFulfillment: w.requireSp(sp).status,
          agreedQty: w.requireSp(sp).items[0].quantity,
          actualQty: w.fulfillments[0].actualQuantity,
        }
      );
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
      return prove(
        "BS-015",
        "I-002",
        { listName: "reuse", purchasesDiffer: true, sameList: true },
        {
          listName: w.lists.get(list.id)?.name ?? null,
          purchasesDiffer: p101.id !== p102.id,
          sameList: p101.listId === p102.listId,
        }
      );
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
      return prove(
        "BS-016",
        "I-022 I-023",
        {
          agreedOffer: o18.id,
          agreedPrice: 15,
          currentOffer: o19.id,
          currentPrice: 12,
          pending: 1,
          historyPrice: 15,
        },
        {
          agreedOffer: snap.agreed.offerId,
          agreedPrice: snap.agreed.items[0].price ?? null,
          currentOffer: snap.current.offerId,
          currentPrice: snap.current.items[0].price ?? null,
          pending: snap.pendingSubstitutions.length,
          historyPrice: w.offerById(o18.id).items[0].price ?? null,
        }
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
      return prove(
        "BS-018",
        "I-012",
        { replacement: "baguette", status: "PROPOSED", agreedOfferId: null },
        {
          replacement: sub.replacementProductId,
          status: sub.status,
          agreedOfferId: w.requireSp(sp).agreedOfferId,
        }
      );
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
      return prove(
        "BS-020",
        "I-005",
        { aPrice: 15, bPrice: 99 },
        { aPrice: w.lastOffer(a)?.items[0].price ?? null, bPrice: w.lastOffer(b)?.items[0].price ?? null }
      );
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
      return prove(
        "BS-021",
        "I-011",
        { activeOfferId: neu.id, expiredStillValid: false, activeValid: true },
        {
          activeOfferId: w.requireSp(sp).activeOfferId,
          expiredStillValid: w.isOfferValid(old),
          activeValid: w.isOfferValid(neu),
        },
        "keep v0.1",
        "OPEN",
        "OQ-009"
      );
    })
  );

  results.push(
    run("BS-023", () => {
      const race: ProductCatalog = {
        names: { tomatoes: "Tomatoes" },
        availability: [{ sellerId: "seller-a", productId: "tomatoes", quantity: 6, unit: "kg", price: 15, stock: 6 }],
      };
      const w = new BasketWorld();
      w.setCatalog(race);
      const listA = w.createList("prom-a");
      w.addItem(listA.id, { productId: "tomatoes", quantity: 4, unit: "kg", alternatives: [] });
      const listB = w.createList("prom-b");
      w.addItem(listB.id, { productId: "tomatoes", quantity: 3, unit: "kg", alternatives: [] });
      const p1 = w.createPurchaseFromList(listA.id, "PRIMARY_ONLY", ["seller-a"]);
      const p2 = w.createPurchaseFromList(listB.id, "PRIMARY_ONLY", ["seller-a"]);
      const o1 = w.proposeOffer({
        sellerPurchaseId: p1.sellerPurchaseIds[0],
        actor: "SELLER",
        items: tomatoes(4, 15),
        reason: "SELLER_COUNTEROFFER",
      });
      const o2 = w.proposeOffer({
        sellerPurchaseId: p2.sellerPurchaseIds[0],
        actor: "SELLER",
        items: tomatoes(3, 15),
        reason: "SELLER_COUNTEROFFER",
      });
      w.acceptOffer(o1.id, "BUYER");
      w.acceptOffer(o2.id, "BUYER");
      assert.equal(w.requireSp(p1.sellerPurchaseIds[0]).status, "STABLE");
      assert.equal(w.requireSp(p2.sellerPurchaseIds[0]).status, "STABLE");
      const first = w.stockConflicts.find((c) => c.detectedAt === "OFFER_CREATION");
      assert.ok(first, "first detection at OFFER_CREATION");
      assert.equal(first.stock, 6);
      assert.equal(first.combined, 7);
      assert.equal(o1.items[0].quantity, 4);
      assert.equal(o2.items[0].quantity, 3);
      assert.equal(first.requested, 3);
      assert.equal(w.fulfillments.length, 0, "no Allocation/Reservation/fulfillment entity");

      const w2 = new BasketWorld();
      w2.setCatalog(race);
      const listA2 = w2.createList("claim-a");
      w2.addItem(listA2.id, { productId: "tomatoes", quantity: 4, unit: "kg", alternatives: [] });
      const listB2 = w2.createList("claim-b");
      w2.addItem(listB2.id, { productId: "tomatoes", quantity: 3, unit: "kg", alternatives: [] });
      const aSp = w2.createPurchaseFromList(listA2.id, "PRIMARY_ONLY", ["seller-a"]).sellerPurchaseIds[0];
      const bSp = w2.createPurchaseFromList(listB2.id, "PRIMARY_ONLY", ["seller-a"]).sellerPurchaseIds[0];
      const agreed4 = w2.proposeOffer({
        sellerPurchaseId: aSp,
        actor: "SELLER",
        items: tomatoes(4, 15),
        reason: "SELLER_COUNTEROFFER",
      });
      w2.acceptOffer(agreed4.id, "BUYER");
      w2.proposeOffer({
        sellerPurchaseId: aSp,
        actor: "SELLER",
        items: tomatoes(7, 15),
        reason: "SELLER_COUNTEROFFER",
      });
      assert.equal(w2.requireSp(aSp).agreedOfferId, agreed4.id);
      assert.notEqual(w2.requireSp(aSp).activeOfferId, agreed4.id);
      w2.proposeOffer({
        sellerPurchaseId: bSp,
        actor: "SELLER",
        items: tomatoes(3, 15),
        reason: "SELLER_COUNTEROFFER",
      });
      const againstActive = w2.stockConflicts.find((c) => c.detectedAt === "OFFER_CREATION" && c.combined === 10);
      assert.ok(againstActive, "claim is active qty 7, not agreed qty 4: 3+7=10");
      assert.equal(againstActive.stock, 6);
      assert.equal(againstActive.requested, 3);

      return prove(
        "BS-023",
        "I-025",
        {
          aStatus: "STABLE",
          bStatus: "STABLE",
          firstAt: "OFFER_CREATION",
          stock: 6,
          combined: 7,
          activeClaimCombined: 10,
          fulfillments: 0,
        },
        {
          aStatus: w.requireSp(p1.sellerPurchaseIds[0]).status,
          bStatus: w.requireSp(p2.sellerPurchaseIds[0]).status,
          firstAt: first.detectedAt,
          stock: first.stock,
          combined: first.combined,
          activeClaimCombined: againstActive.combined,
          fulfillments: w.fulfillments.length,
        },
        "detection-event log only; Allocation/Reservation remain OQ-016",
        "OPEN",
        "OQ-016"
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
      return prove(
        "BS-024",
        "I-010 I-011",
        { agreedOfferId: o18.id, activeOfferId: o19.id },
        { agreedOfferId: w.requireSp(sp).agreedOfferId, activeOfferId: w.requireSp(sp).activeOfferId }
      );
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
      const reReject = threw(() => w.rejectSubstitution(sub.id), /already ACCEPTED/);
      return prove(
        "BS-025",
        "I-013 I-022 I-032",
        { subStatus: "ACCEPTED", offerAfterSubstitution: "SUBSTITUTION", reversalRejected: true },
        {
          subStatus: w.substitutions[0].status,
          offerAfterSubstitution: w.lastOffer(sp)?.reason ?? null,
          reversalRejected: reReject,
        }
      );
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
      return prove(
        "BS-026",
        "I-026",
        { offerValid: true, status: "WAITING_SELLER" },
        { offerValid: w.isOfferValid(w.lastOffer(sp)!), status: w.requireSp(sp).status }
      );
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
      return prove(
        "BS-027",
        "I-014",
        { firstProductId: "white_bread", firstKind: "ALTERNATIVE", askRequiresBuyer: true },
        {
          firstProductId: first.productId,
          firstKind: first.kind,
          askRequiresBuyer: ask.requiresBuyerDecision,
        },
        "keep v0.1",
        "OPEN",
        "OQ-001"
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
      const after = w.requireSp(sp);

      const w2 = new BasketWorld();
      w2.setCatalog({
        names: { tomatoes: "Tomatoes" },
        availability: [{ sellerId: "seller-a", productId: "tomatoes", quantity: 20, unit: "kg", price: 15, stock: 5 }],
      });
      const list2 = w2.createList("stock-drop");
      w2.addItem(list2.id, { productId: "tomatoes", quantity: 20, unit: "kg", alternatives: [] });
      const sp2 = w2.createPurchaseFromList(list2.id, "PRIMARY_ONLY", ["seller-a"]).sellerPurchaseIds[0];
      const emu2 = createSellerEmulator("seller-a", "PartialAvailabilitySeller");
      buyerOffer(w2, sp2, tomatoes(20, 15));
      emu2.respondToBuyerOffer(w2, sp2, tomatoes(20, 15));
      const offered5 = w2.lastOffer(sp2, "SELLER")!;
      assert.equal(offered5.items[0].quantity, 5);
      w2.setStock("seller-a", "tomatoes", 2);
      emu2.tick(w2, sp2);
      const afterDrop = w2.lastOffer(sp2, "SELLER")!;
      assert.notEqual(afterDrop.id, offered5.id);
      assert.equal(offered5.items[0].quantity, 5);

      return prove(
        "BS-028",
        "I-017",
        { activeQty: 5, agreedQty: 5, status: "STABLE", afterStockDropQty: 2, originalOfferUnchanged: 5 },
        {
          activeQty: w.offerById(after.activeOfferId!).items[0].quantity,
          agreedQty: w.offerById(after.agreedOfferId!).items[0].quantity,
          status: after.status,
          afterStockDropQty: afterDrop.items[0].quantity,
          originalOfferUnchanged: offered5.items[0].quantity,
        }
      );
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
      const activeAfterNewer = w.requireSp(sp).activeOfferId;
      const olderRejected = threw(() => w.acceptOffer(older.id, "BUYER"), /only the active Offer/);
      const agreedAfterAttempt = w.requireSp(sp).agreedOfferId;
      const olderPrice = w.offerById(older.id).items[0].price ?? null;
      w.acceptOffer(newer.id, "BUYER");
      return prove(
        "BS-017",
        "I-007 I-011 I-027",
        {
          activeAfterNewer: newer.id,
          olderRejected: true,
          agreedAfterAttempt: null,
          olderPrice: 15,
          agreedFinal: newer.id,
          status: "STABLE",
        },
        {
          activeAfterNewer,
          olderRejected,
          agreedAfterAttempt,
          olderPrice,
          agreedFinal: w.requireSp(sp).agreedOfferId,
          status: w.requireSp(sp).status,
        },
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
      assert.equal(itemA, undefined, "seller A has no stock of the globally resolved primary");
      assert.equal(itemB?.productId, "black_bread");
      assert.equal(itemB?.resolvedFrom, "black_bread");
      assert.equal(itemB?.alternativePriority, 0);
      return prove(
        "BS-019",
        "I-015",
        { sellerA: "none", sellerB: "black_bread" },
        { sellerA: itemA?.productId ?? "none", sellerB: itemB?.productId ?? "none" },
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
      return prove(
        "BS-022",
        "I-026",
        { offerValid: false, status: "WAITING_SELLER", hasWaitingSince: true },
        {
          offerValid: w.isOfferValid(w.lastOffer(sp)!),
          status: s.status,
          hasWaitingSince: Boolean(s.waitingSince),
        },
        "keep v0.1",
        "OPEN",
        "OQ-011"
      );
    })
  );

  return results;
}

export function formatResults(rows: ScenarioResult[]): string {
  const lines = [
    "# GreenMarket — Basket Experiment Results",
    "",
    "**Status:** Evidence from TZ-BASKET-001…004 mock run  ",
    "**Experiment version:** v0.1  ",
    "**Model version:** v0.1.10 (substitution content + policy in basis; semantic rejectReason validation; full-field COUNTER guard; matrix verifies apply end state; OQ-009 assumption pinned)",
    "",
    "## How to read results",
    "",
    "- **Impl `PASS`** — the mock matches the current experimental expectation (code + invariants in force).",
    "- **Domain `CONFIRMED`** — the scenario closes or supports a *specific tested invariant*, not an entire future subsystem (e.g. Allocation).",
    "- **Domain `OPEN`** — implementation is deterministic, but the business semantics are still an open question (see `openQuestion`).",
    "- Do not treat Impl PASS as confirmation of an unresolved OQ.",
    "- Expected/Actual are serialized from the fact map `prove()` asserted on live world state. A scenario cannot record a hand-written result: `prove()` is the only evidence builder.",
    "- All 28 scenarios are programmatically exercised; Domain OPEN rows are still run, not skipped.",
    "",
    "## Purpose",
    "",
    "Record evidence from the mock domain and seller emulator.",
    "",
    "## Scenario results",
    "",
    "| Scenario | Impl | Domain | Model issue | Decision |",
    "|---|---|---|---|---|",
  ];
  for (const row of rows.sort((a, b) => a.id.localeCompare(b.id, undefined, { numeric: true }))) {
    const domain = row.hypothesis === "OPEN" ? `OPEN (${row.openQuestion})` : "CONFIRMED";
    lines.push(`| ${row.id} | ${row.result} | ${domain} | ${row.modelViolation} | ${row.decision} |`);
  }
  lines.push("", "## Scenario records", "");
  for (const row of rows.sort((a, b) => a.id.localeCompare(b.id, undefined, { numeric: true }))) {
    const domain = row.hypothesis === "OPEN" ? `OPEN (${row.openQuestion})` : "CONFIRMED";
    lines.push(`### ${row.id} — Impl ${row.result} / Domain ${domain}`, "");
    lines.push(`- Expected: ${row.expected}`);
    lines.push(`- Actual: ${row.actual}`);
    lines.push(`- Invariant: ${row.invariant}`);
    lines.push(`- Hypothesis: ${row.hypothesis}`);
    lines.push(`- Open question: ${row.openQuestion}`);
    lines.push(`- Model violation: ${row.modelViolation}`);
    lines.push(`- New concept: ${row.newConcept}`);
    lines.push(`- Workaround: ${row.workaround}`);
    lines.push(`- Decision: ${row.decision}`, "");
  }
  lines.push("## Final decision", "");
  lines.push("```text");
  lines.push("Model version: v0.1.10");
  lines.push("Status: experiment implemented; production architecture not started");
  lines.push("");
  lines.push("Scope of this evidence: every CONFIRMED below confirms a SPECIFIC experimental behavior");
  lines.push("under the mock clock, mock catalog and example policies — NOT the basket model as a whole.");
  lines.push("The model as a whole cannot be declared confirmed while expiration/silence/stock-allocation");
  lines.push("questions (OQ-009, OQ-011, OQ-012, OQ-016) remain open.");
  lines.push("");
  lines.push("Changes in this PR (already implemented and tested):");
  lines.push("- I-033: BasketWorld hands out frozen projections; state changes only via domain commands");
  lines.push("- I-030: List and catalog inputs validated like Offer items (finite, > 0 / ≥ 0)");
  lines.push("- I-032: Substitution lifecycle PROPOSED → ACCEPTED|REJECTED is one-way");
  lines.push("- I-034: setCatalog stores a defensive copy; stock changes go through setStock");
  lines.push("- I-031: (sellerId, productId) unique inside a SellerPurchase");
  lines.push("- I-019: mockFulfill checks delivered quantity and honours partialFulfillmentAllowed");
  lines.push("- Advice is a discriminated union naming its exact target (offerId / substitutionId / counterOfferId + items)");
  lines.push("- AdviceBasis is time-aware (active Offer validity) and covers Offer content + catalog rows of the negotiated products (canonical JSON)");
  lines.push("- WAIT and REJECT both carry machine-readable reasons");
  lines.push("- COUNTER is admissible only against the still-valid countered Offer and may change prices, not lines");
  lines.push("- every Offer named by an Advice must belong to the target SellerPurchase (checked at the assistant boundary, and inside basis fingerprints)");
  lines.push("- catalog reference / baseline is a lookup, not a price policy: ambiguous rows (same line, different prices) yield NO reference instead of the cheapest one");
  lines.push("- REJECT is generated by the assistants themselves via policy thresholds (rejectOverReference / rejectBelowCatalog), not only crafted by hand");
  lines.push("- the positive substitution-vs-offer choice is a policy parameter (substitutionPreference), both branches tested");
  lines.push("- AdviceBasis fingerprints pending substitutions with CONTENT (not only IDs) and records the effective policy as an audit fact");
  lines.push("- rejectReason is validated semantically at apply: a REJECT may not claim a ground (substitution, unavailability, priced offer) that does not exist");
  lines.push("- the COUNTER guard compares every item field except price, so future PurchaseItem fields are protected automatically");
  lines.push("- OQ-009 assumption pinned by test: an expired agreed Offer still provides the price baseline; validUntil gates the ACTIVE Offer only");
  lines.push("- combination matrix test: multi-item x missing catalog x substitution x expired x offer author x advisor — kind invariants, determinism, and the SEMANTIC end state after apply for every combination");
  lines.push("- ACCEPT_SUBSTITUTION requires the accepting actor to be the counterparty of proposedBy");
  lines.push("- I-035: countering an expired Offer is forbidden in the domain (symmetric with I-028)");
  lines.push("- Buyer/Seller assistants evaluate EVERY Offer item; baselines and catalog references are per (product, unit, quantity) line");
  lines.push("- Policies are injected parameters, not fixed behavior");
  lines.push("- Seller emulators only rewrite their own proposals, never a buyer Offer");
  lines.push("- I-027: acceptOffer rejects non-active Offers");
  lines.push("- I-028: acceptOffer rejects expired Offers");
  lines.push("- OQ-007 closed: activeOfferId is a required projection pointer");
  lines.push("- OQ-006 / OQ-008 closed");
  lines.push("- PartialAvailabilitySeller offers min(requested, stock)");
  lines.push("- Stock race records combined claims (stock=6, A→4, B→3) at OFFER_CREATION");
  lines.push("- stock claim = valid active Offer quantity; REJECTED/CANCELLED/expired excluded");
  lines.push("- I-029: only the counterparty may accept an Offer");
  lines.push("- Offer items: quantity > 0, finite price/qty; applyAdvice requires matching snapshot basis");
  lines.push("- TZ-001…004 ship as four dependent PRs (domain → assistants → runtime → /sim), each with its own runner");
  lines.push("- removed duplicate SellerPurchase.rejected; REJECTED is FSM status only");
  lines.push("");
  lines.push("Still open after this experiment (future domain work, not blockers for TZ-001…004):");
  lines.push("- OQ-001, OQ-002 — resolution / price policy");
  lines.push("- OQ-009 — pointer/status when an *already agreed* Offer later expires without a replacement");
  lines.push("- OQ-011, OQ-012 — silence / waiting facts");
  lines.push("");
  lines.push("Known dependency: the assistant layer uses Offer validity (isOfferValid) in its decisions and");
  lines.push("in AdviceBasis, while OQ-009 (agreed-Offer expiration) is still open. Assistant semantics for");
  lines.push("that case is therefore an ASSUMPTION and must be revisited when OQ-009 is resolved.");
  lines.push("");
  lines.push("No new domain concepts required. Existing model required several invariant/behavior corrections.");
  lines.push("IMPORTANT: the model is NOT final. Implementation PASS here does not close the open OQs above;");
  lines.push("OQ-009/OQ-011/OQ-012 (agreed-Offer expiration, silence semantics) must be resolved before the");
  lines.push("model is transferred to production architecture. The assistant layer is validated against ONE");
  lines.push("deterministic example policy family: this PR proves the Advice/basis/apply contract is executable");
  lines.push("and safe for THAT family — it does NOT prove the contract sufficient for arbitrary LLM/real");
  lines.push("policies. 'Policy-agnostic' refers to the contract shape (injected parameters), not to evidence.");
  lines.push("Recommended next step: resolve OQ-009/OQ-011/OQ-012 as a separate domain iteration");
  lines.push("```");
  lines.push("");
  return lines.join("\n");
}
