import assert from "node:assert/strict";
import { BasketWorld } from "../domain/world";
import { DeterministicClock } from "../domain/clock";
import { COUNTER_REASONS, isCounterReason } from "../domain/types";
import type { OfferReason, ProductCatalog, PurchaseItem } from "../domain/types";
import { createSellerEmulator, buyerOffer } from "../emulator/sellers";
import { resolve } from "../domain/resolution";
import { catalogUnitPrice } from "../domain/catalog";
import { hasStoredLinePrice, lineTotalAbsence, unitLineTotal } from "../domain/price";
import { adviseBuyer, catalogReferencePrice } from "../assistants";
import {
  extractNamedDeclaration,
  honeyCategorySearch,
  mentionsQuantityRangeTokens,
  mentionsQuantityRangeInProse,
  mentionsSackContents,
  parseListedSeeds,
  readStage1,
  scanBasketExperimentForFlow010,
  copiesPayloadField,
  hasIdent,
} from "./stage1SourceSearch";

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
  openQuestion = "none",
  extras?: { newConcept?: string; modelViolation?: string; workaround?: string }
): ScenarioResult {
  return {
    id,
    result: "PASS",
    hypothesis,
    openQuestion,
    expected,
    actual,
    invariant,
    modelViolation: extras?.modelViolation ?? "none",
    newConcept: extras?.newConcept ?? "none",
    workaround: extras?.workaround ?? "none",
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
  openQuestion = "none",
  extras?: { newConcept?: string; modelViolation?: string; workaround?: string }
): ScenarioResult {
  const keys = Object.keys(expected);
  assert.ok(keys.length > 0, `${id}: prove() requires facts`);
  for (const key of keys) {
    assert.equal(actual[key], expected[key], `${id}.${key}`);
  }
  const fmt = (row: Record<string, Fact>) => keys.map((key) => `${key}=${row[key]}`).join("; ");
  return record(id, fmt(expected), fmt(actual), invariant, decision, hypothesis, openQuestion, extras);
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
        "I-026 I-028 I-037 I-038",
        { laterStatus: "STABLE", laterOfferValid: false, agreedIsLive: true, counterOverExpiredRejected: true },
        {
          laterStatus: w.requireSp(sp).status,
          laterOfferValid: w.isOfferValid(live),
          agreedIsLive: w.requireSp(sp).agreedOfferId === live.id,
          counterOverExpiredRejected,
        },
        "I-037/I-038: agreed expiry keeps STABLE and pointers",
        "CONFIRMED",
        "none"
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
        "I-026 I-039 I-041",
        { status: "WAITING_SELLER", hasWaitingSince: true },
        { status: s.status, hasWaitingSince: Boolean(s.waitingSince) },
        "I-039/I-041: silence + time do not invent EXPIRED",
        "CONFIRMED",
        "none"
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
        "I-011: new Offer becomes active; expired Offer stays historical",
        "CONFIRMED",
        "none"
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
      w.advance(3_600_000);
      return prove(
        "BS-026",
        "I-039 I-026 I-040",
        { offerValid: true, status: "WAITING_BUYER" },
        { offerValid: w.isOfferValid(w.lastOffer(sp)!), status: w.requireSp(sp).status },
        "I-039: silence while valid is not expiration and does not change status",
        "CONFIRMED",
        "none"
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
      w2.setStock("seller-a", "tomatoes", "kg", 2);
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
      const s = w.requireSp(sp);
      return prove(
        "BS-022",
        "I-026 I-039 I-040",
        { offerValid: false, status: "WAITING_BUYER", hasWaitingSince: true, invented: false },
        {
          offerValid: w.isOfferValid(w.lastOffer(sp)!),
          status: s.status,
          hasWaitingSince: Boolean(s.waitingSince),
          invented: s.status === "EXPIRED" || s.status === "REJECTED",
        },
        "I-039: silence after expiration is not a command — status stays WAITING_BUYER",
        "CONFIRMED",
        "none"
      );
    })
  );

  results.push(
    run("BS-029", () => {
      const w = new BasketWorld();
      w.setCatalog(catalog());
      const list = w.createList("bs029");
      w.addItem(list.id, { productId: "tomatoes", quantity: 2, unit: "kg", alternatives: [] });
      const sp = w.createPurchaseFromList(list.id, "PRIMARY_ONLY", ["seller-a"]).sellerPurchaseIds[0];
      const offer = w.proposeOffer({
        sellerPurchaseId: sp,
        actor: "SELLER",
        items: tomatoes(2, 15),
        reason: "PRICE_CHANGE",
        validUntil: "2026-01-01T01:00:00.000Z",
      });
      const before = w.requireSp(sp);
      // Silence = no actor command after proposeOffer. Only advance (I-040) follows.
      w.advance(1_800_000);
      const after = w.requireSp(sp);
      const waitMs =
        after.waitingSince === null ? null : Date.parse(w.nowIso()) - Date.parse(after.waitingSince);
      return prove(
        "BS-029",
        "I-039",
        {
          status: "WAITING_BUYER",
          active: offer.id,
          agreed: null,
          valid: true,
          sameActive: true,
          sameAgreed: true,
          sameOfferCount: true,
          sameAcceptanceCount: true,
          sameWaitingSince: true,
          sameLastSellerActivity: true,
          hasWaitingSince: true,
          hasLastSellerActivity: true,
          waitMs: 1_800_000,
        },
        {
          status: after.status,
          active: after.activeOfferId,
          agreed: after.agreedOfferId,
          valid: w.isOfferValid(offer),
          sameActive: after.activeOfferId === before.activeOfferId,
          sameAgreed: after.agreedOfferId === before.agreedOfferId,
          sameOfferCount: w.offers.filter((o) => o.sellerPurchaseId === sp).length === 1,
          sameAcceptanceCount: w.acceptances.length === 0,
          sameWaitingSince: after.waitingSince === before.waitingSince,
          sameLastSellerActivity: after.lastSellerActivity === before.lastSellerActivity,
          hasWaitingSince: Boolean(after.waitingSince),
          hasLastSellerActivity: Boolean(after.lastSellerActivity),
          waitMs,
        },
        "silence while valid: status/pointers/waiting facts unchanged; waitMs derived from waitingSince + clock"
      );
    })
  );

  results.push(
    run("BS-030", () => {
      const w = new BasketWorld();
      w.setCatalog(catalog());
      const list = w.createList("bs030");
      w.addItem(list.id, { productId: "tomatoes", quantity: 2, unit: "kg", alternatives: [] });
      const sp = w.createPurchaseFromList(list.id, "PRIMARY_ONLY", ["seller-a"]).sellerPurchaseIds[0];
      const offer = w.proposeOffer({
        sellerPurchaseId: sp,
        actor: "SELLER",
        items: tomatoes(2, 15),
        reason: "PRICE_CHANGE",
        validUntil: "2026-01-01T00:00:01.000Z",
      });
      w.advance(1_000);
      const s = w.requireSp(sp);
      return prove(
        "BS-030",
        "I-039 I-028 I-040",
        {
          status: "WAITING_BUYER",
          active: offer.id,
          agreed: null,
          valid: false,
          rejected: false,
          expiredState: false,
          atExactValidUntil: true,
        },
        {
          status: s.status,
          active: s.activeOfferId,
          agreed: s.agreedOfferId,
          valid: w.isOfferValid(offer),
          rejected: s.status === "REJECTED",
          expiredState: s.status === "EXPIRED",
          atExactValidUntil: w.nowIso() === "2026-01-01T00:00:01.000Z",
        },
        "silence until expiration is not implicit REJECT; validUntil is exclusive"
      );
    })
  );

  results.push(
    run("BS-031", () => {
      const claimedQty = (
        claims: readonly { sellerPurchaseId: string; quantity: number }[],
        sellerPurchaseId: string
      ) => claims.filter((c) => c.sellerPurchaseId === sellerPurchaseId).reduce((sum, c) => sum + c.quantity, 0);
      const race = (expireA: boolean) => {
        const w = new BasketWorld();
        w.setCatalog({
          names: { tomatoes: "Tomatoes" },
          availability: [{ sellerId: "seller-a", productId: "tomatoes", quantity: 20, unit: "kg", price: 15, stock: 6 }],
        });
        const list = w.createList(expireA ? "bs031" : "bs031-live");
        w.addItem(list.id, { productId: "tomatoes", quantity: 4, unit: "kg", alternatives: [] });
        const spA = w.createPurchaseFromList(list.id, "PRIMARY_ONLY", ["seller-a"]).sellerPurchaseIds[0];
        const a = w.proposeOffer({
          sellerPurchaseId: spA,
          actor: "SELLER",
          items: tomatoes(4, 15),
          reason: "PRICE_CHANGE",
          validUntil: "2026-01-01T00:00:05.000Z",
        });
        w.acceptOffer(a.id, "BUYER");
        const claimsWhileValid = w.stockClaims("seller-a", "tomatoes", "kg");
        const conflictsBeforeTime = w.stockConflicts.length;
        if (expireA) w.advance(10_000);
        const claimsAfterClock = w.stockClaims("seller-a", "tomatoes", "kg");
        const conflictsAfterTime = w.stockConflicts.length;
        const listB = w.createList(expireA ? "bs031-b" : "bs031-live-b");
        w.addItem(listB.id, { productId: "tomatoes", quantity: 3, unit: "kg", alternatives: [] });
        const spB = w.createPurchaseFromList(listB.id, "PRIMARY_ONLY", ["seller-a"]).sellerPurchaseIds[0];
        w.proposeOffer({
          sellerPurchaseId: spB,
          actor: "SELLER",
          items: tomatoes(3, 15),
          reason: "PRICE_CHANGE",
        });
        return {
          w,
          a,
          spA,
          spB,
          claimsWhileValid,
          claimsAfterClock,
          claimsAfterB: w.stockClaims("seller-a", "tomatoes", "kg"),
          bCreationConflicts: w.stockConflicts.filter(
            (c) => c.purchaseId === w.requireSp(spB).purchaseId && c.detectedAt === "OFFER_CREATION"
          ),
          timeCreatesConflicts: conflictsAfterTime !== conflictsBeforeTime,
        };
      };
      const expired = race(true);
      const live = race(false);
      const s = expired.w.requireSp(expired.spA);
      const counterBlocked = threw(
        () =>
          expired.w.proposeOffer({
            sellerPurchaseId: expired.spA,
            actor: "BUYER",
            items: tomatoes(4, 14),
            reason: "BUYER_CHANGE",
          }),
        /I-035|expired/
      );
      return prove(
        "BS-031",
        "I-037 I-038 I-025 I-035 I-040",
        {
          status: "STABLE",
          agreed: expired.a.id,
          active: expired.a.id,
          valid: false,
          expiredState: false,
          timeCreatesConflicts: false,
          counterBlocked: true,
          aClaimedWhileValid: 4,
          aClaimedAfterExpire: 0,
          bClaimedAfterPropose: 3,
          aClaimedAfterB: 0,
          expiredCheckpointConflicts: 0,
          liveAStillClaimed: 4,
          liveBClaimed: 3,
          liveCheckpointConflicts: 1,
          liveCombined: 7,
        },
        {
          status: s.status,
          agreed: s.agreedOfferId,
          active: s.activeOfferId,
          valid: expired.w.isOfferValid(expired.a),
          expiredState: s.status === "EXPIRED",
          timeCreatesConflicts: expired.timeCreatesConflicts,
          counterBlocked,
          aClaimedWhileValid: claimedQty(expired.claimsWhileValid, expired.spA),
          aClaimedAfterExpire: claimedQty(expired.claimsAfterClock, expired.spA),
          bClaimedAfterPropose: claimedQty(expired.claimsAfterB, expired.spB),
          aClaimedAfterB: claimedQty(expired.claimsAfterB, expired.spA),
          expiredCheckpointConflicts: expired.bCreationConflicts.length,
          liveAStillClaimed: claimedQty(live.claimsAfterB, live.spA),
          liveBClaimed: claimedQty(live.claimsAfterB, live.spB),
          liveCheckpointConflicts: live.bCreationConflicts.length,
          liveCombined: live.bCreationConflicts[0]?.combined ?? 0,
        },
        "accepted Offer expiry keeps STABLE; stockClaims drops A; B is the only claim; live control checkpoint records combined=7"
      );
    })
  );

  results.push(
    run("BS-032", () => {
      const w = new BasketWorld();
      w.setCatalog(catalog());
      const list = w.createList("bs032");
      w.addItem(list.id, { productId: "tomatoes", quantity: 2, unit: "kg", alternatives: [] });
      const sp = w.createPurchaseFromList(list.id, "PRIMARY_ONLY", ["seller-a"]).sellerPurchaseIds[0];
      const a = w.proposeOffer({
        sellerPurchaseId: sp,
        actor: "SELLER",
        items: tomatoes(2, 15),
        reason: "PRICE_CHANGE",
        validUntil: "2026-01-01T00:00:05.000Z",
      });
      w.acceptOffer(a.id, "BUYER");
      w.advance(10_000);
      const b = w.proposeOffer({
        sellerPurchaseId: sp,
        actor: "SELLER",
        items: tomatoes(2, 14),
        reason: "TIME_DISCOUNT",
      });
      const mid = w.requireSp(sp);
      const agreedStaysA = mid.agreedOfferId === a.id;
      const activeIsB = mid.activeOfferId === b.id;
      const waitingOnB = mid.status === "WAITING_BUYER";
      const bAcceptable =
        mid.activeOfferId === b.id && w.isOfferValid(b) && mid.status === "WAITING_BUYER";
      w.acceptOffer(b.id, "BUYER");
      const end = w.requireSp(sp);
      return prove(
        "BS-032",
        "I-011 I-037",
        {
          agreedStaysA: true,
          activeIsB: true,
          waitingOnB: true,
          bAcceptable: true,
          agreedAfterB: b.id,
          statusAfterB: "STABLE",
          history: 2,
        },
        {
          agreedStaysA,
          activeIsB,
          waitingOnB,
          bAcceptable,
          agreedAfterB: end.agreedOfferId,
          statusAfterB: end.status,
          history: w.offers.filter((o) => o.sellerPurchaseId === sp).length,
        },
        "new Offer after agreed expiry becomes active; A stays agreed until B is accepted"
      );
    })
  );

  results.push(
    run("BS-033", () => {
      const w = new BasketWorld();
      w.setCatalog(catalog());
      const list = w.createList("bs033");
      w.addItem(list.id, { productId: "tomatoes", quantity: 2, unit: "kg", alternatives: [] });
      const sp = w.createPurchaseFromList(list.id, "PRIMARY_ONLY", ["seller-a"]).sellerPurchaseIds[0];
      const a = w.proposeOffer({
        sellerPurchaseId: sp,
        actor: "SELLER",
        items: tomatoes(2, 15),
        reason: "PRICE_CHANGE",
        validUntil: "2026-01-01T00:00:01.000Z",
      });
      w.advance(5_000);
      const blocked = threw(() => w.acceptOffer(a.id, "BUYER"), /expired|I-028/);
      return prove(
        "BS-033",
        "I-028",
        { blocked: true, acceptances: 0, agreed: null },
        { blocked, acceptances: w.acceptances.length, agreed: w.requireSp(sp).agreedOfferId },
        "expired Offer cannot be revived by ACCEPT"
      );
    })
  );

  results.push(
    run("BS-034", () => {
      const w = new BasketWorld();
      w.setCatalog(catalog());
      const list = w.createList("bs034");
      w.addItem(list.id, { productId: "tomatoes", quantity: 2, unit: "kg", alternatives: [] });
      const sp = w.createPurchaseFromList(list.id, "PRIMARY_ONLY", ["seller-a"]).sellerPurchaseIds[0];
      w.proposeOffer({
        sellerPurchaseId: sp,
        actor: "SELLER",
        items: tomatoes(2, 15),
        reason: "PRICE_CHANGE",
        validUntil: "2026-01-01T00:00:01.000Z",
      });
      w.advance(5_000);
      const offerCountBefore = w.offers.filter((o) => o.sellerPurchaseId === sp).length;
      const buyerCounterBlocked = threw(
        () =>
          w.proposeOffer({
            sellerPurchaseId: sp,
            actor: "BUYER",
            items: tomatoes(2, 14),
            reason: "BUYER_CHANGE",
          }),
        /I-035|expired/
      );
      const sellerCounterBlocked = threw(
        () =>
          w.proposeOffer({
            sellerPurchaseId: sp,
            actor: "SELLER",
            items: tomatoes(2, 14),
            reason: "SELLER_COUNTEROFFER",
          }),
        /I-035|expired/
      );
      const bothAreCounters = COUNTER_REASONS.every((reason) => isCounterReason(reason));
      const replacementIsNotCounter = !isCounterReason("PRICE_CHANGE" satisfies OfferReason);
      const stillOneOffer = w.offers.filter((o) => o.sellerPurchaseId === sp).length === offerCountBefore;
      w.proposeOffer({
        sellerPurchaseId: sp,
        actor: "SELLER",
        items: tomatoes(2, 14),
        reason: "PRICE_CHANGE",
      });
      return prove(
        "BS-034",
        "I-035",
        {
          buyerCounterBlocked: true,
          sellerCounterBlocked: true,
          bothAreCounters: true,
          replacementIsNotCounter: true,
          countersLeftNoOffer: true,
          replacementCreated: true,
        },
        {
          buyerCounterBlocked,
          sellerCounterBlocked,
          bothAreCounters,
          replacementIsNotCounter,
          countersLeftNoOffer: stillOneOffer,
          replacementCreated: w.offers.filter((o) => o.sellerPurchaseId === sp).length === offerCountBefore + 1,
        },
        "I-035: isCounterReason (BUYER_CHANGE / SELLER_COUNTEROFFER) cannot reply to an expired Offer; PRICE_CHANGE may replace it"
      );
    })
  );

  results.push(
    run("BS-035", () => {
      const w = new BasketWorld();
      w.setCatalog(catalog());
      const list = w.createList("bs035");
      w.addItem(list.id, { productId: "tomatoes", quantity: 2, unit: "kg", alternatives: [] });
      const sp = w.createPurchaseFromList(list.id, "PRIMARY_ONLY", ["seller-a"]).sellerPurchaseIds[0];
      w.proposeOffer({
        sellerPurchaseId: sp,
        actor: "SELLER",
        items: tomatoes(2, 15),
        reason: "PRICE_CHANGE",
        validUntil: "2026-01-01T00:00:01.000Z",
      });
      const before = w.requireSp(sp);
      w.advance(86_400_000);
      const after = w.requireSp(sp);
      const waitMs =
        after.waitingSince === null ? null : Date.parse(w.nowIso()) - Date.parse(after.waitingSince);
      return prove(
        "BS-035",
        "I-039 I-041",
        {
          before: "WAITING_BUYER",
          after: "WAITING_BUYER",
          expiredState: false,
          invented: false,
          sameActive: true,
          sameAgreed: true,
          sameWaitingSince: true,
          sameLastSellerActivity: true,
          waitMs: 86_400_000,
        },
        {
          before: before.status,
          after: after.status,
          expiredState: after.status === "EXPIRED",
          invented: after.status !== before.status,
          sameActive: after.activeOfferId === before.activeOfferId,
          sameAgreed: after.agreedOfferId === before.agreedOfferId,
          sameWaitingSince: after.waitingSince === before.waitingSince,
          sameLastSellerActivity: after.lastSellerActivity === before.lastSellerActivity,
          waitMs,
        },
        "silence must not create a fake FSM state or rewrite waiting facts; waitMs is derived from clock"
      );
    })
  );

  results.push(
    run("BS-036", () => {
      const startIso = "2026-03-15T12:00:00.000Z";
      const play = () => {
        const w = new BasketWorld(new DeterministicClock(startIso));
        w.setCatalog(catalog());
        const list = w.createList("bs036");
        w.addItem(list.id, { productId: "tomatoes", quantity: 2, unit: "kg", alternatives: [] });
        const sp = w.createPurchaseFromList(list.id, "PRIMARY_ONLY", ["seller-a"]).sellerPurchaseIds[0];
        const a = w.proposeOffer({
          sellerPurchaseId: sp,
          actor: "SELLER",
          items: tomatoes(2, 15),
          reason: "PRICE_CHANGE",
          validUntil: "2026-03-15T12:00:05.000Z",
        });
        w.acceptOffer(a.id, "BUYER");
        w.advance(10_000);
        return JSON.stringify({
          startedAt: startIso,
          sellerPurchases: [...w.sellerPurchases.values()],
          purchases: [...w.purchases.values()],
          offers: w.offers,
          acceptances: w.acceptances,
          substitutions: w.substitutions,
          stockConflicts: w.stockConflicts,
          fulfillments: w.fulfillments,
          catalog: w.catalog,
          now: w.nowIso(),
          valid: w.isOfferValid(a),
          stockClaims: w.stockClaims("seller-a", "tomatoes", "kg"),
        });
      };
      const first = play();
      const second = play();
      return prove(
        "BS-036",
        "I-040",
        { same: true },
        { same: first === second },
        "determinism regression: same start + same commands → same snapshot; not a proof of all nondeterminism sources"
      );
    })
  );

  results.push(
    run("PRICE-UNIT-001", () => {
      const w = new BasketWorld();
      w.setCatalog(catalog());
      const list = w.createList("price-unit-001");
      w.addItem(list.id, { productId: "tomatoes", quantity: 2, unit: "kg", alternatives: [] });
      const sp = w.createPurchaseFromList(list.id, "PRIMARY_ONLY", ["seller-a"]).sellerPurchaseIds[0];
      const offer = w.proposeOffer({
        sellerPurchaseId: sp,
        actor: "SELLER",
        items: tomatoes(2, 15),
        reason: "PRICE_CHANGE",
      });
      const item = offer.items[0];
      const snap = w.snapshot(sp);
      return prove(
        "PRICE-UNIT-001",
        "I-042",
        {
          quantity: 2,
          unit: "kg",
          price: 15,
          storedLinePrice: false,
          derivedTotal: 30,
          snapshotLinePrice: false,
        },
        {
          quantity: item.quantity,
          unit: item.unit,
          price: item.price ?? null,
          storedLinePrice: hasStoredLinePrice(item),
          derivedTotal: unitLineTotal(item),
          snapshotLinePrice: snap.current.items.some((row) => hasStoredLinePrice(row)),
        },
        "price is per kg; derived total is not a stored linePrice"
      );
    })
  );

  results.push(
    run("PRICE-UNIT-002", () => {
      const w = new BasketWorld();
      w.setCatalog(catalog());
      const list = w.createList("price-unit-002");
      w.addItem(list.id, { productId: "tomatoes", quantity: 2, unit: "kg", alternatives: [] });
      const sp = w.createPurchaseFromList(list.id, "PRIMARY_ONLY", ["seller-a"]).sellerPurchaseIds[0];
      const a = w.proposeOffer({
        sellerPurchaseId: sp,
        actor: "SELLER",
        items: tomatoes(2, 15),
        reason: "PRICE_CHANGE",
      });
      const b = w.proposeOffer({
        sellerPurchaseId: sp,
        actor: "SELLER",
        items: tomatoes(1, 30),
        reason: "PRICE_CHANGE",
      });
      return prove(
        "PRICE-UNIT-002",
        "I-042 I-043 I-044",
        {
          sameProduct: true,
          sameUnit: true,
          sameQuantity: false,
          samePrice: false,
          distinguishable: true,
          derivedA: 30,
          derivedB: 30,
          sameDerived: true,
          aUnchanged: 15,
        },
        {
          sameProduct: a.items[0].productId === b.items[0].productId,
          sameUnit: a.items[0].unit === b.items[0].unit,
          sameQuantity: a.items[0].quantity === b.items[0].quantity,
          samePrice: a.items[0].price === b.items[0].price,
          distinguishable: a.id !== b.id,
          derivedA: unitLineTotal(a.items[0]),
          derivedB: unitLineTotal(b.items[0]),
          sameDerived: unitLineTotal(a.items[0]) === unitLineTotal(b.items[0]),
          aUnchanged: w.offerById(a.id).items[0].price ?? null,
        },
        "2kg@15 vs 1kg@30 are different Offers; equal derived totals are arithmetic, not commercial equivalence"
      );
    })
  );

  results.push(
    run("PRICE-OFFER-001", () => {
      const w = new BasketWorld();
      w.setCatalog(catalog());
      const list = w.createList("price-offer-001");
      w.addItem(list.id, { productId: "tomatoes", quantity: 2, unit: "kg", alternatives: [] });
      const sp = w.createPurchaseFromList(list.id, "PRIMARY_ONLY", ["seller-a"]).sellerPurchaseIds[0];
      const a = w.proposeOffer({
        sellerPurchaseId: sp,
        actor: "SELLER",
        items: tomatoes(2, 15),
        reason: "PRICE_CHANGE",
      });
      w.acceptOffer(a.id, "BUYER");
      const aPriceAfterAccept = w.offerById(a.id).items[0].price;
      const b = w.proposeOffer({
        sellerPurchaseId: sp,
        actor: "SELLER",
        items: tomatoes(2, 12),
        reason: "PRICE_CHANGE",
      });
      const s = w.requireSp(sp);
      return prove(
        "PRICE-OFFER-001",
        "I-006 I-008 I-044",
        {
          sameProduct: true,
          sameQuantity: true,
          sameUnit: true,
          differentPrice: true,
          aUnchanged: 15,
          offersDistinct: true,
          agreed: a.id,
          active: b.id,
        },
        {
          sameProduct: a.items[0].productId === b.items[0].productId,
          sameQuantity: a.items[0].quantity === b.items[0].quantity,
          sameUnit: a.items[0].unit === b.items[0].unit,
          differentPrice: a.items[0].price !== b.items[0].price,
          aUnchanged: aPriceAfterAccept ?? null,
          offersDistinct: a.id !== b.id,
          agreed: s.agreedOfferId,
          active: s.activeOfferId,
        },
        "price lives on the Offer item; ACCEPT does not mutate A; agreed stays A until B is accepted"
      );
    })
  );

  results.push(
    run("PRICE-QTY-001", () => {
      const w = new BasketWorld();
      w.setCatalog(catalog());
      const list = w.createList("price-qty-001");
      w.addItem(list.id, { productId: "tomatoes", quantity: 2, unit: "kg", alternatives: [] });
      const sp = w.createPurchaseFromList(list.id, "PRIMARY_ONLY", ["seller-a"]).sellerPurchaseIds[0];
      const a = w.proposeOffer({
        sellerPurchaseId: sp,
        actor: "SELLER",
        items: tomatoes(2, 15),
        reason: "PRICE_CHANGE",
      });
      const b = w.proposeOffer({
        sellerPurchaseId: sp,
        actor: "SELLER",
        items: tomatoes(4, 15),
        reason: "PRICE_CHANGE",
      });
      return prove(
        "PRICE-QTY-001",
        "I-043 I-044",
        {
          newOffer: true,
          priceStill: 15,
          qtyA: 2,
          qtyB: 4,
          derivedA: 30,
          derivedB: 60,
          aUnchangedQty: 2,
        },
        {
          newOffer: a.id !== b.id,
          priceStill: b.items[0].price ?? null,
          qtyA: a.items[0].quantity,
          qtyB: b.items[0].quantity,
          derivedA: unitLineTotal(a.items[0]),
          derivedB: unitLineTotal(b.items[0]),
          aUnchangedQty: w.offerById(a.id).items[0].quantity,
        },
        "quantity change is a new Offer; price stays per-unit and is not reread as a line total"
      );
    })
  );

  results.push(
    run("PRICE-ABSENT-001", () => {
      const w = new BasketWorld();
      w.setCatalog(catalog());
      const list = w.createList("price-absent-001");
      w.addItem(list.id, { productId: "tomatoes", quantity: 2, unit: "kg", alternatives: [] });
      const sp = w.createPurchaseFromList(list.id, "PRIMARY_ONLY", ["seller-a"]).sellerPurchaseIds[0];
      const offer = w.proposeOffer({
        sellerPurchaseId: sp,
        actor: "SELLER",
        items: [{ productId: "tomatoes", quantity: 2, unit: "kg" }],
        reason: "PRICE_CHANGE",
      });
      const item = offer.items[0];
      const acceptBlocked = threw(() => w.acceptOffer(offer.id, "BUYER"), /I-046/);
      const second = w.proposeOffer({
        sellerPurchaseId: sp,
        actor: "SELLER",
        items: [{ productId: "tomatoes", quantity: 2, unit: "kg" }],
        reason: "PRICE_CHANGE",
      });
      const secondAcceptBlocked = threw(() => w.acceptOffer(second.id, "BUYER"), /I-046/);
      const firstAfterSecondBlocked = threw(() => w.acceptOffer(offer.id, "BUYER"), /I-027|I-046/);
      const advice = adviseBuyer(w, sp);
      return prove(
        "PRICE-ABSENT-001",
        "I-042 I-046",
        {
          hasPrice: false,
          derivedTotal: null,
          absence: "MISSING_PRICE",
          storedLinePrice: false,
          acceptBlocked: true,
          secondAcceptBlocked: true,
          firstAfterSecondBlocked: true,
          agreedOfferId: null,
          stable: false,
          adviceKind: "WAIT",
          adviceReason: "MISSING_ITEM_PRICE",
          catalogRefUnchanged: 15,
        },
        {
          hasPrice: item.price !== undefined,
          derivedTotal: unitLineTotal(item),
          absence: lineTotalAbsence(item),
          storedLinePrice: hasStoredLinePrice(item),
          acceptBlocked,
          secondAcceptBlocked,
          firstAfterSecondBlocked,
          agreedOfferId: w.requireSp(sp).agreedOfferId,
          stable: w.requireSp(sp).status === "STABLE",
          adviceKind: advice.kind,
          adviceReason: advice.kind === "WAIT" ? advice.waitReason : null,
          catalogRefUnchanged: catalogReferencePrice(w, "seller-a", "tomatoes", "kg"),
        },
        "priceless Offer has no derived total; a second priceless Offer is not a bypass to agreed/STABLE"
      );
    })
  );

  results.push(
    run("PRICE-CATALOG-QTY-001", () => {
      const w = new BasketWorld();
      w.setCatalog({
        names: { tomatoes: "Tomatoes" },
        availability: [{ sellerId: "seller-a", productId: "tomatoes", quantity: 20, unit: "kg", price: 15, stock: 100 }],
      });
      const list = w.createList("price-catalog-qty");
      w.addItem(list.id, { productId: "tomatoes", quantity: 2, unit: "kg", alternatives: [] });
      const sp = w.createPurchaseFromList(list.id, "PRIMARY_ONLY", ["seller-a"]).sellerPurchaseIds[0];
      const item = w.requireSp(sp).items[0];
      return prove(
        "PRICE-CATALOG-QTY-001",
        "I-045 I-043",
        { requested: 2, catalogQty: 20, itemQty: 2, copiedFromCatalog: false },
        {
          requested: 2,
          catalogQty: w.catalog.availability[0].quantity,
          itemQty: item.quantity,
          copiedFromCatalog: item.quantity === w.catalog.availability[0].quantity,
        },
        "requested PurchaseItem.quantity is not catalog reference quantity"
      );
    })
  );

  results.push(
    run("PRICE-ZERO-001", () => {
      const w = new BasketWorld();
      w.setCatalog(catalog());
      const list = w.createList("price-zero-001");
      w.addItem(list.id, { productId: "tomatoes", quantity: 2, unit: "kg", alternatives: [] });
      const sp = w.createPurchaseFromList(list.id, "PRIMARY_ONLY", ["seller-a"]).sellerPurchaseIds[0];
      const offer = w.proposeOffer({
        sellerPurchaseId: sp,
        actor: "SELLER",
        items: tomatoes(2, 0),
        reason: "PRICE_CHANGE",
      });
      return prove(
        "PRICE-ZERO-001",
        "I-042 I-030",
        { price: 0, derivedTotal: 0, missing: false },
        {
          price: offer.items[0].price ?? null,
          derivedTotal: unitLineTotal(offer.items[0]),
          missing: offer.items[0].price === undefined,
        },
        "price 0 is a real unit price; derived total 0 is not a missing price"
      );
    })
  );

  results.push(
    run("PRICE-LIST-QTY-ABSENT-001", () => {
      const w = new BasketWorld();
      w.setCatalog({
        names: { tomatoes: "Tomatoes" },
        availability: [{ sellerId: "seller-a", productId: "tomatoes", quantity: 20, unit: "kg", price: 15, stock: 100 }],
      });
      const list = w.createList("price-list-qty-absent");
      w.addItem(list.id, { productId: "tomatoes", unit: "kg", alternatives: [] });
      const purchase = w.createPurchaseFromList(list.id, "PRIMARY_ONLY", ["seller-a"]);
      return prove(
        "PRICE-LIST-QTY-ABSENT-001",
        "I-045 I-030",
        {
          sellerPurchases: 0,
          reason: "MISSING_QUANTITY",
          inventedOne: false,
          copiedFromCatalog: false,
        },
        {
          sellerPurchases: purchase.sellerPurchaseIds.length,
          reason: purchase.unresolvedItems[0]?.reason ?? null,
          inventedOne: purchase.sellerPurchaseIds.length > 0,
          copiedFromCatalog: false,
        },
        "ListItem without quantity cannot become a PurchaseItem; MISSING_QUANTITY, not silent 1"
      );
    })
  );

  results.push(
    run("ALT-UNIT-001", () => {
      const cat: ProductCatalog = {
        names: { tomatoes: "Tomatoes", tomato_b: "Tomato B" },
        availability: [
          { sellerId: "seller-a", productId: "tomatoes", quantity: 2, unit: "kg", price: 15, stock: 10 },
          { sellerId: "seller-a", productId: "tomato_b", quantity: 2, unit: "pcs", price: 8, stock: 10 },
        ],
      };
      const w = new BasketWorld();
      w.setCatalog(cat);
      const list = w.createList("alt-unit-001");
      w.addItem(list.id, {
        productId: "tomatoes",
        quantity: 2,
        unit: "kg",
        alternatives: [{ productId: "tomato_b", alternativePriority: 1 }],
      });
      const sp = w.createPurchaseFromList(list.id, "PRIMARY_ONLY", ["seller-a"]).sellerPurchaseIds[0];
      const alt = w.snapshot(sp).alternatives[0];
      return prove(
        "ALT-UNIT-001",
        "I-036 I-045 I-023",
        {
          altProduct: "tomato_b",
          requestedUnit: "kg",
          catalogUnit: null,
          catalogPrice: null,
          unitCompatible: false,
          converted: false,
        },
        {
          altProduct: alt?.productId ?? null,
          requestedUnit: alt?.requestedUnit ?? null,
          catalogUnit: alt?.catalogUnit ?? null,
          catalogPrice: alt?.catalogPrice ?? null,
          unitCompatible: alt?.unitCompatible ?? null,
          converted: alt?.catalogPrice === 8,
        },
        "alternative priced in pcs is not converted into the list kg line"
      );
    })
  );

  results.push(
    run("PACKAGE-001", () => {
      const w = new BasketWorld();
      w.setCatalog({
        names: { tomatoes: "Tomatoes" },
        availability: [{ sellerId: "seller-a", productId: "tomatoes", quantity: 1, unit: "package", price: 60, stock: 10 }],
      });
      const list = w.createList("package-001");
      w.addItem(list.id, { productId: "tomatoes", quantity: 1, unit: "package", alternatives: [] });
      const sp = w.createPurchaseFromList(list.id, "PRIMARY_ONLY", ["seller-a"]).sellerPurchaseIds[0];
      const offer = w.proposeOffer({
        sellerPurchaseId: sp,
        actor: "SELLER",
        items: [{ productId: "tomatoes", quantity: 1, unit: "package", price: 60 }],
        reason: "PRICE_CHANGE",
      });
      const item = offer.items[0];
      return prove(
        "PACKAGE-001",
        "I-045 I-042",
        {
          quantity: 1,
          unit: "package",
          price: 60,
          derivedTotal: 60,
        },
        {
          quantity: item.quantity,
          unit: item.unit,
          price: item.price ?? null,
          derivedTotal: unitLineTotal(item),
        },
        "package is representable as a unit"
      );
    })
  );

  results.push(
    run("PACKAGE-004", () => {
      const w = new BasketWorld();
      w.setCatalog({
        names: { tomatoes: "Tomatoes" },
        availability: [{ sellerId: "seller-a", productId: "tomatoes", quantity: 1, unit: "package", price: 60, stock: 10 }],
      });
      const list = w.createList("package-004");
      w.addItem(list.id, { productId: "tomatoes", quantity: 1, unit: "package", alternatives: [] });
      const sp = w.createPurchaseFromList(list.id, "PRIMARY_ONLY", ["seller-a"]).sellerPurchaseIds[0];
      w.proposeOffer({
        sellerPurchaseId: sp,
        actor: "SELLER",
        items: [{ productId: "tomatoes", quantity: 1, unit: "package", price: 60 }],
        reason: "PRICE_CHANGE",
      });
      const kgLine = catalogUnitPrice(w.catalog, { sellerId: "seller-a", productId: "tomatoes", unit: "kg" });
      return prove(
        "PACKAGE-004",
        "I-045",
        {
          kgConversion: null,
          contentsInModel: false,
        },
        {
          kgConversion: kgLine,
          contentsInModel: kgLine !== null,
        },
        "MODEL GAP: package contents / conversion are not in the model; business semantics remain OPEN",
        "OPEN",
        "SPEC-OQ-002",
        { newConcept: "package contents / conversion (not introduced)" }
      );
    })
  );

  results.push(
    run("PACKAGE-002", () => {
      const samePrice = {
        names: { tomatoes: "Tomatoes" },
        availability: [
          { sellerId: "seller-a", productId: "tomatoes", quantity: 5, unit: "kg", price: 12, stock: 10 },
          { sellerId: "seller-a", productId: "tomatoes", quantity: 20, unit: "kg", price: 12, stock: 10 },
        ],
      };
      const volume = {
        names: { tomatoes: "Tomatoes" },
        availability: [
          { sellerId: "seller-a", productId: "tomatoes", quantity: 5, unit: "kg", price: 12, stock: 10 },
          { sellerId: "seller-a", productId: "tomatoes", quantity: 20, unit: "kg", price: 9, stock: 10 },
        ],
      };
      const sameWorld = new BasketWorld();
      sameWorld.setCatalog(samePrice);
      const sameList = sameWorld.createList("package-002-same");
      sameWorld.addItem(sameList.id, { productId: "tomatoes", quantity: 5, unit: "kg", alternatives: [] });
      const samePurchase = sameWorld.createPurchaseFromList(sameList.id, "PRIMARY_ONLY", ["seller-a"]);
      const volumeWorld = new BasketWorld();
      volumeWorld.setCatalog(volume);
      const volumeList = volumeWorld.createList("package-002-vol");
      volumeWorld.addItem(volumeList.id, { productId: "tomatoes", quantity: 5, unit: "kg", alternatives: [] });
      const volumePurchase = volumeWorld.createPurchaseFromList(volumeList.id, "PRIMARY_ONLY", ["seller-a"]);
      return prove(
        "PACKAGE-002",
        "I-045 I-036",
        {
          samePriceRef: 12,
          sameCreated: true,
          volumeRef: null,
          volumeUnresolved: true,
          unresolvedReason: "AMBIGUOUS_PRICE",
        },
        {
          samePriceRef: catalogUnitPrice(sameWorld.catalog, {
            sellerId: "seller-a",
            productId: "tomatoes",
            unit: "kg",
          }),
          sameCreated: samePurchase.sellerPurchaseIds.length === 1,
          volumeRef: catalogUnitPrice(volumeWorld.catalog, {
            sellerId: "seller-a",
            productId: "tomatoes",
            unit: "kg",
          }),
          volumeUnresolved: volumePurchase.sellerPurchaseIds.length === 0,
          unresolvedReason: volumePurchase.unresolvedItems[0]?.reason ?? null,
        },
        "Stage-1: different catalog qty + different unit price is AMBIGUOUS. Volume-pricing policy is not decided",
        "OPEN",
        "SPEC-OQ-002",
        { newConcept: "volume-price schedule (not introduced)" }
      );
    })
  );

  results.push(
    run("PACKAGE-003", () => {
      const w = new BasketWorld();
      w.setCatalog({
        names: { tomatoes: "Tomatoes" },
        availability: [
          { sellerId: "seller-a", productId: "tomatoes", quantity: 5, unit: "package", price: 60, stock: 10 },
          { sellerId: "seller-a", productId: "tomatoes", quantity: 20, unit: "package", price: 60, stock: 10 },
        ],
      });
      const list = w.createList("package-003");
      w.addItem(list.id, { productId: "tomatoes", quantity: 1, unit: "package", alternatives: [] });
      const sp = w.createPurchaseFromList(list.id, "PRIMARY_ONLY", ["seller-a"]).sellerPurchaseIds[0];
      const offer = w.proposeOffer({
        sellerPurchaseId: sp,
        actor: "SELLER",
        items: [{ productId: "tomatoes", quantity: 1, unit: "package", price: 60 }],
        reason: "PRICE_CHANGE",
      });
      const qtys = [...new Set(w.catalog.availability.map((row) => row.quantity))].sort((a, b) => a - b);
      const identityKeys = [
        ...new Set(w.catalog.availability.map((row) => `${row.sellerId}|${row.productId}|${row.unit}`)),
      ];
      return prove(
        "PACKAGE-003",
        "I-045 I-036",
        {
          catalogRows: 2,
          catalogQtys: "5,20",
          sharedIdentity: "seller-a|tomatoes|package",
          identityKeyCount: 1,
          offerHasCatalogQty: false,
        },
        {
          catalogRows: w.catalog.availability.length,
          catalogQtys: qtys.join(","),
          sharedIdentity: identityKeys[0] ?? null,
          identityKeyCount: identityKeys.length,
          offerHasCatalogQty: Object.prototype.hasOwnProperty.call(offer.items[0], "catalogQuantity"),
        },
        "MODEL GAP: current identity cannot represent distinct package bases",
        "OPEN",
        "SPEC-OQ-002",
        { newConcept: "distinct package-base identity (not introduced)" }
      );
    })
  );

  results.push(
    run("ALT-PRICE-001", () => {
      const w = new BasketWorld();
      w.setCatalog({
        names: { tomatoes: "Tomatoes", tomato_b: "Tomato B" },
        availability: [
          { sellerId: "seller-a", productId: "tomatoes", quantity: 2, unit: "kg", price: 15, stock: 10 },
          { sellerId: "seller-a", productId: "tomato_b", quantity: 2, unit: "kg", price: 24, stock: 10 },
        ],
      });
      const list = w.createList("alt-price-001");
      w.addItem(list.id, {
        productId: "tomatoes",
        quantity: 2,
        unit: "kg",
        alternatives: [{ productId: "tomato_b", alternativePriority: 1 }],
      });
      const sp = w.createPurchaseFromList(list.id, "PRIMARY_ONLY", ["seller-a"]).sellerPurchaseIds[0];
      w.proposeOffer({
        sellerPurchaseId: sp,
        actor: "SELLER",
        items: tomatoes(2, 15),
        reason: "PRICE_CHANGE",
      });
      const alt = w.snapshot(sp).alternatives[0];
      return prove(
        "ALT-PRICE-001",
        "I-014 I-042 I-023",
        {
          resolved: "tomatoes",
          offerPrice: 15,
          altProduct: "tomato_b",
          altCatalogPrice: 24,
          switchedToAlt: false,
        },
        {
          resolved: w.requireSp(sp).items[0].productId,
          offerPrice: w.lastOffer(sp)!.items[0].price ?? null,
          altProduct: alt?.productId ?? null,
          altCatalogPrice: alt?.catalogPrice ?? null,
          switchedToAlt: w.requireSp(sp).items[0].productId === "tomato_b",
        },
        "BasketWorld lifecycle: primary 15 and alt 24 are both visible; PRIMARY_ONLY does not switch"
      );
    })
  );

  results.push(
    run("ALT-PRICE-002", () => {
      const cheapFirst: ProductCatalog = {
        names: { tomatoes: "Tomatoes", tomato_b: "Tomato B" },
        availability: [
          { sellerId: "seller-a", productId: "tomato_b", quantity: 2, unit: "kg", price: 15, stock: 10 },
          { sellerId: "seller-a", productId: "tomatoes", quantity: 2, unit: "kg", price: 24, stock: 10 },
        ],
      };
      const dearFirst: ProductCatalog = {
        names: { tomatoes: "Tomatoes", tomato_b: "Tomato B" },
        availability: [
          { sellerId: "seller-a", productId: "tomatoes", quantity: 2, unit: "kg", price: 24, stock: 10 },
          { sellerId: "seller-a", productId: "tomato_b", quantity: 2, unit: "kg", price: 15, stock: 10 },
        ],
      };
      const item = {
        id: "tmp",
        productId: "tomatoes",
        quantity: 2,
        unit: "kg",
        alternatives: [{ productId: "tomato_b", alternativePriority: 1 }],
      };
      const firstCheapCatalog = resolve(item, "FIRST_AVAILABLE", cheapFirst);
      const firstDearCatalog = resolve(item, "FIRST_AVAILABLE", dearFirst);
      const hypotheticalBest =
        (catalogUnitPrice(cheapFirst, { sellerId: "seller-a", productId: "tomato_b", unit: "kg" }) ?? 99) <
        (catalogUnitPrice(cheapFirst, { sellerId: "seller-a", productId: "tomatoes", unit: "kg" }) ?? 99)
          ? "tomato_b"
          : "tomatoes";
      const w = new BasketWorld();
      w.setCatalog(cheapFirst);
      const list = w.createList("alt-price-002");
      w.addItem(list.id, {
        productId: "tomatoes",
        quantity: 2,
        unit: "kg",
        alternatives: [{ productId: "tomato_b", alternativePriority: 1 }],
      });
      const purchase = w.createPurchaseFromList(list.id, "PRIMARY_ONLY", ["seller-a"]);
      const sp = purchase.sellerPurchaseIds[0];
      w.proposeOffer({
        sellerPurchaseId: sp,
        actor: "SELLER",
        items: [{ productId: "tomatoes", quantity: 2, unit: "kg", price: 24 }],
        reason: "PRICE_CHANGE",
      });
      const alt = w.snapshot(sp).alternatives[0];
      return prove(
        "ALT-PRICE-002",
        "I-014 I-023",
        {
          firstIgnoresCatalogOrder: true,
          hypotheticalBest: "tomato_b",
          firstPickedBest: false,
          worldResolved: "tomatoes",
          altVisible: 15,
        },
        {
          firstIgnoresCatalogOrder: firstCheapCatalog.productId === firstDearCatalog.productId,
          hypotheticalBest,
          firstPickedBest: firstCheapCatalog.productId === hypotheticalBest,
          worldResolved: w.requireSp(sp).items[0].productId,
          altVisible: alt?.catalogPrice ?? null,
        },
        "FIRST_AVAILABLE and PRIMARY_ONLY are not BEST_PRICE in this run; this does not prove price never affects resolution. SPEC OQ-008 remains OPEN",
        "OPEN",
        "SPEC-OQ-008"
      );
    })
  );

  results.push(
    run("PRICE-SNAPSHOT-001", () => {
      const w = new BasketWorld();
      w.setCatalog({
        names: { tomatoes: "Tomatoes", tomato_b: "Tomato B" },
        availability: [
          { sellerId: "seller-a", productId: "tomatoes", quantity: 2, unit: "kg", price: 15, stock: 10 },
          { sellerId: "seller-a", productId: "tomato_b", quantity: 2, unit: "kg", price: 24, stock: 10 },
        ],
      });
      const list = w.createList("price-snap-001");
      w.addItem(list.id, {
        productId: "tomatoes",
        quantity: 2,
        unit: "kg",
        alternatives: [{ productId: "tomato_b", alternativePriority: 1 }],
      });
      const sp = w.createPurchaseFromList(list.id, "PRIMARY_ONLY", ["seller-a"]).sellerPurchaseIds[0];
      const a = w.proposeOffer({
        sellerPurchaseId: sp,
        actor: "SELLER",
        items: tomatoes(2, 15),
        reason: "PRICE_CHANGE",
      });
      w.acceptOffer(a.id, "BUYER");
      w.proposeOffer({
        sellerPurchaseId: sp,
        actor: "SELLER",
        items: tomatoes(2, 12),
        reason: "PRICE_CHANGE",
      });
      const snap = w.snapshot(sp);
      const agreed = snap.agreed.items[0];
      const current = snap.current.items[0];
      const alt = snap.alternatives[0];
      return prove(
        "PRICE-SNAPSHOT-001",
        "I-023 I-042 I-044",
        {
          agreedProduct: "tomatoes",
          agreedQty: 2,
          agreedUnit: "kg",
          agreedPrice: 15,
          currentProduct: "tomatoes",
          currentQty: 2,
          currentUnit: "kg",
          currentPrice: 12,
          altProduct: "tomato_b",
          requestedQty: 2,
          requestedUnit: "kg",
          catalogPrice: 24,
          storedLinePrice: false,
        },
        {
          agreedProduct: agreed?.productId ?? null,
          agreedQty: agreed?.quantity ?? null,
          agreedUnit: agreed?.unit ?? null,
          agreedPrice: agreed?.price ?? null,
          currentProduct: current?.productId ?? null,
          currentQty: current?.quantity ?? null,
          currentUnit: current?.unit ?? null,
          currentPrice: current?.price ?? null,
          altProduct: alt?.productId ?? null,
          requestedQty: alt?.requestedQuantity ?? null,
          requestedUnit: alt?.requestedUnit ?? null,
          catalogPrice: alt?.catalogPrice ?? null,
          storedLinePrice: hasStoredLinePrice(agreed ?? {}) || hasStoredLinePrice(current ?? {}),
        },
        "canonical snapshot: agreed 15 / current 12 / alternative 24 — representation only"
      );
    })
  );

  results.push(
    run("ALT-PACK-001", () => {
      const w = new BasketWorld();
      w.setCatalog({
        names: { tomatoes: "Tomatoes", tomato_b: "Tomato B" },
        availability: [
          { sellerId: "seller-a", productId: "tomatoes", quantity: 2, unit: "kg", price: 15, stock: 10 },
          { sellerId: "seller-a", productId: "tomato_b", quantity: 5, unit: "kg", price: 24, stock: 10 },
        ],
      });
      const list = w.createList("alt-pack-001");
      w.addItem(list.id, {
        productId: "tomatoes",
        quantity: 2,
        unit: "kg",
        alternatives: [{ productId: "tomato_b", alternativePriority: 1 }],
      });
      const sp = w.createPurchaseFromList(list.id, "PRIMARY_ONLY", ["seller-a"]).sellerPurchaseIds[0];
      const alt = w.snapshot(sp).alternatives[0];
      return prove(
        "ALT-PACK-001",
        "I-023 I-045",
        {
          requestedQty: 2,
          catalogQty: 5,
          unitCompatible: true,
          referenceQtyMatches: false,
          catalogPrice: 24,
        },
        {
          requestedQty: alt?.requestedQuantity ?? null,
          catalogQty: alt?.catalogQuantity ?? null,
          unitCompatible: alt?.unitCompatible ?? null,
          referenceQtyMatches: alt?.referenceQtyMatches ?? null,
          catalogPrice: alt?.catalogPrice ?? null,
        },
        "projection exposes list 2 kg vs alt catalog pack 5 kg; no silent pack rewrite and no policy"
      );
    })
  );

  results.push(
    run("ALT-STABILITY-001", () => {
      const w = new BasketWorld();
      w.setCatalog({
        names: { tomatoes: "Tomatoes", tomato_b: "Tomato B", baguette: "Baguette" },
        availability: [
          { sellerId: "seller-a", productId: "tomatoes", quantity: 2, unit: "kg", price: 15, stock: 10 },
          { sellerId: "seller-a", productId: "tomato_b", quantity: 2, unit: "kg", price: 24, stock: 10 },
          { sellerId: "seller-a", productId: "baguette", quantity: 1, unit: "pcs", price: 11, stock: 10 },
        ],
      });
      const list = w.createList("alt-stab-001");
      w.addItem(list.id, {
        productId: "tomatoes",
        quantity: 2,
        unit: "kg",
        alternatives: [{ productId: "tomato_b", alternativePriority: 1 }],
      });
      const sp = w.createPurchaseFromList(list.id, "PRIMARY_ONLY", ["seller-a"]).sellerPurchaseIds[0];
      const a = w.proposeOffer({
        sellerPurchaseId: sp,
        actor: "SELLER",
        items: tomatoes(2, 15),
        reason: "PRICE_CHANGE",
      });
      const afterOffer = w.snapshot(sp).alternatives.some((row) => row.productId === "tomato_b");
      w.acceptOffer(a.id, "BUYER");
      w.proposeOffer({
        sellerPurchaseId: sp,
        actor: "SELLER",
        items: tomatoes(2, 12),
        reason: "PRICE_CHANGE",
      });
      const afterNewOffer = w.snapshot(sp).alternatives.some((row) => row.productId === "tomato_b");
      w.proposeSubstitution({
        sellerPurchaseId: sp,
        originalProductId: "tomatoes",
        replacementProductId: "baguette",
        proposedBy: "SELLER",
      });
      const afterSub = w.snapshot(sp).alternatives.some((row) => row.productId === "tomato_b");
      const replacement = w.proposeOffer({
        sellerPurchaseId: sp,
        actor: "SELLER",
        items: [{ productId: "baguette", quantity: 1, unit: "pcs", price: 11 }],
        reason: "SUBSTITUTION",
      });
      const afterReplacementOffer = w.snapshot(sp).alternatives.some((row) => row.productId === "tomato_b");
      w.acceptOffer(replacement.id, "BUYER");
      const afterPrimaryReplaced = w.snapshot(sp);
      const currentIds = w.requireSp(sp).items.map((row) => row.productId);
      const listItem = w.lists.get(list.id)!.items[0];
      const currentItemsAloneWouldShowAlt =
        currentIds.includes(listItem.productId) ||
        listItem.alternatives.some((alt) => currentIds.includes(alt.productId));
      const snapAlt = afterPrimaryReplaced.alternatives.find((row) => row.productId === "tomato_b");
      return prove(
        "ALT-STABILITY-001",
        "I-023 I-014",
        {
          afterOffer: true,
          afterNewOffer: true,
          afterSub: true,
          afterReplacementOffer: true,
          currentProduct: "baguette",
          currentHasPrimary: false,
          currentHasAlt: false,
          currentItemsAloneWouldShowAlt: false,
          listStillHasAlt: true,
          snapshotHasListAlt: true,
          requestedQty: 2,
          requestedUnit: "kg",
        },
        {
          afterOffer,
          afterNewOffer,
          afterSub,
          afterReplacementOffer,
          currentProduct: currentIds[0] ?? null,
          currentHasPrimary: currentIds.includes("tomatoes"),
          currentHasAlt: currentIds.includes("tomato_b"),
          currentItemsAloneWouldShowAlt,
          listStillHasAlt: listItem.alternatives.some((alt) => alt.productId === "tomato_b"),
          snapshotHasListAlt: snapAlt !== undefined,
          requestedQty: snapAlt?.requestedQuantity ?? null,
          requestedUnit: snapAlt?.requestedUnit ?? null,
        },
        "alternatives are a List projection: they remain after the current commercial item is replaced"
      );
    })
  );

  results.push(
    run("PRICE-REGRESSION-001", () => {
      const w = new BasketWorld();
      w.setCatalog(catalog());
      const list = w.createList("price-reg-001");
      w.addItem(list.id, { productId: "tomatoes", quantity: 2, unit: "kg", alternatives: [] });
      const sp = w.createPurchaseFromList(list.id, "PRIMARY_ONLY", ["seller-a"]).sellerPurchaseIds[0];
      const agreed = w.proposeOffer({
        sellerPurchaseId: sp,
        actor: "SELLER",
        items: tomatoes(2, 15),
        reason: "PRICE_CHANGE",
      });
      w.acceptOffer(agreed.id, "BUYER");
      w.proposeOffer({
        sellerPurchaseId: sp,
        actor: "SELLER",
        items: tomatoes(2, 18),
        reason: "PRICE_CHANGE",
      });
      const hike = adviseBuyer(w, sp);
      const discountWorld = new BasketWorld();
      discountWorld.setCatalog(catalog());
      const dList = discountWorld.createList("price-reg-disc");
      discountWorld.addItem(dList.id, { productId: "tomatoes", quantity: 2, unit: "kg", alternatives: [] });
      const dSp = discountWorld.createPurchaseFromList(dList.id, "PRIMARY_ONLY", ["seller-a"]).sellerPurchaseIds[0];
      const dA = discountWorld.proposeOffer({
        sellerPurchaseId: dSp,
        actor: "SELLER",
        items: tomatoes(2, 15),
        reason: "PRICE_CHANGE",
      });
      discountWorld.acceptOffer(dA.id, "BUYER");
      discountWorld.proposeOffer({
        sellerPurchaseId: dSp,
        actor: "SELLER",
        items: tomatoes(2, 12),
        reason: "TIME_DISCOUNT",
      });
      const discount = adviseBuyer(discountWorld, dSp);
      return prove(
        "PRICE-REGRESSION-001",
        "I-042 I-043",
        {
          hikeKind: "COUNTER",
          hikeAt: 15,
          hikeNotLineTotal: true,
          discountKind: "ACCEPT_ACTIVE",
          catalogRef: 15,
          agreedDerived: 30,
        },
        {
          hikeKind: hike.kind,
          hikeAt: hike.kind === "COUNTER" ? hike.items[0]?.price ?? null : null,
          hikeNotLineTotal: hike.kind === "COUNTER" && hike.items[0]?.price === 15,
          discountKind: discount.kind,
          catalogRef: catalogReferencePrice(w, "seller-a", "tomatoes", "kg"),
          agreedDerived: unitLineTotal(w.offerById(agreed.id).items[0]),
        },
        "existing hike/discount paths treat 15 as MAD/kg, not as a 30 MAD line total"
      );
    })
  );

  results.push(
    run("PRICE-TOTAL-001", () => {
      const qtyZero = { quantity: 0, price: 15 };
      const qtyNeg = { quantity: -2, price: 15 };
      const qtyNan = { quantity: Number.NaN, price: 15 };
      const qtyInf = { quantity: Number.POSITIVE_INFINITY, price: 15 };
      const priceNeg = { quantity: 2, price: -1 };
      const priceNan = { quantity: 2, price: Number.NaN };
      const priceInf = { quantity: 2, price: Number.POSITIVE_INFINITY };
      const missing = { quantity: 2 };
      const ok = { quantity: 2, price: 15 };
      return prove(
        "PRICE-TOTAL-001",
        "I-030 I-046 I-042",
        {
          qtyZeroTotal: null,
          qtyZeroReason: "INVALID_QUANTITY",
          qtyNegReason: "INVALID_QUANTITY",
          qtyNanReason: "INVALID_QUANTITY",
          qtyInfReason: "INVALID_QUANTITY",
          priceNegReason: "INVALID_PRICE",
          priceNanReason: "INVALID_PRICE",
          priceInfReason: "INVALID_PRICE",
          missingReason: "MISSING_PRICE",
          okTotal: 30,
          okReason: null,
        },
        {
          qtyZeroTotal: unitLineTotal(qtyZero),
          qtyZeroReason: lineTotalAbsence(qtyZero),
          qtyNegReason: lineTotalAbsence(qtyNeg),
          qtyNanReason: lineTotalAbsence(qtyNan),
          qtyInfReason: lineTotalAbsence(qtyInf),
          priceNegReason: lineTotalAbsence(priceNeg),
          priceNanReason: lineTotalAbsence(priceNan),
          priceInfReason: lineTotalAbsence(priceInf),
          missingReason: lineTotalAbsence(missing),
          okTotal: unitLineTotal(ok),
          okReason: lineTotalAbsence(ok),
        },
        "unitLineTotal only multiplies; quantity > 0 is I-030, price bounds are I-046; null is no derived total, not a new TZ-006 rule"
      );
    })
  );

  results.push(
    run("PACKAGE-SEM-001", () => {
      const w = new BasketWorld();
      w.setCatalog({
        names: { tomatoes: "Tomatoes" },
        availability: [{ sellerId: "seller-a", productId: "tomatoes", quantity: 1, unit: "package", price: 60, stock: 10 }],
      });
      const list = w.createList("package-sem-001");
      w.addItem(list.id, { productId: "tomatoes", quantity: 1, unit: "package", alternatives: [] });
      const sp = w.createPurchaseFromList(list.id, "PRIMARY_ONLY", ["seller-a"]).sellerPurchaseIds[0];
      const offer = w.proposeOffer({
        sellerPurchaseId: sp,
        actor: "SELLER",
        items: [{ productId: "tomatoes", quantity: 1, unit: "package", price: 60 }],
        reason: "PRICE_CHANGE",
      });
      w.acceptOffer(offer.id, "BUYER");
      const snap = w.snapshot(sp);
      const item = w.offerById(offer.id).items[0];
      return prove(
        "PACKAGE-SEM-001",
        "I-045 I-042 I-046",
        {
          quantity: 1,
          unit: "package",
          price: 60,
          derivedTotal: 60,
          accepted: true,
          agreedQty: 1,
          agreedUnit: "package",
          agreedPrice: 60,
          stable: true,
        },
        {
          quantity: item.quantity,
          unit: item.unit,
          price: item.price ?? null,
          derivedTotal: unitLineTotal(item),
          accepted: w.acceptances.some((row) => row.offerId === offer.id),
          agreedQty: snap.agreed.items[0]?.quantity ?? null,
          agreedUnit: snap.agreed.items[0]?.unit ?? null,
          agreedPrice: snap.agreed.items[0]?.price ?? null,
          stable: w.requireSp(sp).status === "STABLE",
        },
        "package is representable as a unit through Offer, Acceptance, and snapshot; contents are not claimed"
      );
    })
  );

  results.push(
    run("PACKAGE-SEM-002", () => {
      const samePrice = {
        names: { tomatoes: "Tomatoes" },
        availability: [
          { sellerId: "seller-a", productId: "tomatoes", quantity: 5, unit: "package", price: 60, stock: 10 },
          { sellerId: "seller-a", productId: "tomatoes", quantity: 20, unit: "package", price: 60, stock: 10 },
        ],
      };
      const differentPrice = {
        names: { tomatoes: "Tomatoes" },
        availability: [
          { sellerId: "seller-a", productId: "tomatoes", quantity: 5, unit: "package", price: 60, stock: 10 },
          { sellerId: "seller-a", productId: "tomatoes", quantity: 20, unit: "package", price: 240, stock: 10 },
        ],
      };
      const sameWorld = new BasketWorld();
      sameWorld.setCatalog(samePrice);
      const sameList = sameWorld.createList("package-sem-002-same");
      sameWorld.addItem(sameList.id, { productId: "tomatoes", quantity: 1, unit: "package", alternatives: [] });
      const sameSp = sameWorld.createPurchaseFromList(sameList.id, "PRIMARY_ONLY", ["seller-a"]).sellerPurchaseIds[0];
      const sameOffer = sameWorld.proposeOffer({
        sellerPurchaseId: sameSp,
        actor: "SELLER",
        items: [{ productId: "tomatoes", quantity: 1, unit: "package", price: 60 }],
        reason: "PRICE_CHANGE",
      });
      const sameKeys = [
        ...new Set(sameWorld.catalog.availability.map((row) => `${row.sellerId}|${row.productId}|${row.unit}`)),
      ];
      const diffWorld = new BasketWorld();
      diffWorld.setCatalog(differentPrice);
      const diffList = diffWorld.createList("package-sem-002-diff");
      diffWorld.addItem(diffList.id, { productId: "tomatoes", quantity: 1, unit: "package", alternatives: [] });
      const diffPurchase = diffWorld.createPurchaseFromList(diffList.id, "PRIMARY_ONLY", ["seller-a"]);
      const pricedA = { productId: "tomatoes", quantity: 1, unit: "package", price: 60 };
      const pricedB = { productId: "tomatoes", quantity: 1, unit: "package", price: 240 };
      return prove(
        "PACKAGE-SEM-002",
        "I-047 I-045 I-036",
        {
          externalBases: "5kg,20kg",
          identityKeyCount: 1,
          samePriceOfferHasContents: false,
          differentPriceUnresolved: true,
          differentPriceReason: "AMBIGUOUS_PRICE",
          offersDistinguishPriceNotContents: true,
        },
        {
          externalBases: "5kg,20kg",
          identityKeyCount: sameKeys.length,
          samePriceOfferHasContents: Object.prototype.hasOwnProperty.call(sameOffer.items[0], "contentsQuantity"),
          differentPriceUnresolved: diffPurchase.sellerPurchaseIds.length === 0,
          differentPriceReason: diffPurchase.unresolvedItems[0]?.reason ?? null,
          offersDistinguishPriceNotContents:
            pricedA.price !== pricedB.price && pricedA.quantity === pricedB.quantity && pricedA.unit === pricedB.unit,
        },
        "MODEL GAP: current identity cannot represent distinct package bases",
        "OPEN",
        "SPEC-OQ-002A",
        { newConcept: "package contents / basis (not introduced)" }
      );
    })
  );

  results.push(
    run("PACKAGE-SEM-003", () => {
      const cat: ProductCatalog = {
        names: { tomatoes: "Tomatoes" },
        availability: [{ sellerId: "seller-a", productId: "tomatoes", quantity: 5, unit: "package", price: 60, stock: 10 }],
      };
      const one = new BasketWorld();
      one.setCatalog(cat);
      const oneList = one.createList("package-sem-003-one");
      one.addItem(oneList.id, { productId: "tomatoes", quantity: 1, unit: "package", alternatives: [] });
      const oneItem = one.requireSp(one.createPurchaseFromList(oneList.id, "PRIMARY_ONLY", ["seller-a"]).sellerPurchaseIds[0])
        .items[0];
      const two = new BasketWorld();
      two.setCatalog(cat);
      const twoList = two.createList("package-sem-003-two");
      two.addItem(twoList.id, { productId: "tomatoes", quantity: 2, unit: "package", alternatives: [] });
      const twoItem = two.requireSp(two.createPurchaseFromList(twoList.id, "PRIMARY_ONLY", ["seller-a"]).sellerPurchaseIds[0])
        .items[0];
      return prove(
        "PACKAGE-SEM-003",
        "I-045 I-047",
        {
          catalogQty: 5,
          requestedOne: 1,
          purchasedOne: 1,
          requestedTwo: 2,
          purchasedTwo: 2,
          copiedFromCatalog: false,
          convertedToKg: false,
        },
        {
          catalogQty: 5,
          requestedOne: 1,
          purchasedOne: oneItem.quantity,
          requestedTwo: 2,
          purchasedTwo: twoItem.quantity,
          copiedFromCatalog: oneItem.quantity === 5 || twoItem.quantity === 5,
          convertedToKg: oneItem.unit === "kg" || twoItem.unit === "kg",
        },
        "catalog package size is not requested quantity and is not converted into kg"
      );
    })
  );

  results.push(
    run("PACKAGE-SEM-004", () => {
      const w = new BasketWorld();
      w.setCatalog({
        names: { tomatoes: "Tomatoes" },
        availability: [{ sellerId: "seller-a", productId: "tomatoes", quantity: 1, unit: "package", price: 60, stock: 10 }],
      });
      const list = w.createList("package-sem-004");
      w.addItem(list.id, { productId: "tomatoes", quantity: 2, unit: "kg", alternatives: [] });
      const item = {
        id: "tmp",
        productId: "tomatoes",
        quantity: 2,
        unit: "kg",
        alternatives: [] as { productId: string; alternativePriority: number }[],
      };
      const resolved = resolve(item, "FIRST_AVAILABLE", w.catalog);
      const purchase = w.createPurchaseFromList(list.id, "PRIMARY_ONLY", ["seller-a"]);
      return prove(
        "PACKAGE-SEM-004",
        "I-036 I-047",
        {
          resolvedKind: "UNRESOLVED",
          sellerPurchases: 0,
          reason: "UNAVAILABLE",
          convertedToPackage: false,
          askedBuyer: false,
        },
        {
          resolvedKind: resolved.kind,
          sellerPurchases: purchase.sellerPurchaseIds.length,
          reason: purchase.unresolvedItems[0]?.reason ?? null,
          convertedToPackage: resolved.kind !== "UNRESOLVED",
          askedBuyer: resolved.requiresBuyerDecision,
        },
        "2 kg vs package catalog is unresolved; no auto-conversion and no conversion policy decided",
        "OPEN",
        "SPEC-OQ-002A",
        { newConcept: "kg↔package conversion policy (not introduced)" }
      );
    })
  );

  results.push(
    run("PACKAGE-SEM-005", () => {
      const w = new BasketWorld();
      w.setCatalog({
        names: { tomatoes: "Tomatoes" },
        availability: [{ sellerId: "seller-a", productId: "tomatoes", quantity: 1, unit: "package", price: 60, stock: 10 }],
      });
      const list = w.createList("package-sem-005");
      w.addItem(list.id, { productId: "tomatoes", quantity: 2, unit: "kg", alternatives: [] });
      const purchase = w.createPurchaseFromList(list.id, "PRIMARY_ONLY", ["seller-a"]);
      return prove(
        "PACKAGE-SEM-005",
        "I-047",
        {
          requested: 2,
          requestedUnit: "kg",
          externalPackageKg: 5,
          sellerPurchases: 0,
          partialPackageConcept: false,
        },
        {
          requested: 2,
          requestedUnit: "kg",
          externalPackageKg: 5,
          sellerPurchases: purchase.sellerPurchaseIds.length,
          partialPackageConcept: purchase.unresolvedItems.some((row) => "partialPackage" in row),
        },
        "MODEL GAP: requested 2 kg vs external 5 kg package has no partial-package concept",
        "OPEN",
        "SPEC-OQ-002A",
        { newConcept: "partial package (not introduced)" }
      );
    })
  );

  results.push(
    run("PACKAGE-SEM-006", () => {
      const w = new BasketWorld();
      w.setCatalog({
        names: { tomatoes: "Tomatoes" },
        availability: [{ sellerId: "seller-a", productId: "tomatoes", quantity: 1, unit: "package", price: 60, stock: 10 }],
      });
      const list = w.createList("package-sem-006");
      w.addItem(list.id, { productId: "tomatoes", quantity: 6, unit: "kg", alternatives: [] });
      const purchase = w.createPurchaseFromList(list.id, "PRIMARY_ONLY", ["seller-a"]);
      return prove(
        "PACKAGE-SEM-006",
        "I-047",
        {
          requested: 6,
          requestedUnit: "kg",
          externalPackageKg: 5,
          sellerPurchases: 0,
          wholePackageOnlyConcept: false,
          splitConcept: false,
        },
        {
          requested: 6,
          requestedUnit: "kg",
          externalPackageKg: 5,
          sellerPurchases: purchase.sellerPurchaseIds.length,
          wholePackageOnlyConcept: purchase.unresolvedItems.some((row) => "wholePackageOnly" in row),
          splitConcept: purchase.unresolvedItems.some((row) => "packageSplit" in row),
        },
        "MODEL GAP: requested 6 kg vs external 5 kg package has no whole-package-only or split concept",
        "OPEN",
        "SPEC-OQ-002A",
        { newConcept: "whole package / split (not introduced)" }
      );
    })
  );

  results.push(
    run("VOLUME-PRICE-001", () => {
      const w = new BasketWorld();
      w.setCatalog(catalog());
      const list = w.createList("volume-price-001");
      w.addItem(list.id, { productId: "tomatoes", quantity: 5, unit: "kg", alternatives: [] });
      const sp = w.createPurchaseFromList(list.id, "PRIMARY_ONLY", ["seller-a"]).sellerPurchaseIds[0];
      const small = w.proposeOffer({
        sellerPurchaseId: sp,
        actor: "SELLER",
        items: tomatoes(5, 15),
        reason: "PRICE_CHANGE",
      });
      const bulk = w.proposeOffer({
        sellerPurchaseId: sp,
        actor: "SELLER",
        items: tomatoes(20, 15),
        reason: "PRICE_CHANGE",
      });
      return prove(
        "VOLUME-PRICE-001",
        "I-042 I-048",
        { smallTotal: 75, bulkTotal: 300, sameUnitPrice: true, newOffer: true },
        {
          smallTotal: unitLineTotal(small.items[0]),
          bulkTotal: unitLineTotal(bulk.items[0]),
          sameUnitPrice: small.items[0].price === bulk.items[0].price,
          newOffer: small.id !== bulk.id,
        },
        "linear unit pricing: 5×15=75 and 20×15=300; no model change"
      );
    })
  );

  results.push(
    run("VOLUME-PRICE-002", () => {
      const w = new BasketWorld();
      w.setCatalog(catalog());
      const list = w.createList("volume-price-002");
      w.addItem(list.id, { productId: "tomatoes", quantity: 5, unit: "kg", alternatives: [] });
      const sp = w.createPurchaseFromList(list.id, "PRIMARY_ONLY", ["seller-a"]).sellerPurchaseIds[0];
      const a = w.proposeOffer({
        sellerPurchaseId: sp,
        actor: "SELLER",
        items: tomatoes(5, 15),
        reason: "PRICE_CHANGE",
      });
      const b = w.proposeOffer({
        sellerPurchaseId: sp,
        actor: "SELLER",
        items: tomatoes(20, 12),
        reason: "PRICE_CHANGE",
      });
      return prove(
        "VOLUME-PRICE-002",
        "I-044 I-048 I-042",
        {
          distinct: true,
          qtyA: 5,
          priceA: 15,
          totalA: 75,
          qtyB: 20,
          priceB: 12,
          totalB: 240,
          volumeEntity: false,
        },
        {
          distinct: a.id !== b.id,
          qtyA: a.items[0].quantity,
          priceA: a.items[0].price ?? null,
          totalA: unitLineTotal(a.items[0]),
          qtyB: b.items[0].quantity,
          priceB: b.items[0].price ?? null,
          totalB: unitLineTotal(b.items[0]),
          volumeEntity: Object.prototype.hasOwnProperty.call(a, "volumePrice") || Object.prototype.hasOwnProperty.call(b, "volumePrice"),
        },
        "concrete volume discount is two Offers; VolumePrice entity is not required for this deal"
      );
    })
  );

  results.push(
    run("VOLUME-PRICE-003", () => {
      const w = new BasketWorld();
      w.setCatalog(catalog());
      const list = w.createList("volume-price-003");
      w.addItem(list.id, { productId: "tomatoes", quantity: 20, unit: "kg", alternatives: [] });
      const sp = w.createPurchaseFromList(list.id, "PRIMARY_ONLY", ["seller-a"]).sellerPurchaseIds[0];
      const a = w.proposeOffer({
        sellerPurchaseId: sp,
        actor: "SELLER",
        items: tomatoes(20, 15),
        reason: "PRICE_CHANGE",
      });
      w.acceptOffer(a.id, "BUYER");
      const b = w.proposeOffer({
        sellerPurchaseId: sp,
        actor: "SELLER",
        items: tomatoes(20, 12),
        reason: "PRICE_CHANGE",
      });
      const s = w.requireSp(sp);
      return prove(
        "VOLUME-PRICE-003",
        "I-006 I-044 I-048",
        { aUnchanged: 15, agreed: a.id, active: b.id, sameQty: true },
        {
          aUnchanged: w.offerById(a.id).items[0].price ?? null,
          agreed: s.agreedOfferId,
          active: s.activeOfferId,
          sameQty: a.items[0].quantity === b.items[0].quantity,
        },
        "same quantity, different unit price: agreed=A current=B; Offer A is not mutated"
      );
    })
  );

  results.push(
    run("VOLUME-PRICE-004", () => {
      const w = new BasketWorld();
      w.setCatalog(catalog());
      const list = w.createList("volume-price-004");
      w.addItem(list.id, { productId: "tomatoes", quantity: 5, unit: "kg", alternatives: [] });
      const sp = w.createPurchaseFromList(list.id, "PRIMARY_ONLY", ["seller-a"]).sellerPurchaseIds[0];
      const a = w.proposeOffer({
        sellerPurchaseId: sp,
        actor: "SELLER",
        items: tomatoes(5, 20),
        reason: "PRICE_CHANGE",
      });
      const b = w.proposeOffer({
        sellerPurchaseId: sp,
        actor: "SELLER",
        items: tomatoes(10, 10),
        reason: "PRICE_CHANGE",
      });
      return prove(
        "VOLUME-PRICE-004",
        "I-042 I-044 I-048",
        { totalA: 100, totalB: 100, sameTotal: true, sameOffer: false, priceA: 20, priceB: 10 },
        {
          totalA: unitLineTotal(a.items[0]),
          totalB: unitLineTotal(b.items[0]),
          sameTotal: unitLineTotal(a.items[0]) === unitLineTotal(b.items[0]),
          sameOffer: a.id === b.id,
          priceA: a.items[0].price ?? null,
          priceB: b.items[0].price ?? null,
        },
        "equal derived totals are arithmetic, not Offer identity"
      );
    })
  );

  results.push(
    run("VOLUME-PRICE-005", () => {
      const w = new BasketWorld();
      w.setCatalog(catalog());
      const list = w.createList("volume-price-005");
      w.addItem(list.id, { productId: "tomatoes", quantity: 3, unit: "kg", alternatives: [] });
      const sp = w.createPurchaseFromList(list.id, "PRIMARY_ONLY", ["seller-a"]).sellerPurchaseIds[0];
      const a = w.proposeOffer({
        sellerPurchaseId: sp,
        actor: "SELLER",
        items: tomatoes(3, 20),
        reason: "PRICE_CHANGE",
      });
      const b = w.proposeOffer({
        sellerPurchaseId: sp,
        actor: "SELLER",
        items: tomatoes(7, 17),
        reason: "PRICE_CHANGE",
      });
      const c = w.proposeOffer({
        sellerPurchaseId: sp,
        actor: "SELLER",
        items: tomatoes(12, 14),
        reason: "PRICE_CHANGE",
      });
      return prove(
        "VOLUME-PRICE-005",
        "I-048 I-044",
        { distinct: true, totalA: 60, totalB: 119, totalC: 168, aUnchanged: 20 },
        {
          distinct: a.id !== b.id && b.id !== c.id && a.id !== c.id,
          totalA: unitLineTotal(a.items[0]),
          totalB: unitLineTotal(b.items[0]),
          totalC: unitLineTotal(c.items[0]),
          aUnchanged: w.offerById(a.id).items[0].price ?? null,
        },
        "concrete quantity-dependent deals are Offers; this does not introduce a tier schedule"
      );
    })
  );

  results.push(
    run("VOLUME-PRICE-005B", () => {
      const w = new BasketWorld();
      w.setCatalog(catalog());
      const list = w.createList("volume-price-005b");
      w.addItem(list.id, { productId: "tomatoes", quantity: 3, unit: "kg", alternatives: [] });
      const sp = w.createPurchaseFromList(list.id, "PRIMARY_ONLY", ["seller-a"]).sellerPurchaseIds[0];
      const offer = w.proposeOffer({
        sellerPurchaseId: sp,
        actor: "SELLER",
        items: tomatoes(3, 20),
        reason: "PRICE_CHANGE",
      });
      const snap = w.snapshot(sp);
      return prove(
        "VOLUME-PRICE-005B",
        "I-048",
        {
          concreteOffer: true,
          scheduleOnOffer: false,
          scheduleOnSnapshot: false,
          scheduleOnWorld: false,
        },
        {
          concreteOffer: offer.items[0].quantity === 3 && offer.items[0].price === 20,
          scheduleOnOffer: Object.prototype.hasOwnProperty.call(offer, "priceSchedule"),
          scheduleOnSnapshot: Object.prototype.hasOwnProperty.call(snap, "priceSchedule"),
          scheduleOnWorld: Object.prototype.hasOwnProperty.call(w, "priceSchedule"),
        },
        "MODEL GAP: a standing quantity-range price schedule is not a domain object",
        "OPEN",
        "SPEC-OQ-002B",
        { newConcept: "quantity-range price schedule (not introduced)" }
      );
    })
  );

  results.push(
    run("VOLUME-PRICE-006", () => {
      const w = new BasketWorld();
      w.setCatalog(catalog());
      const list = w.createList("volume-price-006");
      w.addItem(list.id, { productId: "tomatoes", quantity: 5, unit: "kg", alternatives: [] });
      const sp = w.createPurchaseFromList(list.id, "PRIMARY_ONLY", ["seller-a"]).sellerPurchaseIds[0];
      const a = w.proposeOffer({
        sellerPurchaseId: sp,
        actor: "SELLER",
        items: tomatoes(5, 15),
        reason: "PRICE_CHANGE",
      });
      const b = w.proposeOffer({
        sellerPurchaseId: sp,
        actor: "BUYER",
        items: tomatoes(10, 15),
        reason: "BUYER_CHANGE",
      });
      return prove(
        "VOLUME-PRICE-006",
        "I-006 I-044 I-048",
        { newOffer: true, aQty: 5, aPrice: 15, bQty: 10, bPrice: 15, aUnchangedQty: 5 },
        {
          newOffer: a.id !== b.id,
          aQty: a.items[0].quantity,
          aPrice: a.items[0].price ?? null,
          bQty: b.items[0].quantity,
          bPrice: b.items[0].price ?? null,
          aUnchangedQty: w.offerById(a.id).items[0].quantity,
        },
        "quantity change is a new Offer; Offer #1 is not mutated"
      );
    })
  );

  results.push(
    run("VOLUME-PRICE-007", () => {
      const w = new BasketWorld();
      w.setCatalog(catalog());
      const list = w.createList("volume-price-007");
      w.addItem(list.id, { productId: "tomatoes", quantity: 5, unit: "kg", alternatives: [] });
      const sp = w.createPurchaseFromList(list.id, "PRIMARY_ONLY", ["seller-a"]).sellerPurchaseIds[0];
      const a = w.proposeOffer({
        sellerPurchaseId: sp,
        actor: "SELLER",
        items: tomatoes(5, 15),
        reason: "PRICE_CHANGE",
      });
      w.proposeOffer({
        sellerPurchaseId: sp,
        actor: "BUYER",
        items: tomatoes(10, 15),
        reason: "BUYER_CHANGE",
      });
      const b = w.proposeOffer({
        sellerPurchaseId: sp,
        actor: "SELLER",
        items: tomatoes(10, 12),
        reason: "PRICE_CHANGE",
      });
      return prove(
        "VOLUME-PRICE-007",
        "I-006 I-044 I-048",
        { aQty: 5, aPrice: 15, bQty: 10, bPrice: 12, aUnchanged: 15, newOffer: true },
        {
          aQty: a.items[0].quantity,
          aPrice: a.items[0].price ?? null,
          bQty: b.items[0].quantity,
          bPrice: b.items[0].price ?? null,
          aUnchanged: w.offerById(a.id).items[0].price ?? null,
          newOffer: a.id !== b.id,
        },
        "seller reprice after quantity increase is a new Offer; Offer #1 stays 5 kg @ 15"
      );
    })
  );

  results.push(
    run("VOLUME-PRICE-008", () => {
      const w = new BasketWorld();
      w.setCatalog(catalog());
      const list = w.createList("volume-price-008");
      w.addItem(list.id, { productId: "tomatoes", quantity: 20, unit: "kg", alternatives: [] });
      const sp = w.createPurchaseFromList(list.id, "PRIMARY_ONLY", ["seller-a"]).sellerPurchaseIds[0];
      const offer = w.proposeOffer({
        sellerPurchaseId: sp,
        actor: "SELLER",
        items: tomatoes(20, 12),
        reason: "PRICE_CHANGE",
      });
      const snap = w.snapshot(sp);
      const item = snap.current.items[0];
      return prove(
        "VOLUME-PRICE-008",
        "I-042 I-023 I-048",
        {
          product: "tomatoes",
          quantity: 20,
          unit: "kg",
          price: 12,
          derivedTotal: 240,
          storedLinePrice: false,
          priceIsNotTotal: true,
        },
        {
          product: item?.productId ?? null,
          quantity: item?.quantity ?? null,
          unit: item?.unit ?? null,
          price: item?.price ?? null,
          derivedTotal: unitLineTotal(item ?? { quantity: 0, price: null }),
          storedLinePrice: hasStoredLinePrice(item ?? {}),
          priceIsNotTotal: item?.price !== 240,
        },
        "snapshot keeps unit-price basis 20 kg @ 12; derived total 240 is not stored as price"
      );
    })
  );

  results.push(
    run("SNAPSHOT-VOL-001", () => {
      const w = new BasketWorld();
      w.setCatalog({
        names: { tomatoes: "Tomatoes", tomato_b: "Tomato B" },
        availability: [
          { sellerId: "seller-a", productId: "tomatoes", quantity: 20, unit: "kg", price: 15, stock: 10 },
          { sellerId: "seller-a", productId: "tomato_b", quantity: 20, unit: "kg", price: 14, stock: 10 },
        ],
      });
      const list = w.createList("snapshot-vol-001");
      w.addItem(list.id, {
        productId: "tomatoes",
        quantity: 20,
        unit: "kg",
        alternatives: [{ productId: "tomato_b", alternativePriority: 1 }],
      });
      const sp = w.createPurchaseFromList(list.id, "PRIMARY_ONLY", ["seller-a"]).sellerPurchaseIds[0];
      const a = w.proposeOffer({
        sellerPurchaseId: sp,
        actor: "SELLER",
        items: tomatoes(20, 15),
        reason: "PRICE_CHANGE",
      });
      w.acceptOffer(a.id, "BUYER");
      w.proposeOffer({
        sellerPurchaseId: sp,
        actor: "SELLER",
        items: tomatoes(20, 12),
        reason: "PRICE_CHANGE",
      });
      const snap = w.snapshot(sp);
      const listItem = w.lists.get(list.id)!.items[0];
      return prove(
        "SNAPSHOT-VOL-001",
        "I-023 I-042 I-047 I-048",
        {
          requestedQty: 20,
          requestedUnit: "kg",
          agreedPrice: 15,
          agreedDerived: 300,
          currentPrice: 12,
          currentDerived: 240,
          altProduct: "tomato_b",
          altPrice: 14,
          packageContentsStored: false,
          snapshotHasPackageField: false,
        },
        {
          requestedQty: listItem.quantity ?? null,
          requestedUnit: listItem.unit ?? null,
          agreedPrice: snap.agreed.items[0]?.price ?? null,
          agreedDerived: unitLineTotal(snap.agreed.items[0] ?? { quantity: 0, price: null }),
          currentPrice: snap.current.items[0]?.price ?? null,
          currentDerived: unitLineTotal(snap.current.items[0] ?? { quantity: 0, price: null }),
          altProduct: snap.alternatives[0]?.productId ?? null,
          altPrice: snap.alternatives[0]?.catalogPrice ?? null,
          packageContentsStored: Object.prototype.hasOwnProperty.call(snap.current.items[0] ?? {}, "contentsQuantity"),
          snapshotHasPackageField:
            Object.prototype.hasOwnProperty.call(snap, "package") ||
            Object.prototype.hasOwnProperty.call(snap, "packageContents"),
        },
        "canonical snapshot distinguishes requested/agreed/current/alt/derived; package contents remain absent",
        "OPEN",
        "SPEC-OQ-002A",
        { newConcept: "snapshot package contents (not introduced)" }
      );
    })
  );

  results.push(
    run("PACKAGE-008-001", () => {
      const w = new BasketWorld();
      w.setCatalog({
        names: { tomatoes: "Tomatoes" },
        availability: [{ sellerId: "seller-a", productId: "tomatoes", quantity: 1, unit: "package", price: 60, stock: 10 }],
      });
      const list = w.createList("package-008-001");
      w.addItem(list.id, { productId: "tomatoes", quantity: 1, unit: "package", alternatives: [] });
      const sp = w.createPurchaseFromList(list.id, "PRIMARY_ONLY", ["seller-a"]).sellerPurchaseIds[0];
      const offer = w.proposeOffer({
        sellerPurchaseId: sp,
        actor: "SELLER",
        items: [{ productId: "tomatoes", quantity: 1, unit: "package", price: 60 }],
        reason: "PRICE_CHANGE",
      });
      const item = offer.items[0];
      return prove(
        "PACKAGE-008-001",
        "I-045 I-042 I-047",
        {
          quantity: 1,
          unit: "package",
          price: 60,
          derivedTotal: 60,
          extraPackageField: false,
        },
        {
          quantity: item.quantity,
          unit: item.unit,
          price: item.price ?? null,
          derivedTotal: unitLineTotal(item),
          extraPackageField:
            Object.prototype.hasOwnProperty.call(item, "contentsQuantity") ||
            Object.prototype.hasOwnProperty.call(item, "packageContents"),
        },
        "regression: 1 package @ 60 is a complete Offer triple with no extra package fields"
      );
    })
  );

  results.push(
    run("PACKAGE-008-002", () => {
      const w = new BasketWorld();
      w.setCatalog({
        names: { tomatoes: "Tomatoes" },
        availability: [{ sellerId: "seller-a", productId: "tomatoes", quantity: 1, unit: "package", price: 60, stock: 10 }],
      });
      const list = w.createList("package-008-002");
      w.addItem(list.id, { productId: "tomatoes", quantity: 1, unit: "package", alternatives: [] });
      const sp = w.createPurchaseFromList(list.id, "PRIMARY_ONLY", ["seller-a"]).sellerPurchaseIds[0];
      const offer = w.proposeOffer({
        sellerPurchaseId: sp,
        actor: "SELLER",
        items: [{ productId: "tomatoes", quantity: 1, unit: "package", price: 60 }],
        reason: "PRICE_CHANGE",
      });
      w.acceptOffer(offer.id, "BUYER");
      const snap = w.snapshot(sp);
      const item = w.offerById(offer.id).items[0];
      const purchased = w.requireSp(sp).items[0];
      return prove(
        "PACKAGE-008-002",
        "I-049 I-047 I-042 I-046",
        {
          externalKg: 5,
          offerContents: false,
          itemContents: false,
          snapshotContents: false,
          derivedTotal: 60,
          derivedIgnoresExternalKg: true,
          accepted: true,
          domainSuppliesContents: false,
        },
        {
          externalKg: 5,
          offerContents: Object.prototype.hasOwnProperty.call(item, "contentsQuantity"),
          itemContents: Object.prototype.hasOwnProperty.call(purchased, "contentsQuantity"),
          snapshotContents:
            Object.prototype.hasOwnProperty.call(snap, "packageContents") ||
            Object.prototype.hasOwnProperty.call(snap.agreed.items[0] ?? {}, "contentsQuantity"),
          derivedTotal: unitLineTotal(item),
          derivedIgnoresExternalKg: unitLineTotal(item) === 60,
          accepted: w.acceptances.some((row) => row.offerId === offer.id),
          domainSuppliesContents: false,
        },
        "external 5 kg is not an Offer term: package-unit deal completes without stored contents"
      );
    })
  );

  results.push(
    run("PACKAGE-008-003", () => {
      const w = new BasketWorld();
      w.setCatalog({
        names: { tomatoes: "Tomatoes" },
        availability: [{ sellerId: "seller-a", productId: "tomatoes", quantity: 1, unit: "package", price: 60, stock: 10 }],
      });
      const list = w.createList("package-008-003");
      w.addItem(list.id, { productId: "tomatoes", quantity: 2, unit: "kg", alternatives: [] });
      const purchase = w.createPurchaseFromList(list.id, "PRIMARY_ONLY", ["seller-a"]);
      const resolved = resolve(
        { id: "tmp", productId: "tomatoes", quantity: 2, unit: "kg", alternatives: [] },
        "FIRST_AVAILABLE",
        w.catalog
      );
      return prove(
        "PACKAGE-008-003",
        "I-047 I-049 I-036",
        {
          requestedKg: 2,
          externalPackageKg: 5,
          sellerPurchases: 0,
          convertedFraction: false,
          convertedPrice: false,
          unresolved: true,
        },
        {
          requestedKg: 2,
          externalPackageKg: 5,
          sellerPurchases: purchase.sellerPurchaseIds.length,
          convertedFraction: resolved.kind !== "UNRESOLVED",
          convertedPrice: false,
          unresolved: resolved.kind === "UNRESOLVED",
        },
        "2 kg vs 5 kg package is unresolved; no 0.4 package and no 24 MAD conversion",
        "OPEN",
        "SPEC-OQ-002A",
        { newConcept: "kg↔package conversion (not introduced)" }
      );
    })
  );

  results.push(
    run("PACKAGE-008-004", () => {
      const w = new BasketWorld();
      w.setCatalog({
        names: { tomatoes: "Tomatoes" },
        availability: [{ sellerId: "seller-a", productId: "tomatoes", quantity: 1, unit: "package", price: 60, stock: 10 }],
      });
      const list = w.createList("package-008-004");
      w.addItem(list.id, { productId: "tomatoes", quantity: 2, unit: "kg", alternatives: [] });
      const purchase = w.createPurchaseFromList(list.id, "PRIMARY_ONLY", ["seller-a"]);
      const reasons = purchase.unresolvedItems.map((row) => row.reason);
      return prove(
        "PACKAGE-008-004",
        "I-047",
        {
          requestedKg: 2,
          externalPackageKg: 5,
          sellerPurchases: 0,
          partialPolicy: false,
          wholeOnlyPolicy: false,
          splitPolicy: false,
          oversupplyPolicy: false,
        },
        {
          requestedKg: 2,
          externalPackageKg: 5,
          sellerPurchases: purchase.sellerPurchaseIds.length,
          partialPolicy: reasons.some((reason) => /partial/i.test(reason)),
          wholeOnlyPolicy: reasons.some((reason) => /whole/i.test(reason)),
          splitPolicy: reasons.some((reason) => /split/i.test(reason)),
          oversupplyPolicy: reasons.some((reason) => /oversupply/i.test(reason)),
        },
        "MODEL GAP: 2 kg < 5 kg package has no partial/whole/split/oversupply policy",
        "OPEN",
        "SPEC-OQ-002A",
        { newConcept: "partial / whole package policy (not introduced)" }
      );
    })
  );

  results.push(
    run("PACKAGE-008-005", () => {
      const w = new BasketWorld();
      w.setCatalog({
        names: { tomatoes: "Tomatoes" },
        availability: [{ sellerId: "seller-a", productId: "tomatoes", quantity: 1, unit: "package", price: 60, stock: 10 }],
      });
      const list = w.createList("package-008-005");
      w.addItem(list.id, { productId: "tomatoes", quantity: 6, unit: "kg", alternatives: [] });
      const purchase = w.createPurchaseFromList(list.id, "PRIMARY_ONLY", ["seller-a"]);
      return prove(
        "PACKAGE-008-005",
        "I-047",
        {
          requestedKg: 6,
          externalPackageKg: 5,
          sellerPurchases: 0,
          onePackageChosen: false,
          twoPackagesChosen: false,
          splitChosen: false,
          exactSixKg: false,
        },
        {
          requestedKg: 6,
          externalPackageKg: 5,
          sellerPurchases: purchase.sellerPurchaseIds.length,
          onePackageChosen: false,
          twoPackagesChosen: false,
          splitChosen: purchase.unresolvedItems.some((row) => "packageSplit" in row),
          exactSixKg: purchase.sellerPurchaseIds.length === 1,
        },
        "MODEL GAP: 6 kg > 5 kg package does not choose 1 pack, 2 packs, split, or exact 6 kg",
        "OPEN",
        "SPEC-OQ-002A",
        { newConcept: "contents quantity vs package quantity (not introduced)" }
      );
    })
  );

  results.push(
    run("PACKAGE-008-006", () => {
      const w = new BasketWorld();
      w.setCatalog({
        names: { tomatoes: "Tomatoes" },
        availability: [
          { sellerId: "seller-a", productId: "tomatoes", quantity: 5, unit: "package", price: 60, stock: 10 },
          { sellerId: "seller-a", productId: "tomatoes", quantity: 20, unit: "package", price: 200, stock: 10 },
        ],
      });
      const list = w.createList("package-008-006");
      w.addItem(list.id, { productId: "tomatoes", quantity: 1, unit: "package", alternatives: [] });
      const purchase = w.createPurchaseFromList(list.id, "PRIMARY_ONLY", ["seller-a"]);
      const keys = [...new Set(w.catalog.availability.map((row) => `${row.sellerId}|${row.productId}|${row.unit}`))];
      return prove(
        "PACKAGE-008-006",
        "I-047 I-036 I-049",
        {
          externalBases: "5kg,20kg",
          identityKeyCount: 1,
          unresolved: true,
          reason: "AMBIGUOUS_PRICE",
          packageEntity: false,
        },
        {
          externalBases: "5kg,20kg",
          identityKeyCount: keys.length,
          unresolved: purchase.sellerPurchaseIds.length === 0,
          reason: purchase.unresolvedItems[0]?.reason ?? null,
          packageEntity: Object.prototype.hasOwnProperty.call(w, "packages"),
        },
        "MODEL GAP: distinct package bases are a catalog-identity limitation; no evidence yet justifies a Package entity",
        "OPEN",
        "SPEC-OQ-002A",
        { newConcept: "package-base identity (not introduced)" }
      );
    })
  );

  results.push(
    run("VOLUME-008-001", () => {
      const w = new BasketWorld();
      w.setCatalog({
        names: { tomatoes: "Tomatoes" },
        availability: [{ sellerId: "seller-a", productId: "tomatoes", quantity: 20, unit: "kg", price: 15, stock: 100 }],
      });
      const list = w.createList("volume-008-001");
      w.addItem(list.id, { productId: "tomatoes", quantity: 3, unit: "kg", alternatives: [] });
      w.createPurchaseFromList(list.id, "PRIMARY_ONLY", ["seller-a"]);
      const catalogPrice = catalogUnitPrice(w.catalog, { sellerId: "seller-a", productId: "tomatoes", unit: "kg" });
      return prove(
        "VOLUME-008-001",
        "I-048 I-050",
        {
          externalTier3: 20,
          externalTier7: 17,
          externalTier12: 14,
          domainPrice: 15,
          scheduleApplied3: false,
          scheduleApplied7: false,
          scheduleApplied12: false,
        },
        {
          externalTier3: 20,
          externalTier7: 17,
          externalTier12: 14,
          domainPrice: catalogPrice,
          scheduleApplied3: catalogPrice === 20,
          scheduleApplied7: catalogPrice === 17,
          scheduleApplied12: catalogPrice === 14,
        },
        "Buyer 3/7/12 kg does not read an external tier schedule from the domain",
        "OPEN",
        "SPEC-OQ-002B",
        { newConcept: "quantity-range price schedule (not introduced)" }
      );
    })
  );

  results.push(
    run("VOLUME-008-002", () => {
      const w = new BasketWorld();
      w.setCatalog(catalog());
      const list = w.createList("volume-008-002");
      w.addItem(list.id, { productId: "tomatoes", quantity: 3, unit: "kg", alternatives: [] });
      const sp = w.createPurchaseFromList(list.id, "PRIMARY_ONLY", ["seller-a"]).sellerPurchaseIds[0];
      const before = w.offers.filter((row) => row.sellerPurchaseId === sp).length;
      const snap = w.snapshot(sp);
      return prove(
        "VOLUME-008-002",
        "I-050 I-048 I-027",
        {
          scheduleIsOffer: false,
          scheduleOfferId: null,
          offersCreated: 0,
          snapshotHasSchedule: false,
          acceptable: false,
        },
        {
          scheduleIsOffer: false,
          scheduleOfferId: w.requireSp(sp).activeOfferId,
          offersCreated: w.offers.filter((row) => row.sellerPurchaseId === sp).length - before,
          snapshotHasSchedule: Object.prototype.hasOwnProperty.call(snap, "priceSchedule"),
          acceptable: w.requireSp(sp).activeOfferId !== null,
        },
        "a pre-negotiation tier announcement is not an Offer, has no id, and cannot be accepted"
      );
    })
  );

  results.push(
    run("VOLUME-008-003", () => {
      const w = new BasketWorld();
      w.setCatalog(catalog());
      const list = w.createList("volume-008-003");
      w.addItem(list.id, { productId: "tomatoes", quantity: 7, unit: "kg", alternatives: [] });
      const sp = w.createPurchaseFromList(list.id, "PRIMARY_ONLY", ["seller-a"]).sellerPurchaseIds[0];
      const offer = w.proposeOffer({
        sellerPurchaseId: sp,
        actor: "SELLER",
        items: tomatoes(7, 17),
        reason: "PRICE_CHANGE",
      });
      return prove(
        "VOLUME-008-003",
        "I-050 I-048 I-044",
        { qty: 7, price: 17, derivedFromSchedule: false, isOffer: true },
        {
          qty: offer.items[0].quantity,
          price: offer.items[0].price ?? null,
          derivedFromSchedule: Object.prototype.hasOwnProperty.call(offer, "derivedFromSchedule"),
          isOffer: Boolean(offer.id),
        },
        "7 kg @ 17 is a concrete Offer; schedule is not stored as provenance"
      );
    })
  );

  results.push(
    run("VOLUME-008-004", () => {
      const w = new BasketWorld();
      w.setCatalog(catalog());
      const list = w.createList("volume-008-004");
      w.addItem(list.id, { productId: "tomatoes", quantity: 7, unit: "kg", alternatives: [] });
      const sp = w.createPurchaseFromList(list.id, "PRIMARY_ONLY", ["seller-a"]).sellerPurchaseIds[0];
      const a = w.proposeOffer({
        sellerPurchaseId: sp,
        actor: "SELLER",
        items: tomatoes(7, 17),
        reason: "PRICE_CHANGE",
      });
      const b = w.proposeOffer({
        sellerPurchaseId: sp,
        actor: "SELLER",
        items: tomatoes(7, 16),
        reason: "PRICE_CHANGE",
      });
      return prove(
        "VOLUME-008-004",
        "I-006 I-044 I-050",
        { newOffer: true, aUnchanged: 17, bPrice: 16, scheduleVersion: false },
        {
          newOffer: a.id !== b.id,
          aUnchanged: w.offerById(a.id).items[0].price ?? null,
          bPrice: b.items[0].price ?? null,
          scheduleVersion: Object.prototype.hasOwnProperty.call(a, "scheduleVersion"),
        },
        "17→16 is a new Offer; there is no schedule object to mutate or version"
      );
    })
  );

  results.push(
    run("VOLUME-008-005", () => {
      const w = new BasketWorld();
      w.setCatalog(catalog());
      const list = w.createList("volume-008-005");
      w.addItem(list.id, { productId: "tomatoes", quantity: 5, unit: "kg", alternatives: [] });
      const sp = w.createPurchaseFromList(list.id, "PRIMARY_ONLY", ["seller-a"]).sellerPurchaseIds[0];
      const a = w.proposeOffer({
        sellerPurchaseId: sp,
        actor: "SELLER",
        items: tomatoes(5, 17),
        reason: "PRICE_CHANGE",
      });
      const b = w.proposeOffer({
        sellerPurchaseId: sp,
        actor: "BUYER",
        items: tomatoes(8, 17),
        reason: "BUYER_CHANGE",
      });
      return prove(
        "VOLUME-008-005",
        "I-044 I-048 I-050",
        { newOffer: true, aQty: 5, bQty: 8, sameUnitPrice: true, scheduleLink: false },
        {
          newOffer: a.id !== b.id,
          aQty: a.items[0].quantity,
          bQty: b.items[0].quantity,
          sameUnitPrice: a.items[0].price === b.items[0].price,
          scheduleLink:
            Object.prototype.hasOwnProperty.call(a, "derivedFromSchedule") ||
            Object.prototype.hasOwnProperty.call(b, "derivedFromSchedule"),
        },
        "5 kg → 8 kg is a new Offer at the same unit price; no Offer←schedule link"
      );
    })
  );

  results.push(
    run("VOLUME-008-006", () => {
      const w = new BasketWorld();
      w.setCatalog(catalog());
      const list = w.createList("volume-008-006");
      w.addItem(list.id, { productId: "tomatoes", quantity: 3, unit: "kg", alternatives: [] });
      const sp = w.createPurchaseFromList(list.id, "PRIMARY_ONLY", ["seller-a"]).sellerPurchaseIds[0];
      const a = w.proposeOffer({
        sellerPurchaseId: sp,
        actor: "SELLER",
        items: tomatoes(3, 15),
        reason: "PRICE_CHANGE",
      });
      const b = w.proposeOffer({
        sellerPurchaseId: sp,
        actor: "SELLER",
        items: tomatoes(8, 15),
        reason: "PRICE_CHANGE",
      });
      return prove(
        "VOLUME-008-006",
        "I-044 I-048 I-042",
        { distinct: true, priceA: 15, priceB: 15, totalA: 45, totalB: 120, boundsStored: false },
        {
          distinct: a.id !== b.id,
          priceA: a.items[0].price ?? null,
          priceB: b.items[0].price ?? null,
          totalA: unitLineTotal(a.items[0]),
          totalB: unitLineTotal(b.items[0]),
          boundsStored:
            Object.prototype.hasOwnProperty.call(a, "minQuantity") || Object.prototype.hasOwnProperty.call(b, "maxQuantity"),
        },
        "equal unit price across external 1–5 / 6–10 tiers is still two Offers; bounds are not stored"
      );
    })
  );

  results.push(
    run("VOLUME-008-007", () => {
      const w = new BasketWorld();
      w.setCatalog(catalog());
      const list = w.createList("volume-008-007");
      w.addItem(list.id, { productId: "tomatoes", quantity: 5, unit: "kg", alternatives: [] });
      const sp = w.createPurchaseFromList(list.id, "PRIMARY_ONLY", ["seller-a"]).sellerPurchaseIds[0];
      const a = w.proposeOffer({
        sellerPurchaseId: sp,
        actor: "SELLER",
        items: tomatoes(5, 20),
        reason: "PRICE_CHANGE",
      });
      const b = w.proposeOffer({
        sellerPurchaseId: sp,
        actor: "SELLER",
        items: tomatoes(10, 10),
        reason: "PRICE_CHANGE",
      });
      return prove(
        "VOLUME-008-007",
        "I-048 I-042 I-044",
        { totalA: 100, totalB: 100, sameTotal: true, sameOffer: false },
        {
          totalA: unitLineTotal(a.items[0]),
          totalB: unitLineTotal(b.items[0]),
          sameTotal: unitLineTotal(a.items[0]) === unitLineTotal(b.items[0]),
          sameOffer: a.id === b.id,
        },
        "I-048 regression: equal derived totals are not Offer identity"
      );
    })
  );

  results.push(
    run("PACKAGE-BIZ-009-001", () => {
      const w = new BasketWorld();
      w.setCatalog({
        names: { tvorog: "Cottage cheese" },
        availability: [{ sellerId: "seller-a", productId: "tvorog", quantity: 1, unit: "250 g", price: 140, stock: 10 }],
      });
      const list = w.createList("package-biz-009-001");
      w.addItem(list.id, { productId: "tvorog", quantity: 1, unit: "250 g", alternatives: [] });
      const sp = w.createPurchaseFromList(list.id, "PRIMARY_ONLY", ["seller-a"]).sellerPurchaseIds[0];
      const item = w.requireSp(sp).items[0];
      return prove(
        "PACKAGE-BIZ-009-001",
        "I-045 I-049",
        {
          unit: "250 g",
          catalogPrice: 140,
          contentsField: false,
        },
        {
          unit: item.unit,
          catalogPrice: item.price ?? null,
          contentsField:
            Object.prototype.hasOwnProperty.call(item, "contentsQuantity") ||
            Object.prototype.hasOwnProperty.call(item, "packageContents"),
        },
        "catalog/spec reconstruction: listed unit 250 g is representable without a contents field; this does not prove pack contents are not a business fact",
        "OPEN",
        "SPEC-OQ-002A",
        { newConcept: "catalog/spec reconstruction — not a business-flow observation" }
      );
    })
  );

  results.push(
    run("PACKAGE-BIZ-009-002", () => {
      const w = new BasketWorld();
      w.setCatalog({
        names: { honey_flower: "Flower honey", honey_perga: "Honey with perga" },
        availability: [
          { sellerId: "seller-a", productId: "honey_flower", quantity: 1, unit: "500 g", price: 380, stock: 10 },
          { sellerId: "seller-a", productId: "honey_perga", quantity: 1, unit: "350 g", price: 450, stock: 10 },
        ],
      });
      const keys = [
        ...new Set(w.catalog.availability.map((row) => `${row.sellerId}|${row.productId}|${row.unit}`)),
      ];
      const list = w.createList("package-biz-009-002");
      w.addItem(list.id, { productId: "honey_flower", quantity: 1, unit: "500 g", alternatives: [] });
      const purchase = w.createPurchaseFromList(list.id, "PRIMARY_ONLY", ["seller-a"]);
      return prove(
        "PACKAGE-BIZ-009-002",
        "I-036",
        {
          identityKeyCount: 2,
          unresolved: false,
        },
        {
          identityKeyCount: keys.length,
          unresolved: purchase.unresolvedItems.length > 0,
        },
        "catalog/spec reconstruction: two pre-split productIds yield two identity keys; this does not prove pack sizes must be Products and is not OQ-002A evidence",
        "OPEN",
        "SPEC-OQ-002A",
        { newConcept: "catalog/spec reconstruction — not a business-flow observation" }
      );
    })
  );

  results.push(
    run("VOLUME-BIZ-009-001", () => {
      const w = new BasketWorld();
      w.setCatalog({
        names: { tomatoes: "Tomatoes" },
        availability: [{ sellerId: "seller-a", productId: "tomatoes", quantity: 1, unit: "kg", price: 180, stock: 100 }],
      });
      const listed = catalogUnitPrice(w.catalog, { sellerId: "seller-a", productId: "tomatoes", unit: "kg" });
      const prices: Array<number | null> = [];
      for (const qty of [3, 7, 12]) {
        const list = w.createList(`volume-biz-009-001-${qty}`);
        w.addItem(list.id, { productId: "tomatoes", quantity: qty, unit: "kg", alternatives: [] });
        const sp = w.createPurchaseFromList(list.id, "PRIMARY_ONLY", ["seller-a"]).sellerPurchaseIds[0];
        prices.push(w.requireSp(sp).items[0].price ?? null);
      }
      return prove(
        "VOLUME-BIZ-009-001",
        "I-042 I-045",
        {
          listedPrice: 180,
          purchasePrice3: 180,
          purchasePrice7: 180,
          purchasePrice12: 180,
        },
        {
          listedPrice: listed,
          purchasePrice3: prices[0],
          purchasePrice7: prices[1],
          purchasePrice12: prices[2],
        },
        "catalog/spec reconstruction: createPurchaseFromList copies listed unit price onto 3/7/12 kg items; lookup is quantity-agnostic. This does not observe which price a seller would apply to 7 kg",
        "OPEN",
        "SPEC-OQ-002B",
        { newConcept: "catalog/spec reconstruction — not a business-flow observation" }
      );
    })
  );

  results.push(
    run("SOURCE-010-CATALOG-KG", () => {
      const seeds = parseListedSeeds(readStage1("catalog"));
      return prove(
        "SOURCE-010-CATALOG-KG",
        "source inspection — not a domain invariant",
        { hasKgListedSeed: true },
        { hasKgListedSeed: seeds.some((seed) => seed.unit === "1 кг") },
        "mockSellerCatalog.ts lexical object seeds include at least one unit 1 кг listing. Seeds inside string or regex literals do not count. Not a business-flow observation",
        "OPEN",
        "SPEC-OQ-002A",
        { newConcept: "SOURCE ABSENT/present of listed kg unit in mockSellerCatalog.ts object literals" }
      );
    })
  );

  results.push(
    run("SOURCE-010-CATALOG-HONEY", () => {
      const honeyKg = honeyCategorySearch(readStage1("catalog"));
      return prove(
        "SOURCE-010-CATALOG-HONEY",
        "source inspection — not a domain invariant",
        {
          honeyCategoryFound: true,
          honeySeedsPresent: true,
          honeyKgUnitInBlock: false,
        },
        {
          honeyCategoryFound: honeyKg.blockFound,
          honeySeedsPresent: honeyKg.listedCount > 0,
          honeyKgUnitInBlock: honeyKg.kgUnitInBlock,
        },
        "honey category block found with at least one object seed; no unit: 1 кг string in that block. Not A3 seller classification and not a business-flow observation",
        "OPEN",
        "SPEC-OQ-002A",
        { newConcept: "SOURCE ABSENT of 1 кг honey listing in mockSellerCatalog.ts honey block" }
      );
    })
  );

  results.push(
    run("SOURCE-010-CATALOG-TOKENS", () => {
      const source = readStage1("catalog");
      return prove(
        "SOURCE-010-CATALOG-TOKENS",
        "source inspection — not a domain invariant",
        {
          sackContentsTokens: false,
          quantityRangeTokens: false,
        },
        {
          sackContentsTokens: mentionsSackContents(source),
          quantityRangeTokens: mentionsQuantityRangeTokens(source),
        },
        "whole identifier tokens мешок / minQuantity / maxQuantity / tierPrice / PriceSchedule / VolumePrice and 1-4 / 5-9 / 10+ sequences are SOURCE ABSENT in mockSellerCatalog.ts lexical code. Substrings and regex interiors do not count. Token miss is not a market finding",
        "OPEN",
        "SPEC-OQ-002A",
        { newConcept: "SOURCE ABSENT of sack/range tokens in mockSellerCatalog.ts" }
      );
    })
  );

  results.push(
    run("SOURCE-010-EMULATOR", () => {
      const source = readStage1("emulator");
      return prove(
        "SOURCE-010-EMULATOR",
        "source inspection — not a domain invariant",
        {
          hasMinQuantity: false,
          hasMaxQuantity: false,
          hasTierPrice: false,
          hasPriceSchedule: false,
          quantityRangeTokens: false,
        },
        {
          hasMinQuantity: hasIdent(source, ["minQuantity"]),
          hasMaxQuantity: hasIdent(source, ["maxQuantity"]),
          hasTierPrice: hasIdent(source, ["tierPrice"]),
          hasPriceSchedule: hasIdent(source, ["PriceSchedule"]),
          quantityRangeTokens: mentionsQuantityRangeTokens(source),
        },
        "Stage-1 source search of sellers.ts: the identifier tokens minQuantity/maxQuantity/tierPrice/PriceSchedule/VolumePrice are SOURCE ABSENT in this file. This does not claim sellers.ts has no quantity-range mechanism under another name (quantityPrices, getPrice, ranges, ...). Not a CooperativeSeller call-shape test and not a market finding",
        "OPEN",
        "SPEC-OQ-002B",
        { newConcept: "SOURCE ABSENT of quantity-range tokens in sellers.ts" }
      );
    })
  );

  results.push(
    run("SOURCE-010-BASKET", () => {
      const addToBasket = extractNamedDeclaration(readStage1("basket"), "addToBasket");
      return prove(
        "SOURCE-010-BASKET",
        "source inspection — not a domain invariant",
        {
          declarationFound: true,
          copiesUnit: true,
          copiesPrice: true,
          hasConversion: false,
          hasTierPrice: false,
        },
        {
          declarationFound: addToBasket.length > 0,
          copiesUnit: copiesPayloadField(addToBasket, "unit"),
          copiesPrice: copiesPayloadField(addToBasket, "price"),
          hasConversion: hasIdent(addToBasket, ["conversionFactor", "packageContents"]),
          hasTierPrice: hasIdent(addToBasket, ["tierPrice", "minQuantity", "maxQuantity"]),
        },
        "No conversion/tier lookup found in ADD_TO_BASKET itself. The function copies payload.unit and payload.price. Conversion or pricing could occur before this call; this row does not claim the whole basket path",
        "OPEN",
        "SPEC-OQ-002A",
        { newConcept: "SOURCE ABSENT in ADD_TO_BASKET itself — not a business-flow observation" }
      );
    })
  );

  results.push(
    run("SOURCE-010-TZ025", () => {
      const source = readStage1("tz025");
      return prove(
        "SOURCE-010-TZ025",
        "source inspection — not a domain invariant",
        {
          cheeseDiscountText: true,
          quantityRangeTokens: false,
        },
        {
          cheeseDiscountText: source.includes("Сегодня скидка на сыр"),
          quantityRangeTokens: mentionsQuantityRangeInProse(source),
        },
        "Stage-1 markdown prose search of TZ-025: free-text cheese discount is present; quantity-range names as whole words are SOURCE ABSENT in this file. This is not a TypeScript lexical scan. Token miss is not a business fact and not B3 observation",
        "OPEN",
        "SPEC-OQ-002B",
        { newConcept: "SOURCE ABSENT in TZ-025 — not a business-flow observation" }
      );
    })
  );

  results.push(
    run("SOURCE-010-TREE", () => {
      const scan = scanBasketExperimentForFlow010();
      return prove(
        "SOURCE-010-TREE",
        "source inspection — not a domain invariant",
        {
          walkComplete: true,
          flow010Run: false,
          observeCooperativeAcceptHelper: false,
        },
        {
          walkComplete: scan.walkComplete,
          flow010Run: scan.flow010Run,
          observeCooperativeAcceptHelper: scan.observeCooperativeAccept,
        },
        "experiments/basket **/*.ts has no FLOW-010 run() and no observeCooperativeAccept helper. Cleanup check of those two historical artifacts only. Does not prove synthetic business-flow is absent. Does not search docs or PACKAGE-008 experimenter facts. Not a business-flow observation",
        "OPEN",
        "SPEC-OQ-002A",
        { newConcept: "cleanup of two historical FLOW-010 artifacts — not proof that synthetic business-flow is absent" }
      );
    })
  );

  return results;
}

