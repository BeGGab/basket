# GreenMarket — Basket Domain Experiment

**Status:** Experimental Baseline v0.1

## Objective

Validate the Basket domain model on mock data and seller emulators before production backend/API/Platform Core integration.

The experiment asks whether GreenMarket purchasing behavior can be described naturally without prematurely introducing Order, Checkout, Payment, Reservation, Allocation, Fulfillment or Delivery.

## In scope

- List/ListItem
- alternatives and Resolution
- Purchase/SellerPurchase/PurchaseItem
- immutable Offer history
- Acceptance
- Substitution
- negotiation
- price/quantity/composition changes
- automatic price reductions
- expiration
- silence
- partial availability as behavior
- stock competition as a stress scenario
- Seller Emulator
- mock interactions needed to exercise the model

## Out of scope

- production Order
- Checkout
- Payment
- Reservation
- Allocation
- production stock management
- Fulfillment subsystem
- Delivery subsystem
- real seller accounts
- production ACL
- production persistence
- production backend integration

Mock transitions may represent future processes after STABLE.

## Experimental principle

The goal is to find where the model breaks, not to prove it correct.

For every scenario record:

```text
Scenario
Expected
Actual
Model violation
New concept required
Existing concept overloaded
Workaround used
Decision
```

A workaround can be more significant than a simple failure.

## Primary invariant

At any checkpoint a SellerPurchase must expose:

1. what has already been agreed;
2. the currently active proposal;
3. any pending substitution.

## Resolution policies

Initially test:

```text
PRIMARY_ONLY
FIRST_AVAILABLE
ASK_BUYER
```

Do not implement a general pricing optimizer unless experiments justify it.

## Success criterion

The model succeeds if scenarios preserve these distinctions:

```text
List ≠ Purchase
Purchase ≠ SellerPurchase
SellerPurchase ≠ Offer
Offer ≠ Acceptance
Alternative ≠ Substitution
Commercial agreement ≠ Fulfillment
```

## Deliverables

- mock domain implementation
- seller emulator
- breaking scenario suite
- experiment results
- updated invariants/open questions
- revised domain model if required

Only after validation should production architecture and the first implementation TЗ be prepared.
