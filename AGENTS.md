# GreenMarket AI Development Rules

## Mandatory domain specification

Before implementing or modifying any GreenMarket domain behavior, the
AI executor MUST read:

`docs/domain/GREENMARKET_DOMAIN_SPEC.md`

This document is the canonical source of GreenMarket domain semantics.

It defines:

- entity identities;
- relationships;
- matching rules;
- pricing semantics;
- stock semantics;
- Purchase / SellerPurchase lifecycle;
- Offer / Acceptance / Substitution semantics;
- Assistant and Emulator constraints;
- confirmed rules and unresolved domain questions.

## No local domain interpretation

The executor MUST NOT introduce a local interpretation of:

- entity identity;
- product matching;
- unit matching;
- catalog lookup;
- stock lookup;
- PurchaseItem identity;
- Offer comparison;
- pricing;
- SellerPurchase lifecycle

when the corresponding semantics are defined in the domain specification.

Existing domain helpers MUST be reused where applicable (for example the
shared catalog matcher in `experiments/basket/domain/catalog.ts`).

## When the specification is insufficient

If implementation reveals a domain question not covered by the specification:

1. Do not silently invent a business rule.
2. Identify the missing or conflicting domain rule.
3. Propose an update to
   `docs/domain/GREENMARKET_DOMAIN_SPEC.md`.
4. Add or update an executable scenario covering the rule.
5. Only then implement the corresponding behavior.

## Domain changes

A PR that introduces or changes GreenMarket domain semantics MUST update:

1. `docs/domain/GREENMARKET_DOMAIN_SPEC.md`
2. the corresponding executable scenario/test

The PR description MUST identify the affected domain rule(s).

If a PR changes confirmed domain semantics and does not update the domain
specification, that is a defect of the PR.

Executable evidence for the current confirmed rules lives in
`experiments/basket/tests/` and is mapped from
`tests/domain/README.md`. New confirmed rules MUST add or update that mapping.

## Do not regress confirmed domain rules

Before changing existing GreenMarket domain code, the executor MUST
check the relevant CONFIRMED rules in
`docs/domain/GREENMARKET_DOMAIN_SPEC.md`.

A previously discovered and confirmed domain rule MUST NOT be
reinterpreted or bypassed for local implementation convenience.

If a new implementation appears to require changing a CONFIRMED rule,
the executor MUST treat this as a domain-model change, not as a normal
refactoring.
