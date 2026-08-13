import type { BasketWorld } from "../domain/world";
import { captureAdviceBasis } from "./basis";
import type { Advice, AdviceKind } from "./types";

function firstPrice(world: BasketWorld, offerId: string | null): number | null {
  if (!offerId) return null;
  const price = world.offerById(offerId).items[0]?.price;
  return typeof price === "number" ? price : null;
}

function bind(
  world: BasketWorld,
  sellerPurchaseId: string,
  kind: AdviceKind,
  rationale: string,
  extra: Partial<Advice> = {}
): Advice {
  return {
    actor: "BUYER",
    kind,
    rationale,
    ...extra,
    basis: captureAdviceBasis(world, sellerPurchaseId),
  };
}

/** Deterministic buyer policy: take discounts, counter price hikes vs agreed, accept first seller offer. */
export function adviseBuyer(world: BasketWorld, sellerPurchaseId: string): Advice {
  const sp = world.requireSp(sellerPurchaseId);
  const snap = world.snapshot(sellerPurchaseId);

  if (sp.status === "REJECTED" || sp.status === "CANCELLED" || sp.status === "STABLE") {
    return bind(world, sellerPurchaseId, "WAIT", `SellerPurchase already ${sp.status}; no buyer move.`);
  }

  if (snap.pendingSubstitutions.length > 0) {
    return bind(
      world,
      sellerPurchaseId,
      "ACCEPT_SUBSTITUTION",
      "Pending substitution is explicit; default buyer assistant accepts it so negotiation can continue."
    );
  }

  if (!sp.activeOfferId) {
    return bind(world, sellerPurchaseId, "WAIT", "No active offer to decide on.");
  }

  const active = world.offerById(sp.activeOfferId);
  if (!world.isOfferValid(active)) {
    return bind(world, sellerPurchaseId, "WAIT", "Active offer is expired; acceptance is forbidden (I-028).");
  }
  if (active.actor === "BUYER") {
    return bind(world, sellerPurchaseId, "WAIT", "Active offer is already the buyer's; waiting for seller.");
  }

  const currentPrice = firstPrice(world, sp.activeOfferId);
  const agreedPrice = firstPrice(world, sp.agreedOfferId);

  if (agreedPrice != null && currentPrice != null && currentPrice > agreedPrice) {
    return bind(
      world,
      sellerPurchaseId,
      "COUNTER",
      `Current ${currentPrice} MAD is above agreed ${agreedPrice} MAD; counter at agreed price.`,
      { price: agreedPrice }
    );
  }

  if (agreedPrice != null && currentPrice != null && currentPrice < agreedPrice) {
    return bind(
      world,
      sellerPurchaseId,
      "ACCEPT_ACTIVE",
      `Current ${currentPrice} MAD is a discount vs agreed ${agreedPrice} MAD; accept.`
    );
  }

  return bind(
    world,
    sellerPurchaseId,
    "ACCEPT_ACTIVE",
    "No agreed baseline yet; accept the seller/system proposal to reach STABLE."
  );
}
