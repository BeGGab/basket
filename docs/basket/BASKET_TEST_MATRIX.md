# GreenMarket — Basket Experiment Test Matrix

**Status:** Experimental Baseline v0.1

| ID | Scenario | Model | Emulator | UI | Main check |
|---|---|:---:|:---:|:---:|---|
| BS-001 | List → Purchase | ✓ |  | ✓ | List/Purchase |
| BS-002 | Multiple sellers | ✓ | ✓ | ✓ | SellerPurchase |
| BS-003 | Independent lifecycle | ✓ | ✓ | ✓ | seller isolation |
| BS-004 | Long negotiation | ✓ | ✓ | ✓ | Offer history |
| BS-005 | Price change | ✓ | ✓ | ✓ | immutability |
| BS-006 | Time discount | ✓ | ✓ | ✓ | actor/reason |
| BS-007 | Quantity reduction | ✓ | ✓ | ✓ | agreement |
| BS-008 | Composition change | ✓ | ✓ | ✓ | history |
| BS-009 | Alternatives | ✓ | ✓ | ✓ | resolution |
| BS-010 | Expensive alternative | ✓ | ✓ | ✓ | resolution policy |
| BS-011 | Stock race | ✓ | ✓ |  | boundary |
| BS-012 | Expiration | ✓ | ✓ | ✓ | activeOffer |
| BS-013 | Silence | ✓ | ✓ | ✓ | waiting |
| BS-014 | Partial fulfillment | ✓ | ✓ |  | STABLE/fulfillment |
| BS-015 | List → multiple Purchases | ✓ |  | ✓ | reuse |
| BS-016 | Snapshot conflict | ✓ | ✓ | ✓ | core invariant |
| BS-017 | Accept previous Offer | ✓ | ✓ | ✓ | acceptance semantics |
| BS-018 | Substitution | ✓ | ✓ | ✓ | substitution |
| BS-019 | Alternative across sellers | ✓ | ✓ | ✓ | resolution ordering |
| BS-020 | Simultaneous seller changes | ✓ | ✓ | ✓ | isolation |
| BS-021 | Expired + new Offer | ✓ | ✓ | ✓ | activeOffer |
| BS-022 | Silence after expiration | ✓ | ✓ | ✓ | TTL/state |
| BS-023 | Conflicting promises | ✓ | ✓ |  | stock boundary |
| BS-024 | Accepted + new Offer | ✓ | ✓ | ✓ | agreed/current |
| BS-025 | Accepted substitution + new Offer | ✓ | ✓ | ✓ | history |
| BS-026 | Silence while valid | ✓ | ✓ | ✓ | silence ≠ expiry |
| BS-027 | Unacceptable alternative price | ✓ | ✓ | ✓ | policy |
| BS-028 | Partial availability before STABLE | ✓ | ✓ | ✓ | STABLE |

## Mandatory acceptance scenarios

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
