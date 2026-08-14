export type Actor = "BUYER" | "SELLER" | "SYSTEM";

export type OfferReason =
  | "BUYER_CHANGE"
  | "SELLER_COUNTEROFFER"
  | "PRICE_CHANGE"
  | "TIME_DISCOUNT"
  | "AVAILABILITY_CHANGE"
  | "SYSTEM_ADJUSTMENT"
  | "SUBSTITUTION"
  | "EXPIRATION";

export type ResolutionPolicy = "PRIMARY_ONLY" | "FIRST_AVAILABLE" | "ASK_BUYER";
export type ResolutionKind = "PRIMARY" | "ALTERNATIVE" | "UNRESOLVED";
export type SubstitutionStatus = "PROPOSED" | "ACCEPTED" | "REJECTED";
export type SellerPurchaseStatus =
  | "DRAFT"
  | "NEGOTIATING"
  | "WAITING_SELLER"
  | "WAITING_BUYER"
  | "STABLE"
  | "REJECTED"
  | "CANCELLED"
  | "EXPIRED";

export interface Alternative {
  productId: string;
  alternativePriority: number;
}

export interface ListItem {
  id: string;
  productId: string;
  quantity?: number;
  unit?: string;
  referencePrice?: number;
  alternatives: Alternative[];
}

export interface ShoppingList {
  id: string;
  name: string;
  items: ListItem[];
}

export interface PurchaseItem {
  productId: string;
  quantity: number;
  unit: string;
  price?: number;
  discount?: number;
  resolvedFrom?: string;
  alternativePriority?: number;
}

export interface Offer {
  readonly id: string;
  readonly sellerPurchaseId: string;
  readonly actor: Actor;
  readonly items: readonly PurchaseItem[];
  readonly reason: OfferReason;
  readonly createdAt: string;
  readonly validUntil?: string;
}

export interface Acceptance {
  id: string;
  offerId: string;
  actor: Actor;
  createdAt: string;
}

export interface Substitution {
  id: string;
  sellerPurchaseId: string;
  originalProductId: string;
  replacementProductId: string;
  proposedBy: Actor;
  reason?: string;
  status: SubstitutionStatus;
  createdAt: string;
}

export interface SellerPurchase {
  id: string;
  purchaseId: string;
  sellerId: string;
  items: PurchaseItem[];
  agreedOfferId: string | null;
  activeOfferId: string | null;
  status: SellerPurchaseStatus;
  lastSellerActivity: string | null;
  waitingSince: string | null;
}

export interface Purchase {
  id: string;
  listId: string;
  resolutionPolicy: ResolutionPolicy;
  sellerPurchaseIds: string[];
  unresolvedItems: Array<{ listItemId: string; productId: string; reason: string }>;
}

export interface ResolutionResult {
  kind: ResolutionKind;
  productId: string | null;
  alternativePriority: number | null;
  resolvedFrom: string | null;
  requiresBuyerDecision: boolean;
}

export interface CatalogOffer {
  sellerId: string;
  productId: string;
  quantity: number;
  unit: string;
  price: number;
  stock: number;
}

export interface ProductCatalog {
  names: Record<string, string>;
  availability: CatalogOffer[];
}

export type StockConflictPoint = "OFFER_CREATION" | "ACCEPTANCE" | "STABLE" | "FULFILLMENT" | "NONE";

/** Detection-event log entry, not a unique conflict state. The same race may appear at several checkpoints. */
export interface StockConflict {
  productId: string;
  stock: number;
  requested: number;
  /** Sum of this request plus competing claims (each claim = that SellerPurchase's active Offer quantity). */
  combined: number;
  detectedAt: StockConflictPoint;
  purchaseId: string;
}

export interface Snapshot {
  agreed: { offerId: string | null; items: readonly Readonly<PurchaseItem>[] };
  current: { offerId: string | null; items: readonly Readonly<PurchaseItem>[] };
  pendingSubstitutions: readonly ReadonlySubstitution[];
}

/**
 * Read-only projections handed out by BasketWorld.
 * State only changes through domain commands, so every exit point is a frozen copy.
 */
export type ReadonlyListItem = Readonly<Omit<ListItem, "alternatives">> & {
  readonly alternatives: readonly Readonly<Alternative>[];
};

export type ReadonlyShoppingList = Readonly<Omit<ShoppingList, "items">> & {
  readonly items: readonly ReadonlyListItem[];
};

export type ReadonlySellerPurchase = Readonly<Omit<SellerPurchase, "items">> & {
  readonly items: readonly Readonly<PurchaseItem>[];
};

export type ReadonlyPurchase = Readonly<Omit<Purchase, "sellerPurchaseIds" | "unresolvedItems">> & {
  readonly sellerPurchaseIds: readonly string[];
  readonly unresolvedItems: readonly Readonly<{ listItemId: string; productId: string; reason: string }>[];
};

export type ReadonlySubstitution = Readonly<Substitution>;
export type ReadonlyAcceptance = Readonly<Acceptance>;
export type ReadonlyStockConflict = Readonly<StockConflict>;
export type ReadonlyMockFulfillment = Readonly<MockFulfillment>;

export interface ReadonlyProductCatalog {
  readonly names: Readonly<Record<string, string>>;
  readonly availability: readonly Readonly<CatalogOffer>[];
}

export interface MockFulfillment {
  sellerPurchaseId: string;
  actualQuantity: number;
  recordedAt: string;
}
