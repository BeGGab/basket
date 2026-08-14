import type { SellerPurchaseStatus } from "./types";

const TERMINAL: ReadonlySet<SellerPurchaseStatus> = new Set(["REJECTED", "CANCELLED"]);

const ALLOWED: Record<SellerPurchaseStatus, readonly SellerPurchaseStatus[]> = {
  DRAFT: ["DRAFT", "NEGOTIATING", "WAITING_SELLER", "WAITING_BUYER", "REJECTED", "CANCELLED"],
  NEGOTIATING: ["NEGOTIATING", "WAITING_SELLER", "WAITING_BUYER", "STABLE", "REJECTED", "CANCELLED"],
  WAITING_SELLER: ["WAITING_SELLER", "WAITING_BUYER", "NEGOTIATING", "STABLE", "REJECTED", "CANCELLED"],
  WAITING_BUYER: ["WAITING_BUYER", "WAITING_SELLER", "NEGOTIATING", "STABLE", "REJECTED", "CANCELLED"],
  STABLE: ["STABLE", "WAITING_SELLER", "WAITING_BUYER", "NEGOTIATING", "CANCELLED"],
  REJECTED: ["REJECTED"],
  CANCELLED: ["CANCELLED"],
  // Silence / clock must not enter EXPIRED automatically (TZ-001 I-026).
  EXPIRED: ["EXPIRED"],
};

export function canTransition(from: SellerPurchaseStatus, to: SellerPurchaseStatus): boolean {
  if (from === to) return true;
  if (TERMINAL.has(from)) return false;
  return ALLOWED[from].includes(to);
}

export function transition(from: SellerPurchaseStatus, to: SellerPurchaseStatus): SellerPurchaseStatus {
  if (!canTransition(from, to)) {
    throw new Error(`Illegal FSM transition: ${from} → ${to}`);
  }
  return to;
}
