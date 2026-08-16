# Basket domain experiment (TZ-BASKET-001)

Isolated mock of List → Resolution → Purchase → SellerPurchase → Offer/Acceptance/Substitution → STABLE.

Not production Customer UI. UI is out of mandatory scope: scenarios are programmatic and deterministic.

## Run

From the repository root (uses `npx tsx`, same style as platform-core tests):

```bash
npx tsx experiments/basket/tests/run.ts
```

Writes evidence into `docs/basket/BASKET_EXPERIMENT_RESULTS.md`.

Canonical domain semantics: [`docs/domain/GREENMARKET_DOMAIN_SPEC.md`](../../docs/domain/GREENMARKET_DOMAIN_SPEC.md). AI executors MUST read it before changing domain behavior (`AGENTS.md`).

Human-facing demo (TZ-003/004): open `/sim` directly in the Vite app (`react-vite-bootstrap-project`). It is **not** in Customer UI navigation and is not the production `/cart` screen. Assistants on that screen advise; Apply uses the displayed Advice and refuses a stale `basis`.

The experiment ships as a stack of four dependent PRs, one per layer: domain + emulator (TZ-001), assistants (TZ-004), runtime + scenario engine (TZ-002), `/sim` viewer (TZ-003). TZ-BASKET-005 is a later domain iteration on expiration / silence / time (SPEC v0.3). TZ-BASKET-006 closes SPEC OQ-001/OQ-002 (price / package semantics, SPEC v0.4). Each layer keeps its own runner: domain scenarios in `tests/run.ts`, engine in `tests/runtime.ts`, assistants in `tests/assistants.ts`. `/sim` is a viewer, not acceptance.

## Layout

```text
experiments/basket/
  domain/      entities, resolution, FSM, projections, commands   (PR 1)
  emulator/    buyer + seller profiles                            (PR 1)
  assistants/  deterministic buyer/seller advice (no LLM)         (PR 2)
  runtime/     Simulation Runtime + Scenario Engine               (PR 3)
  tests/       invariants + breaking scenarios, then TZ-004 and TZ-002 runners
```

The `/sim` screen in `react-vite-bootstrap-project` arrives with PR 4.

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
