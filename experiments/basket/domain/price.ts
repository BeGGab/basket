/**
 * I-042 diagnostic: derived commercial total under unit-price semantics.
 * Not a stored field (`linePrice` does not exist).
 *
 * Stage-1 limits (not a money type, no currency engine):
 * - `quantity` must be a finite number > 0 (same bound as I-030);
 * - `price` must be a finite number ≥ 0;
 * - the product is IEEE-754 floating point — no rounding, scale, or overflow policy.
 * Invalid inputs yield `null` rather than a fake total.
 */
export function unitLineTotal(item: { quantity: number; price?: number | null }): number | null {
  if (!Number.isFinite(item.quantity) || item.quantity <= 0) return null;
  if (item.price == null || !Number.isFinite(item.price) || item.price < 0) return null;
  return item.quantity * item.price;
}

export function hasStoredLinePrice(item: object): boolean {
  return Object.prototype.hasOwnProperty.call(item, "linePrice");
}
