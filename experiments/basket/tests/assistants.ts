import assert from "node:assert/strict";
import { adviseBuyer, adviseSeller, applyAdvice, captureAdviceBasis, catalogReferencePrice } from "../assistants";
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

function twoProductWorld(): { world: BasketWorld; spId: string } {
  const world = new BasketWorld();
  world.setCatalog({
    names: { tomatoes: "Tomatoes", cucumbers: "Cucumbers" },
    availability: [
      { sellerId: "seller-a", productId: "tomatoes", quantity: 20, unit: "kg", price: 15, stock: 100 },
      { sellerId: "seller-a", productId: "cucumbers", quantity: 20, unit: "kg", price: 10, stock: 100 },
    ],
  });
  const list = world.createList("multi");
  world.addItem(list.id, { productId: "tomatoes", quantity: 2, unit: "kg", alternatives: [] });
  world.addItem(list.id, { productId: "cucumbers", quantity: 3, unit: "kg", alternatives: [] });
  const purchase = world.createPurchaseFromList(list.id, "PRIMARY_ONLY", ["seller-a"]);
  return { world, spId: purchase.sellerPurchaseIds[0] };
}

export function runTz004(): void {
  // --- Buyer: accept a discount vs agreed baseline; Advice targets the exact Offer. ---
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
  assert(takeDiscount.kind === "ACCEPT_ACTIVE");
  assert.equal(takeDiscount.offerId, discount.world.requireSp(discount.spId).activeOfferId, "ACCEPT_ACTIVE names its Offer");
  applyAdvice(discount.world, discount.spId, takeDiscount);
  assert.equal(discount.world.requireSp(discount.spId).status, "STABLE");
  assert.equal(discount.world.snapshot(discount.spId).agreed.items[0]?.price, 12);

  // --- Buyer: counter a hike vs agreed baseline. ---
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
  assert(counterHike.kind === "COUNTER");
  assert.equal(counterHike.counterOfferId, hike.world.requireSp(hike.spId).activeOfferId, "COUNTER names the Offer it replies to");
  assert.equal(counterHike.items[0]?.price, 15);
  applyAdvice(hike.world, hike.spId, counterHike);
  // The created Offer must match the Advice exactly: items, actor, reason.
  const counteredSp = hike.world.requireSp(hike.spId);
  const createdOffer = hike.world.offerById(counteredSp.activeOfferId!);
  assert.deepEqual(
    createdOffer.items.map((i) => ({ productId: i.productId, quantity: i.quantity, unit: i.unit, price: i.price })),
    counterHike.items.map((i) => ({ productId: i.productId, quantity: i.quantity, unit: i.unit, price: i.price })),
    "applied COUNTER creates exactly the advised items"
  );
  assert.equal(createdOffer.actor, counterHike.actor);
  assert.equal(createdOffer.reason, "BUYER_CHANGE");
  assert.equal(hike.world.snapshot(hike.spId).current.items[0]?.price, 15);
  assert.notEqual(hike.world.requireSp(hike.spId).status, "STABLE");

  // --- Buyer, multi-item: hike on the SECOND item only must still trigger COUNTER, per-item prices. ---
  const multiBuyer = twoProductWorld();
  multiBuyer.world.proposeOffer({
    sellerPurchaseId: multiBuyer.spId,
    actor: "SELLER",
    items: [
      { productId: "tomatoes", quantity: 2, unit: "kg", price: 15 },
      { productId: "cucumbers", quantity: 3, unit: "kg", price: 10 },
    ],
    reason: "PRICE_CHANGE",
  });
  multiBuyer.world.acceptOffer(multiBuyer.world.requireSp(multiBuyer.spId).activeOfferId!, "BUYER");
  multiBuyer.world.proposeOffer({
    sellerPurchaseId: multiBuyer.spId,
    actor: "SELLER",
    items: [
      { productId: "tomatoes", quantity: 2, unit: "kg", price: 15 },
      { productId: "cucumbers", quantity: 3, unit: "kg", price: 13 },
    ],
    reason: "PRICE_CHANGE",
  });
  const multiCounter = adviseBuyer(multiBuyer.world, multiBuyer.spId);
  assert(multiCounter.kind === "COUNTER", "hike on second item must be detected");
  assert.equal(multiCounter.items.find((i) => i.productId === "tomatoes")?.price, 15, "unchanged item keeps its price");
  assert.equal(multiCounter.items.find((i) => i.productId === "cucumbers")?.price, 10, "hiked item is countered at agreed price");
  applyAdvice(multiBuyer.world, multiBuyer.spId, multiCounter);
  const multiSnap = multiBuyer.world.snapshot(multiBuyer.spId);
  assert.equal(multiSnap.current.items.find((i) => i.productId === "cucumbers")?.price, 10);
  assert.equal(multiSnap.current.items.find((i) => i.productId === "tomatoes")?.price, 15);

  // --- Seller: counter below-tolerance buyer offer at catalog price. ---
  const seller = tomatoesWorld();
  seller.world.proposeOffer({
    sellerPurchaseId: seller.spId,
    actor: "BUYER",
    items: [{ productId: "tomatoes", quantity: 2, unit: "kg", price: 13 }],
    reason: "BUYER_CHANGE",
  });
  const sellerCounter = adviseSeller(seller.world, seller.spId);
  assert(sellerCounter.kind === "COUNTER");
  assert.equal(sellerCounter.items[0]?.price, 15);

  // COUNTER content cannot be swapped: different lines (not just prices) are rejected.
  assert.throws(
    () =>
      applyAdvice(seller.world, seller.spId, {
        ...sellerCounter,
        items: [{ productId: "tomatoes", quantity: 99, unit: "kg", price: 15 }],
      }),
    /invalid command.*prices only|must match the countered Offer/
  );
  // ANY non-price field change is rejected, not only the (productId, quantity, unit) triple —
  // the guard covers future PurchaseItem fields automatically.
  assert.throws(
    () =>
      applyAdvice(seller.world, seller.spId, {
        ...sellerCounter,
        items: [{ productId: "tomatoes", quantity: 2, unit: "kg", price: 15, discount: 5 }],
      }),
    /invalid command.*prices only/,
    "COUNTER must not smuggle in a discount (or any other non-price field)"
  );

  applyAdvice(seller.world, seller.spId, sellerCounter);
  assert.equal(seller.world.snapshot(seller.spId).current.items[0]?.price, 15);

  // --- Seller, multi-item: one bad item counters with PER-ITEM catalog prices, not one uniform price. ---
  const multiSeller = twoProductWorld();
  multiSeller.world.proposeOffer({
    sellerPurchaseId: multiSeller.spId,
    actor: "BUYER",
    items: [
      { productId: "tomatoes", quantity: 2, unit: "kg", price: 15 },
      { productId: "cucumbers", quantity: 3, unit: "kg", price: 5 },
    ],
    reason: "BUYER_CHANGE",
  });
  const perItem = adviseSeller(multiSeller.world, multiSeller.spId);
  assert(perItem.kind === "COUNTER");
  assert.equal(perItem.items.find((i) => i.productId === "tomatoes")?.price, 15);
  assert.equal(perItem.items.find((i) => i.productId === "cucumbers")?.price, 10);

  // --- Policies are parameters: stricter seller / looser buyer change the decision. ---
  const strict = tomatoesWorld();
  strict.world.proposeOffer({
    sellerPurchaseId: strict.spId,
    actor: "BUYER",
    items: [{ productId: "tomatoes", quantity: 2, unit: "kg", price: 14.5 }],
    reason: "BUYER_CHANGE",
  });
  assert.equal(adviseSeller(strict.world, strict.spId).kind, "ACCEPT_ACTIVE", "default tolerance 1 MAD accepts 14.5");
  assert.equal(
    adviseSeller(strict.world, strict.spId, { acceptBelowCatalog: 0 }).kind,
    "COUNTER",
    "zero-tolerance policy counters the same offer"
  );

  // --- Buyer without agreed baseline does NOT blindly accept the first offer. ---
  const firstOffer = tomatoesWorld();
  firstOffer.world.proposeOffer({
    sellerPurchaseId: firstOffer.spId,
    actor: "SELLER",
    items: [{ productId: "tomatoes", quantity: 2, unit: "kg", price: 16 }],
    reason: "PRICE_CHANGE",
  });
  const overCatalog = adviseBuyer(firstOffer.world, firstOffer.spId);
  assert(overCatalog.kind === "COUNTER", "16 MAD above catalog 15 must be countered, not accepted");
  assert.equal(overCatalog.items[0]?.price, 15);
  assert.equal(
    adviseBuyer(firstOffer.world, firstOffer.spId, { maxOverCatalog: 2 }).kind,
    "ACCEPT_ACTIVE",
    "looser buyer policy accepts the same offer"
  );

  // --- WAIT carries a machine-readable reason. ---
  const idle = tomatoesWorld();
  const noOffer = adviseBuyer(idle.world, idle.spId);
  assert(noOffer.kind === "WAIT");
  assert.equal(noOffer.waitReason, "NO_ACTIVE_OFFER");
  idle.world.proposeOffer({
    sellerPurchaseId: idle.spId,
    actor: "BUYER",
    items: [{ productId: "tomatoes", quantity: 2, unit: "kg", price: 15 }],
    reason: "BUYER_CHANGE",
  });
  const ownOffer = adviseBuyer(idle.world, idle.spId);
  assert(ownOffer.kind === "WAIT");
  assert.equal(ownOffer.waitReason, "OWN_OFFER_ACTIVE");

  // --- Substitutions: explicit target, one-shot, and NO suppression of price analysis. ---
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
  assert(takeSub.kind === "ACCEPT_SUBSTITUTION");
  assert.equal(takeSub.substitutionId, sub.world.snapshot(sub.spId).pendingSubstitutions[0].id);
  assert.throws(
    () => applyAdvice(sub.world, sub.spId, { ...takeSub, substitutionId: "sub-nope" }),
    /no longer pending/
  );
  applyAdvice(sub.world, sub.spId, takeSub);
  assert.equal(sub.world.snapshot(sub.spId).pendingSubstitutions.length, 0);
  assert.throws(() => applyAdvice(sub.world, sub.spId, takeSub), /stale|no longer pending/);

  const subVsHike = tomatoesWorld();
  subVsHike.world.proposeOffer({
    sellerPurchaseId: subVsHike.spId,
    actor: "SELLER",
    items: [{ productId: "tomatoes", quantity: 2, unit: "kg", price: 15 }],
    reason: "PRICE_CHANGE",
  });
  subVsHike.world.acceptOffer(subVsHike.world.requireSp(subVsHike.spId).activeOfferId!, "BUYER");
  subVsHike.world.proposeOffer({
    sellerPurchaseId: subVsHike.spId,
    actor: "SELLER",
    items: [{ productId: "tomatoes", quantity: 2, unit: "kg", price: 18 }],
    reason: "PRICE_CHANGE",
  });
  subVsHike.world.proposeSubstitution({
    sellerPurchaseId: subVsHike.spId,
    originalProductId: "tomato_a",
    replacementProductId: "tomato_b",
    proposedBy: "SELLER",
  });
  const hikeWins = adviseBuyer(subVsHike.world, subVsHike.spId);
  assert(hikeWins.kind === "COUNTER", "pending substitution must not suppress a price hike");
  assert.equal(hikeWins.items[0]?.price, 15);

  // --- Assistant layer refuses semantically invalid commands before the domain sees them. ---
  const invalid = tomatoesWorld();
  invalid.world.proposeOffer({
    sellerPurchaseId: invalid.spId,
    actor: "BUYER",
    items: [{ productId: "tomatoes", quantity: 2, unit: "kg", price: 15 }],
    reason: "BUYER_CHANGE",
  });
  const buyerOfferId = invalid.world.requireSp(invalid.spId).activeOfferId!;
  assert.throws(
    () =>
      applyAdvice(invalid.world, invalid.spId, {
        actor: "BUYER",
        kind: "ACCEPT_ACTIVE",
        offerId: buyerOfferId,
        rationale: "crafted",
        basis: captureAdviceBasis(invalid.world, invalid.spId),
      }),
    /invalid command/
  );

  // --- TZ004 demo scenarios: assertions run inside the scenarios; here we also check that every
  //     assistantApply executed exactly the advice that was displayed for the same SellerPurchase. ---
  for (const scenario of DEMO_SCENARIOS.filter((item) => item.name.startsWith("TZ004-"))) {
    const runtime = runScenario(scenario);
    const adviceEvents = runtime.events.filter((event) => event.event === "assistantAdvice");
    const applyEvents = runtime.events.filter((event) => event.event === "assistantApply");
    assert.ok(adviceEvents.length > 0, `${scenario.name} missing assistantAdvice`);
    assert.ok(applyEvents.length > 0, `${scenario.name} missing assistantApply`);
    for (const applied of applyEvents) {
      const kind = applied.input.split(" ")[1];
      assert.ok(
        adviceEvents.some(
          (event) => event.sellerPurchaseId === applied.sellerPurchaseId && event.result.startsWith(`${kind}:`)
        ),
        `${scenario.name}: applied ${applied.input} without a matching displayed advice`
      );
    }
  }

  // --- Runtime and UI share one execution path (applyDisplayedAdvice). ---
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

  // --- Staleness: pointer change. ---
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

  // --- Staleness: same Offer ID, different content (two deterministic worlds share ID sequences). ---
  const contentA = tomatoesWorld();
  const contentB = tomatoesWorld();
  contentA.world.proposeOffer({
    sellerPurchaseId: contentA.spId,
    actor: "SELLER",
    items: [{ productId: "tomatoes", quantity: 2, unit: "kg", price: 15 }],
    reason: "PRICE_CHANGE",
  });
  contentB.world.proposeOffer({
    sellerPurchaseId: contentB.spId,
    actor: "SELLER",
    items: [{ productId: "tomatoes", quantity: 5, unit: "kg", price: 15 }],
    reason: "PRICE_CHANGE",
  });
  assert.equal(
    contentA.world.requireSp(contentA.spId).activeOfferId,
    contentB.world.requireSp(contentB.spId).activeOfferId,
    "precondition: both worlds use the same Offer ID"
  );
  const crossWorld = adviseBuyer(contentA.world, contentA.spId);
  assert.throws(
    () => applyAdvice(contentB.world, contentB.spId, crossWorld),
    /Offer content changed|stale/,
    "same activeOfferId with different items must be stale"
  );

  // --- Staleness: seller advice reads the catalog, so a catalog change must invalidate it too. ---
  const priced = tomatoesWorld();
  priced.world.proposeOffer({
    sellerPurchaseId: priced.spId,
    actor: "BUYER",
    items: [{ productId: "tomatoes", quantity: 2, unit: "kg", price: 13 }],
    reason: "BUYER_CHANGE",
  });
  const pricedAdvice = adviseSeller(priced.world, priced.spId);
  assert.equal(pricedAdvice.kind, "COUNTER");
  priced.world.setStock("seller-a", "tomatoes", 3);
  assert.throws(() => applyAdvice(priced.world, priced.spId, pricedAdvice), /catalog facts/);

  // --- Staleness: the time race. advise on a live Offer → clock passes validUntil → apply must fail,
  //     and the domain must be left unchanged (no new Offer). ---
  const timed = tomatoesWorld();
  timed.world.proposeOffer({
    sellerPurchaseId: timed.spId,
    actor: "SELLER",
    items: [{ productId: "tomatoes", quantity: 2, unit: "kg", price: 16 }],
    reason: "PRICE_CHANGE",
    validUntil: "2026-01-01T00:00:05.000Z",
  });
  const timedCounter = adviseBuyer(timed.world, timed.spId);
  assert(timedCounter.kind === "COUNTER", "16 above catalog 15 must be countered");
  const offersBefore = timed.world.offers.length;
  timed.world.advance(10_000);
  assert.throws(
    () => applyAdvice(timed.world, timed.spId, timedCounter),
    /stale.*validity|expired/,
    "COUNTER computed on a live Offer must not apply after it expires"
  );
  assert.equal(timed.world.offers.length, offersBefore, "the failed apply must not create an Offer");

  // --- REJECT: machine-readable reason; admissible only while negotiation is ongoing. ---
  const rejecting = tomatoesWorld();
  rejecting.world.proposeOffer({
    sellerPurchaseId: rejecting.spId,
    actor: "SELLER",
    items: [{ productId: "tomatoes", quantity: 2, unit: "kg", price: 15 }],
    reason: "PRICE_CHANGE",
  });
  applyAdvice(rejecting.world, rejecting.spId, {
    actor: "BUYER",
    kind: "REJECT",
    rejectReason: "PRICE_UNACCEPTABLE",
    rationale: "manual reject",
    basis: captureAdviceBasis(rejecting.world, rejecting.spId),
  });
  assert.equal(rejecting.world.requireSp(rejecting.spId).status, "REJECTED");

  const stableSp = tomatoesWorld();
  stableSp.world.proposeOffer({
    sellerPurchaseId: stableSp.spId,
    actor: "SELLER",
    items: [{ productId: "tomatoes", quantity: 2, unit: "kg", price: 15 }],
    reason: "PRICE_CHANGE",
  });
  stableSp.world.acceptOffer(stableSp.world.requireSp(stableSp.spId).activeOfferId!, "BUYER");
  assert.throws(
    () =>
      applyAdvice(stableSp.world, stableSp.spId, {
        actor: "BUYER",
        kind: "REJECT",
        rejectReason: "POLICY_DECLINED",
        rationale: "crafted",
        basis: captureAdviceBasis(stableSp.world, stableSp.spId),
      }),
    /invalid command.*REJECT/
  );

  // --- ACCEPT_SUBSTITUTION: the proposer cannot accept their own substitution. ---
  const ownSub = tomatoesWorld();
  ownSub.world.proposeOffer({
    sellerPurchaseId: ownSub.spId,
    actor: "SELLER",
    items: [{ productId: "tomatoes", quantity: 2, unit: "kg", price: 15 }],
    reason: "PRICE_CHANGE",
  });
  const sellerProposed = ownSub.world.proposeSubstitution({
    sellerPurchaseId: ownSub.spId,
    originalProductId: "tomato_a",
    replacementProductId: "tomato_b",
    proposedBy: "SELLER",
  });
  assert.throws(
    () =>
      applyAdvice(ownSub.world, ownSub.spId, {
        actor: "SELLER",
        kind: "ACCEPT_SUBSTITUTION",
        substitutionId: sellerProposed.id,
        rationale: "crafted",
        basis: captureAdviceBasis(ownSub.world, ownSub.spId),
      }),
    /invalid command.*substitution/
  );
  // The buyer assistant also never proposes accepting a BUYER-proposed substitution.
  const buyerProposed = tomatoesWorld();
  buyerProposed.world.proposeSubstitution({
    sellerPurchaseId: buyerProposed.spId,
    originalProductId: "tomato_a",
    replacementProductId: "tomato_b",
    proposedBy: "BUYER",
  });
  const skipOwn = adviseBuyer(buyerProposed.world, buyerProposed.spId);
  assert.notEqual(skipOwn.kind, "ACCEPT_SUBSTITUTION", "buyer must not accept its own substitution");

  // --- Target ownership: an Advice with the basis of one SP and the offerId of ANOTHER SP
  //     must be rejected at the assistant boundary, before the domain ever sees it. ---
  const owners = new BasketWorld();
  owners.setCatalog({
    names: { tomatoes: "Tomatoes" },
    availability: [{ sellerId: "seller-a", productId: "tomatoes", quantity: 20, unit: "kg", price: 15, stock: 100 }],
  });
  const listOne = owners.createList("one");
  owners.addItem(listOne.id, { productId: "tomatoes", quantity: 2, unit: "kg", alternatives: [] });
  const listTwo = owners.createList("two");
  owners.addItem(listTwo.id, { productId: "tomatoes", quantity: 3, unit: "kg", alternatives: [] });
  const spOne = owners.createPurchaseFromList(listOne.id, "PRIMARY_ONLY", ["seller-a"]).sellerPurchaseIds[0];
  const spTwo = owners.createPurchaseFromList(listTwo.id, "PRIMARY_ONLY", ["seller-a"]).sellerPurchaseIds[0];
  owners.proposeOffer({
    sellerPurchaseId: spTwo,
    actor: "SELLER",
    items: [{ productId: "tomatoes", quantity: 3, unit: "kg", price: 15 }],
    reason: "PRICE_CHANGE",
  });
  const foreignOfferId = owners.requireSp(spTwo).activeOfferId!;
  assert.throws(
    () =>
      applyAdvice(owners, spOne, {
        actor: "BUYER",
        kind: "ACCEPT_ACTIVE",
        offerId: foreignOfferId,
        rationale: "crafted: basis of spOne, offer of spTwo",
        basis: captureAdviceBasis(owners, spOne),
      }),
    /invalid command.*belongs to/,
    "ACCEPT_ACTIVE naming a foreign Offer must fail at the assistant boundary"
  );
  assert.throws(
    () =>
      applyAdvice(owners, spOne, {
        actor: "BUYER",
        kind: "COUNTER",
        counterOfferId: foreignOfferId,
        items: [{ productId: "tomatoes", quantity: 3, unit: "kg", price: 14 }],
        rationale: "crafted: basis of spOne, counter target of spTwo",
        basis: captureAdviceBasis(owners, spOne),
      }),
    /invalid command.*belongs to/,
    "COUNTER naming a foreign Offer must fail at the assistant boundary"
  );

  // --- Catalog reference is a lookup, not a price policy: two identical (seller, product, unit,
  //     quantity) rows with DIFFERENT prices are ambiguous → no reference → WAIT, never "cheapest". ---
  const ambiguous = new BasketWorld();
  ambiguous.setCatalog({
    names: { tomatoes: "Tomatoes" },
    availability: [
      { sellerId: "seller-a", productId: "tomatoes", quantity: 2, unit: "kg", price: 15, stock: 100 },
      { sellerId: "seller-a", productId: "tomatoes", quantity: 2, unit: "kg", price: 14, stock: 50 },
    ],
  });
  const ambiguousList = ambiguous.createList("ambiguous");
  ambiguous.addItem(ambiguousList.id, { productId: "tomatoes", quantity: 2, unit: "kg", alternatives: [] });
  const ambiguousSp = ambiguous.createPurchaseFromList(ambiguousList.id, "PRIMARY_ONLY", ["seller-a"]).sellerPurchaseIds[0];
  ambiguous.proposeOffer({
    sellerPurchaseId: ambiguousSp,
    actor: "BUYER",
    items: [{ productId: "tomatoes", quantity: 2, unit: "kg", price: 14 }],
    reason: "BUYER_CHANGE",
  });
  const ambiguousAdvice = adviseSeller(ambiguous, ambiguousSp);
  assert(ambiguousAdvice.kind === "WAIT", "ambiguous catalog rows must not silently become the cheapest reference");
  assert.equal(ambiguousAdvice.waitReason, "NO_CATALOG_PRICE");
  // Direct unit evidence: the ambiguous pool yields NO reference (no cheapest-of pick), while an
  // unambiguous line still resolves.
  assert.equal(catalogReferencePrice(ambiguous, "seller-a", "tomatoes", "kg", 2), null);
  const unambiguous = tomatoesWorld();
  assert.equal(catalogReferencePrice(unambiguous.world, "seller-a", "tomatoes", "kg", 20), 15);

  // --- REJECT is generated by the assistants themselves, not only crafted by hand. ---
  const buyerGivesUp = tomatoesWorld();
  buyerGivesUp.world.proposeOffer({
    sellerPurchaseId: buyerGivesUp.spId,
    actor: "SELLER",
    items: [{ productId: "tomatoes", quantity: 2, unit: "kg", price: 30 }],
    reason: "PRICE_CHANGE",
  });
  const buyerReject = adviseBuyer(buyerGivesUp.world, buyerGivesUp.spId);
  assert(buyerReject.kind === "REJECT", "30 MAD vs reference 15 is beyond the reject threshold — buyer gives up");
  assert.equal(buyerReject.rejectReason, "PRICE_UNACCEPTABLE");
  applyAdvice(buyerGivesUp.world, buyerGivesUp.spId, buyerReject);
  assert.equal(buyerGivesUp.world.requireSp(buyerGivesUp.spId).status, "REJECTED");

  const sellerGivesUp = tomatoesWorld();
  sellerGivesUp.world.proposeOffer({
    sellerPurchaseId: sellerGivesUp.spId,
    actor: "BUYER",
    items: [{ productId: "tomatoes", quantity: 2, unit: "kg", price: 2 }],
    reason: "BUYER_CHANGE",
  });
  const sellerReject = adviseSeller(sellerGivesUp.world, sellerGivesUp.spId);
  assert(sellerReject.kind === "REJECT", "2 MAD vs reference 15 is beyond the reject threshold — seller gives up");
  assert.equal(sellerReject.rejectReason, "PRICE_UNACCEPTABLE");
  applyAdvice(sellerGivesUp.world, sellerGivesUp.spId, sellerReject);
  assert.equal(sellerGivesUp.world.requireSp(sellerGivesUp.spId).status, "REJECTED");
  // The threshold is a policy parameter: a tolerant policy still counters instead.
  const tolerant = tomatoesWorld();
  tolerant.world.proposeOffer({
    sellerPurchaseId: tolerant.spId,
    actor: "BUYER",
    items: [{ productId: "tomatoes", quantity: 2, unit: "kg", price: 2 }],
    reason: "BUYER_CHANGE",
  });
  assert.equal(adviseSeller(tolerant.world, tolerant.spId, { rejectBelowCatalog: 20 }).kind, "COUNTER");

  // --- rejectReason is validated semantically at apply, not only as a typed field. ---
  const reasonWorld = tomatoesWorld();
  reasonWorld.world.proposeOffer({
    sellerPurchaseId: reasonWorld.spId,
    actor: "SELLER",
    items: [{ productId: "tomatoes", quantity: 2, unit: "kg", price: 15 }],
    reason: "PRICE_CHANGE",
  });
  assert.throws(
    () =>
      applyAdvice(reasonWorld.world, reasonWorld.spId, {
        actor: "BUYER",
        kind: "REJECT",
        rejectReason: "SUBSTITUTION_IMPOSSIBLE",
        rationale: "crafted: no substitution exists",
        basis: captureAdviceBasis(reasonWorld.world, reasonWorld.spId),
      }),
    /invalid command.*SUBSTITUTION_IMPOSSIBLE/,
    "REJECT(SUBSTITUTION_IMPOSSIBLE) without any pending substitution must be refused"
  );
  assert.throws(
    () =>
      applyAdvice(reasonWorld.world, reasonWorld.spId, {
        actor: "BUYER",
        kind: "REJECT",
        rejectReason: "PRODUCT_UNAVAILABLE",
        rationale: "crafted: the product is in stock",
        basis: captureAdviceBasis(reasonWorld.world, reasonWorld.spId),
      }),
    /invalid command.*PRODUCT_UNAVAILABLE/,
    "REJECT(PRODUCT_UNAVAILABLE) while every line has catalog availability must be refused"
  );
  const noOfferReject = tomatoesWorld();
  assert.throws(
    () =>
      applyAdvice(noOfferReject.world, noOfferReject.spId, {
        actor: "BUYER",
        kind: "REJECT",
        rejectReason: "PRICE_UNACCEPTABLE",
        rationale: "crafted: no offer to judge",
        basis: captureAdviceBasis(noOfferReject.world, noOfferReject.spId),
      }),
    /invalid command.*PRICE_UNACCEPTABLE/,
    "REJECT(PRICE_UNACCEPTABLE) without an active Offer must be refused"
  );

  // --- OQ-009 assumption, pinned: the agreed baseline SURVIVES the agreed Offer's expiration.
  //     The agreement is a negotiation fact; validUntil gates acceptance of the ACTIVE Offer only.
  //     This is an explicit assumption to revisit when OQ-009 is resolved. ---
  const agreedExpired = tomatoesWorld();
  agreedExpired.world.proposeOffer({
    sellerPurchaseId: agreedExpired.spId,
    actor: "SELLER",
    items: [{ productId: "tomatoes", quantity: 2, unit: "kg", price: 15 }],
    reason: "PRICE_CHANGE",
    validUntil: "2026-01-01T00:00:05.000Z",
  });
  agreedExpired.world.acceptOffer(agreedExpired.world.requireSp(agreedExpired.spId).activeOfferId!, "BUYER");
  agreedExpired.world.proposeOffer({
    sellerPurchaseId: agreedExpired.spId,
    actor: "SELLER",
    items: [{ productId: "tomatoes", quantity: 2, unit: "kg", price: 17 }],
    reason: "PRICE_CHANGE",
  });
  agreedExpired.world.advance(10_000); // agreed Offer is now expired; active Offer stays valid
  const agreedOffer = agreedExpired.world.offerById(agreedExpired.world.requireSp(agreedExpired.spId).agreedOfferId!);
  assert.equal(agreedExpired.world.isOfferValid(agreedOffer), false, "precondition: the agreed Offer expired");
  const baselineSurvives = adviseBuyer(agreedExpired.world, agreedExpired.spId);
  assert(baselineSurvives.kind === "COUNTER", "expired agreed Offer still provides the price baseline (OQ-009 assumption)");
  assert.equal(baselineSurvives.items[0]?.price, 15);

  // --- Positive substitution choice is a policy parameter, not a hardcoded rule. ---
  const choice = tomatoesWorld();
  choice.world.proposeOffer({
    sellerPurchaseId: choice.spId,
    actor: "SELLER",
    items: [{ productId: "tomatoes", quantity: 2, unit: "kg", price: 15 }],
    reason: "PRICE_CHANGE",
  });
  choice.world.proposeSubstitution({
    sellerPurchaseId: choice.spId,
    originalProductId: "tomato_a",
    replacementProductId: "tomato_b",
    proposedBy: "SELLER",
  });
  assert.equal(
    adviseBuyer(choice.world, choice.spId).kind,
    "ACCEPT_SUBSTITUTION",
    "SUBSTITUTION_FIRST (default): a pending counterparty substitution is accepted before the Offer decision"
  );
  const offerFirst = adviseBuyer(choice.world, choice.spId, { substitutionPreference: "OFFER_FIRST" });
  assert(offerFirst.kind === "ACCEPT_ACTIVE", "OFFER_FIRST: the acceptable Offer is taken, substitution stays pending");
  applyAdvice(choice.world, choice.spId, offerFirst);
  const choiceSp = choice.world.requireSp(choice.spId);
  assert.equal(choiceSp.agreedOfferId, offerFirst.offerId, "OFFER_FIRST agrees on the Offer");
  assert.equal(choice.world.snapshot(choice.spId).pendingSubstitutions.length, 1, "OFFER_FIRST leaves the substitution pending");
  // The domain still refuses STABLE while a mandatory substitution is pending (I-032 family).
  assert.notEqual(choiceSp.status, "STABLE");

  runAdviceMatrix();

  console.log("TZ-BASKET-004 assistants: OK");
}

