import type { CatalogOffer, ProductCatalog, ReadonlyProductCatalog } from "./types";

/** Accepts both the mutable domain catalog and the frozen projection returned by BasketWorld. */
type AnyCatalog = ProductCatalog | ReadonlyProductCatalog;
type Row = Readonly<CatalogOffer>;

/**
 * Commercial identity of a catalog line — the SINGLE source of catalog-line semantics for the
 * whole model. Resolution, SellerPurchase creation, setStock, stock-conflict detection AND the
 * assistants all derive availability / reference price from here, so the domain can never be
 * laxer about commercial comparability than the assistant layer.
 *
 * Identity is `(sellerId, productId, unit)`. `price` is the UNIT price (per one `unit`): a listing
 * "20 kg @ 15" means 15 MAD per kg, and the catalog `quantity` is only a reference / package size
 * — it is NOT part of the line identity and does NOT scale the price. A `pcs` row is therefore not
 * comparable to a `kg` request. Two in-stock rows that share `(sellerId, productId, unit)` but
 * disagree on price are AMBIGUOUS: the model returns "no reference" instead of picking one by
 * array order (that would be a hidden price policy).
 *
 * ASSUMPTION (SPEC OQ-001 / OQ-002, see docs/domain/GREENMARKET_DOMAIN_SPEC.md): package/reference
 * `quantity` never changes the unit price — "1 kg @ 15" and "20 kg @ 15" are the same line at the
 * same unit price. This is a deliberate Stage-1 assumption, NOT a proven domain truth; volume
 * pricing (e.g. 20 kg cheaper per kg) would make `quantity` part of the price policy and must be
 * revisited before it is relied on.
 */
export interface CatalogLineQuery {
  sellerId?: string;
  productId: string;
  /** When omitted the query is unit-agnostic (e.g. resolution before a unit is fixed). */
  unit?: string;
}

/** In-stock rows on the same commercial line as the query. */
export function comparableRows(catalog: AnyCatalog, query: CatalogLineQuery): Row[] {
  return catalog.availability.filter(
    (row) =>
      row.productId === query.productId &&
      row.stock > 0 &&
      (query.sellerId === undefined || row.sellerId === query.sellerId) &&
      (query.unit === undefined || row.unit === query.unit)
  );
}

/** At least one in-stock comparable row exists (unit-aware: a pcs row is not a kg availability). */
export function isCatalogLineAvailable(catalog: AnyCatalog, query: CatalogLineQuery): boolean {
  return comparableRows(catalog, query).length > 0;
}

/**
 * Unit price for the line, or null when there is no comparable in-stock row OR the comparable rows
 * disagree on price (ambiguous — never the cheapest / first row).
 */
export function catalogUnitPrice(catalog: AnyCatalog, query: CatalogLineQuery): number | null {
  const rows = comparableRows(catalog, query);
  if (rows.length === 0) return null;
  const price = rows[0].price;
  return rows.every((row) => row.price === price) ? price : null;
}

export interface SellerLine {
  sellerId: string;
  unit: string;
  price: number;
}

/**
 * The priceable seller lines for a product, used when a Purchase is built from a List.
 * For each seller that has an in-stock comparable row, a single line is produced ONLY if that
 * seller's rows yield an unambiguous unit and price:
 * - `unit` given: that unit; `unit` omitted: the seller's rows must all share one unit, else the
 *   seller is ambiguous (we do not pick a unit by array order);
 * - the comparable rows must agree on one price, else the seller is ambiguous.
 * Ambiguous sellers are reported separately so the caller records them instead of guessing.
 */
export function priceableSellerLines(
  catalog: AnyCatalog,
  productId: string,
  unit: string | undefined,
  allowed: ReadonlySet<string> | null
): { lines: SellerLine[]; ambiguousSellers: string[] } {
  const rows = comparableRows(catalog, { productId, unit }).filter(
    (row) => allowed === null || allowed.has(row.sellerId)
  );
  const bySeller = new Map<string, Row[]>();
  for (const row of rows) {
    const bucket = bySeller.get(row.sellerId) ?? [];
    bucket.push(row);
    bySeller.set(row.sellerId, bucket);
  }
  const lines: SellerLine[] = [];
  const ambiguousSellers: string[] = [];
  for (const [sellerId, sellerRows] of [...bySeller].sort(([a], [b]) => a.localeCompare(b))) {
    const units = new Set(sellerRows.map((row) => row.unit));
    const effectiveUnit = unit ?? (units.size === 1 ? [...units][0] : null);
    if (effectiveUnit === null) {
      ambiguousSellers.push(sellerId);
      continue;
    }
    const price = catalogUnitPrice(catalog, { sellerId, productId, unit: effectiveUnit });
    if (price === null) {
      ambiguousSellers.push(sellerId);
      continue;
    }
    lines.push({ sellerId, unit: effectiveUnit, price });
  }
  return { lines, ambiguousSellers };
}
