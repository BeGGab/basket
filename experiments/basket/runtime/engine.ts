import { adviseBuyer, adviseSeller } from "../assistants";
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
  | { op: "assertNotStatus"; sellerIndex: number; status: SellerPurchaseStatus }
  | { op: "applyBuyerAdvice"; sellerIndex: number }
  | { op: "applySellerAdvice"; sellerIndex: number }
  | {
      op: "assertAdvice";
      sellerIndex: number;
      actor: "BUYER" | "SELLER";
      kind: string;
      /** For a SINGLE-LINE COUNTER: expected unit price of its only item. */
      price?: number;
      /** For ACCEPT_ACTIVE: the advice must target exactly the current active Offer. */
      targetsActiveOffer?: boolean;
      /** For WAIT: expected machine-readable reason. */
      waitReason?: string;
    };

export interface Scenario {
  name: string;
  title?: string;
  steps: ScenarioStep[];
}

export interface ScenarioContext {
  runtime: SimulationRuntime;
  listId: string | null;
  purchaseSellerIds: string[];
  scenarioName: string;
}

export function createScenarioContext(scenarioName: string, runtime = new SimulationRuntime()): ScenarioContext {
  return { runtime, listId: null, purchaseSellerIds: [], scenarioName };
}

function spAt(ctx: ScenarioContext, index: number): string {
  const id = ctx.purchaseSellerIds[index];
  if (!id) throw new Error(`${ctx.scenarioName}: no SellerPurchase at index ${index}`);
  return id;
}

export function executeStep(ctx: ScenarioContext, step: ScenarioStep): void {
  const { runtime } = ctx;
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
      ctx.listId = runtime.world.createList(step.name).id;
      break;
    case "addItem":
      if (!ctx.listId) throw new Error("createList before addItem");
      runtime.world.addItem(ctx.listId, {
        productId: step.productId,
        quantity: step.quantity,
        unit: step.unit,
        alternatives: step.alternatives ?? [],
      });
      break;
    case "createPurchase": {
      if (!ctx.listId) throw new Error("createList before createPurchase");
      const purchase = runtime.world.createPurchaseFromList(ctx.listId, step.policy, step.sellerIds);
      ctx.purchaseSellerIds = [...purchase.sellerPurchaseIds];
      break;
    }
    case "buyerOffer":
      runtime.world.proposeOffer({
        sellerPurchaseId: spAt(ctx, step.sellerIndex),
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
        sellerPurchaseId: spAt(ctx, step.sellerIndex),
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
      const sp = runtime.world.requireSp(spAt(ctx, step.sellerIndex));
      if (!sp.activeOfferId) throw new Error(`${ctx.scenarioName}: no active offer`);
      runtime.world.acceptOffer(sp.activeOfferId, step.actor);
      break;
    }
    case "proposeSubstitution":
      runtime.world.proposeSubstitution({
        sellerPurchaseId: spAt(ctx, step.sellerIndex),
        originalProductId: step.originalProductId,
        replacementProductId: step.replacementProductId,
        proposedBy: "SELLER",
      });
      break;
    case "sellerRespond":
      runtime.sellerRespond(spAt(ctx, step.sellerIndex));
      break;
    case "buyerRespond":
      runtime.buyerRespond(spAt(ctx, step.sellerIndex));
      break;
    case "tick":
      runtime.tick(step.ms);
      break;
    case "assertStatus": {
      const actual = runtime.world.requireSp(spAt(ctx, step.sellerIndex)).status;
      if (actual !== step.status) {
        throw new Error(`${ctx.scenarioName}: expected ${step.status}, got ${actual}`);
      }
      break;
    }
    case "assertNotStatus": {
      const actual = runtime.world.requireSp(spAt(ctx, step.sellerIndex)).status;
      if (actual === step.status) {
        throw new Error(`${ctx.scenarioName}: status should not be ${step.status}`);
      }
      break;
    }
    case "assertSnapshot": {
      const snap = runtime.world.snapshot(spAt(ctx, step.sellerIndex));
      if (step.agreedPrice !== undefined && snap.agreed.items[0]?.price !== step.agreedPrice) {
        throw new Error(`${ctx.scenarioName}: agreed price ${snap.agreed.items[0]?.price} != ${step.agreedPrice}`);
      }
      if (step.currentPrice !== undefined && snap.current.items[0]?.price !== step.currentPrice) {
        throw new Error(`${ctx.scenarioName}: current price ${snap.current.items[0]?.price} != ${step.currentPrice}`);
      }
      if (step.pending !== undefined && snap.pendingSubstitutions.length !== step.pending) {
        throw new Error(`${ctx.scenarioName}: pending ${snap.pendingSubstitutions.length} != ${step.pending}`);
      }
      break;
    }
    case "applyBuyerAdvice":
      runtime.applyBuyerAdvice(spAt(ctx, step.sellerIndex));
      break;
    case "applySellerAdvice":
      runtime.applySellerAdvice(spAt(ctx, step.sellerIndex));
      break;
    case "assertAdvice": {
      const spId = spAt(ctx, step.sellerIndex);
      const advice = step.actor === "BUYER" ? adviseBuyer(runtime.world, spId) : adviseSeller(runtime.world, spId);
      if (advice.kind !== step.kind) {
        throw new Error(`${ctx.scenarioName}: ${step.actor} advice ${advice.kind} != ${step.kind}`);
      }
      if (!advice.rationale) {
        throw new Error(`${ctx.scenarioName}: advice has no rationale`);
      }
      if (step.price !== undefined) {
        // Only a single-line counter has "a price"; multi-line counters must be asserted per item.
        const actualPrice =
          advice.kind === "COUNTER" && advice.items.length === 1 ? advice.items[0]?.price : undefined;
        if (actualPrice !== step.price) {
          throw new Error(`${ctx.scenarioName}: advice price ${actualPrice} != ${step.price}`);
        }
      }
      if (step.targetsActiveOffer) {
        const activeOfferId = runtime.world.requireSp(spId).activeOfferId;
        const target = advice.kind === "ACCEPT_ACTIVE" ? advice.offerId : null;
        if (target !== activeOfferId) {
          throw new Error(`${ctx.scenarioName}: advice targets ${target}, active is ${activeOfferId}`);
        }
      }
      if (step.waitReason !== undefined) {
        const actualReason = advice.kind === "WAIT" ? advice.waitReason : undefined;
        if (actualReason !== step.waitReason) {
          throw new Error(`${ctx.scenarioName}: waitReason ${actualReason} != ${step.waitReason}`);
        }
      }
      break;
    }
    default: {
      const _never: never = step;
      throw new Error(`Unknown step ${JSON.stringify(_never)}`);
    }
  }
}

export function runScenario(scenario: Scenario, runtime = new SimulationRuntime()): SimulationRuntime {
  const ctx = createScenarioContext(scenario.name, runtime);
  for (const step of scenario.steps) executeStep(ctx, step);
  return ctx.runtime;
}
