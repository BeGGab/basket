import { catalogUnitPrice, isCatalogLineAvailable } from "../domain/catalog";
import type { BasketWorld } from "../domain/world";

/**
 * The assistants share the domain's ONE catalog-line concept (`domain/catalog`) instead of owning
 * a private matcher. Commercial identity is `(sellerId, productId, unit)`; `price` is the unit
 * price. The domain can therefore never be laxer than the assistant layer about comparability.
 */

/** Unit reference price for a line, or null when there is no comparable in-stock row OR the rows
 * disagree on price (ambiguous — never the cheapest). */
export function catalogReferencePrice(
  world: BasketWorld,
  sellerId: string,
  productId: string,
  unit: string
): number | null {
  return catalogUnitPrice(world.catalog, { sellerId, productId, unit });
}

/** Is this line buyable? Unit-aware: a pcs row is not availability for a kg line. */
export function catalogLineAvailable(
  world: BasketWorld,
  sellerId: string,
  productId: string,
  unit: string
): boolean {
  return isCatalogLineAvailable(world.catalog, { sellerId, productId, unit });
}
