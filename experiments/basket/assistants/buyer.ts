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

  // The reference for an active LINE is its agreed baseline ONLY for the exact same commercial
  // line (productId, unit, quantity). A different quantity is a different proposal — there is no
  // fallback across quantities (that would compare 10 kg against a 20 kg price). A line without
  // an exact, unambiguous agreed baseline is judged against the catalog reference instead, so a
  // quantity change is never silently accepted or flagged as a "hike".
  const exactBaseline = (item: PurchaseItem): number | null => {
    if (!agreed) return null;
    const exact = agreed.items.filter(
      (a) => a.productId === item.productId && a.unit === item.unit && a.quantity === item.quantity && a.price != null
    );
    if (exact.length === 0) return null;
    const price = exact[0].price as number;
    return exact.every((a) => a.price === price) ? price : null;
  };

  interface LineEval {
    item: PurchaseItem;
    reference: number;
    fromBaseline: boolean;
    over: boolean;
    hopeless: boolean;
  }

  const evals: LineEval[] = [];
  for (const item of active.items) {
    const baseline = exactBaseline(item);
    const fromBaseline = baseline != null;
    const reference = fromBaseline
      ? baseline
      : catalogReferencePrice(world, sp.sellerId, item.productId, item.unit);
    if (reference == null) {
      return wait(
        world,
        sellerPurchaseId,
        policy,
        "NO_CATALOG_PRICE",
        `No agreed baseline and no comparable catalog reference for ${item.productId} (${item.unit} x${item.quantity}); cannot evaluate.`
      );
    }
    // An agreed baseline tolerates no increase; a catalog reference tolerates policy.maxOverCatalog.
    const margin = fromBaseline ? 0 : policy.maxOverCatalog;
    const over = item.price != null && item.price > reference + margin + EPS;
    const hopeless = item.price != null && item.price > reference + policy.rejectOverReference + EPS;
    evals.push({ item, reference, fromBaseline, over, hopeless });
  }

  const hopeless = evals.filter((ev) => ev.hopeless);
  if (hopeless.length > 0) {
    const detail = hopeless
      .map((ev) => `${ev.item.productId} ${ev.item.price}>${ev.reference}+${policy.rejectOverReference}`)
      .join(", ");
    return {
      actor: "BUYER",
      kind: "REJECT",
      rejectReason: "PRICE_UNACCEPTABLE",
      offerId: active.id,
      rationale: `Price exceeds the ${hopeless[0].fromBaseline ? "agreed baseline" : "catalog reference"} beyond the reject threshold on: ${detail}; give up on this SellerPurchase.`,
      basis: captureAdviceBasis(world, sellerPurchaseId, { actor: "BUYER", ...policy }),
    };
  }

  const over = evals.filter((ev) => ev.over);
  if (over.length > 0) {
    const items = evals.map((ev) => ({ ...ev.item, price: ev.reference }));
    const detail = over.map((ev) => `${ev.item.productId} ${ev.item.price}>${ev.reference}`).join(", ");
    return {
      actor: "BUYER",
      kind: "COUNTER",
      counterOfferId: active.id,
      items,
      rationale: `Above ${over.every((ev) => ev.fromBaseline) ? "agreed baseline" : "reference"} on: ${detail}; counter at per-line reference prices.`,
      basis: captureAdviceBasis(world, sellerPurchaseId, { actor: "BUYER", ...policy }),
    };
  }

  return {
    actor: "BUYER",
    kind: "ACCEPT_ACTIVE",
    offerId: active.id,
    rationale: `Every line of ${active.id} is within its per-line reference; accept.`,
    basis: captureAdviceBasis(world, sellerPurchaseId, { actor: "BUYER", ...policy }),
  };
}
