import type { BasketWorld } from "../domain/world";
import type { PurchaseItem } from "../domain/types";
import { captureAdviceBasis } from "./basis";
import { catalogReferencePrice } from "./catalog";
import type { Advice, BuyerPolicy, WaitReason } from "./types";
import { DEFAULT_BUYER_POLICY } from "./types";

const EPS = 1e-9;

function wait(
  world: BasketWorld,
  sellerPurchaseId: string,
  policy: BuyerPolicy,
  waitReason: WaitReason,
  rationale: string
): Advice {
  return {
    actor: "BUYER",
    kind: "WAIT",
    waitReason,
    rationale,
    basis: captureAdviceBasis(world, sellerPurchaseId, { actor: "BUYER", ...policy }),
  };
}

/**
 * Example buyer policy (ONE deterministic family, parameterized, not part of the model),
 * evaluated over EVERY Offer item:
 * - with an agreed baseline: counter any per-item price hike at the agreed prices, accept otherwise;
 * - without a baseline: accept only if every item is within `policy.maxOverCatalog` of the catalog
 *   reference price, otherwise counter at catalog prices (no blind first-offer acceptance);
 * - a hike beyond `policy.rejectOverReference` is not worth negotiating: the buyer REJECTs;
 * - price problems outrank substitutions (COUNTER/REJECT win, the substitution stays pending);
 * - when the Offer needs no correction, `policy.substitutionPreference` makes the positive
 *   choice between a pending counterparty substitution and the Offer decision explicit.
 */
export function adviseBuyer(
  world: BasketWorld,
  sellerPurchaseId: string,
  policyInput: Partial<BuyerPolicy> = {}
): Advice {
  const policy: BuyerPolicy = { ...DEFAULT_BUYER_POLICY, ...policyInput };
  const sp = world.requireSp(sellerPurchaseId);
  const snap = world.snapshot(sellerPurchaseId);

  if (sp.status === "REJECTED" || sp.status === "CANCELLED" || sp.status === "STABLE") {
    return wait(world, sellerPurchaseId, policy, "TERMINAL_STATUS", `SellerPurchase already ${sp.status}; no buyer move.`);
  }

  const offerDecision = decideOnOffer(world, sellerPurchaseId, policy);

  // Price protection outranks substitutions: a hike must be countered (or given up on) even
  // if a substitution is pending.
  if (offerDecision.kind === "COUNTER" || offerDecision.kind === "REJECT") {
    return offerDecision;
  }

  // Only counterparty proposals are acceptable: the buyer never "accepts" its own substitution.
  const firstPending = snap.pendingSubstitutions.find((sub) => sub.proposedBy !== "BUYER");
  const preferSubstitution =
    policy.substitutionPreference === "SUBSTITUTION_FIRST" || offerDecision.kind === "WAIT";
  if (firstPending && preferSubstitution) {
    return {
      actor: "BUYER",
      kind: "ACCEPT_SUBSTITUTION",
      substitutionId: firstPending.id,
      rationale: `Active Offer needs no correction; accept pending substitution ${firstPending.id} (policy: ${policy.substitutionPreference}).`,
      basis: captureAdviceBasis(world, sellerPurchaseId, { actor: "BUYER", ...policy }),
    };
  }

  return offerDecision;
}

