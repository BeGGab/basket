import type { Actor, Alternative, OfferReason, ProductCatalog, ResolutionPolicy, SellerPurchaseStatus } from "../domain/types";
import type { BuyerProfileName } from "../emulator/buyers";
import type { SellerProfileName } from "../emulator/sellers";
import { SimulationRuntime } from "./simulation";

export type ScenarioStep =
  | { op: "catalog"; catalog: ProductCatalog }
  | { op: "bindSeller"; sellerId: string; profile: SellerProfileName }
  | { op: "bindBuyer"; profile: BuyerProfileName }
  | { op: "createList"; name: string }
  | {
      op: "addItem";
      productId: string;
      quantity: number;
      unit: string;
      alternatives?: Alternative[];
    }
  | { op: "createPurchase"; policy: ResolutionPolicy; sellerIds?: string[] }
  | { op: "buyerOffer"; sellerIndex: number; quantity: number; unit: string; productId: string; price: number }
  | {
      op: "sellerOffer";
      sellerIndex: number;
      quantity: number;
      unit: string;
      productId: string;
      price: number;
      reason?: OfferReason;
    }
  | { op: "acceptActive"; sellerIndex: number; actor: Actor }
  | { op: "proposeSubstitution"; sellerIndex: number; originalProductId: string; replacementProductId: string }
  | { op: "sellerRespond"; sellerIndex: number }
  | { op: "buyerRespond"; sellerIndex: number }
  | { op: "tick"; ms: number }
  | { op: "assertStatus"; sellerIndex: number; status: SellerPurchaseStatus }
  | { op: "assertSnapshot"; sellerIndex: number; agreedPrice?: number; currentPrice?: number; pending?: number }
  | { op: "assertNotStatus"; sellerIndex: number; status: SellerPurchaseStatus };

export interface Scenario {
  name: string;
  steps: ScenarioStep[];
}

export function runScenario(scenario: Scenario, runtime = new SimulationRuntime()): SimulationRuntime {
  let listId: string | null = null;
  let purchaseSellerIds: string[] = [];

  const spAt = (index: number) => {
    const id = purchaseSellerIds[index];
    if (!id) throw new Error(`${scenario.name}: no SellerPurchase at index ${index}`);
    return id;
  };

  for (const step of scenario.steps) {
    switch (step.op) {
      case "catalog":
        runtime.setCatalog(step.catalog);
        break;
      case "bindSeller":
        runtime.bindSeller(step.sellerId, step.profile);
        break;
      case "bindBuyer":
        runtime.bindBuyer(step.profile);
        break;
      case "createList":
        listId = runtime.world.createList(step.name).id;
        break;
      case "addItem":
        if (!listId) throw new Error("createList before addItem");
        runtime.world.addItem(listId, {
          productId: step.productId,
          quantity: step.quantity,
          unit: step.unit,
          alternatives: step.alternatives ?? [],
        });
        break;
      case "createPurchase": {
        if (!listId) throw new Error("createList before createPurchase");
        const purchase = runtime.world.createPurchaseFromList(listId, step.policy, step.sellerIds);
        purchaseSellerIds = purchase.sellerPurchaseIds;
        break;
      }
      case "buyerOffer":
        runtime.world.proposeOffer({
          sellerPurchaseId: spAt(step.sellerIndex),
          actor: "BUYER",
          items: [
            {
              productId: step.productId,
              quantity: step.quantity,
              unit: step.unit,
              price: step.price,
            },
          ],
          reason: "BUYER_CHANGE",
        });
        break;
      case "sellerOffer":
        runtime.world.proposeOffer({
          sellerPurchaseId: spAt(step.sellerIndex),
          actor: "SELLER",
          items: [
            {
              productId: step.productId,
              quantity: step.quantity,
              unit: step.unit,
              price: step.price,
            },
          ],
          reason: step.reason ?? "SELLER_COUNTEROFFER",
        });
        break;
      case "acceptActive": {
        const sp = runtime.world.requireSp(spAt(step.sellerIndex));
        if (!sp.activeOfferId) throw new Error(`${scenario.name}: no active offer`);
        runtime.world.acceptOffer(sp.activeOfferId, step.actor);
        break;
      }
      case "proposeSubstitution":
        runtime.world.proposeSubstitution({
          sellerPurchaseId: spAt(step.sellerIndex),
          originalProductId: step.originalProductId,
          replacementProductId: step.replacementProductId,
          proposedBy: "SELLER",
        });
        break;
      case "sellerRespond":
        runtime.sellerRespond(spAt(step.sellerIndex));
        break;
      case "buyerRespond":
        runtime.buyerRespond(spAt(step.sellerIndex));
        break;
      case "tick":
        runtime.tick(step.ms);
        break;
      case "assertStatus": {
        const actual = runtime.world.requireSp(spAt(step.sellerIndex)).status;
        if (actual !== step.status) {
          throw new Error(`${scenario.name}: expected ${step.status}, got ${actual}`);
        }
        break;
      }
      case "assertNotStatus": {
        const actual = runtime.world.requireSp(spAt(step.sellerIndex)).status;
        if (actual === step.status) {
          throw new Error(`${scenario.name}: status should not be ${step.status}`);
        }
        break;
      }
      case "assertSnapshot": {
        const snap = runtime.world.snapshot(spAt(step.sellerIndex));
        if (step.agreedPrice !== undefined && snap.agreed.items[0]?.price !== step.agreedPrice) {
          throw new Error(`${scenario.name}: agreed price ${snap.agreed.items[0]?.price} != ${step.agreedPrice}`);
        }
        if (step.currentPrice !== undefined && snap.current.items[0]?.price !== step.currentPrice) {
          throw new Error(`${scenario.name}: current price ${snap.current.items[0]?.price} != ${step.currentPrice}`);
        }
        if (step.pending !== undefined && snap.pendingSubstitutions.length !== step.pending) {
          throw new Error(`${scenario.name}: pending ${snap.pendingSubstitutions.length} != ${step.pending}`);
        }
        break;
      }
      default: {
        const _never: never = step;
        throw new Error(`Unknown step ${JSON.stringify(_never)}`);
      }
    }
  }

  return runtime;
}
