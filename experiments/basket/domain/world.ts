import { catalogUnitPrice, comparableRows, priceableSellerLines } from "./catalog";
import type { AlternativeProjection } from "./projections";
import { DeterministicClock } from "./clock";
import { transition } from "./fsm";
import { resolve } from "./resolution";
import { isCounterReason } from "./types";
import type {
  Acceptance,
  Actor,
  ListItem,
  MockFulfillment,
  Offer,
  OfferReason,
  ProductCatalog,
  Purchase,
  PurchaseItem,
  ReadonlyAcceptance,
  ReadonlyListItem,
  ReadonlyMockFulfillment,
  ReadonlyProductCatalog,
  ReadonlyPurchase,
  ReadonlySellerPurchase,
  ReadonlyShoppingList,
  ReadonlyStockClaim,
  ReadonlyStockConflict,
  ReadonlySubstitution,
  StockClaim,
  ResolutionPolicy,
  SellerPurchase,
  ShoppingList,
  Snapshot,
  StockConflict,
  Substitution,
} from "./types";

function frozenItems(items: readonly PurchaseItem[]): readonly Readonly<PurchaseItem>[] {
  return Object.freeze(items.map((item) => Object.freeze({ ...item })));
}

function frozenListItem(item: ListItem): ReadonlyListItem {
  return Object.freeze({
    ...item,
    alternatives: Object.freeze(item.alternatives.map((alt) => Object.freeze({ ...alt }))),
  });
}

function frozenList(list: ShoppingList): ReadonlyShoppingList {
  return Object.freeze({ ...list, items: Object.freeze(list.items.map(frozenListItem)) });
}

function frozenSp(sp: SellerPurchase): ReadonlySellerPurchase {
  return Object.freeze({ ...sp, items: frozenItems(sp.items) });
}

function frozenPurchase(purchase: Purchase): ReadonlyPurchase {
  return Object.freeze({
    ...purchase,
    sellerPurchaseIds: Object.freeze([...purchase.sellerPurchaseIds]),
    unresolvedItems: Object.freeze(purchase.unresolvedItems.map((row) => Object.freeze({ ...row }))),
  });
}

function frozenSub(sub: Substitution): ReadonlySubstitution {
  return Object.freeze({ ...sub });
}

function frozenCatalog(catalog: ProductCatalog): ReadonlyProductCatalog {
  return Object.freeze({
    names: Object.freeze({ ...catalog.names }),
    availability: Object.freeze(catalog.availability.map((row) => Object.freeze({ ...row }))),
  });
}

/**
 * Mutable state is private: every read exits as a frozen copy, so FSM transitions and
 * invariants cannot be bypassed by writing to a returned object (I-033).
 */
export class BasketWorld {
  readonly clock: DeterministicClock;
  /** Policy flag checked by `mockFulfill` (I-019). */
  partialFulfillmentAllowed = true;

  private readonly listById = new Map<string, ShoppingList>();
  private readonly purchaseById = new Map<string, Purchase>();
  private readonly spById = new Map<string, SellerPurchase>();
  private readonly offerLog: Offer[] = [];
  private readonly acceptanceLog: ReadonlyAcceptance[] = [];
  private readonly substitutionLog: Substitution[] = [];
  private readonly stockConflictLog: ReadonlyStockConflict[] = [];
  private readonly fulfillmentLog: ReadonlyMockFulfillment[] = [];
  private catalogState: ProductCatalog = { names: {}, availability: [] };

  private seq = 0;

  constructor(clock = new DeterministicClock()) {
    this.clock = clock;
  }

  get lists(): ReadonlyMap<string, ReadonlyShoppingList> {
    return new Map([...this.listById].map(([id, list]) => [id, frozenList(list)]));
  }

  get purchases(): ReadonlyMap<string, ReadonlyPurchase> {
    return new Map([...this.purchaseById].map(([id, purchase]) => [id, frozenPurchase(purchase)]));
  }

  get sellerPurchases(): ReadonlyMap<string, ReadonlySellerPurchase> {
    return new Map([...this.spById].map(([id, sp]) => [id, frozenSp(sp)]));
  }

  get offers(): readonly Offer[] {
    return Object.freeze([...this.offerLog]);
  }

