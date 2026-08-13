import { DeterministicClock } from "./clock";
import { transition } from "./fsm";
import { resolve } from "./resolution";
import type {
  Acceptance,
  Actor,
  CatalogOffer,
  ListItem,
  MockFulfillment,
  Offer,
  OfferReason,
  ProductCatalog,
  Purchase,
  PurchaseItem,
  ResolutionPolicy,
  SellerPurchase,
  ShoppingList,
  Snapshot,
  StockConflict,
  Substitution,
} from "./types";

export class BasketWorld {
  readonly clock: DeterministicClock;
  readonly lists = new Map<string, ShoppingList>();
  readonly purchases = new Map<string, Purchase>();
  readonly sellerPurchases = new Map<string, SellerPurchase>();
  readonly offers: Offer[] = [];
  readonly acceptances: Acceptance[] = [];
  readonly substitutions: Substitution[] = [];
  readonly stockConflicts: StockConflict[] = [];
  readonly fulfillments: MockFulfillment[] = [];
  catalog: ProductCatalog = { names: {}, availability: [] };
  partialFulfillmentAllowed = true;

  private seq = 0;

  constructor(clock = new DeterministicClock()) {
    this.clock = clock;
  }

  private id(prefix: string): string {
    this.seq += 1;
    return `${prefix}-${this.seq}`;
  }

  nowIso(): string {
    return this.clock.now().toISOString();
  }

  /** Advance time and re-evaluate STABLE/validity without inventing EXPIRED as a silence state. */
  advance(durationMs: number): void {
    this.clock.advance(durationMs);
    for (const sp of this.sellerPurchases.values()) this.refreshStatus(sp);
  }

  setCatalog(catalog: ProductCatalog): void {
    this.catalog = catalog;
  }

  createList(name: string): ShoppingList {
    const list: ShoppingList = { id: this.id("list"), name, items: [] };
    this.lists.set(list.id, list);
    return list;
  }

  addItem(listId: string, item: Omit<ListItem, "id">): ListItem {
    const list = this.requireList(listId);
    const created: ListItem = { ...item, id: this.id("li"), alternatives: [...item.alternatives] };
    list.items.push(created);
    return created;
  }

  /**
   * Experimental helper, not a production purchase API.
   * - `sellerIds` omitted: one SellerPurchase via deterministic `pickSeller` (lexicographic sellerId).
   * - `sellerIds` provided: **fan-out** — one SellerPurchase per listed seller that has a catalog row with stock > 0.
   * Passing sellerIds is therefore a multi-seller scenario mode, not merely a search filter.
   */
  createPurchaseFromList(listId: string, policy: ResolutionPolicy, sellerIds?: string[]): Purchase {
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
      const result = resolve(item, policy, this.catalog);
      if (result.kind === "UNRESOLVED" || !result.productId) {
        purchase.unresolvedItems.push({
          listItemId: item.id,
          productId: item.productId,
          reason: result.requiresBuyerDecision ? "ASK_BUYER" : "UNAVAILABLE",
        });
        continue;
      }

      const rows = this.catalog.availability.filter((row) => {
        if (row.productId !== result.productId) return false;
        if (row.stock <= 0) return false;
        if (allowed && !allowed.has(row.sellerId)) return false;
        return true;
      });

      if (rows.length === 0) {
        purchase.unresolvedItems.push({
          listItemId: item.id,
          productId: result.productId,
          reason: "NO_SELLER",
        });
        continue;
      }

      const targets = allowed ? rows : [this.pickSeller(rows)];
      for (const row of allowed ? rows : targets) {
        const pi: PurchaseItem = {
          productId: result.productId,
          quantity: item.quantity ?? row.quantity,
          unit: item.unit ?? row.unit,
          price: row.price,
          resolvedFrom: result.resolvedFrom ?? item.productId,
          alternativePriority: result.alternativePriority ?? 0,
        };
        const bucket = bySeller.get(row.sellerId) ?? [];
        bucket.push(pi);
        bySeller.set(row.sellerId, bucket);
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
      this.sellerPurchases.set(sp.id, sp);
      purchase.sellerPurchaseIds.push(sp.id);
    }

    this.purchases.set(purchase.id, purchase);
    return purchase;
  }

  private pickSeller(rows: CatalogOffer[]): CatalogOffer {
    return rows.slice().sort((a, b) => a.sellerId.localeCompare(b.sellerId))[0];
  }