interface MatrixCombo {
  multiItem: boolean;
  missingCatalog: boolean;
  withSub: boolean;
  expired: boolean;
  activeActor: "BUYER" | "SELLER";
}

function matrixWorld(combo: MatrixCombo): { world: BasketWorld; spId: string } {
  const world = new BasketWorld();
  const availability = [
    { sellerId: "seller-a", productId: "tomatoes", quantity: 20, unit: "kg", price: 15, stock: 100 },
  ];
  if (!combo.missingCatalog) {
    availability.push({ sellerId: "seller-a", productId: "cucumbers", quantity: 20, unit: "kg", price: 10, stock: 100 });
  }
  world.setCatalog({
    names: { tomatoes: "Tomatoes", cucumbers: "Cucumbers", tomato_a: "Tomato A", tomato_b: "Tomato B" },
    availability,
  });
  const list = world.createList("matrix");
  world.addItem(list.id, { productId: "tomatoes", quantity: 2, unit: "kg", alternatives: [] });
  if (combo.multiItem) {
    world.addItem(list.id, { productId: "cucumbers", quantity: 3, unit: "kg", alternatives: [] });
  }
  const purchase = world.createPurchaseFromList(list.id, "PRIMARY_ONLY", ["seller-a"]);
  const spId = purchase.sellerPurchaseIds[0];
  const items = [{ productId: "tomatoes", quantity: 2, unit: "kg", price: 15 }];
  if (combo.multiItem) {
    items.push({ productId: "cucumbers", quantity: 3, unit: "kg", price: 10 });
  }
  world.proposeOffer({
    sellerPurchaseId: spId,
    actor: combo.activeActor,
    items,
    reason: combo.activeActor === "BUYER" ? "BUYER_CHANGE" : "PRICE_CHANGE",
    validUntil: combo.expired ? "2026-01-01T00:00:05.000Z" : undefined,
  });
  if (combo.withSub) {
    world.proposeSubstitution({
      sellerPurchaseId: spId,
      originalProductId: "tomato_a",
      replacementProductId: "tomato_b",
      proposedBy: "SELLER",
    });
  }
  if (combo.expired) {
    world.advance(10_000);
  }
  return { world, spId };
}