  get acceptances(): readonly ReadonlyAcceptance[] {
    return Object.freeze([...this.acceptanceLog]);
  }

  get substitutions(): readonly ReadonlySubstitution[] {
    return Object.freeze(this.substitutionLog.map(frozenSub));
  }

  get stockConflicts(): readonly ReadonlyStockConflict[] {
    return Object.freeze([...this.stockConflictLog]);
  }

  get fulfillments(): readonly ReadonlyMockFulfillment[] {
    return Object.freeze([...this.fulfillmentLog]);
  }

  get catalog(): ReadonlyProductCatalog {
    return frozenCatalog(this.catalogState);
  }

  private id(prefix: string): string {
    this.seq += 1;
    return `${prefix}-${this.seq}`;
  }

  nowIso(): string {
    return this.clock.now().toISOString();
  }

  /**
   * Domain time operation (I-040): move the world clock and nothing else.
   * `isOfferValid` is computed from the clock; status, pointers, and logs are unchanged.
   * Does not enter EXPIRED (I-041).
   */
  advance(durationMs: number): void {
    this.clock.advance(durationMs);
  }

  /** Stores a defensive copy: catalog changes only happen through `setCatalog`/`setStock` (I-034). */
  setCatalog(catalog: ProductCatalog): void {
    this.assertCatalog(catalog);
    this.catalogState = {
      names: { ...catalog.names },
      availability: catalog.availability.map((row) => ({ ...row })),
    };
  }

  createList(name: string): ReadonlyShoppingList {
    if (!name) throw new Error("List requires a name.");
    const list: ShoppingList = { id: this.id("list"), name, items: [] };
    this.listById.set(list.id, list);
    return frozenList(list);
  }

  addItem(listId: string, item: Omit<ListItem, "id">): ReadonlyListItem {
    const list = this.requireList(listId);
    this.assertListItem(item);
    const created: ListItem = {
      ...item,
      id: this.id("li"),
      alternatives: item.alternatives.map((alt) => ({ ...alt })),
    };
    list.items.push(created);
    return frozenListItem(created);
  }

  /**
   * Experimental helper, not a production purchase API.
   * - `sellerIds` omitted: one SellerPurchase via deterministic `pickSeller` (lexicographic sellerId).
   * - `sellerIds` provided: **fan-out** — one SellerPurchase per listed seller that has a catalog row with stock > 0.
   * Passing sellerIds is therefore a multi-seller scenario mode, not merely a search filter.
   */
  createPurchaseFromList(listId: string, policy: ResolutionPolicy, sellerIds?: string[]): ReadonlyPurchase {
    const list = this.requireList(listId);
    const purchase: Purchase = {
      id: this.id("purchase"),
      listId: list.id,
      resolutionPolicy: policy,
      sellerPurchaseIds: [],
      unresolvedItems: [],
    };

    const bySeller = new Map<string, PurchaseItem[]>();
    const allowed = sellerIds ? new Set(sellerIds) : null;

    for (const item of list.items) {
      if (item.quantity === undefined) {
        purchase.unresolvedItems.push({
          listItemId: item.id,
          productId: item.productId,
          reason: "MISSING_QUANTITY",
        });
        continue;
      }
      const result = resolve(item, policy, this.catalogState);
      if (result.kind === "UNRESOLVED" || !result.productId) {
        purchase.unresolvedItems.push({
          listItemId: item.id,
          productId: item.productId,
          reason: result.requiresBuyerDecision ? "ASK_BUYER" : "UNAVAILABLE",
        });
        continue;
      }

      // Seller lines come from the shared commercial matcher (domain/catalog): unit-aware and
      // ambiguity-aware. A seller whose catalog rows disagree on unit/price is NOT silently priced
      // by array order — it is reported as ambiguous and never becomes a SellerPurchase line.
      const { lines, ambiguousSellers } = priceableSellerLines(
        this.catalogState,
        result.productId,
        item.unit,
        allowed
      );

      if (lines.length === 0) {
        purchase.unresolvedItems.push({
          listItemId: item.id,
          productId: result.productId,
          reason: ambiguousSellers.length > 0 ? "AMBIGUOUS_PRICE" : "NO_SELLER",
        });
        continue;
      }

      // Single mode: the lexicographically first priceable seller (lines are pre-sorted).
      const targets = allowed ? lines : [lines[0]];
      let duplicated = false;
      for (const line of targets) {
        const bucket = bySeller.get(line.sellerId) ?? [];
        // A SellerPurchase line is unique per COMMERCIAL identity (productId, unit) — the same
        // identity as CatalogLine (I-031/I-036). tomatoes/kg and tomatoes/pcs are two lines; a
        // second ListItem collapsing to the SAME (productId, unit) is the domain-undefined
        // duplicate case (SPEC OQ-003) and is surfaced explicitly, never silently dropped.
        if (bucket.some((existing) => existing.productId === result.productId && existing.unit === line.unit)) {
          duplicated = true;
          continue;
        }
        bucket.push({
          productId: result.productId,
          quantity: item.quantity,
          unit: line.unit,
          price: line.price,
          resolvedFrom: result.resolvedFrom ?? item.productId,
          alternativePriority: result.alternativePriority ?? 0,
        });
        bySeller.set(line.sellerId, bucket);
      }
      if (duplicated) {
        purchase.unresolvedItems.push({
          listItemId: item.id,
          productId: result.productId,
          reason: "DUPLICATE_LINE",
        });
      }
    }

    for (const [sellerId, items] of bySeller) {
      const sp: SellerPurchase = {
        id: this.id("sp"),
        purchaseId: purchase.id,
        sellerId,
        items,
        agreedOfferId: null,
        activeOfferId: null,
        status: "DRAFT",
        lastSellerActivity: null,
        waitingSince: this.nowIso(),
      };
      this.spById.set(sp.id, sp);
      purchase.sellerPurchaseIds.push(sp.id);
    }

    this.purchaseById.set(purchase.id, purchase);
    return frozenPurchase(purchase);
  }

