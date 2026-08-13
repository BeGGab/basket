import type { BasketWorld } from "../domain/world";

export type BuyerProfileName =
  | "AcceptingBuyer"
  | "CounteringBuyer"
  | "RejectingBuyer"
  | "SlowBuyer"
  | "SubstitutionAcceptingBuyer";

export interface BuyerEmulator {
  profile: BuyerProfileName;
  respond(world: BasketWorld, sellerPurchaseId: string): void;
}

export function createBuyerEmulator(profile: BuyerProfileName): BuyerEmulator {
  return {
    profile,
    respond(world, sellerPurchaseId) {
      const sp = world.requireSp(sellerPurchaseId);
      if (sp.status === "REJECTED" || sp.status === "CANCELLED") return;

      if (profile === "SlowBuyer") return;

      if (profile === "RejectingBuyer") {
        world.rejectSellerPurchase(sellerPurchaseId);
        return;
      }

      if (profile === "SubstitutionAcceptingBuyer") {
        const pending = world.snapshot(sellerPurchaseId).pendingSubstitutions;
        if (pending[0]) {
          world.acceptSubstitution(pending[0].id);
          return;
        }
      }

      const activeId = sp.activeOfferId;
      if (!activeId) return;
      const active = world.offerById(activeId);

      if (profile === "CounteringBuyer") {
        if (active.actor === "BUYER") return;
        world.proposeOffer({
          sellerPurchaseId,
          actor: "BUYER",
          items: active.items.map((item) => ({ ...item, price: Math.max(0, (item.price ?? 0) - 1) })),
          reason: "BUYER_CHANGE",
        });
        return;
      }

      // AcceptingBuyer and SubstitutionAcceptingBuyer fallback
      if (active.actor === "SELLER" || active.actor === "SYSTEM") {
        world.acceptOffer(active.id, "BUYER");
      }
    },
  };
}
