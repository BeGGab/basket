/**
 * I-042: `price` is the price of one `unit`.
 * The commercial line total is derived. It is not a stored field and must not be invented
 * as `linePrice` on PurchaseItem / Offer / CatalogOffer.
 */
export function unitLineTotal(item: { quantity: number; price?: number | null }): number | null {
  if (item.price == null || !Number.isFinite(item.price)) return null;
  return item.quantity * item.price;
}

export function hasStoredLinePrice(item: object): boolean {
  return Object.prototype.hasOwnProperty.call(item, "linePrice");
}