  /**
   * Stock is set on one commercial line `(sellerId, productId, unit)`. Because the PR intentionally
   * allows several catalog rows for the same seller/product (to exercise ambiguity), the unit is a
   * required key and the target row must be unique — an ambiguous or missing match throws instead
   * of silently editing the first row (I-034).
   */
  setStock(sellerId: string, productId: string, unit: string, stock: number): void {
    if (!Number.isFinite(stock) || stock < 0) {
      throw new Error(`stock must be a finite number ≥ 0, got ${stock}`);
    }
    const rows = this.catalogState.availability.filter(
      (item) => item.sellerId === sellerId && item.productId === productId && item.unit === unit
    );
    if (rows.length === 0) throw new Error(`No catalog row for ${sellerId}/${productId}/${unit}`);
    if (rows.length > 1) {
      throw new Error(
        `Ambiguous setStock: ${rows.length} rows for ${sellerId}/${productId}/${unit}; catalog line identity is (sellerId, productId, unit).`
      );
    }
    rows[0].stock = stock;
  }

  cancelSellerPurchase(sellerPurchaseId: string): void {
    this.applyStatus(this.mutableSp(sellerPurchaseId), "CANCELLED");
  }

  proposeOffer(input: {
    sellerPurchaseId: string;
    actor: Actor;
    items: PurchaseItem[];
    reason: OfferReason;
    validUntil?: string;
  }): Offer {
    const sp = this.mutableSp(input.sellerPurchaseId);
    this.assertOfferItems(input.items);
    // I-035: a counter is a reply to a live proposal. Countering an expired Offer is forbidden —
    // like acceptOffer (I-028); replacing an expired Offer requires an explicit new proposal
    // with a non-counter reason (PRICE_CHANGE, TIME_DISCOUNT, ...).
    if (isCounterReason(input.reason) && sp.activeOfferId) {
      const active = this.requireOffer(sp.activeOfferId);
      if (!this.isOfferValid(active)) {
        throw new Error(
          `Cannot counter Offer ${active.id}: it is expired (I-035). Propose a new Offer with a non-counter reason instead.`
        );
      }
    }
    const offer: Offer = Object.freeze({
      id: this.id("offer"),
      sellerPurchaseId: sp.id,
      actor: input.actor,
      items: frozenItems(input.items),
      reason: input.reason,
      createdAt: this.nowIso(),
      validUntil: input.validUntil,
    });
    this.offerLog.push(offer);
    sp.activeOfferId = offer.id;
    if (sp.status === "DRAFT" || sp.status === "STABLE") this.applyStatus(sp, "NEGOTIATING");
    if (input.actor === "SELLER" || input.actor === "SYSTEM") {
      sp.lastSellerActivity = this.nowIso();
      sp.waitingSince = this.nowIso();
      this.applyStatus(sp, "WAITING_BUYER");
    } else {
      this.applyStatus(sp, "WAITING_SELLER");
      sp.waitingSince = this.nowIso();
    }
    this.recordStockConflict(sp, offer.items, "OFFER_CREATION");
    this.refreshStatus(sp);
    return offer;
  }

