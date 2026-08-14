import { adviseBuyer, adviseSeller, applyAdvice, type Advice } from "../assistants";
import { BasketWorld } from "../domain/world";
import type { ProductCatalog } from "../domain/types";
import { createSellerEmulator, type SellerEmulator, type SellerProfileName } from "../emulator/sellers";
import { createBuyerEmulator, type BuyerEmulator, type BuyerProfileName } from "../emulator/buyers";

/** Observation record matching BASKET_EMULATOR_SPEC (timestamp, seller, event, input, result, Offer, SellerPurchase). */
export type SimEvent = {
  at: string;
  seller: string | null;
  event: string;
  input: string;
  result: string;
  offerId: string | null;
  sellerPurchaseId: string | null;
};

type SimEventDraft = {
  event: string;
  seller?: string | null;
  input?: string;
  result?: string;
  offerId?: string | null;
  sellerPurchaseId?: string | null;
};

export class SimulationRuntime {
  readonly world: BasketWorld;
  readonly events: SimEvent[] = [];
  private sellers = new Map<string, SellerEmulator>();
  private buyer: BuyerEmulator = createBuyerEmulator("AcceptingBuyer");

  constructor(world = new BasketWorld()) {
    this.world = world;
  }

  private log(draft: SimEventDraft): void {
    this.events.push({
      at: this.world.nowIso(),
      seller: draft.seller ?? null,
      event: draft.event,
      input: draft.input ?? "",
      result: draft.result ?? "",
      offerId: draft.offerId ?? null,
      sellerPurchaseId: draft.sellerPurchaseId ?? null,
    });
  }

  setCatalog(catalog: ProductCatalog): void {
    this.world.setCatalog(catalog);
    this.log({ event: "catalog", input: "setCatalog", result: `${catalog.availability.length} rows` });
  }

  bindSeller(sellerId: string, profile: SellerProfileName): void {
    this.sellers.set(sellerId, createSellerEmulator(sellerId, profile));
    this.log({ event: "bindSeller", seller: sellerId, input: profile, result: "bound" });
  }

  bindBuyer(profile: BuyerProfileName): void {
    this.buyer = createBuyerEmulator(profile);
    this.log({ event: "bindBuyer", input: profile, result: "bound" });
  }

  sellerRespond(sellerPurchaseId: string): void {
    const sp = this.world.requireSp(sellerPurchaseId);
    const emu = this.sellers.get(sp.sellerId);
    if (!emu) throw new Error(`No seller emulator bound for ${sp.sellerId}`);
    const lastBuyer = this.world.lastOffer(sellerPurchaseId, "BUYER");
    emu.respondToBuyerOffer(this.world, sellerPurchaseId, lastBuyer ? [...lastBuyer.items] : [...sp.items]);
    const after = this.world.requireSp(sellerPurchaseId);
    this.log({
      event: "sellerRespond",
      seller: sp.sellerId,
      sellerPurchaseId,
      offerId: after.activeOfferId,
      input: lastBuyer ? `buyerOffer ${lastBuyer.id}` : "sp.items",
      result: `${emu.profile} → ${after.status}`,
    });
  }

  buyerRespond(sellerPurchaseId: string): void {
    const sp = this.world.requireSp(sellerPurchaseId);
    this.buyer.respond(this.world, sellerPurchaseId);
    const after = this.world.requireSp(sellerPurchaseId);
    this.log({
      event: "buyerRespond",
      seller: sp.sellerId,
      sellerPurchaseId,
      offerId: after.activeOfferId,
      input: this.buyer.profile,
      result: after.status,
    });
  }

  adviseBuyer(sellerPurchaseId: string): Advice {
    const sp = this.world.requireSp(sellerPurchaseId);
    const advice = adviseBuyer(this.world, sellerPurchaseId);
    this.log({
      event: "assistantAdvice",
      seller: sp.sellerId,
      sellerPurchaseId,
      offerId: sp.activeOfferId,
      // The basis is part of the reproducibility contract: log it so a later stale Apply is explainable.
      input: `BUYER basis=${JSON.stringify(advice.basis)}`,
      result: `${advice.kind}: ${advice.rationale}`,
    });
    return advice;
  }

  adviseSeller(sellerPurchaseId: string): Advice {
    const sp = this.world.requireSp(sellerPurchaseId);
    const advice = adviseSeller(this.world, sellerPurchaseId);
    this.log({
      event: "assistantAdvice",
      seller: sp.sellerId,
      sellerPurchaseId,
      offerId: sp.activeOfferId,
      input: `SELLER basis=${JSON.stringify(advice.basis)}`,
      result: `${advice.kind}: ${advice.rationale}`,
    });
    return advice;
  }

  /** Convenience: advise + apply through the SAME execution path the UI uses (applyDisplayedAdvice). */
  applyBuyerAdvice(sellerPurchaseId: string): Advice {
    const advice = this.adviseBuyer(sellerPurchaseId);
    this.applyDisplayedAdvice(sellerPurchaseId, advice);
    return advice;
  }

  applySellerAdvice(sellerPurchaseId: string): Advice {
    const advice = this.adviseSeller(sellerPurchaseId);
    this.applyDisplayedAdvice(sellerPurchaseId, advice);
    return advice;
  }

  /** The single Advice execution path: apply a previously computed Advice; throws if the snapshot changed. */
  applyDisplayedAdvice(sellerPurchaseId: string, advice: Advice): void {
    applyAdvice(this.world, sellerPurchaseId, advice);
    const after = this.world.requireSp(sellerPurchaseId);
    this.log({
      event: "assistantApply",
      seller: after.sellerId,
      sellerPurchaseId,
      offerId: after.activeOfferId,
      input: `${advice.actor} ${advice.kind}`,
      result: after.status,
    });
  }

  /** Advance clock and give every bound seller a tick (SYSTEM events, delays). */
  tick(durationMs: number): void {
    this.world.advance(durationMs);
    const ids: string[] = [];
    for (const sp of this.world.sellerPurchases.values()) {
      const emu = this.sellers.get(sp.sellerId);
      if (emu) {
        emu.tick(this.world, sp.id);
        ids.push(sp.id);
      }
    }
    this.log({
      event: "tick",
      input: `${durationMs}ms`,
      result: `ticked ${ids.length} SellerPurchase(s)`,
    });
    // One entry per SellerPurchase: the log must allow reconstructing every tick outcome, not just the first.
    for (const id of ids) {
      const after = this.world.requireSp(id);
      this.log({
        event: "tickResult",
        seller: after.sellerId,
        sellerPurchaseId: id,
        offerId: after.activeOfferId,
        input: `${durationMs}ms`,
        result: after.status,
      });
    }
  }

  sellerIds(): string[] {
    return [...this.sellers.keys()];
  }
}