  setStock(sellerId: string, productId: string, stock: number): void {
    if (!Number.isFinite(stock) || stock < 0) {
      throw new Error(`stock must be a finite number ≥ 0, got ${stock}`);
    }
    const row = this.catalog.availability.find((item) => item.sellerId === sellerId && item.productId === productId);
    if (!row) throw new Error(`No catalog row for ${sellerId}/${productId}`);
    row.stock = stock;
  }

  cancelSellerPurchase(sellerPurchaseId: string): void {
    this.applyStatus(this.requireSp(sellerPurchaseId), "CANCELLED");
  }

  proposeOffer(input: {
    sellerPurchaseId: string;
    actor: Actor;
    items: PurchaseItem[];
    reason: OfferReason;
    validUntil?: string;
  }): Offer {
    const sp = this.requireSp(input.sellerPurchaseId);
    this.assertOfferItems(input.items);
    const offer: Offer = Object.freeze({
      id: this.id("offer"),
      sellerPurchaseId: sp.id,
      actor: input.actor,
      items: Object.freeze(input.items.map((item) => Object.freeze({ ...item }))),
      reason: input.reason,
      createdAt: this.nowIso(),
      validUntil: input.validUntil,
    });
    this.offers.push(offer);
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
    this.recordStockConflict(sp, offer, "OFFER_CREATION");
    this.refreshStatus(sp);
    return offer;
  }

  acceptOffer(offerId: string, actor: Actor): Acceptance {
    const offer = this.requireOffer(offerId);
    const sp = this.requireSp(offer.sellerPurchaseId);
    if (sp.activeOfferId !== offer.id) {
      throw new Error(
        `Cannot accept Offer ${offer.id}: only the active Offer (${sp.activeOfferId}) can be accepted (OQ-008 / I-027).`
      );
    }
    if (!this.isOfferValid(offer)) {
      throw new Error(`Cannot accept Offer ${offer.id}: offer is expired (I-028).`);
    }
    this.assertAcceptanceActor(offer, actor);
    const acceptance: Acceptance = {
      id: this.id("acc"),
      offerId: offer.id,
      actor,
      createdAt: this.nowIso(),
    };
    this.acceptances.push(acceptance);
    sp.agreedOfferId = offer.id;
    sp.items = offer.items.map((item) => ({ ...item }));
    if (actor === "SELLER" || actor === "SYSTEM") sp.lastSellerActivity = this.nowIso();
    this.recordStockConflict(sp, offer, "ACCEPTANCE");
    this.refreshStatus(sp);
    return acceptance;
  }

  rejectSellerPurchase(sellerPurchaseId: string): void {
    const sp = this.requireSp(sellerPurchaseId);
    this.applyStatus(sp, "REJECTED");
  }

  proposeSubstitution(input: {
    sellerPurchaseId: string;
    originalProductId: string;
    replacementProductId: string;
    proposedBy: Actor;
    reason?: string;
  }): Substitution {
    const sp = this.requireSp(input.sellerPurchaseId);
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
    this.substitutions.push(sub);
    if (input.proposedBy === "SELLER") sp.lastSellerActivity = this.nowIso();
    this.refreshStatus(sp);
    return sub;
  }

  acceptSubstitution(substitutionId: string): Substitution {
    const sub = this.requireSub(substitutionId);
    sub.status = "ACCEPTED";
    const sp = this.requireSp(sub.sellerPurchaseId);
    this.refreshStatus(sp);
    return sub;
  }

  rejectSubstitution(substitutionId: string): Substitution {
    const sub = this.requireSub(substitutionId);
    sub.status = "REJECTED";
    this.refreshStatus(this.requireSp(sub.sellerPurchaseId));
    return sub;
  }

  markWaiting(sellerPurchaseId: string): void {
    const sp = this.requireSp(sellerPurchaseId);
    if (!sp.waitingSince) sp.waitingSince = this.nowIso();
    if (sp.status !== "REJECTED" && sp.status !== "STABLE" && sp.status !== "CANCELLED") {
      this.applyStatus(sp, "WAITING_SELLER");
    }
  }

  mockFulfill(sellerPurchaseId: string, actualQuantity: number): MockFulfillment {
    const rec: MockFulfillment = {
      sellerPurchaseId,
      actualQuantity,
      recordedAt: this.nowIso(),
    };
    this.fulfillments.push(rec);
    this.recordStockConflict(this.requireSp(sellerPurchaseId), null, "FULFILLMENT");
    return rec;
  }