  acceptOffer(offerId: string, actor: Actor): ReadonlyAcceptance {
    const offer = this.requireOffer(offerId);
    const sp = this.mutableSp(offer.sellerPurchaseId);
    if (sp.activeOfferId !== offer.id) {
      throw new Error(
        `Cannot accept Offer ${offer.id}: only the active Offer (${sp.activeOfferId}) can be accepted (OQ-008 / I-027).`
      );
    }
    if (!this.isOfferValid(offer)) {
      throw new Error(`Cannot accept Offer ${offer.id}: offer is expired (I-028).`);
    }
    if (
      offer.items.some((item) => item.price == null || !Number.isFinite(item.price) || item.price < 0)
    ) {
      throw new Error(
        `Cannot accept Offer ${offer.id}: every item needs a finite price ≥ 0 (I-046).`
      );
    }
    this.assertAcceptanceActor(offer, actor);
    const acceptance: ReadonlyAcceptance = Object.freeze<Acceptance>({
      id: this.id("acc"),
      offerId: offer.id,
      actor,
      createdAt: this.nowIso(),
    });
    this.acceptanceLog.push(acceptance);
    sp.agreedOfferId = offer.id;
    sp.items = offer.items.map((item) => ({ ...item }));
    if (actor === "SELLER" || actor === "SYSTEM") sp.lastSellerActivity = this.nowIso();
    this.recordStockConflict(sp, offer.items, "ACCEPTANCE");
    this.refreshStatus(sp);
    return acceptance;
  }

  rejectSellerPurchase(sellerPurchaseId: string): void {
    this.applyStatus(this.mutableSp(sellerPurchaseId), "REJECTED");
  }

  proposeSubstitution(input: {
    sellerPurchaseId: string;
    originalProductId: string;
    replacementProductId: string;
    proposedBy: Actor;
    reason?: string;
  }): ReadonlySubstitution {
    const sp = this.mutableSp(input.sellerPurchaseId);
    if (!input.originalProductId || !input.replacementProductId) {
      throw new Error("Substitution requires originalProductId and replacementProductId.");
    }
    const sub: Substitution = {
      id: this.id("sub"),
      sellerPurchaseId: sp.id,
      originalProductId: input.originalProductId,
      replacementProductId: input.replacementProductId,
      proposedBy: input.proposedBy,
      reason: input.reason,
      status: "PROPOSED",
      createdAt: this.nowIso(),
    };
    this.substitutionLog.push(sub);
    if (input.proposedBy === "SELLER") sp.lastSellerActivity = this.nowIso();
    this.refreshStatus(sp);
    return frozenSub(sub);
  }

  acceptSubstitution(substitutionId: string): ReadonlySubstitution {
    const sub = this.requireSub(substitutionId);
    this.assertSubstitutionPending(sub, "accept");
    sub.status = "ACCEPTED";
    this.refreshStatus(this.mutableSp(sub.sellerPurchaseId));
    return frozenSub(sub);
  }

  rejectSubstitution(substitutionId: string): ReadonlySubstitution {
    const sub = this.requireSub(substitutionId);
    this.assertSubstitutionPending(sub, "reject");
    sub.status = "REJECTED";
    this.refreshStatus(this.mutableSp(sub.sellerPurchaseId));
    return frozenSub(sub);
  }

