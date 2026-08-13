export type AdviceKind =
  | "ACCEPT_ACTIVE"
  | "COUNTER"
  | "REJECT"
  | "ACCEPT_SUBSTITUTION"
  | "WAIT";

export interface Advice {
  actor: "BUYER" | "SELLER";
  kind: AdviceKind;
  rationale: string;
  /** For COUNTER: proposed unit price of the first item. */
  price?: number;
}
