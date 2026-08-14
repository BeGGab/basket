import { catalogUnitPrice, isCatalogLineAvailable } from "./catalog";
import type { Alternative, ListItem, ProductCatalog, ResolutionKind, ResolutionPolicy, ResolutionResult } from "./types";

export function primaryProductId(item: ListItem): string {
  const primary = item.alternatives.find((a) => a.alternativePriority === 0);
  return primary?.productId ?? item.productId;
}

export function orderedAlternatives(item: ListItem): Alternative[] {
  const listed = [...item.alternatives].sort((a, b) => a.alternativePriority - b.alternativePriority);
  if (!listed.some((a) => a.productId === item.productId && a.alternativePriority === 0)) {
    return [{ productId: item.productId, alternativePriority: 0 }, ...listed.filter((a) => a.productId !== item.productId)];
  }
  return listed;
}

/**
 * Availability is unit-aware and uses the SAME commercial identity as SellerPurchase creation and
 * the assistants (`domain/catalog`): a `kg` ListItem is not satisfied by a `pcs` catalog row. When
 * the ListItem has no unit the query is unit-agnostic (any in-stock row for the product).
 */
export function isAvailable(catalog: ProductCatalog, productId: string, unit?: string): boolean {
  return isCatalogLineAvailable(catalog, { productId, unit });
}

// `cheapestAvailable` was removed: picking the lowest price is a PRICE_OPTIMIZATION policy, not
// catalog semantics. Ambiguous rows must yield NO reference (`catalogUnitPrice` returns null),
// never the cheapest — so the base catalog module deliberately offers no "cheapest" helper.

/** Re-export so callers building Purchases share one price lookup. */
export { catalogUnitPrice };

/**
 * Resolution is independent of SellerPurchase negotiation and runs *before*
 * seller partitioning (OQ-006 / I-015): one ListItem → one productId for the
 * whole Purchase. Availability is catalog-global (any seller with stock) but unit-aware — the
 * ListItem's unit must be commercially available, so alternatives cannot resolve to a different
 * unit than requested. Price is NOT used as a hidden threshold — expensive alternatives still
 * resolve if available.
 */
export function resolve(item: ListItem, policy: ResolutionPolicy, catalog: ProductCatalog): ResolutionResult {
  const chain = orderedAlternatives(item);
  const primary = chain[0];

  if (policy === "PRIMARY_ONLY") {
    if (primary && isAvailable(catalog, primary.productId, item.unit)) {
      return ok("PRIMARY", primary.productId, 0, item.productId);
    }
    return unresolved();
  }

  if (policy === "ASK_BUYER") {
    if (primary && isAvailable(catalog, primary.productId, item.unit)) {
      return ok("PRIMARY", primary.productId, 0, item.productId);
    }
    return {
      kind: "UNRESOLVED",
      productId: null,
      alternativePriority: null,
      resolvedFrom: item.productId,
      requiresBuyerDecision: true,
    };
  }

  // FIRST_AVAILABLE
  for (const alt of chain) {
    if (isAvailable(catalog, alt.productId, item.unit)) {
      const kind: ResolutionKind = alt.alternativePriority === 0 ? "PRIMARY" : "ALTERNATIVE";
      return ok(kind, alt.productId, alt.alternativePriority, item.productId);
    }
  }
  return unresolved();
}

function ok(kind: ResolutionKind, productId: string, priority: number, from: string): ResolutionResult {
  return {
    kind,
    productId,
    alternativePriority: priority,
    resolvedFrom: from,
    requiresBuyerDecision: false,
  };
}

function unresolved(): ResolutionResult {
  return {
    kind: "UNRESOLVED",
    productId: null,
    alternativePriority: null,
    resolvedFrom: null,
    requiresBuyerDecision: false,
  };
}
