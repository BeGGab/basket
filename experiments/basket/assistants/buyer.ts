import type { BasketWorld } from "../domain/world";
import type { Advice } from "./types";

function firstPrice(world: BasketWorld, offerId: string | null): number | null {
  if (!offerId) return null;
  const price = world.offerById(offerId).items[0]?.price;
  return typeof price === "number" ? price : null;
}

/** Deterministic buyer policy: take discounts, counter price hikes vs agreed, accept first seller offer. */
export function adviseBuyer(world: BasketWorld, sellerPurchaseId: string): Advice {
  const sp = world.requireSp(sellerPurchaseId);
  const snap = world.snapshot(sellerPurchaseId);

  if (sp.status === "REJECTED" || sp.status === "CANCELLED" || sp.status === "STABLE") {
    return { actor: "BUYER", kind: "WAIT", rationale: `SellerPurchase already ${sp.status}; no buyer move.` };
  }

  if (snap.pendingSubstitutions.length > 0) {
    return {
      actor: "BUYER",
      kind: "ACCEPT_SUBSTITUTION",
      rationale: "Pending substitution is explicit; default buyer assistant accepts it so negotiation can continue.",
    };
  }

  if (!sp.activeOfferId) {
    return { actor: "BUYER", kind: "WAIT", rationale: "No active offer to decide on." };
  }

  const active = world.offerById(sp.activeOfferId);
  if (!world.isOfferValid(active)) {
    return { actor: "BUYER", kind: "WAIT", rationale: "Active offer is expired; acceptance is forbidden (I-028)." };
  }
  if (active.actor === "BUYER") {
    return { actor: "BUYER", kind: "WAIT", rationale: "Active offer is already the buyer's; waiting for seller." };
  }

  const currentPrice = firstPrice(world, sp.activeOfferId);
  const agreedPrice = firstPrice(world, sp.agreedOfferId);

  if (agreedPrice != null && currentPrice != null && currentPrice > agreedPrice) {
    return {
      actor: "BUYER",
      kind: "COUNTER",
      price: agreedPrice,
      rationale: `Current ${currentPrice} MAD is above agreed ${agreedPrice} MAD; counter at agreed price.`,
    };
  }

  if (agreedPrice != null && currentPrice != null && currentPrice < agreedPrice) {
    return {
      actor: "BUYER",
      kind: "ACCEPT_ACTIVE",
      rationale: `Current ${currentPrice} MAD is a discount vs agreed ${agreedPrice} MAD; accept.`,
    };
  }

  return {
    actor: "BUYER",
    kind: "ACCEPT_ACTIVE",
    rationale: "No agreed baseline yet; accept the seller/system proposal to reach STABLE.",
  };
}
