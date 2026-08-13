import type { BasketWorld } from "../domain/world";
import { captureAdviceBasis } from "./basis";
import type { Advice, AdviceKind } from "./types";

function catalogPrice(world: BasketWorld, sellerId: string, productId: string): number | null {
  const row = world.catalog.availability.find((item) => item.sellerId === sellerId && item.productId === productId);
  return row ? row.price : null;
}

function bind(
  world: BasketWorld,
  sellerPurchaseId: string,
  kind: AdviceKind,
  rationale: string,
  extra: Partial<Advice> = {}
): Advice {
  return {
    actor: "SELLER",
    kind,
    rationale,
    ...extra,
    basis: captureAdviceBasis(world, sellerPurchaseId),
  };
}

/** Deterministic seller policy: accept near-list buyer offers, otherwise counter at catalog price. */
export function adviseSeller(world: BasketWorld, sellerPurchaseId: string): Advice {
  const sp = world.requireSp(sellerPurchaseId);

  if (sp.status === "REJECTED" || sp.status === "CANCELLED" || sp.status === "STABLE") {
    return bind(world, sellerPurchaseId, "WAIT", `SellerPurchase already ${sp.status}; no seller move.`);
  }

  const activeId = sp.activeOfferId;
  if (!activeId) {
    return bind(world, sellerPurchaseId, "WAIT", "No active offer.");
  }

  const active = world.offerById(activeId);
  if (!world.isOfferValid(active)) {
    return bind(world, sellerPurchaseId, "WAIT", "Active offer is expired; acceptance is forbidden (I-028).");
  }
  if (active.actor !== "BUYER") {
    return bind(world, sellerPurchaseId, "WAIT", "Active offer is not from the buyer; waiting.");
  }

  const buyerPrice = active.items[0]?.price;
  const productId = active.items[0]?.productId;
  const listPrice = productId ? catalogPrice(world, sp.sellerId, productId) : null;

  if (typeof buyerPrice === "number" && listPrice != null && buyerPrice + 1e-9 >= listPrice - 1) {
    return bind(
      world,
      sellerPurchaseId,
      "ACCEPT_ACTIVE",
      `Buyer ${buyerPrice} MAD is within 1 MAD of catalog ${listPrice} MAD; accept.`
    );
  }

  if (typeof listPrice === "number") {
    return bind(
      world,
      sellerPurchaseId,
      "COUNTER",
      `Buyer ${buyerPrice ?? "?"} MAD is below catalog ${listPrice} MAD; counter at list price.`,
      { price: listPrice }
    );
  }

  return bind(world, sellerPurchaseId, "WAIT", "No catalog price to compare.");
}
