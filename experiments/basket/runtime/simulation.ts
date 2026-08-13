import { BasketWorld } from "../domain/world";
import type { ProductCatalog } from "../domain/types";
import { createSellerEmulator, type SellerEmulator, type SellerProfileName } from "../emulator/sellers";
import { createBuyerEmulator, type BuyerEmulator, type BuyerProfileName } from "../emulator/buyers";

export type SimEvent = {
  at: string;
  kind: string;
  detail: string;
};

export class SimulationRuntime {
  readonly world: BasketWorld;
  readonly events: SimEvent[] = [];
  private sellers = new Map<string, SellerEmulator>();
  private buyer: BuyerEmulator = createBuyerEmulator("AcceptingBuyer");

  constructor(world = new BasketWorld()) {
    this.world = world;
  }

  private log(kind: string, detail: string): void {
    this.events.push({ at: this.world.nowIso(), kind, detail });
  }

  setCatalog(catalog: ProductCatalog): void {
    this.world.setCatalog(catalog);
    this.log("catalog", `${catalog.availability.length} rows`);
  }

  bindSeller(sellerId: string, profile: SellerProfileName): void {
    this.sellers.set(sellerId, createSellerEmulator(sellerId, profile));
    this.log("bindSeller", `${sellerId}=${profile}`);
  }

  bindBuyer(profile: BuyerProfileName): void {
    this.buyer = createBuyerEmulator(profile);
    this.log("bindBuyer", profile);
  }

  sellerRespond(sellerPurchaseId: string): void {
    const sp = this.world.requireSp(sellerPurchaseId);
    const emu = this.sellers.get(sp.sellerId);
    if (!emu) throw new Error(`No seller emulator bound for ${sp.sellerId}`);
    const lastBuyer = this.world.lastOffer(sellerPurchaseId, "BUYER");
    emu.respondToBuyerOffer(this.world, sellerPurchaseId, lastBuyer ? [...lastBuyer.items] : [...sp.items]);
    this.log("sellerRespond", `${sp.sellerId} ${emu.profile} → ${this.world.requireSp(sellerPurchaseId).status}`);
  }

  buyerRespond(sellerPurchaseId: string): void {
    this.buyer.respond(this.world, sellerPurchaseId);
    this.log("buyerRespond", `${this.buyer.profile} → ${this.world.requireSp(sellerPurchaseId).status}`);
  }

  /** Advance clock and give every bound seller a tick (SYSTEM events, delays). */
  tick(durationMs: number): void {
    this.world.advance(durationMs);
    for (const sp of this.world.sellerPurchases.values()) {
      const emu = this.sellers.get(sp.sellerId);
      if (emu) emu.tick(this.world, sp.id);
    }
    this.log("tick", `${durationMs}ms`);
  }

  sellerIds(): string[] {
    return [...this.sellers.keys()];
  }
}
