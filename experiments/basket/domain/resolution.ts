import type { Alternative, CatalogOffer, ListItem, ProductCatalog, ResolutionKind, ResolutionPolicy, ResolutionResult } from "./types";

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

export function isAvailable(catalog: ProductCatalog, productId: string, sellerId?: string): boolean {
  return catalog.availability.some(
    (row) => row.productId === productId && row.stock > 0 && (sellerId === undefined || row.sellerId === sellerId)
  );
}

export function cheapestAvailable(catalog: ProductCatalog, productId: string): CatalogOffer | null {
  const rows = catalog.availability.filter((row) => row.productId === productId && row.stock > 0);
  if (rows.length === 0) return null;
  return rows.slice().sort((a, b) => a.price - b.price)[0];
}

/**
 * Resolution is independent of SellerPurchase negotiation and runs *before*
 * seller partitioning (OQ-006 / I-015): one ListItem → one productId for the
 * whole Purchase. Availability is catalog-global (any seller with stock).
 * Price is NOT used as a hidden threshold — expensive alternatives still resolve if available.
 */
export function resolve(item: ListItem, policy: ResolutionPolicy, catalog: ProductCatalog): ResolutionResult {
  const chain = orderedAlternatives(item);
  const primary = chain[0];

  if (policy === "PRIMARY_ONLY") {
    if (primary && isAvailable(catalog, primary.productId)) {
      return ok("PRIMARY", primary.productId, 0, item.productId);
    }
    return unresolved();
  }

  if (policy === "ASK_BUYER") {
    if (primary && isAvailable(catalog, primary.productId)) {
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
    if (isAvailable(catalog, alt.productId)) {
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
