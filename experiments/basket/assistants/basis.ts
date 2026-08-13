import type { BasketWorld } from "../domain/world";
import type { SellerPurchaseStatus } from "../domain/types";

/** Snapshot identity an Advice is allowed to act on. Stale Advice must not apply. */
export interface AdviceBasis {
  sellerPurchaseId: string;
  activeOfferId: string | null;
  agreedOfferId: string | null;
  status: SellerPurchaseStatus;
  pendingSubstitutionIds: string[];
}

export function captureAdviceBasis(world: BasketWorld, sellerPurchaseId: string): AdviceBasis {
  const sp = world.requireSp(sellerPurchaseId);
  return {
    sellerPurchaseId,
    activeOfferId: sp.activeOfferId,
    agreedOfferId: sp.agreedOfferId,
    status: sp.status,
    pendingSubstitutionIds: world
      .snapshot(sellerPurchaseId)
      .pendingSubstitutions.map((sub) => sub.id),
  };
}

export function adviceIsStale(world: BasketWorld, sellerPurchaseId: string, basis: AdviceBasis): string | null {
  const now = captureAdviceBasis(world, sellerPurchaseId);
  if (basis.sellerPurchaseId !== sellerPurchaseId) {
    return `Advice was bound to ${basis.sellerPurchaseId}, not ${sellerPurchaseId}.`;
  }
  if (basis.activeOfferId !== now.activeOfferId) {
    return `Advice is stale: activeOfferId ${basis.activeOfferId} ≠ ${now.activeOfferId}.`;
  }
  if (basis.agreedOfferId !== now.agreedOfferId) {
    return `Advice is stale: agreedOfferId ${basis.agreedOfferId} ≠ ${now.agreedOfferId}.`;
  }
  if (basis.status !== now.status) {
    return `Advice is stale: status ${basis.status} ≠ ${now.status}.`;
  }
  if (basis.pendingSubstitutionIds.join(",") !== now.pendingSubstitutionIds.join(",")) {
    return "Advice is stale: pending substitutions changed.";
  }
  return null;
}
