/**
 * Read-only projections. These are not commercial entities (not Offer, not PurchaseItem,
 * not a selected alternative). They exist so tests and UI can observe facts without
 * inventing BEST_PRICE / AUTO_ACCEPT / package-contents.
 */

export interface AlternativeProjection {
  productId: string;
  alternativePriority: number;
  /** Quantity/unit from the source ListItem — not claimed as the alternative's sellable pack. */
  requestedQuantity: number | null;
  requestedUnit: string | null;
  /** Catalog reference size / unit / unit-price for this seller, or null if missing/ambiguous. */
  catalogQuantity: number | null;
  catalogUnit: string | null;
  catalogPrice: number | null;
  unitCompatible: boolean;
  referenceQtyMatches: boolean;
}

export type ReadonlyAlternativeProjection = Readonly<AlternativeProjection>;
