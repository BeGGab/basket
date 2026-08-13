# Basket domain experiment (TZ-BASKET-001)

Isolated mock of List → Resolution → Purchase → SellerPurchase → Offer/Acceptance/Substitution → STABLE.

Not production Customer UI. UI is out of mandatory scope: scenarios are programmatic and deterministic.

## Run

From the repository root (uses `npx tsx`, same style as platform-core tests):

```bash
npx tsx experiments/basket/tests/run.ts
```

Writes evidence into `docs/basket/BASKET_EXPERIMENT_RESULTS.md`.

Human-facing demo (TZ-003/004): open `/sim` in the Vite app (`react-vite-bootstrap-project`). This is not the production `/cart` screen. Assistants on that screen advise; Apply is explicit.

## Layout

```text
experiments/basket/
  domain/      entities, resolution, FSM, projections, commands
  emulator/    buyer + seller profiles
  assistants/  deterministic buyer/seller advice (no LLM)
  runtime/     Simulation Runtime + Scenario Engine
  tests/       invariants + breaking scenarios + TZ-002 engine + TZ-004
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
| FSM | `domain/fsm.ts` |
| Simulation Runtime | `runtime/simulation.ts` |
| Scenario Engine | `runtime/engine.ts` |
| Buyer Emulator | `emulator/buyers.ts` |
| Buyer / Seller assistants | `assistants/` |

## Seller profiles

CooperativeSeller, NegotiatingSeller, TimeDiscountSeller, SubstitutionSeller, SlowSeller, PartialAvailabilitySeller.
