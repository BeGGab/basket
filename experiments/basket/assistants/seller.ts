import type { BasketWorld } from "../domain/world";
import { captureAdviceBasis } from "./basis";
import { catalogReferencePrice } from "./catalog";
import type { Advice, SellerPolicy, WaitReason } from "./types";
import { DEFAULT_SELLER_POLICY } from "./types";

const EPS = 1e-9;

function wait(
  world: BasketWorld,
  sellerPurchaseId: string,
  policy: SellerPolicy,
  waitReason: WaitReason,
  rationale: string
): Advice {
  return {
    actor: "SELLER",
    kind: "WAIT",
    waitReason,
    rationale,
    basis: captureAdviceBasis(world, sellerPurchaseId, { actor: "SELLER", ...policy }),
  };
}

/**
 * Example seller policy (ONE deterministic family, parameterized, not part of the model):
 * accept a buyer Offer when EVERY item is within `policy.acceptBelowCatalog` MAD of the catalog
 * reference price; counter with per-item catalog prices when below tolerance; REJECT when a
 * price is below reference − `policy.rejectBelowCatalog` — negotiating is pointless there.
 */
export function adviseSeller(
  world: BasketWorld,
  sellerPurchaseId: string,
  policyInput: Partial<SellerPolicy> = {}
): Advice {
  const policy: SellerPolicy = { ...DEFAULT_SELLER_POLICY, ...policyInput };
  const sp = world.requireSp(sellerPurchaseId);

  if (sp.status === "REJECTED" || sp.status === "CANCELLED" || sp.status === "STABLE") {
    return wait(world, sellerPurchaseId, policy, "TERMINAL_STATUS", `SellerPurchase already ${sp.status}; no seller move.`);
  }

  const activeId = sp.activeOfferId;
  if (!activeId) {
    return wait(world, sellerPurchaseId, policy, "NO_ACTIVE_OFFER", "No active offer.");
  }

  const active = world.offerById(activeId);
  if (!world.isOfferValid(active)) {
    return wait(world, sellerPurchaseId, policy, "OFFER_EXPIRED", "Active offer is expired; acceptance is forbidden (I-028).");
  }
  if (active.actor !== "BUYER") {
    return wait(world, sellerPurchaseId, policy, "OWN_OFFER_ACTIVE", "Active offer is the seller/system side's own; waiting for the buyer.");
  }

  // Evaluate EVERY item of the buyer Offer, not just items[0].
  const evaluations: { productId: string; buyerPrice: number | null; listPrice: number }[] = [];
  for (const item of active.items) {
    const listPrice = catalogReferencePrice(world, sp.sellerId, item.productId, item.unit);
    if (listPrice == null) {
      return wait(world, sellerPurchaseId, policy, "NO_CATALOG_PRICE", `No comparable catalog price for ${item.productId} (${item.unit}); cannot evaluate the offer.`);
    }
    if (item.price == null || !Number.isFinite(item.price)) {
      return wait(
        world,
        sellerPurchaseId,
        policy,
        "MISSING_ITEM_PRICE",
        `Active Offer ${active.id} has no unit price on ${item.productId}; cannot treat it as a priced proposal.`
      );
    }
    evaluations.push({ productId: item.productId, buyerPrice: item.price ?? null, listPrice });
  }

  // A price below reference − rejectBelowCatalog is not worth negotiating: give up explicitly.
  const hopeless = evaluations.filter(
    (ev) => ev.buyerPrice != null && ev.buyerPrice + EPS < ev.listPrice - policy.rejectBelowCatalog
  );
  if (hopeless.length > 0) {
    const detail = hopeless
      .map((ev) => `${ev.productId} ${ev.buyerPrice}<${ev.listPrice}-${policy.rejectBelowCatalog}`)
      .join(", ");
    return {
      actor: "SELLER",
      kind: "REJECT",
      rejectReason: "PRICE_UNACCEPTABLE",
      offerId: active.id,
      rationale: `Buyer price is below the reject threshold on: ${detail}; give up on this SellerPurchase.`,
      basis: captureAdviceBasis(world, sellerPurchaseId, { actor: "SELLER", ...policy }),
    };
  }

  // An unpriced item cannot be accepted — it goes into the counter with the catalog price.
  const belowTolerance = evaluations.filter(
    (ev) => ev.buyerPrice == null || ev.buyerPrice + EPS < ev.listPrice - policy.acceptBelowCatalog
  );

  if (belowTolerance.length === 0) {
    return {
      actor: "SELLER",
      kind: "ACCEPT_ACTIVE",
      offerId: active.id,
      rationale: `All ${evaluations.length} item(s) are within ${policy.acceptBelowCatalog} MAD of catalog reference; accept ${active.id}.`,
      basis: captureAdviceBasis(world, sellerPurchaseId, { actor: "SELLER", ...policy }),
    };
  }

  const items = active.items.map((item) => ({
    ...item,
    price: catalogReferencePrice(world, sp.sellerId, item.productId, item.unit) ?? item.price,
  }));
  const detail = belowTolerance
    .map((ev) => `${ev.productId} ${ev.buyerPrice ?? "unpriced"}<${ev.listPrice - policy.acceptBelowCatalog}`)
    .join(", ");
  return {
    actor: "SELLER",
    kind: "COUNTER",
    counterOfferId: active.id,
    items,
    rationale: `Below tolerance on: ${detail}; counter with per-item catalog prices.`,
    basis: captureAdviceBasis(world, sellerPurchaseId, { actor: "SELLER", ...policy }),
  };
}