/**
 * Combination sweep: multi-item × missing catalog row × pending substitution × expired offer ×
 * offer author × advisor. For every combination the Advice must satisfy kind-specific invariants,
 * be deterministic, and apply cleanly when executed immediately — this is where a policy layer
 * most easily produces a contradictory Advice.
 */
function runAdviceMatrix(): void {
  let combos = 0;
  for (const multiItem of [false, true])
    for (const missingCatalog of [false, true])
      for (const withSub of [false, true])
        for (const expired of [false, true])
          for (const activeActor of ["SELLER", "BUYER"] as const)
            for (const advisor of [adviseBuyer, adviseSeller]) {
              // A missing cucumbers row only matters when cucumbers are in play.
              if (missingCatalog && !multiItem) continue;
              const combo: MatrixCombo = { multiItem, missingCatalog, withSub, expired, activeActor };
              const label = `${advisor === adviseBuyer ? "buyer" : "seller"} ${JSON.stringify(combo)}`;
              try {
                const { world, spId } = matrixWorld(combo);
                const advice = advisor(world, spId);
                const sp = world.requireSp(spId);
                const active = sp.activeOfferId ? world.offerById(sp.activeOfferId) : null;
                const lineKey = (item: { productId: string; quantity: number; unit: string }) =>
                  `${item.productId}|${item.quantity}|${item.unit}`;
                switch (advice.kind) {
                  case "WAIT":
                    assert.ok(advice.waitReason, "WAIT must carry a reason");
                    break;
                  case "REJECT":
                    assert.ok(advice.rejectReason, "REJECT must carry a reason");
                    break;
                  case "ACCEPT_ACTIVE":
                    assert.ok(active && world.isOfferValid(active), "ACCEPT_ACTIVE requires a live active Offer");
                    assert.equal(advice.offerId, sp.activeOfferId, "ACCEPT_ACTIVE must target the active Offer");
                    assert.notEqual(active!.actor, advice.actor, "cannot accept one's own Offer");
                    break;
                  case "COUNTER":
                    assert.ok(active && world.isOfferValid(active), "COUNTER requires a live active Offer");
                    assert.equal(advice.counterOfferId, sp.activeOfferId, "COUNTER must reply to the active Offer");
                    assert.notEqual(active!.actor, advice.actor, "cannot counter one's own Offer");
                    assert.deepEqual(
                      advice.items.map(lineKey).sort(),
                      active!.items.map(lineKey).sort(),
                      "COUNTER lines must match the countered Offer"
                    );
                    break;
                  case "ACCEPT_SUBSTITUTION": {
                    const pending = world
                      .snapshot(spId)
                      .pendingSubstitutions.find((item) => item.id === advice.substitutionId);
                    assert.ok(pending, "ACCEPT_SUBSTITUTION must target a pending substitution");
                    assert.notEqual(pending!.proposedBy, advice.actor, "cannot accept one's own substitution");
                    break;
                  }
                }
                if (expired) {
                  assert.ok(
                    advice.kind === "WAIT" || advice.kind === "ACCEPT_SUBSTITUTION",
                    `expired active Offer allows only WAIT/ACCEPT_SUBSTITUTION, got ${advice.kind}`
                  );
                }
                assert.equal(
                  JSON.stringify(advisor(world, spId)),
                  JSON.stringify(advice),
                  "advice must be deterministic on an unchanged world"
                );
                // Apply and verify the SEMANTIC end state, not just that apply did not throw.
                const offersBefore = world.offers.length;
                const activeBefore = sp.activeOfferId;
                const agreedBefore = sp.agreedOfferId;
                const statusBefore = sp.status;
                applyAdvice(world, spId, advice);
                const after = world.requireSp(spId);
                switch (advice.kind) {
                  case "WAIT":
                    assert.equal(world.offers.length, offersBefore, "WAIT must not create Offers");
                    assert.equal(after.status, statusBefore, "WAIT must not change status");
                    assert.equal(after.activeOfferId, activeBefore, "WAIT must not move the active pointer");
                    assert.equal(after.agreedOfferId, agreedBefore, "WAIT must not move the agreed pointer");
                    break;
                  case "REJECT":
                    assert.equal(after.status, "REJECTED", "applied REJECT must terminate the SellerPurchase");
                    break;
                  case "ACCEPT_ACTIVE":
                    assert.equal(after.agreedOfferId, advice.offerId, "applied ACCEPT_ACTIVE must agree on the named Offer");
                    break;
                  case "ACCEPT_SUBSTITUTION":
                    assert.ok(
                      !world.snapshot(spId).pendingSubstitutions.some((item) => item.id === advice.substitutionId),
                      "applied ACCEPT_SUBSTITUTION must remove the substitution from pending"
                    );
                    break;
                  case "COUNTER": {
                    assert.equal(world.offers.length, offersBefore + 1, "applied COUNTER must create exactly one Offer");
                    const newActive = world.offerById(after.activeOfferId!);
                    assert.equal(newActive.actor, advice.actor, "the created Offer belongs to the advising actor");
                    assert.deepEqual(
                      newActive.items.map((item) => ({ productId: item.productId, quantity: item.quantity, unit: item.unit, price: item.price ?? null })),
                      advice.items.map((item) => ({ productId: item.productId, quantity: item.quantity, unit: item.unit, price: item.price ?? null })),
                      "the created Offer carries exactly the advised items"
                    );
                    break;
                  }
                }
                combos += 1;
              } catch (error) {
                throw new Error(`advice matrix [${label}]: ${(error as Error).message}`);
              }
            }
  assert.ok(combos >= 40, `advice matrix must cover the combination space (covered ${combos})`);
}
