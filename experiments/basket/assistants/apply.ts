import type { BasketWorld } from "../domain/world";
import type { Advice } from "./types";

export function applyAdvice(world: BasketWorld, sellerPurchaseId: string, advice: Advice): void {
  const sp = world.requireSp(sellerPurchaseId);

  switch (advice.kind) {
    case "WAIT":
      return;
    case "REJECT":
      world.rejectSellerPurchase(sellerPurchaseId);
      return;
    case "ACCEPT_SUBSTITUTION": {
      const pending = world.snapshot(sellerPurchaseId).pendingSubstitutions[0];
      if (pending) world.acceptSubstitution(pending.id);
      return;
    }
    case "ACCEPT_ACTIVE": {
      if (!sp.activeOfferId) return;
      world.acceptOffer(sp.activeOfferId, advice.actor);
      return;
    }
    case "COUNTER": {
      const active = sp.activeOfferId ? world.offerById(sp.activeOfferId) : null;
      const items = (active?.items ?? sp.items).map((item) => ({
        ...item,
        price: advice.price ?? item.price,
      }));
      world.proposeOffer({
        sellerPurchaseId,
        actor: advice.actor,
        items,
        reason: advice.actor === "BUYER" ? "BUYER_CHANGE" : "SELLER_COUNTEROFFER",
      });
      return;
    }
    default: {
      const _never: never = advice.kind;
      throw new Error(`Unknown advice ${_never}`);
    }
  }
}