  snapshot(sellerPurchaseId: string): Snapshot {
    const sp = this.requireSp(sellerPurchaseId);
    const agreed = sp.agreedOfferId ? this.requireOffer(sp.agreedOfferId) : null;
    const current = sp.activeOfferId ? this.requireOffer(sp.activeOfferId) : null;
    return {
      agreed: { offerId: agreed?.id ?? null, items: agreed ? agreed.items.map((i) => ({ ...i })) : [] },
      current: { offerId: current?.id ?? null, items: current ? current.items.map((i) => ({ ...i })) : [] },
      pendingSubstitutions: this.substitutions.filter((s) => s.sellerPurchaseId === sp.id && s.status === "PROPOSED"),
    };
  }

  isOfferValid(offer: Offer): boolean {
    if (!offer.validUntil) return true;
    return Date.parse(offer.validUntil) > this.clock.now().getTime();
  }

  isStable(sellerPurchaseId: string): boolean {
    return this.requireSp(sellerPurchaseId).status === "STABLE";
  }

  derivedPurchaseStatus(purchaseId: string): string {
    const purchase = this.requirePurchase(purchaseId);
    const states = purchase.sellerPurchaseIds.map((id) => this.requireSp(id).status);
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
    const list = this.offers.filter(
      (offer) => offer.sellerPurchaseId === sellerPurchaseId && (actor === undefined || offer.actor === actor)
    );
    return list.length ? list[list.length - 1] : null;
  }

  private pendingMandatorySubs(sp: SellerPurchase): Substitution[] {
    return this.substitutions.filter((s) => s.sellerPurchaseId === sp.id && s.status === "PROPOSED");
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
    const stable =
      agreed !== null &&
      active !== null &&
      agreed.id === active.id &&
      pending.length === 0 &&
      this.isOfferValid(agreed);
    if (stable) {
      this.applyStatus(sp, "STABLE");
      this.recordStockConflict(sp, agreed, "STABLE");
      return;
    }
    if (agreed && active && agreed.id !== active.id) {
      this.applyStatus(sp, active.actor === "BUYER" ? "WAITING_SELLER" : "WAITING_BUYER");
    }
    // OQ-009 remains OPEN: an already-agreed Offer that later expires does not
    // auto-change SellerPurchase status. Validity only prevents *entering* STABLE.
  }

  /**
   * Competing claim = quantity on the other SellerPurchase's **valid active** commercial proposal.
   * REJECTED and CANCELLED are ignored. Expired Offers (`isOfferValid` = false) are not claims.
   */
  private claimedByOthers(sp: SellerPurchase, productId: string): number {
    let sum = 0;
    for (const other of this.sellerPurchases.values()) {
      if (other.id === sp.id || other.sellerId !== sp.sellerId) continue;
      if (other.status === "REJECTED" || other.status === "CANCELLED") continue;
      if (!other.activeOfferId) continue;
      const offer = this.requireOffer(other.activeOfferId);
      if (!this.isOfferValid(offer)) continue;
      for (const item of offer.items) {
        if (item.productId === productId) sum += item.quantity;
      }
    }
    return sum;
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

  /** Append a detection event when combined claims exceed catalog stock. Same race may log at several checkpoints. */
  private recordStockConflict(sp: SellerPurchase, offer: Offer | null, point: StockConflict["detectedAt"]): void {
    const items = offer?.items ?? sp.items;
    for (const item of items) {
      const stock = this.catalog.availability
        .filter((row) => row.sellerId === sp.sellerId && row.productId === item.productId)
        .reduce((sum, row) => sum + row.stock, 0);
      const competing = this.claimedByOthers(sp, item.productId);
      const combined = item.quantity + competing;
      if (combined > stock) {
        this.stockConflicts.push({
          productId: item.productId,
          stock,
          requested: item.quantity,
          combined,
          detectedAt: point,
          purchaseId: sp.purchaseId,
        });
      }
    }
  }

  private requireList(id: string): ShoppingList {
    const list = this.lists.get(id);
    if (!list) throw new Error(`List not found: ${id}`);
    return list;
  }

  private requirePurchase(id: string): Purchase {
    const purchase = this.purchases.get(id);
    if (!purchase) throw new Error(`Purchase not found: ${id}`);
    return purchase;
  }

  requireSp(id: string): SellerPurchase {
    const sp = this.sellerPurchases.get(id);
    if (!sp) throw new Error(`SellerPurchase not found: ${id}`);
    return sp;
  }

  private requireOffer(id: string): Offer {
    const offer = this.offers.find((o) => o.id === id);
    if (!offer) throw new Error(`Offer not found: ${id}`);
    return offer;
  }

  private requireSub(id: string): Substitution {
    const sub = this.substitutions.find((s) => s.id === id);
    if (!sub) throw new Error(`Substitution not found: ${id}`);
    return sub;
  }
}
