# Basket domain experiment (TZ-BASKET-001)

Isolated mock of List → Resolution → Purchase → SellerPurchase → Offer/Acceptance/Substitution → STABLE.

Not production Customer UI. UI is out of mandatory scope: scenarios are programmatic and deterministic.

## Run

From the repository root (uses `npx tsx`, same style as platform-core tests):

```bash
npx tsx experiments/basket/tests/run.ts
```

Writes evidence into `docs/basket/BASKET_EXPERIMENT_RESULTS.md`.

## Layout

```text
experiments/basket/
  domain/     entities, resolution, projections, commands
  emulator/   seller profiles + deterministic reactions
  tests/      invariants + breaking scenarios
```

## Domain mapping

| Concept | Code |
|---|---|
| List / ListItem | `domain/types.ts` `ShoppingList`, `ListItem` |
| Purchase / SellerPurchase / PurchaseItem | `domain/types.ts` + `BasketWorld` |
| Offer / Acceptance / Substitution | `domain/types.ts` + `BasketWorld` |
| Resolution | `domain/resolution.ts` |
| Snapshot AGREED/CURRENT/PENDING | `BasketWorld.snapshot()` |
| Clock | `domain/clock.ts` `DeterministicClock` |

## Seller profiles

CooperativeSeller, NegotiatingSeller, TimeDiscountSeller, SubstitutionSeller, SlowSeller, PartialAvailabilitySeller.