  markWaiting(sellerPurchaseId: string): void {
    const sp = this.mutableSp(sellerPurchaseId);
    if (!sp.waitingSince) sp.waitingSince = this.nowIso();
    if (sp.status !== "REJECTED" && sp.status !== "STABLE" && sp.status !== "CANCELLED") {
      this.applyStatus(sp, "WAITING_SELLER");
    }
  }

  /**
   * Mock delivery. `actual` is the delivered quantity (single-line SellerPurchase) or a
   * per-product map; the FULFILLMENT checkpoint is evaluated on those delivered quantities.
   */
  mockFulfill(sellerPurchaseId: string, actual: number | Record<string, number>): ReadonlyMockFulfillment {
    const sp = this.mutableSp(sellerPurchaseId);
    const delivered = this.deliveredItems(sp, actual);
    const total = delivered.reduce((sum, item) => sum + item.quantity, 0);
    const agreed = sp.items.reduce((sum, item) => sum + item.quantity, 0);
    if (!this.partialFulfillmentAllowed && total < agreed) {
      throw new Error(
        `Partial fulfillment is disabled: delivered ${total} < agreed ${agreed} on ${sp.id} (I-019).`
      );
    }
    const rec: ReadonlyMockFulfillment = Object.freeze<MockFulfillment>({
      sellerPurchaseId,
      actualQuantity: total,
      recordedAt: this.nowIso(),
    });
    this.fulfillmentLog.push(rec);
    this.recordStockConflict(
      sp,
      delivered.filter((item) => item.quantity > 0),
      "FULFILLMENT"
    );
    return rec;
  }

  private deliveredItems(sp: SellerPurchase, actual: number | Record<string, number>): PurchaseItem[] {
    const check = (productId: string, quantity: number) => {
      if (!Number.isFinite(quantity) || quantity < 0) {
        throw new Error(`Fulfilled quantity for ${productId} must be a finite number ≥ 0, got ${quantity}.`);
      }
    };
    if (typeof actual === "number") {
      if (sp.items.length !== 1) {
        throw new Error(
          `mockFulfill(number) needs a single-line SellerPurchase; ${sp.id} has ${sp.items.length} lines — pass a per-product map.`
        );
      }
      check(sp.items[0].productId, actual);
      return [{ ...sp.items[0], quantity: actual }];
    }
    return sp.items.map((item) => {
      const quantity = actual[item.productId] ?? 0;
      check(item.productId, quantity);
      return { ...item, quantity };
    });
  }

  snapshot(sellerPurchaseId: string): Snapshot {
    const sp = this.mutableSp(sellerPurchaseId);
    const agreed = sp.agreedOfferId ? this.requireOffer(sp.agreedOfferId) : null;
    const current = sp.activeOfferId ? this.requireOffer(sp.activeOfferId) : null;
    return {
      agreed: { offerId: agreed?.id ?? null, items: agreed ? frozenItems(agreed.items) : [] },
      current: { offerId: current?.id ?? null, items: current ? frozenItems(current.items) : [] },
      pendingSubstitutions: Object.freeze(this.pendingMandatorySubs(sp).map(frozenSub)),
      alternatives: Object.freeze(this.listAlternatives(sp).map((row) => Object.freeze({ ...row }))),
    };
  }

