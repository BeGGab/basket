import type { PurchaseItem } from "../domain/types";
import type { AdviceBasis } from "./basis";

export type AdviceKind =
  | "ACCEPT_ACTIVE"
  | "COUNTER"
  | "REJECT"
  | "ACCEPT_SUBSTITUTION"
  | "WAIT";

/** Machine-readable reason for WAIT, so the runtime can distinguish structurally different idle states. */
export type WaitReason =
  | "TERMINAL_STATUS"
  | "NO_ACTIVE_OFFER"
  | "OFFER_EXPIRED"
  | "OWN_OFFER_ACTIVE"
  | "NO_CATALOG_PRICE";

/** Machine-readable reason for REJECT — mirrors WaitReason so refusals stay explainable. */
export type RejectReason =
  | "PRICE_UNACCEPTABLE"
  | "PRODUCT_UNAVAILABLE"
  | "SUBSTITUTION_IMPOSSIBLE"
  | "POLICY_DECLINED";

interface AdviceBase {
  actor: "BUYER" | "SELLER";
  rationale: string;
  /** Must match the SellerPurchase snapshot at apply time. */
  basis: AdviceBasis;
}

/**
 * Advice is an executable command, not a hint: each kind names the exact object it acts on
 * (offerId / substitutionId / the full counter item list). applyAdvice never re-derives the
 * target from the current world.
 */
export type Advice =
  | (AdviceBase & { kind: "WAIT"; waitReason: WaitReason })
  | (AdviceBase & {
      kind: "REJECT";
      rejectReason: RejectReason;
      /**
       * The counterparty Offer being declined — REQUIRED for PRICE_UNACCEPTABLE and
       * POLICY_DECLINED so a refusal names the concrete standing proposal it rejects instead of
       * being a free enum. applyAdvice re-verifies it is the active counterparty Offer.
       */
      offerId?: string;
      /** The counterparty substitution proven impossible — REQUIRED for SUBSTITUTION_IMPOSSIBLE. */
      substitutionId?: string;
    })
  | (AdviceBase & { kind: "ACCEPT_ACTIVE"; offerId: string })
  | (AdviceBase & { kind: "ACCEPT_SUBSTITUTION"; substitutionId: string })
  | (AdviceBase & {
      kind: "COUNTER";
      /** The Offer this counter replies to — the counter is meaningless without it. */
      counterOfferId: string;
      /**
       * Complete proposed item list, priced per item by the assistant at advice time.
       * There is deliberately NO single "advice price": a multi-item counter has no one price.
       */
      items: PurchaseItem[];
    });

/**
 * Assistants are an experimental layer: these are ONE example family of deterministic price
 * policies, injected as parameters. The experiment validates the Advice/basis/apply contract
 * with this family — it does not prove the contract sufficient for arbitrary LLM/real policies.
 */
export interface BuyerPolicy {
  /** Without an agreed baseline: accept only if every unit price ≤ catalog reference + this margin (MAD). */
  maxOverCatalog: number;
  /** Give up instead of countering when a price exceeds the baseline/reference by more than this (MAD). */
  rejectOverReference: number;
  /**
   * Positive substitution choice when the active Offer needs no correction:
   * SUBSTITUTION_FIRST accepts the pending substitution before deciding on the Offer;
   * OFFER_FIRST completes the Offer decision and leaves the substitution pending.
   */
  substitutionPreference: "SUBSTITUTION_FIRST" | "OFFER_FIRST";
}

export interface SellerPolicy {
  /** Accept a buyer price down to catalog reference − this margin (MAD). */
  acceptBelowCatalog: number;
  /** Give up instead of countering when a buyer price is below catalog reference − this margin (MAD). */
  rejectBelowCatalog: number;
}

export const DEFAULT_BUYER_POLICY: BuyerPolicy = {
  maxOverCatalog: 0,
  rejectOverReference: 10,
  substitutionPreference: "SUBSTITUTION_FIRST",
};
export const DEFAULT_SELLER_POLICY: SellerPolicy = { acceptBelowCatalog: 1, rejectBelowCatalog: 10 };
