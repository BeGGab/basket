import type { BasketWorld } from "../domain/world";
import type { Actor, OfferReason, PurchaseItem } from "../domain/types";

export type SellerProfileName =
  | "CooperativeSeller"
  | "NegotiatingSeller"
  | "TimeDiscountSeller"
  | "SubstitutionSeller"
  | "SlowSeller"
  | "PartialAvailabilitySeller";

export interface SellerEmulator {
  sellerId: string;
  profile: SellerProfileName;
  respondToBuyerOffer(world: BasketWorld, sellerPurchaseId: string, buyerOfferItems: PurchaseItem[]): void;
  tick(world: BasketWorld, sellerPurchaseId: string): void;
}

function catalogStock(world: BasketWorld, sellerId: string, productId: string): number {
  return world.catalog.availability
    .filter((row) => row.sellerId === sellerId && row.productId === productId)
    .reduce((sum, row) => sum + row.stock, 0);
}

function reduceToStock(world: BasketWorld, sellerId: string, items: readonly PurchaseItem[]): PurchaseItem[] {
  return items
    .map((item) => ({
      ...item,
      quantity: Math.min(item.quantity, Math.max(0, catalogStock(world, sellerId, item.productId))),
    }))
    .filter((item) => item.quantity > 0);
}

export function createSellerEmulator(sellerId: string, profile: SellerProfileName): SellerEmulator {
  return {
    sellerId,
    profile,
    respondToBuyerOffer(world, sellerPurchaseId, buyerOfferItems) {
      const sp = world.requireSp(sellerPurchaseId);
      if (sp.sellerId !== sellerId) return;

      if (profile === "SlowSeller") {
        world.markWaiting(sellerPurchaseId);
        return;
      }

      if (profile === "SubstitutionSeller") {
        const original = buyerOfferItems[0]?.productId;
        if (original) {
          world.proposeSubstitution({
            sellerPurchaseId,
            originalProductId: original,
            replacementProductId: "baguette",
            proposedBy: "SELLER",
            reason: "requested product unavailable",
          });
        }
        return;
      }

      if (profile === "NegotiatingSeller") {
        const countered = buyerOfferItems.map((item) => ({
          ...item,
          price: (item.price ?? 0) + 1,
        }));
        world.proposeOffer({
          sellerPurchaseId,
          actor: "SELLER",
          items: countered,
          reason: "SELLER_COUNTEROFFER",
        });
        return;
      }

      if (profile === "PartialAvailabilitySeller") {
        // Catalog stock at this moment only. Cross-purchase allocation is outside this experiment.
        const reduced = reduceToStock(world, sellerId, buyerOfferItems);
        if (reduced.length === 0) {
          world.markWaiting(sellerPurchaseId);
          return;
        }
        world.proposeOffer({
          sellerPurchaseId,
          actor: "SELLER",
          items: reduced,
          reason: "AVAILABILITY_CHANGE",
        });
        return;
      }

      if (profile === "CooperativeSeller") {
        const latestBuyer = world.lastOffer(sellerPurchaseId, "BUYER");
        if (latestBuyer) world.acceptOffer(latestBuyer.id, "SELLER");
        return;
      }
    },
    tick(world, sellerPurchaseId) {
      const sp = world.requireSp(sellerPurchaseId);
      if (sp.status === "STABLE" || sp.status === "REJECTED" || sp.status === "CANCELLED") return;

      if (profile === "TimeDiscountSeller") {
        const active = sp.activeOfferId ? world.offerById(sp.activeOfferId) : null;
        if (!active || active.reason === "TIME_DISCOUNT") return;
        const dropped = active.items.map((item) => ({
          ...item,
          price: Math.max(0, (item.price ?? 0) - 3),
        }));
        world.proposeOffer({
          sellerPurchaseId,
          actor: "SYSTEM",
          items: dropped,
          reason: "TIME_DISCOUNT" satisfies OfferReason,
        });
        return;
      }

      if (profile === "PartialAvailabilitySeller") {
        const active = sp.activeOfferId ? world.offerById(sp.activeOfferId) : null;
        if (!active) return;
        const reduced = reduceToStock(world, sellerId, active.items);
        const same =
          reduced.length === active.items.length &&
          reduced.every((item, index) => item.quantity === active.items[index]?.quantity);
        if (same) return;
        if (reduced.length === 0) {
          world.markWaiting(sellerPurchaseId);
          return;
        }
        world.proposeOffer({
          sellerPurchaseId,
          actor: "SELLER",
          items: reduced,
          reason: "AVAILABILITY_CHANGE",
        });
      }
    },
  };
}

export function buyerOffer(
  world: BasketWorld,
  sellerPurchaseId: string,
  items: PurchaseItem[],
  reason: OfferReason = "BUYER_CHANGE"
) {
  return world.proposeOffer({ sellerPurchaseId, actor: "BUYER" satisfies Actor, items, reason });
}