  /**
   * I-023: alternatives are sourced from the List, then compared to this seller's catalog.
   * Current `sp.items` and this SP's offer history are only a binding set — which List
   * lines belong to this SellerPurchase. They are not the source of alternatives.
   * Replacing the current commercial item does not drop List alternatives.
   * Does not select an alternative and does not treat List quantity as the alt's pack size.
   */
  private listAlternatives(sp: SellerPurchase): AlternativeProjection[] {
    const purchase = this.requirePurchase(sp.purchaseId);
    const list = this.requireList(purchase.listId);
    const boundProducts = new Set<string>();
    const bind = (productId?: string | null) => {
      if (productId) boundProducts.add(productId);
    };
    for (const line of sp.items) {
      bind(line.productId);
      bind(line.resolvedFrom);
    }
    for (const offer of this.offerLog) {
      if (offer.sellerPurchaseId !== sp.id) continue;
      for (const line of offer.items) {
        bind(line.productId);
        bind(line.resolvedFrom);
      }
    }
    const rows: AlternativeProjection[] = [];
    for (const item of list.items) {
      const boundToThisSp =
        boundProducts.has(item.productId) ||
        item.alternatives.some((alt) => boundProducts.has(alt.productId));
      if (!boundToThisSp) continue;
      for (const alt of item.alternatives) {
        if (alt.productId === item.productId) continue;
        const requestedUnit = item.unit ?? null;
        const rowsForAlt = requestedUnit
          ? comparableRows(this.catalogState, {
              sellerId: sp.sellerId,
              productId: alt.productId,
              unit: requestedUnit,
            })
          : [];
        const catalogPrice = requestedUnit
          ? catalogUnitPrice(this.catalogState, {
              sellerId: sp.sellerId,
              productId: alt.productId,
              unit: requestedUnit,
            })
          : null;
        const qty = rowsForAlt.length > 0 && rowsForAlt.every((row) => row.quantity === rowsForAlt[0].quantity)
          ? rowsForAlt[0].quantity
          : null;
        const catalogUnit = rowsForAlt.length > 0 ? requestedUnit : null;
        rows.push({
          productId: alt.productId,
          alternativePriority: alt.alternativePriority,
          requestedQuantity: item.quantity ?? null,
          requestedUnit,
          catalogQuantity: qty,
          catalogUnit,
          catalogPrice,
          unitCompatible: requestedUnit !== null && rowsForAlt.length > 0,
          referenceQtyMatches:
            qty !== null && item.quantity !== undefined && qty === item.quantity,
        });
      }
    }
    return rows;
  }

  /**
   * Standing-proposal validity (I-037): may this Offer be accepted or countered *now*.
   * `validUntil` is an exclusive end: the instant `now === validUntil` is already expired.
   */
  isOfferValid(offer: Offer): boolean {
    if (!offer.validUntil) return true;
    return Date.parse(offer.validUntil) > this.clock.now().getTime();
  }

  /**
   * I-025 diagnostic: current claims on one seller commercial line.
   * Same predicate as stock-conflict detection. Frozen; not a claims registry entity.
   */
  stockClaims(sellerId: string, productId: string, unit: string): readonly ReadonlyStockClaim[] {
    return Object.freeze(this.collectClaims(sellerId, productId, unit).map((claim) => Object.freeze({ ...claim })));
  }

  isStable(sellerPurchaseId: string): boolean {
    return this.mutableSp(sellerPurchaseId).status === "STABLE";
  }

  derivedPurchaseStatus(purchaseId: string): string {
    const purchase = this.requirePurchase(purchaseId);
    const states = purchase.sellerPurchaseIds.map((id) => this.mutableSp(id).status);
    if (states.length === 0) return "EMPTY";
    if (states.every((s) => s === "STABLE")) return "STABLE";
    if (states.every((s) => s === "REJECTED")) return "REJECTED";
    if (states.some((s) => s === "STABLE") && states.some((s) => s !== "STABLE")) return "MIXED";
    return "IN_PROGRESS";
  }

  offerById(id: string): Offer {
    return this.requireOffer(id);
  }

  lastOffer(sellerPurchaseId: string, actor?: Actor): Offer | null {
    const list = this.offerLog.filter(
      (offer) => offer.sellerPurchaseId === sellerPurchaseId && (actor === undefined || offer.actor === actor)
    );
    return list.length ? list[list.length - 1] : null;
  }

  private pendingMandatorySubs(sp: SellerPurchase): Substitution[] {
    return this.substitutionLog.filter((s) => s.sellerPurchaseId === sp.id && s.status === "PROPOSED");
  }

  private applyStatus(sp: SellerPurchase, next: SellerPurchase["status"]): void {
    sp.status = transition(sp.status, next);
  }

  private refreshStatus(sp: SellerPurchase): void {
    if (sp.status === "REJECTED" || sp.status === "CANCELLED") {
      return;
    }
    const agreed = sp.agreedOfferId ? this.requireOffer(sp.agreedOfferId) : null;
    const active = sp.activeOfferId ? this.requireOffer(sp.activeOfferId) : null;
    const pending = this.pendingMandatorySubs(sp);
    // I-038: STABLE is the accepted agreement, not a live lease on validUntil.
    const stable = agreed !== null && active !== null && agreed.id === active.id && pending.length === 0;
    if (stable) {
      this.applyStatus(sp, "STABLE");
      this.recordStockConflict(sp, agreed.items, "STABLE");
      return;
    }
    if (agreed && active && agreed.id !== active.id) {
      this.applyStatus(sp, active.actor === "BUYER" ? "WAITING_SELLER" : "WAITING_BUYER");
    }
  }