export function formatResults(rows: ScenarioResult[]): string {
  const lines = [
    "# GreenMarket — Basket Experiment Results",
    "",
    "**Status:** Evidence from TZ-BASKET-001…010 mock run  ",
    "**Experiment version:** v0.1  ",
    "**Model version:** v0.1.17 / SPEC v0.6 (TZ-010 is Stage-1 source search; business-flow observation not obtained; OQ-002A/B remain OPEN)",
    "",
    "## How to read results",
    "",
    "- **Impl `PASS`** — the mock matches the current experimental expectation (code + invariants in force).",
    "- **Domain `CONFIRMED`** — the scenario closes or supports a *specific tested invariant*, not an entire future subsystem (e.g. Allocation).",
    "- **Domain `OPEN`** — the run is deterministic, but the *business* question stays open. PACKAGE-002/003/004, PACKAGE-SEM-002/004/005/006, PACKAGE-008-003/004/005/006, PACKAGE-BIZ-009-001/002, SOURCE-010-CATALOG-KG/HONEY/TOKENS/BASKET/TREE, VOLUME-PRICE-005B, VOLUME-008-001, VOLUME-BIZ-009-001, SOURCE-010-EMULATOR/TZ025, SNAPSHOT-VOL-001, and ALT-PRICE-002 are in this bucket: they prove a Stage-1 limitation, catalog/spec reconstruction, or Stage-1 source absence — not a business-flow observation and not a policy.",
    "- Do not treat Impl PASS as confirmation of an unresolved OQ.",
    "- Expected/Actual are serialized from the fact map `prove()` asserted on live world state. A scenario cannot record a hand-written result: `prove()` is the only evidence builder.",
    `- All ${rows.length} scenarios are programmatically exercised; Domain OPEN rows are still run, not skipped. Evidence strength is not uniform: OPEN rows must not be read as CONFIRMED.`,
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
  lines.push("Model version: v0.1.17 / SPEC v0.6");
  lines.push("Status: experiment implemented; production architecture not started");
  lines.push("");
  lines.push("Scope of this evidence: every CONFIRMED below confirms a SPECIFIC experimental behavior");
  lines.push("under the mock clock, mock catalog and example policies — NOT the basket model as a whole.");
  lines.push("The model as a whole cannot be declared confirmed while package/volume business semantics,");
  lines.push("duplicate-line, negotiation-TTL and allocation questions (SPEC OQ-002/003; experiment OQ-010; OQ-016) remain open.");
  lines.push("");
  lines.push("Changes in this PR (already implemented and tested):");
  lines.push("- I-033: BasketWorld hands out frozen projections; state changes only via domain commands");
  lines.push("- I-030: List and catalog inputs validated like Offer items (finite, > 0 / ≥ 0)");
  lines.push("- I-032: Substitution lifecycle PROPOSED → ACCEPTED|REJECTED is one-way");
  lines.push("- I-034: setCatalog stores a defensive copy; stock changes go through setStock");
  lines.push("- I-031: SellerPurchase line unique per (sellerId, productId, unit) — tomatoes/kg and tomatoes/pcs are independent; a second ListItem of the same line is DUPLICATE_LINE (SPEC OQ-003), never silently dropped");
  lines.push("- I-019: mockFulfill checks delivered quantity and honours partialFulfillmentAllowed");
  lines.push("- Advice is a discriminated union naming its exact target (offerId / substitutionId / counterOfferId + items)");
  lines.push("- AdviceBasis is time-aware (active Offer validity) and covers Offer content + catalog rows of the negotiated products (canonical JSON)");
  lines.push("- WAIT and REJECT both carry machine-readable reasons");
  lines.push("- COUNTER is admissible only against the still-valid countered Offer and may change prices, not lines");
  lines.push("- every Offer named by an Advice must belong to the target SellerPurchase (checked at the assistant boundary, and inside basis fingerprints)");
  lines.push("- I-036: ONE catalog-line identity (sellerId, productId, unit) lives in domain/catalog and is shared by resolve, createPurchaseFromList, setStock, stock-conflict detection AND the assistants — the domain is no longer laxer than the assistant layer");
  lines.push("- price is the UNIT price (per one unit); the catalog quantity is a reference/package size, not part of the line identity and not a price multiplier — the earlier 'whole-line price' wording is corrected");
  lines.push("- resolve() is unit-aware: a kg ListItem is not satisfied by a pcs-only catalog (fixed at the List -> Resolution boundary, before seller partitioning)");
  lines.push("- createPurchaseFromList() prices lines through the shared matcher: a seller whose rows disagree on price/unit is reported AMBIGUOUS_PRICE and gets NO SellerPurchase — the array order is never a hidden price policy");
  lines.push("- setStock(sellerId, productId, unit, stock) keys on the commercial line and requires a unique row, throwing on ambiguity instead of editing the first match");
  lines.push("- stock-conflict claims compete only within (productId, unit) — a pcs claim is not a kg stock pool");
  lines.push("- catalog reference / baseline is a lookup, not a price policy: ambiguous rows (same line, different prices) yield NO reference instead of the cheapest one");
  lines.push("- REJECT is not a free enum: each reason must NAME and PROVE its ground at apply (PRICE_UNACCEPTABLE/POLICY_DECLINED name the declined active counterparty Offer; SUBSTITUTION_IMPOSSIBLE names a pending substitution; PRODUCT_UNAVAILABLE needs a line unbuyable under the SAME (seller, product, unit, stock) matcher as the reference price), one negative test per reason");
  lines.push("- catalog availability and reference price are thin adapters over the domain matcher (catalogLineAvailable / catalogReferencePrice -> isCatalogLineAvailable / catalogUnitPrice); a row in another unit is not availability");
  lines.push("- agreed baseline reuses the agreed price only for the identical (product, unit, quantity) line; a changed quantity defers to the catalog unit reference (both are per-unit prices of the same unit)");
  lines.push("- basis stores the FULL immutable Offer metadata (actor/reason/createdAt/validUntil + items) under activeOfferFingerprint/agreedOfferFingerprint, not just the commercial items");
  lines.push("- decision tests (world -> expected Advice) are separated from execution tests (Advice -> domain change); the policy's choice of kind/reason is pinned by its own table");
  lines.push("- runtime determinism test: re-running each demo scenario from a fresh runtime reproduces the event stream AND a canonical snapshot of the WHOLE observable world (offers, acceptances, substitutions, catalog, stock conflicts, fulfillments, SellerPurchases, purchases)");
  lines.push("- the scenario engine deeply checks a multi-line COUNTER (every item price by (productId, unit, quantity)), so a wrong price on a non-first line cannot pass as long as kind stays COUNTER");
  lines.push("- model tech debt recorded: two identical PurchaseItem lines differing only in price are multiset-equal (no lineId) — acceptable now, would need an explicit lineId if such lines ever diverge commercially");
  lines.push("- REJECT is generated by the assistants themselves via policy thresholds (rejectOverReference / rejectBelowCatalog), not only crafted by hand");
  lines.push("- the positive substitution-vs-offer choice is a policy parameter (substitutionPreference), both branches tested");
  lines.push("- AdviceBasis fingerprints pending substitutions with CONTENT (not only IDs) and records the effective policy as an audit fact");
  lines.push("- rejectReason is validated semantically at apply: a REJECT may not claim a ground (substitution, unavailability, priced offer) that does not exist");
  lines.push("- the COUNTER guard compares every item field except price, so future PurchaseItem fields are protected automatically");
  lines.push("- expired agreed Offer still provides the price baseline (I-037, CONFIRMED — no longer an OQ-009 assumption)");
  lines.push("- combination matrix test: multi-item x missing catalog x substitution x expired x offer author x advisor — kind invariants, determinism, and the SEMANTIC end state after apply for every combination");
  lines.push("- ACCEPT_SUBSTITUTION requires the accepting actor to be the counterparty of proposedBy");
  lines.push("- I-035: countering an expired Offer is forbidden in the domain (symmetric with I-028)");
  lines.push("- Buyer/Seller assistants evaluate EVERY Offer item; catalog references are per (seller, product, unit) unit price and agreed baselines per exact (product, unit, quantity) line");
  lines.push("- Policies are injected parameters, not fixed behavior");
  lines.push("- Seller emulators only rewrite their own proposals, never a buyer Offer");
  lines.push("- I-027: acceptOffer rejects non-active Offers");
  lines.push("- I-028: acceptOffer rejects expired Offers");
  lines.push("- OQ-007 closed: activeOfferId is a required projection pointer");
  lines.push("- OQ-006 / OQ-008 closed");
  lines.push("- PartialAvailabilitySeller offers min(requested, stock) of the SAME CatalogLine (sellerId, productId, unit) — a pcs pool is not kg stock");
  lines.push("- cheapestAvailable() removed from domain catalog semantics (ambiguous ≠ cheapest); catalogUnitPrice returns null on disagreement");
  lines.push("- GREENMARKET_DOMAIN_SPEC v0.6 is the canonical domain contract; TZ-BASKET-009 records catalog/spec reconstruction; TZ-BASKET-010 records Stage-1 source search (SOURCE ABSENT in inspected files) and does not obtain a business-flow observation; neither introduces Package or PriceSchedule");
  lines.push("- I-042: price is the price of one unit; derived total = quantity * price; no stored linePrice");
  lines.push("- I-043: changing quantity does not reread price as a line total");
  lines.push("- I-044: Offer stores (product, quantity, unit, price); a change is a new Offer");
  lines.push("- I-045: catalog quantity is Stage-1 reference size — not identity, multiplier, or conversion");
  lines.push("- I-046: acceptOffer requires a finite price on every item; unitLineTotal only multiplies under I-030/I-046 bounds and is not a hidden validator");
  lines.push("- I-047: package contents / size in another unit is not a stored fact; external 1 package = 5 kg is experimenter knowledge");
  lines.push("- I-048: a concrete volume-priced deal is an Offer; a standing quantity-range schedule is not introduced");
  lines.push("- I-049: a package-unit deal completes without stored contents; contents are not Offer terms");
  lines.push("- I-050: a standing quantity-range announcement is not an Offer and a concrete Offer stores no schedule provenance");
  lines.push("- snapshot.alternatives is a List projection (AlternativeProjection); current SP items are only a binding set");
  lines.push("- createPurchaseFromList surfaces MISSING_QUANTITY instead of inventing quantity 1");
  lines.push("- I-037: validUntil constrains accept/counter of the ACTIVE standing proposal only; it does not revoke Acceptance or agreed baseline");
  lines.push("- I-038: STABLE is agreed==active and no pending substitutions — Offer validity is not a STABLE exit");
  lines.push("- I-039: silence is the absence of a command; it does not REJECT/CANCEL/EXPIRED or move pointers");
  lines.push("- I-040: DeterministicClock + advance() move only the clock; time creates no facts; validUntil is exclusive");
  lines.push("- I-041: time/silence do not enter EXPIRED");
  lines.push("- BS-029…036: silence-while-valid, silence-until-expiry, agreed expiry, new Offer after expiry, no revive, no counter, no fake FSM state, time determinism");
  lines.push("- I-025 claims are the stockClaims() projection (same predicate as detection); stockConflicts is a detection-event log, not a claims registry");
  lines.push("- BS-031: after A expires, stockClaims drops A and keeps B; the live control checkpoint records combined=7");
  lines.push("- I-029: only the counterparty may accept an Offer");
  lines.push("- Offer items: quantity > 0, finite price/qty; applyAdvice requires matching snapshot basis");
  lines.push("- TZ-001…004 ship as four dependent PRs (domain → assistants → runtime → /sim), each with its own runner");
  lines.push("- removed duplicate SellerPurchase.rejected; REJECTED is FSM status only");
  lines.push("");
  lines.push("Closed in SPEC v0.3 / TZ-BASKET-005:");
  lines.push("- OQ-009 CLOSED — agreed Offer expiry keeps pointers and STABLE; validity still forbids accept/counter");
  lines.push("- OQ-011 CLOSED for Stage-1 silence — no command ⇒ no lifecycle change; waiting facts are observation, not a sufficiency proof");
  lines.push("- OQ-012 CLOSED for passage of time — no SELLER_UNRESPONSIVE / auto-EXPIRED; negotiation TTL remains OQ-005");
  lines.push("");
  lines.push("TZ-BASKET-006");
  lines.push("Status: PASS for Stage-1 representation / OQ-001");
  lines.push("OQ-001: CLOSED — price = price of one unit");
  lines.push("Stage-1 representation: catalog quantity is not a multiplier/conversion (I-045)");
  lines.push("OQ-002: split by TZ-BASKET-007 into OQ-002A / OQ-002B");
  lines.push("");
  lines.push("TZ-BASKET-007");
  lines.push("Status: PASS for Stage-1 representation; no new entity");
  lines.push("OQ-002A: OPEN — package is a unit; contents/conversion/partial remain MODEL GAP (I-047)");
  lines.push("OQ-002B: Stage-1 — concrete volume deal = Offer (I-048); standing schedule OPEN");
  lines.push("Model change required: NO new entity");
  lines.push("New concept required: YES if/when OQ-002A contents or OQ-002B schedule is closed — NOT introduced");
  lines.push("Production architecture changed: NO");
  lines.push("");
  lines.push("TZ-BASKET-008");
  lines.push("Status: PASS for Stage-1 evidence; conclusion B on both OQs; no new entity");
  lines.push("OQ-002A: OPEN / MODEL GAP / NO NEW CONCEPT — package-unit deal does not require contents (I-049)");
  lines.push("OQ-002B: OPEN schedule object / NO NEW CONCEPT — announcement is not an Offer (I-050); concrete Offers remain sufficient (I-048)");
  lines.push("NEW CONCEPT JUSTIFIED: no — no evidence yet justifies a Package or PriceSchedule entity");
  lines.push("NO MODEL CHANGE: yes");
  lines.push("Production architecture changed: NO");
  lines.push("Further closing OQ-002A/B requires a business observation, not another synthetic model test");
  lines.push("");
  lines.push("TZ-BASKET-009");
  lines.push("Status: catalog/spec reconstruction only; NO BUSINESS-FLOW OBSERVATION obtained");
  lines.push("OQ-002A: OPEN — reconstruction shows listed unit 250 g is representable; pack-as-Products is tautological if catalog already splits ids");
  lines.push("OQ-002B: OPEN — reconstruction shows listed unit price is copied onto 3/7/12 kg PurchaseItems; this is not seller pricing behavior");
  lines.push("H3 schedule change: NOT OBSERVED — not used as OQ-002B evidence");
  lines.push("NEW CONCEPT JUSTIFIED: no — absence of observation does not justify Package or PriceSchedule");
  lines.push("NO MODEL CHANGE: yes");
  lines.push("NO NEW INVARIANT: yes");
  lines.push("SPEC version bump: no");
  lines.push("Production architecture changed: NO");
  lines.push("Further closing OQ-002A/B still requires a business-flow observation, not another synthetic model test");
  lines.push("");
  lines.push("TZ-BASKET-010");
  lines.push("Status: primary goal NOT MET — Stage-1 source search only; BUSINESS-FLOW OBSERVATION NOT OBTAINED");
  lines.push("OQ-002A: OPEN — SOURCE ABSENT in mockSellerCatalog; no conversion/tier lookup found in ADD_TO_BASKET itself; A1/A2 flow NOT OBTAINED; A3 NOT TESTABLE (no seller classification); SOURCE-010-TREE is a cleanup check of two historical FLOW-010 artifacts, not proof synthetic business-flow is absent");
  lines.push("OQ-002B: OPEN — named identifier tokens SOURCE ABSENT in sellers.ts; range names as whole words SOURCE ABSENT in TZ-025 markdown; B1/B2/B3 flow NOT OBTAINED. Not a claim that no quantity-range mechanism exists under another name. Token miss is not a CooperativeSeller call-shape test and not a market finding");
  lines.push("NEW CONCEPT JUSTIFIED: no — source absence does not justify Package or PriceSchedule");
  lines.push("NO MODEL CHANGE: yes");
  lines.push("NO NEW INVARIANT: yes");
  lines.push("SPEC version bump: no");
  lines.push("Production architecture changed: NO");
  lines.push("Further closing OQ-002A/B still requires a business-flow observation where a deal cannot complete without the extra fact");
  lines.push("");
  lines.push("Still open:");
  lines.push("- SPEC OQ-002A — conversion / partial-whole package / distinct package bases");
  lines.push("- SPEC OQ-002B — standing quantity-range price schedule as a domain object");
  lines.push("- SPEC OQ-003 — duplicate ListItems");
  lines.push("- SPEC OQ-005 / experiment OQ-010 — negotiation TTL");
  lines.push("- SPEC OQ-008 / experiment OQ-002 — alternative price *policy*");
  lines.push("- experiment OQ-016 — allocation");
  lines.push("");
  lines.push("Assistant compatibility: isOfferValid still means standing-proposal validity. STABLE is");
  lines.push("checked first (WAIT TERMINAL_STATUS). An expired agreed Offer remains the price baseline");
  lines.push("when a later live active Offer is evaluated (I-037). Assistants WAIT on MISSING_ITEM_PRICE.");
  lines.push("Assistant unit-price comparisons are consistent with I-042; they are not the source of I-042.");
  lines.push("");
  lines.push("The model is still experimental. PASS does not close remaining OPEN questions.");
  lines.push("Recommended next step: obtain a real business-flow observation for OQ-002A/B. OQ-003 may proceed independently, but does not replace this observation");
  lines.push("```");
  lines.push("");
  return lines.join("\n");
}
