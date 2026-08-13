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

The emulator must reproduce:

```text
Stock = 10 kg
Purchase A → 20 kg
Purchase B → 20 kg
```

without silently solving allocation.

It must expose where conflict is detected.

## Observation

Each emulator event should record:

```text
timestamp
seller
event
input
result
related Offer
related SellerPurchase
```

## Minimum profiles for first implementation

- Cooperative
- Negotiating
- Time-Discount
- Substitution
- Slow
- Partial Availability
