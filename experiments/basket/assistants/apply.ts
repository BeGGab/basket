import type { BasketWorld } from "../domain/world";
import type { PurchaseItem } from "../domain/types";
import { adviceIsStale } from "./basis";
import { catalogLineAvailable } from "./catalog";
import type { Advice } from "./types";

/**
 * Assistant-level guard: every Offer named by an Advice must belong to the SellerPurchase the
 * Advice is applied to. Without this check a command could carry the basis of one SP and the
 * offerId/counterOfferId of another — the domain would eventually fail, but the contract
 * boundary itself must reject the mismatch explicitly.
 */
function assertTargetOwnership(offerSellerPurchaseId: string, sellerPurchaseId: string, offerId: string): void {
  if (offerSellerPurchaseId !== sellerPurchaseId) {
    throw new Error(
      `Assistant produced an invalid command: Offer ${offerId} belongs to ${offerSellerPurchaseId}, not to ${sellerPurchaseId}.`
    );
  }
}

/** Assistant-level guard: the advice must be a semantically valid command before it reaches the domain. */
function assertCounterparty(adviceActor: "BUYER" | "SELLER", offerActor: "BUYER" | "SELLER" | "SYSTEM"): void {
  const valid =
    (adviceActor === "BUYER" && (offerActor === "SELLER" || offerActor === "SYSTEM")) ||
    (adviceActor === "SELLER" && offerActor === "BUYER");
  if (!valid) {
    throw new Error(`Assistant produced an invalid command: ${adviceActor} cannot act on a ${offerActor} Offer.`);
  }
}

/**
 * A counter may reprice lines but must not change anything else. The guard compares EVERY item
 * field except `price` (canonical JSON of the remaining fields, as a multiset), so a future
 * extension of PurchaseItem is covered automatically instead of silently becoming mutable.
 */
function assertAdmissibleCounter(counterItems: PurchaseItem[], counteredItems: readonly Readonly<PurchaseItem>[]): void {
  const lineKey = (item: Readonly<PurchaseItem>) => {
    const { price: _price, ...rest } = item;
    return JSON.stringify(
      Object.entries(rest)
        .filter(([, value]) => value !== undefined)
        .sort(([a], [b]) => a.localeCompare(b))
    );
  };
  const proposed = counterItems.map(lineKey).sort();
  const countered = [...counteredItems].map(lineKey).sort();
  if (proposed.length !== countered.length || proposed.some((key, index) => key !== countered[index])) {
    throw new Error(
      "Assistant produced an invalid command: COUNTER may change prices only; every other item field must match the countered Offer."
    );
  }
}

/**
 * Executes an Advice verbatim: the target of every action comes from the Advice itself
 * (offerId / substitutionId / counterOfferId + items) and is never re-derived from the world.
 * The current world IS consulted — to re-verify that the named target is still applicable
 * (staleness basis, active pointer, validity, counterparty), never to compute a new target.
 */
