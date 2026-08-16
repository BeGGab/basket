/**
 * I-042 diagnostic: derived commercial total under unit-price semantics.
 * Not a stored field (`linePrice` does not exist).
 *
 * `unitLineTotal` only multiplies. Bounds come from existing invariants:
 * - quantity finite > 0 — I-030 (Offer / List / catalog construction), not a TZ-006 rule;
 * - price finite ≥ 0 — I-046 (acceptance) / I-030 (when price is present).
 * The product is IEEE-754 floating point — no rounding, scale, or overflow policy.
 *
 * These helpers are diagnostics. They do not accept, reject, or construct Offers.
 * A `null` total means "no derived number", not a commercial status.
 */

export type LineTotalInput = { quantity: number; price?: number | null };

/** Why no derived total can be formed. Not a domain command result. */
export type LineTotalAbsence = "INVALID_QUANTITY" | "MISSING_PRICE" | "INVALID_PRICE";

export function lineTotalAbsence(item: LineTotalInput): LineTotalAbsence | null {
  if (!Number.isFinite(item.quantity) || item.quantity <= 0) return "INVALID_QUANTITY";
  if (item.price == null) return "MISSING_PRICE";
  if (!Number.isFinite(item.price) || item.price < 0) return "INVALID_PRICE";
  return null;
}

export function isRepresentableLine(item: LineTotalInput): boolean {
  return lineTotalAbsence(item) === null;
}

export function unitLineTotal(item: LineTotalInput): number | null {
  if (!isRepresentableLine(item)) return null;
  return item.quantity * (item.price as number);
}

export function hasStoredLinePrice(item: object): boolean {
  return Object.prototype.hasOwnProperty.call(item, "linePrice");
}
