# GreenMarket — Seller Emulator Specification

**Status:** Experimental Baseline v0.1

## Purpose

The Seller Emulator is a behavioral actor for domain experimentation. It is not a production seller service and must not hide allocation/reservation semantics.

## Capabilities

```text
SellerEmulator
├── catalog
├── availability
├── prices
├── discounts
├── makeOffer()
├── counterOffer()
├── changePrice()
├── changeQuantity()
├── changeComposition()
├── proposeSubstitution()
├── reject()
├── delayResponse()
└── expireOffer()
```

## Profiles

- Cooperative Seller
- Negotiating Seller
- Price-Changing Seller
- Time-Discount Seller
- Availability-Changing Seller
- Substitution Seller
- Rejecting Seller
- Slow Seller
- Partial Availability Seller

## System events

The environment must support deterministic:

```text
SYSTEM_PRICE_DROP
SHELF_LIFE_DISCOUNT
AVAILABILITY_CHANGE
OFFER_EXPIRATION
SELLER_SILENCE
```

## Determinism

Scenarios must be reproducible with deterministic:

- timestamps;
- response delays;
- seller decisions;
- price changes;
- availability changes.

## Multiple sellers

At least three independent seller emulator instances should run simultaneously.

Example:

```text
Seller A → Cooperative
Seller B → Negotiating
Seller C → Slow
```

## Concurrency

The emulator must reproduce a true race, where each claim is individually within stock but the combination is not:

```text
Stock = 6 kg
Purchase A → 4 kg
Purchase B → 3 kg
```

without silently solving allocation.

It must expose the first layer at which combined claims exceed stock (Offer creation, Acceptance, STABLE or fulfillment).

`stockConflicts` is a **detection-event log**: the same race may produce several rows (one per checkpoint). Do not treat `conflicts.length` as the number of unique races.

## Observation

Each emulator / runtime event records:

```text
timestamp          → SimEvent.at
seller             → SimEvent.seller
event              → SimEvent.event
input              → SimEvent.input
result             → SimEvent.result
related Offer      → SimEvent.offerId
related SellerPurchase → SimEvent.sellerPurchaseId
```

`input` / `result` are short deterministic strings, not full Offer dumps.

## Minimum profiles for first implementation

- Cooperative
- Negotiating
- Time-Discount
- Substitution
- Slow
- Partial Availability
