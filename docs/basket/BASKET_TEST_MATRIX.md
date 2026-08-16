# GreenMarket — Basket Experiment Test Matrix

**Status:** Experimental Baseline v0.1

`/sim` is a **demo/training viewer**, not the acceptance interface for BS-001…036. All 36 scenarios are **programmatically exercised** by `npx tsx experiments/basket/tests/run.ts` (Model column). Impl PASS does not mean Domain CONFIRMED — some rows stay Domain OPEN. The `/sim demo` column is ✓ only when a named scenario on `/sim` covers that check for a human.

| ID | Scenario | Model | Emulator | /sim demo | Main check |
|---|---|:---:|:---:|:---:|---|
| BS-001 | List → Purchase | ✓ |  |  | List/Purchase |
| BS-002 | Multiple sellers | ✓ | ✓ | ✓ | SellerPurchase switcher (TZ002-THREE-SELLERS) |
| BS-003 | Independent lifecycle | ✓ | ✓ | ✓ | A STABLE / B counter / C silence |
| BS-004 | Long negotiation | ✓ | ✓ |  | Offer history |
| BS-005 | Price change | ✓ | ✓ |  | immutability |
| BS-006 | Time discount | ✓ | ✓ | ✓ | TZ002-TIME_DISCOUNT |
| BS-007 | Quantity reduction | ✓ | ✓ |  | agreement |
| BS-008 | Composition change | ✓ | ✓ |  | history |
| BS-009 | Alternatives | ✓ | ✓ |  | resolution |
| BS-010 | Expensive alternative | ✓ | ✓ |  | resolution policy |
| BS-011 | Stock race | ✓ | ✓ |  | boundary |
| BS-012 | Expiration | ✓ | ✓ |  | I-028 cannot accept expired; I-037/I-038 agreed expiry keeps STABLE |
| BS-013 | Silence | ✓ | ✓ | ✓ | TZ002-SILENCE |
| BS-014 | Partial fulfillment | ✓ | ✓ |  | STABLE/fulfillment |
| BS-015 | List → multiple Purchases | ✓ |  |  | reuse |
| BS-016 | Snapshot conflict | ✓ | ✓ | ✓ | TZ002-SNAPSHOT |
| BS-017 | Accept previous Offer | ✓ | ✓ |  | acceptance semantics |
| BS-018 | Substitution | ✓ | ✓ |  | substitution |
| BS-019 | Alternative across sellers | ✓ | ✓ |  | resolution ordering |
| BS-020 | Simultaneous seller changes | ✓ | ✓ | ✓ | TZ002-THREE-SELLERS |
| BS-021 | Expired + new Offer | ✓ | ✓ |  | new Offer becomes active; expired stays historical (I-011) |
| BS-022 | Silence after expiration | ✓ | ✓ |  | I-039 not a command; status stays WAITING_BUYER |
| BS-023 | Conflicting promises | ✓ | ✓ |  | stock=6 combined=7 OFFER_CREATION; both STABLE |
| BS-024 | Accepted + new Offer | ✓ | ✓ | ✓ | TZ002-SNAPSHOT agreed ≠ current |
| BS-025 | Accepted substitution + new Offer | ✓ | ✓ |  | history |
| BS-026 | Silence while valid | ✓ | ✓ | ✓ | TZ002-SILENCE |
| BS-027 | Unacceptable alternative price | ✓ | ✓ |  | policy |
| BS-028 | Partial availability before STABLE | ✓ | ✓ |  | agreed/active qty=5 |
| BS-029 | Silence while valid | ✓ |  |  | I-039 pointers/status unchanged |
| BS-030 | Silence until expiration | ✓ |  |  | I-039 not implicit REJECT |
| BS-031 | Accepted Offer expires | ✓ |  |  | I-037/I-038 STABLE + pointers stay |
| BS-032 | Expiry then new Offer | ✓ |  |  | agreed=A, active=B, B acceptable |
| BS-033 | Expired cannot be revived | ✓ |  |  | I-028 |
| BS-034 | Expired cannot be countered | ✓ |  |  | I-035 isCounterReason blocked; PRICE_CHANGE allowed |
| BS-035 | Silence invents no FSM state | ✓ |  |  | I-039 / I-041 |
| BS-036 | Time determinism | ✓ |  |  | I-040 identical full snapshot |

TZ-004 assistant demos on `/sim` (DISCOUNT / HIKE / SELLER) are training overlays, not rows in this BS matrix.

## Mandatory acceptance scenarios

Exercised in the Model column (programmatic), not by `/sim`:

1. BS-003
2. BS-006
3. BS-009
4. BS-010
5. BS-011
6. BS-012
7. BS-013
8. BS-014
9. BS-016
10. BS-024
11. BS-028

Passing all scenarios is not sufficient. Record model gaps, overloaded entities, duplicated state and artificial workarounds.