  /**
   * Current claims on a seller commercial line (I-025).
   * Claim = quantity on that SellerPurchase's **valid active** commercial proposal.
   * REJECTED and CANCELLED are ignored. Expired Offers (`isOfferValid` = false) are not claims.
   */
  private collectClaims(sellerId: string, productId: string, unit: string): StockClaim[] {
    const claims: StockClaim[] = [];
    for (const other of this.spById.values()) {
      if (other.sellerId !== sellerId) continue;
      if (other.status === "REJECTED" || other.status === "CANCELLED") continue;
      if (!other.activeOfferId) continue;
      const offer = this.requireOffer(other.activeOfferId);
      if (!this.isOfferValid(offer)) continue;
      for (const item of offer.items) {
        // Claims compete only within the same commercial line: tomatoes/kg and tomatoes/pcs
        // draw on different stock pools (identity is (productId, unit)).
        if (item.productId === productId && item.unit === unit) {
          claims.push({ sellerPurchaseId: other.id, offerId: offer.id, quantity: item.quantity });
        }
      }
    }
    return claims;
  }

  private claimedByOthers(sp: SellerPurchase, productId: string, unit: string): number {
    return this.collectClaims(sp.sellerId, productId, unit)
      .filter((claim) => claim.sellerPurchaseId !== sp.id)
      .reduce((sum, claim) => sum + claim.quantity, 0);
  }

  private assertOfferItems(items: PurchaseItem[]): void {
    if (items.length === 0) {
      throw new Error("Offer must contain at least one item.");
    }
    for (const item of items) {
      if (!item.productId) {
        throw new Error("Offer item requires productId.");
      }
      if (!Number.isFinite(item.quantity) || item.quantity <= 0) {
        throw new Error(`Offer quantity must be a finite number > 0, got ${item.quantity}.`);
      }
      if (!item.unit) {
        throw new Error("Offer item requires unit.");
      }
      if (item.price !== undefined && (!Number.isFinite(item.price) || item.price < 0)) {
        throw new Error(`Offer price must be a finite number ≥ 0, got ${item.price}.`);
      }
      if (item.discount !== undefined && !Number.isFinite(item.discount)) {
        throw new Error(`Offer discount must be a finite number, got ${item.discount}.`);
      }
    }
  }

  /** Same numeric guarantees as Offer items, applied at the List boundary (I-030). */
  private assertListItem(item: Omit<ListItem, "id">): void {
    if (!item.productId) {
      throw new Error("List item requires productId.");
    }
    if (item.quantity !== undefined && (!Number.isFinite(item.quantity) || item.quantity <= 0)) {
      throw new Error(`List item quantity must be a finite number > 0, got ${item.quantity}.`);
    }
    if (item.unit !== undefined && !item.unit) {
      throw new Error("List item unit must not be empty.");
    }
    if (
      item.referencePrice !== undefined &&
      (!Number.isFinite(item.referencePrice) || item.referencePrice < 0)
    ) {
      throw new Error(`List item referencePrice must be a finite number ≥ 0, got ${item.referencePrice}.`);
    }
    for (const alt of item.alternatives) {
      if (!alt.productId) {
        throw new Error("Alternative requires productId.");
      }
      if (!Number.isFinite(alt.alternativePriority) || alt.alternativePriority < 0) {
        throw new Error(
          `Alternative priority must be a finite number ≥ 0, got ${alt.alternativePriority}.`
        );
      }
    }
  }

