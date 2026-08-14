import type { BasketWorld } from "../domain/world";
import type { ReadonlySellerPurchase, SellerPurchaseStatus } from "../domain/types";

/**
 * Snapshot identity an Advice is allowed to act on. Stale Advice must not apply.
 *
 * Fingerprints are canonical JSON (stable field order via explicit object literals,
 * JSON escaping) — no hand-rolled delimiter strings, no collision on data content.
 */
export interface AdviceBasis {
  sellerPurchaseId: string;
  activeOfferId: string | null;
  agreedOfferId: string | null;
  /**
   * Time-validity of the active Offer at advice time. Advice computed on a live Offer
   * becomes stale once the Offer expires — this covers advise → clock advance → apply.
   */
  activeOfferValid: boolean;
  /**
   * Full immutable fingerprint of the active/agreed Offer — the complete observed fact, not just
   * its commercial items: actor, reason, validUntil, createdAt AND items. Protects against
   * same-ID/different-content drift and lets a future LLM policy reference the whole Offer.
   */
  activeOfferFingerprint: string;
  agreedOfferFingerprint: string;
  status: SellerPurchaseStatus;
  /**
   * Canonical JSON of pending substitutions — id AND content (original, replacement, proposedBy).
   * Sorted by id: they are a set, listing order is not part of snapshot identity. Content is
   * included so that a same-ID substitution with different content would be stale, keeping the
   * snapshot complete even though the current domain freezes substitutions after creation.
   */
  pendingSubstitutionFacts: string;
  /**
   * Audit-only: canonical JSON of the effective policy (with the advising actor) the Advice was
   * computed under, or "" for hand-crafted commands. NOT compared by adviceIsStale — policy is
   * not world state — but it makes the same-world/different-policy case distinguishable and the
   * Advice reproducible.
   */
  policy: string;
  /**
   * Catalog rows of this seller for exactly the products the example policies read
   * (SellerPurchase lines + active/agreed Offer lines). Unrelated products do not
   * invalidate the Advice.
   */
  catalogFacts: string;
}

/**
 * Every fact in the basis must belong to the SellerPurchase it identifies: Offers are fetched
 * by ID, so ownership is asserted explicitly, and the fingerprint embeds the owning SP id plus
 * the full immutable Offer metadata (not only items).
 */
function offerFingerprint(world: BasketWorld, sellerPurchaseId: string, offerId: string | null): string {
  if (!offerId) return "";
  const offer = world.offerById(offerId);
  if (offer.sellerPurchaseId !== sellerPurchaseId) {
    throw new Error(
      `Basis integrity violation: Offer ${offerId} belongs to ${offer.sellerPurchaseId}, not ${sellerPurchaseId}.`
    );
  }
  return JSON.stringify({
    sellerPurchaseId,
    offerId,
    actor: offer.actor,
    reason: offer.reason,
    createdAt: offer.createdAt,
    validUntil: offer.validUntil ?? null,
    items: offer.items.map((item) => ({
      productId: item.productId,
      quantity: item.quantity,
      unit: item.unit,
      price: item.price ?? null,
      discount: item.discount ?? null,
    })),
  });
}

function relevantProductIds(world: BasketWorld, sp: ReadonlySellerPurchase): Set<string> {
  const ids = new Set<string>(sp.items.map((item) => item.productId));
  for (const offerId of [sp.activeOfferId, sp.agreedOfferId]) {
    if (!offerId) continue;
    for (const item of world.offerById(offerId).items) ids.add(item.productId);
  }
  return ids;
}

/** Catalog facts are derived from the SP's own sellerId, and the fingerprint embeds the SP id. */
function catalogFacts(world: BasketWorld, sp: ReadonlySellerPurchase): string {
  const products = relevantProductIds(world, sp);
  const rows = world.catalog.availability
    .filter((row) => row.sellerId === sp.sellerId && products.has(row.productId))
    .map((row) => ({
      productId: row.productId,
      unit: row.unit,
      quantity: row.quantity,
      price: row.price,
      stock: row.stock,
    }))
    .sort((a, b) =>
      a.productId === b.productId
        ? a.unit === b.unit
          ? a.quantity - b.quantity
          : a.unit.localeCompare(b.unit)
        : a.productId.localeCompare(b.productId)
    );
  return JSON.stringify({ sellerPurchaseId: sp.id, sellerId: sp.sellerId, rows });
}

export function captureAdviceBasis(
  world: BasketWorld,
  sellerPurchaseId: string,
  policy: object | null = null
): AdviceBasis {
  const sp = world.requireSp(sellerPurchaseId);
  return {
    sellerPurchaseId,
    activeOfferId: sp.activeOfferId,
    agreedOfferId: sp.agreedOfferId,
    activeOfferValid: sp.activeOfferId ? world.isOfferValid(world.offerById(sp.activeOfferId)) : false,
    activeOfferFingerprint: offerFingerprint(world, sellerPurchaseId, sp.activeOfferId),
    agreedOfferFingerprint: offerFingerprint(world, sellerPurchaseId, sp.agreedOfferId),
    status: sp.status,
    pendingSubstitutionFacts: JSON.stringify(
      world
        .snapshot(sellerPurchaseId)
        .pendingSubstitutions.map((sub) => ({
          id: sub.id,
          originalProductId: sub.originalProductId,
          replacementProductId: sub.replacementProductId,
          proposedBy: sub.proposedBy,
        }))
        .sort((a, b) => a.id.localeCompare(b.id))
    ),
    policy: policy ? JSON.stringify(policy) : "",
    catalogFacts: catalogFacts(world, sp),
  };
}

export function adviceIsStale(world: BasketWorld, sellerPurchaseId: string, basis: AdviceBasis): string | null {
  if (basis.sellerPurchaseId !== sellerPurchaseId) {
    return `Advice was bound to ${basis.sellerPurchaseId}, not ${sellerPurchaseId}.`;
  }
  const now = captureAdviceBasis(world, sellerPurchaseId);
  if (basis.activeOfferId !== now.activeOfferId) {
    return `Advice is stale: activeOfferId ${basis.activeOfferId} ≠ ${now.activeOfferId}.`;
  }
  if (basis.activeOfferValid !== now.activeOfferValid) {
    return "Advice is stale: active Offer validity changed (expired since the advice was computed).";
  }
  if (basis.activeOfferFingerprint !== now.activeOfferFingerprint) {
    return "Advice is stale: active Offer content changed.";
  }
  if (basis.agreedOfferId !== now.agreedOfferId) {
    return `Advice is stale: agreedOfferId ${basis.agreedOfferId} ≠ ${now.agreedOfferId}.`;
  }
  if (basis.agreedOfferFingerprint !== now.agreedOfferFingerprint) {
    return "Advice is stale: agreed Offer content changed.";
  }
  if (basis.status !== now.status) {
    return `Advice is stale: status ${basis.status} ≠ ${now.status}.`;
  }
  if (basis.pendingSubstitutionFacts !== now.pendingSubstitutionFacts) {
    return "Advice is stale: pending substitutions (set or content) changed.";
  }
  if (basis.catalogFacts !== now.catalogFacts) {
    return "Advice is stale: catalog facts for the negotiated products changed.";
  }
  // basis.policy is intentionally NOT compared: it is an audit fact about how the Advice was
  // computed, not a claim about world state.
  return null;
}
