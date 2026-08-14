import type { BasketWorld } from "../domain/world";

/**
 * Reference unit price for an Offer line (sellerId, productId, unit, quantity).
 *
 * Comparability rule (explicit, order-independent, NO hidden price optimization):
 * 1. only catalog rows with the SAME unit are comparable — a price in a different
 *    unit/packaging is not a reference for this line;
 * 2. among same-unit rows, rows with the exact quantity are the reference pool;
 *    without an exact match the pool is the same-unit rows only if there is exactly one;
 * 3. the pool yields a reference ONLY if all its rows agree on one price — picking the
 *    cheapest of several would be a price policy, not a reference lookup;
 * 4. empty or ambiguous pool → no reference (callers must treat this as "cannot evaluate").
 */
export function catalogReferencePrice(
  world: BasketWorld,
  sellerId: string,
  productId: string,
  unit: string,
  quantity: number
): number | null {
  const sameUnit = world.catalog.availability.filter(
    (row) => row.sellerId === sellerId && row.productId === productId && row.unit === unit
  );
  const exact = sameUnit.filter((row) => row.quantity === quantity);
  const pool = exact.length > 0 ? exact : sameUnit.length === 1 ? sameUnit : [];
  if (pool.length === 0) return null;
  const price = pool[0].price;
  return pool.every((row) => row.price === price) ? price : null;
}