  /** Same numeric guarantees at the catalog boundary (I-030). */
  private assertCatalog(catalog: ProductCatalog): void {
    if (!catalog || !Array.isArray(catalog.availability)) {
      throw new Error("Catalog requires an availability array.");
    }
    for (const row of catalog.availability) {
      if (!row.sellerId || !row.productId) {
        throw new Error("Catalog row requires sellerId and productId.");
      }
      if (!row.unit) {
        throw new Error(`Catalog row ${row.sellerId}/${row.productId} requires unit.`);
      }
      if (!Number.isFinite(row.quantity) || row.quantity <= 0) {
        throw new Error(
          `Catalog quantity must be a finite number > 0 (${row.sellerId}/${row.productId}), got ${row.quantity}.`
        );
      }
      if (!Number.isFinite(row.price) || row.price < 0) {
        throw new Error(
          `Catalog price must be a finite number ≥ 0 (${row.sellerId}/${row.productId}), got ${row.price}.`
        );
      }
      if (!Number.isFinite(row.stock) || row.stock < 0) {
        throw new Error(
          `Catalog stock must be a finite number ≥ 0 (${row.sellerId}/${row.productId}), got ${row.stock}.`
        );
      }
    }
  }

  /** BUYER accepts SELLER/SYSTEM; SELLER accepts BUYER; nobody accepts their own Offer. */
  private assertAcceptanceActor(offer: Offer, actor: Actor): void {
    if (actor === "SYSTEM") {
      throw new Error(`SYSTEM cannot accept Offers (I-029).`);
    }
    if (actor === offer.actor) {
      throw new Error(`Cannot accept own Offer ${offer.id} (I-029).`);
    }
    if (offer.actor === "BUYER" && actor !== "SELLER") {
      throw new Error(`Only SELLER may accept a BUYER Offer (I-029).`);
    }
    if ((offer.actor === "SELLER" || offer.actor === "SYSTEM") && actor !== "BUYER") {
      throw new Error(`Only BUYER may accept a ${offer.actor} Offer (I-029).`);
    }
  }

  /** PROPOSED → ACCEPTED | REJECTED is one-way; a decided Substitution stays a historical fact (I-032). */
  private assertSubstitutionPending(sub: Substitution, action: "accept" | "reject"): void {
    if (sub.status !== "PROPOSED") {
      throw new Error(`Cannot ${action} Substitution ${sub.id}: already ${sub.status} (I-032).`);
    }
  }

  /** Append a detection event when combined claims exceed catalog stock. Same race may log at several checkpoints. */
  private recordStockConflict(
    sp: SellerPurchase,
    items: readonly PurchaseItem[],
    point: StockConflict["detectedAt"]
  ): void {
    for (const item of items) {
      // Stock pool is the same commercial line (sellerId, productId, unit) — a pcs listing is not
      // stock for a kg claim.
      const stock = this.catalogState.availability
        .filter((row) => row.sellerId === sp.sellerId && row.productId === item.productId && row.unit === item.unit)
        .reduce((sum, row) => sum + row.stock, 0);
      const competing = this.claimedByOthers(sp, item.productId, item.unit);
      const combined = item.quantity + competing;
      if (combined > stock) {
        this.stockConflictLog.push(
          Object.freeze<StockConflict>({
            productId: item.productId,
            stock,
            requested: item.quantity,
            combined,
            detectedAt: point,
            purchaseId: sp.purchaseId,
          })
        );
      }
    }
  }

  private requireList(id: string): ShoppingList {
    const list = this.listById.get(id);
    if (!list) throw new Error(`List not found: ${id}`);
    return list;
  }

  private requirePurchase(id: string): Purchase {
    const purchase = this.purchaseById.get(id);
    if (!purchase) throw new Error(`Purchase not found: ${id}`);
    return purchase;
  }

  /** Read-only projection; state changes only through domain commands (I-033). */
  requireSp(id: string): ReadonlySellerPurchase {
    return frozenSp(this.mutableSp(id));
  }

  private mutableSp(id: string): SellerPurchase {
    const sp = this.spById.get(id);
    if (!sp) throw new Error(`SellerPurchase not found: ${id}`);
    return sp;
  }

  private requireOffer(id: string): Offer {
    const offer = this.offerLog.find((o) => o.id === id);
    if (!offer) throw new Error(`Offer not found: ${id}`);
    return offer;
  }

  private requireSub(id: string): Substitution {
    const sub = this.substitutionLog.find((s) => s.id === id);
    if (!sub) throw new Error(`Substitution not found: ${id}`);
    return sub;
  }
}