export function applyAdvice(world: BasketWorld, sellerPurchaseId: string, advice: Advice): void {
  const stale = adviceIsStale(world, sellerPurchaseId, advice.basis);
  if (stale) {
    throw new Error(`Cannot apply stale Advice: ${stale}`);
  }

  switch (advice.kind) {
    case "WAIT":
      return;
    case "REJECT": {
      const sp = world.requireSp(sellerPurchaseId);
      if (sp.status === "REJECTED" || sp.status === "CANCELLED" || sp.status === "STABLE") {
        throw new Error(
          `Assistant produced an invalid command: cannot REJECT a ${sp.status} SellerPurchase (rejection is a negotiation decision).`
        );
      }
      // A REJECT is not a free enum: every rejectReason must name and prove its ground against
      // the current world, so an executable refusal cannot claim a basis that does not exist.
      switch (advice.rejectReason) {
        case "PRICE_UNACCEPTABLE":
        case "POLICY_DECLINED": {
          // Declines the standing counterparty proposal — must name that exact active Offer.
          if (!advice.offerId) {
            throw new Error(
              `Assistant produced an invalid command: REJECT(${advice.rejectReason}) must name the declined Offer (offerId).`
            );
          }
          const offer = world.offerById(advice.offerId);
          assertTargetOwnership(offer.sellerPurchaseId, sellerPurchaseId, offer.id);
          if (sp.activeOfferId !== advice.offerId) {
            throw new Error(
              `Assistant produced an invalid command: REJECT(${advice.rejectReason}) declines ${advice.offerId}, but the active Offer is ${sp.activeOfferId}.`
            );
          }
          assertCounterparty(advice.actor, offer.actor);
          break;
        }
        case "SUBSTITUTION_IMPOSSIBLE": {
          // Declines a counterparty substitution as impossible — must name that pending one.
          if (!advice.substitutionId) {
            throw new Error(
              "Assistant produced an invalid command: REJECT(SUBSTITUTION_IMPOSSIBLE) must name the impossible substitution (substitutionId)."
            );
          }
          const sub = world
            .snapshot(sellerPurchaseId)
            .pendingSubstitutions.find((item) => item.id === advice.substitutionId);
          if (!sub) {
            throw new Error(
              `Assistant produced an invalid command: substitution ${advice.substitutionId} is not pending on ${sellerPurchaseId}.`
            );
          }
          if (sub.proposedBy === advice.actor) {
            throw new Error(
              `Assistant produced an invalid command: ${advice.actor} cannot reject a substitution it proposed itself.`
            );
          }
          break;
        }
        case "PRODUCT_UNAVAILABLE": {
          // At least one negotiated line must be provably unbuyable under the SAME
          // (seller, product, unit, quantity, stock) comparability the reference price uses.
          const unavailable = sp.items.some(
            (item) => !catalogLineAvailable(world, sp.sellerId, item.productId, item.unit)
          );
          if (!unavailable) {
            throw new Error(
              "Assistant produced an invalid command: REJECT(PRODUCT_UNAVAILABLE) requires a negotiated line with no comparable in-stock catalog row (unit/quantity aware)."
            );
          }
          break;
        }
      }
      world.rejectSellerPurchase(sellerPurchaseId);
      return;
    }
    case "ACCEPT_SUBSTITUTION": {
      const pending = world.snapshot(sellerPurchaseId).pendingSubstitutions;
      const sub = pending.find((item) => item.id === advice.substitutionId);
      if (!sub) {
        throw new Error(`Substitution ${advice.substitutionId} is no longer pending on ${sellerPurchaseId}.`);
      }
      if (sub.proposedBy === advice.actor) {
        throw new Error(
          `Assistant produced an invalid command: ${advice.actor} cannot accept a substitution proposed by ${sub.proposedBy}.`
        );
      }
      world.acceptSubstitution(advice.substitutionId);
      return;
    }
    case "ACCEPT_ACTIVE": {
      const offer = world.offerById(advice.offerId);
      assertTargetOwnership(offer.sellerPurchaseId, sellerPurchaseId, offer.id);
      assertCounterparty(advice.actor, offer.actor);
      // Domain re-validates that advice.offerId is still the active pointer (I-027) and not expired (I-028).
      world.acceptOffer(advice.offerId, advice.actor);
      return;
    }
    case "COUNTER": {
      if (advice.items.length === 0) {
        throw new Error("COUNTER Advice must carry the full proposed item list.");
      }
      const countered = world.offerById(advice.counterOfferId);
      assertTargetOwnership(countered.sellerPurchaseId, sellerPurchaseId, countered.id);
      const sp = world.requireSp(sellerPurchaseId);
      if (sp.activeOfferId !== advice.counterOfferId) {
        throw new Error(
          `Cannot apply COUNTER: it replies to ${advice.counterOfferId}, but the active Offer is ${sp.activeOfferId}.`
        );
      }
      if (!world.isOfferValid(countered)) {
        throw new Error(`Cannot apply COUNTER: Offer ${countered.id} is expired (I-035).`);
      }
      assertCounterparty(advice.actor, countered.actor);
      assertAdmissibleCounter(advice.items, countered.items);
      world.proposeOffer({
        sellerPurchaseId,
        actor: advice.actor,
        items: advice.items.map((item) => ({ ...item })),
        reason: advice.actor === "BUYER" ? "BUYER_CHANGE" : "SELLER_COUNTEROFFER",
      });
      return;
    }
    default: {
      const _never: never = advice;
      throw new Error(`Unknown advice ${JSON.stringify(_never)}`);
    }
  }
}