function decideOnOffer(world: BasketWorld, sellerPurchaseId: string, policy: BuyerPolicy): Advice {
  const sp = world.requireSp(sellerPurchaseId);

  if (!sp.activeOfferId) {
    return wait(world, sellerPurchaseId, policy, "NO_ACTIVE_OFFER", "No active offer to decide on.");
  }

  const active = world.offerById(sp.activeOfferId);
  if (!world.isOfferValid(active)) {
    return wait(world, sellerPurchaseId, policy, "OFFER_EXPIRED", "Active offer is expired; acceptance is forbidden (I-028).");
  }
  if (active.actor === "BUYER") {
    return wait(world, sellerPurchaseId, policy, "OWN_OFFER_ACTIVE", "Active offer is already the buyer's; waiting for seller.");
  }

  const agreed = sp.agreedOfferId ? world.offerById(sp.agreedOfferId) : null;

  if (agreed) {
    // Baseline is per LINE, not per productId: two lines of the same product with different
    // quantity/unit must not collapse into one baseline. Several matching lines with different
    // prices are AMBIGUOUS — picking the cheapest would be a hidden price policy, so there is
    // no baseline for such a line.
    const baselineFor = (item: PurchaseItem): number | null => {
      const exact = agreed.items.filter(
        (a) => a.productId === item.productId && a.unit === item.unit && a.quantity === item.quantity && a.price != null
      );
      const pool =
        exact.length > 0
          ? exact
          : agreed.items.filter((a) => a.productId === item.productId && a.unit === item.unit && a.price != null);
      if (pool.length === 0) return null;
      if (exact.length === 0 && pool.length > 1) return null;
      const price = pool[0].price as number;
      return pool.every((a) => a.price === price) ? price : null;
    };

    const hikes = active.items.filter((item) => {
      const baseline = baselineFor(item);
      return baseline != null && item.price != null && item.price > baseline + EPS;
    });

    // A hike beyond the reject threshold is not worth negotiating — give up explicitly.
    const hopeless = hikes.filter((item) => {
      const baseline = baselineFor(item);
      return baseline != null && item.price != null && item.price > baseline + policy.rejectOverReference + EPS;
    });
    if (hopeless.length > 0) {
      const detail = hopeless.map((item) => `${item.productId} ${item.price}>${baselineFor(item)}+${policy.rejectOverReference}`).join(", ");
      return {
        actor: "BUYER",
        kind: "REJECT",
        rejectReason: "PRICE_UNACCEPTABLE",
        rationale: `Price exceeds the agreed baseline beyond the reject threshold on: ${detail}; give up on this SellerPurchase.`,
        basis: captureAdviceBasis(world, sellerPurchaseId, { actor: "BUYER", ...policy }),
      };
    }

    if (hikes.length > 0) {
      const items = active.items.map((item) => ({
        ...item,
        price: baselineFor(item) ?? item.price,
      }));
      const detail = hikes
        .map((item) => `${item.productId} ${item.price}>${baselineFor(item)}`)
        .join(", ");
      return {
        actor: "BUYER",
        kind: "COUNTER",
        counterOfferId: active.id,
        items,
        rationale: `Price hike vs agreed baseline on: ${detail}; counter at agreed per-line prices.`,
        basis: captureAdviceBasis(world, sellerPurchaseId, { actor: "BUYER", ...policy }),
      };
    }

    return {
      actor: "BUYER",
      kind: "ACCEPT_ACTIVE",
      offerId: active.id,
      rationale: `No item of ${active.id} is above the agreed baseline; accept.`,
      basis: captureAdviceBasis(world, sellerPurchaseId, { actor: "BUYER", ...policy }),
    };
  }

  // No agreed baseline: never accept blindly — compare every item against the catalog reference.
  const overpriced: { productId: string; price: number; reference: number }[] = [];
  for (const item of active.items) {
    const reference = catalogReferencePrice(world, sp.sellerId, item.productId, item.unit, item.quantity);
    if (reference == null) {
      return wait(world, sellerPurchaseId, policy, "NO_CATALOG_PRICE", `No comparable catalog reference for ${item.productId} (${item.unit}); cannot evaluate the first offer.`);
    }
    if (item.price != null && item.price > reference + policy.maxOverCatalog + EPS) {
      overpriced.push({ productId: item.productId, price: item.price, reference });
    }
  }

  const hopelesslyOverpriced = overpriced.filter(
    (ev) => ev.price > ev.reference + policy.rejectOverReference + EPS
  );
  if (hopelesslyOverpriced.length > 0) {
    const detail = hopelesslyOverpriced.map((ev) => `${ev.productId} ${ev.price}>${ev.reference}+${policy.rejectOverReference}`).join(", ");
    return {
      actor: "BUYER",
      kind: "REJECT",
      rejectReason: "PRICE_UNACCEPTABLE",
      rationale: `Offer exceeds the catalog reference beyond the reject threshold on: ${detail}; give up on this SellerPurchase.`,
      basis: captureAdviceBasis(world, sellerPurchaseId, { actor: "BUYER", ...policy }),
    };
  }

  if (overpriced.length > 0) {
    const items = active.items.map((item) => ({
      ...item,
      price: catalogReferencePrice(world, sp.sellerId, item.productId, item.unit, item.quantity) ?? item.price,
    }));
    const detail = overpriced.map((ev) => `${ev.productId} ${ev.price}>${ev.reference}`).join(", ");
    return {
      actor: "BUYER",
      kind: "COUNTER",
      counterOfferId: active.id,
      items,
      rationale: `No agreed baseline and offer is above catalog reference on: ${detail}; counter at catalog prices.`,
      basis: captureAdviceBasis(world, sellerPurchaseId, { actor: "BUYER", ...policy }),
    };
  }

  return {
    actor: "BUYER",
    kind: "ACCEPT_ACTIVE",
    offerId: active.id,
    rationale: `No agreed baseline; every item of ${active.id} is within catalog reference + ${policy.maxOverCatalog} MAD; accept.`,
    basis: captureAdviceBasis(world, sellerPurchaseId, { actor: "BUYER", ...policy }),
  };
}
