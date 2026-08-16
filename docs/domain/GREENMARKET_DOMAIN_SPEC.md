# GreenMarket Domain Specification

Version: 0.4
Status: EXPERIMENTAL
Update basis: TZ-BASKET-006 (price semantics / package quantity)
Scope: Stage 1 Basket Experiment
Purpose: a single domain contract for the core code, emulators, scenarios, tests, and the later AI layer.

> This is a living domain specification, not an implementation TZ. It is the **canonical source** of
> GreenMarket domain semantics and MUST evolve after every substantive PR. New domain semantics
> discovered during implementation must be recorded here — not left only in code or PR review.

---

## 1. Purpose

The document captures the accumulated knowledge about the GreenMarket domain gained through modeling
and experimentation.

It defines:

- domain entities;
- their identity;
- relationships;
- lifecycles;
- commercial semantics;
- invariants;
- edge-case handling rules;
- confirmed decisions;
- working hypotheses;
- open questions;
- executable scenarios that these rules must be verified by.

The document evolves after each substantive PR. New domain semantics discovered during
implementation must NOT remain only in the code or PR review — they must be recorded here.

## 2. Knowledge statuses

- **CONFIRMED** — the rule is confirmed by the experiment and tests.
- **ASSUMED** — the rule is accepted as a working hypothesis but not yet proven.
- **OPEN** — no domain decision exists yet.
- **SUPERSEDED** — a previously active decision has been replaced by a new one.

## 3. Core model

```
List
  │
  │ resolution
  ▼
Purchase
  │
  ├── SellerPurchase
  ├── SellerPurchase
  └── SellerPurchase
          │
          ▼
      Offer history
          │
      Acceptance
          │
          ▼
        STABLE
```

The model deliberately separates:

- `List`     = long-lived intent
- `Purchase` = a concrete purchasing attempt

One List can spawn several Purchases. **CONFIRMED**

## 4. List

`List` is the buyer's long-lived intent (family list, weekly shop, BBQ, trip, holiday shop). A List
is neither an Order nor a current purchase.

Minimal `ListItem`:

```
ListItem
├── product
├── quantity?
├── unit?
├── referencePrice?
└── alternatives?
```

Quantity and price may be absent. **CONFIRMED**

## 5. Alternatives

Alternatives are part of the buyer's intent and belong to the List.

```
Bread
├── black       priority 1
└── white       priority 2
```

Resolution may automatically use an alternative:

```
primary unavailable → alternative #1 → alternative #2 → unresolved
```

**CONFIRMED**

## 6. Alternatives ≠ Substitution

- **Alternative** — a variant pre-approved by the buyer.
- **Substitution** — a new variant proposed by the seller during a concrete purchase.

```
Alternative:   pre-approved
Substitution:  requires a separate decision
```

If `white bread` (a declared alternative) is found during Resolution, that is ordinary Resolution.
If the seller proposes `baguette`, that is a Substitution. **CONFIRMED**

## 7. Resolution

Resolution turns a List into a concrete Purchase. It must respect the commercial compatibility of a
ListItem with the seller catalog: product, unit, availability, alternatives, seller.

Resolution MUST NOT use matching semantics different from this specification. **CONFIRMED**

## 8. CatalogLine

The experiment establishes the commercial identity of a CatalogLine:

```
CatalogLine identity = sellerId + productId + unit
```

`quantity` is NOT part of CatalogLine identity. Therefore:

```
Tomatoes / kg / 1 kg
Tomatoes / kg / 5 kg
Tomatoes / kg / 20 kg
```

all belong to the same commercial line `Tomatoes / kg`. Catalog `quantity` is a reference/package
size on that row: it is not identity, not a price multiplier, and not a conversion into another
unit (I-045). That is a Stage-1 representation constraint. Whether the future domain should
support volume pricing or package-contents conversion remains **OPEN — OQ-002**.
**CONFIRMED** (Stage-1 constraint only)

## 9. Unit

Unit is part of the commercial identity:

```
kg ≠ pcs
kg ≠ box
l  ≠ pcs
```

`Tomatoes / kg` does not satisfy `Tomatoes / pcs` even for the same productId. **CONFIRMED**

## 10. Unified CatalogLine matching

Any operation working with a commercial catalog line must use the SAME matching semantics:
Resolution, Purchase creation, price lookup, stock lookup, stock-conflict detection, Buyer
Assistant, Seller Assistant, Seller Emulator.

A local implementation of the form `sellerId + productId` is forbidden when the operation needs to
identify a concrete commercial line. **CONFIRMED**

> Reinforced by pr_11: after unifying the matcher in the domain, all emulators must use it too,
> instead of their own simplified lookup.

## 11. Catalog ambiguity

If several rows share `sellerId + productId + unit` but have different prices, the lookup is
ambiguous:

```
Seller A
Tomatoes / kg / 15
Tomatoes / kg / 12
→ AMBIGUOUS   (not 12, not 15)
```

Choosing the first or the minimum price as a hidden policy is forbidden. **CONFIRMED**

## 12. Reference Price

Reference price is a fact/anchor for policy. An unambiguous catalog match may yield a reference
price; ambiguity yields no reference price. Reference lookup must not itself make a commercial
decision. **CONFIRMED**

## 13. Price semantics (closes SPEC OQ-001)

**Decision.** `PurchaseItem.price` and `CatalogOffer.price` are the price of **one** `unit`
(I-042). Example:

```
Tomatoes   quantity = 2   unit = kg   price = 15
→ derived total = 2 × 15 = 30
```

The derived total is not a stored field. `linePrice` does not exist. A missing `price` yields no
derived total (it is not invented as 0).

`(quantity=2, price=15)` and `(quantity=1, price=30)` are different stored facts. They may share
a derived arithmetic total after this rule is applied. That equality is a numeric consequence,
not a claim that the two deals are commercially equivalent.

Changing `quantity` does not reinterpret `price` as a line total (I-043). Changing quantity or
price requires a new Offer (I-044 / I-006). Requested `PurchaseItem.quantity` is the buyer amount
in `unit`; it is not copied from catalog `quantity`. A ListItem without quantity cannot become a
PurchaseItem — it is surfaced as `MISSING_QUANTITY`. Acceptance requires a finite `price` on
every item (I-046).

**Rationale.** The stored triple has no `linePrice`. A line-price reading would treat
`(2 kg, 15)` and `(1 kg, 15)` as the same unit economics. Catalog lookup and assistants are
*consistent* with unit-price; they are not the source of the rule (Rule 49).

**Affected invariants:** I-030, I-036, I-042, I-043, I-044, I-046.

**Affected scenarios:** PRICE-UNIT-001, PRICE-UNIT-002, PRICE-OFFER-001, PRICE-QTY-001,
PRICE-ABSENT-001, PRICE-CATALOG-QTY-001, PRICE-SNAPSHOT-001, PRICE-REGRESSION-001.

## 13.1 Package / reference quantity (Stage-1 constraint; OQ-002 remains OPEN)

**Stage-1 representation (CONFIRMED).** Catalog `quantity` is a reference/package size of that
catalog row (I-045). `unit = "package"` is a commercial unit like `kg`: `1 package @ 60` means
60 per package. Catalog `quantity` does not scale `price` and is not a conversion into another
unit. This specification does **not** introduce `Package` or `Price` entities and does not
auto-convert 60 MAD/package into 12 MAD/kg.

**Business semantics (OPEN — OQ-002).** The experiment shows that the current identity
`(sellerId, productId, unit)` cannot *represent* volume pricing (same line, different package
sizes, different unit prices → `AMBIGUOUS_PRICE`) or package contents (`1 package = 5 kg`).
That is a MODEL GAP / limitation of Stage-1 representation. It is **not** a decision that
volume pricing or package-contents conversion must not exist in the future domain.

**Rationale.** Putting package size into CatalogLine identity, or treating catalog `quantity` as
a hidden kg conversion, would smuggle a new rule through an existing field. The next experiment
must decide the business semantics before any new concept is added.

**Affected invariants:** I-036, I-045.

**Affected scenarios:** PACKAGE-001 (representation CONFIRMED), PACKAGE-004 (contents OPEN), PACKAGE-002 / PACKAGE-003 (OPEN — OQ-002).

Alternative *selection policy* (AUTO_ACCEPT / BEST_PRICE / ASK_BUYER) is a different question and
stays **OPEN — SPEC OQ-008**.

## 14. Purchase

`Purchase` is a concrete purchasing attempt. One List may spawn Purchase #1, #2, #3. A Purchase has
its own lifecycle and is not a copy of the List. **CONFIRMED**

## 15. SellerPurchase

A Purchase is composed of independent SellerPurchases:

```
Purchase
├── SellerPurchase A → STABLE
├── SellerPurchase B → NEGOTIATING
└── SellerPurchase C → REJECTED
```

`SellerPurchase` is the primary unit of commercial interaction with a specific seller. One seller
must not block the others. **CONFIRMED**

## 16. SellerPurchaseItem identity

After pr_11 the following rule is fixed: if `unit` is part of CatalogLine identity, then a
SellerPurchaseItem must also distinguish `productId + unit`, not only `productId`.

```
Tomatoes / kg
Tomatoes / pcs
→ two independent positions
```

**CONFIRMED.** This is a direct result of the CatalogLine ↔ SellerPurchase mismatch found in pr_11.

## 17. Duplicate ListItems

The following case remains open:

```
List:
    Tomatoes / 2 kg
    Tomatoes / 5 kg
```

Such lines must not be silently collapsed just because `productId + unit` matches. It must be
separately decided whether they are two independent PurchaseItems or one aggregated position.

**OPEN — OQ-003.** Until resolved, the code must not introduce implicit aggregation behavior. The
current implementation surfaces the duplicate explicitly as an unresolved `DUPLICATE_LINE` (the
first line resolves; the second is neither silently dropped nor silently merged). This is a
temporary experimental handling of an OPEN question, not a confirmed aggregation policy.

## 18. requested / agreed / fulfilled

Quantity at different stages is different concepts:

```
requestedQuantity → agreedQuantity → fulfilledQuantity
```

Valid scenario: `requested = 20 kg`, `agreed = 20 kg`, `fulfilled = 5 kg` when the buyer agreed in
advance to the corresponding actual-delivery rule. **CONFIRMED**

## 19. STABLE

STABLE means the commercial terms of the SellerPurchase are agreed (`agreedOfferId` equals
`activeOfferId`, no pending mandatory substitutions). STABLE does NOT mean: paid, reserved,
requested-quantity guaranteed, actually delivered, handed to delivery, or that the agreed Offer's
`validUntil` is still in the future. Thus `STABLE ≠ stock guarantee` and `STABLE ≠ Offer still
valid`. **CONFIRMED** (v0.3: expiration of an already-agreed Offer does not exit STABLE).

## 20. Offer

`Offer` is immutable. Each new proposal (Offer #17, #18, #19) is a new object. Offer history is
append-only. A separate OfferRevision is not required in the current model. **CONFIRMED**

## 21. Offer actor

An Offer may be created by `BUYER`, `SELLER`, or `SYSTEM`. Buyer counteroffer and seller
counteroffer are elements of one Offer history. **CONFIRMED**

## 22. Offer reason

An Offer has a `reason` describing the cause of the change (e.g. `MANUAL_COUNTEROFFER`,
`SHELF_LIFE_DISCOUNT`, `AVAILABILITY_CHANGE`, `SYSTEM_PRICE_DROP`, ...). The enum is not considered
final. **ASSUMED**

## 23. Agreed Offer / Active Offer

A SellerPurchase holds `agreedOfferId` and `activeOfferId`, both pointing into the immutable Offer
history:

```
agreedOfferId = Offer #18   (last agreed state)
activeOfferId = Offer #19   (current proposal)
```

The Active Offer does not become agreed automatically.

After an Offer is accepted, both pointers may still name that same Offer. Later expiration of that
Offer does **not** clear either pointer. A subsequent new Offer becomes the new `activeOfferId`;
`agreedOfferId` stays on the last accepted Offer until a later Acceptance. The SellerPurchase
snapshot exposes agreed items, current items, pending substitutions, and a List-alternative
**projection** (requested qty/unit vs catalog qty/unit/price; no selection policy). The
projection is not a commercial entity. **CONFIRMED**

## 24. Acceptance

Acceptance is a separate historical fact:

```
Acceptance
├── offerId
├── actor
└── timestamp
```

Acceptance moves the agreed pointer but does not replace the historical record. **CONFIRMED**

## 25. Substitution

Substitution is a separate entity with a lifecycle:

```
PROPOSED → ACCEPTED / REJECTED
```

It must be addressed by a concrete `substitutionId`. An array position must not be used as the
identifier of a business operation. **CONFIRMED**

## 26. Advice

Advice is an executable command, not just a recommendation. It contains `actor`, `kind`,
`target/payload`, `basis`. Main kinds: `WAIT`, `ACCEPT_ACTIVE`, `ACCEPT_SUBSTITUTION`, `COUNTER`,
`REJECT`. **CONFIRMED**

## 27. Advice Basis

Advice is computed relative to a concrete snapshot. Basis must capture the facts the decision
depends on: SellerPurchase, active/agreed Offer, Offer items, catalog facts, pending substitutions,
validity-relevant Offer. Changing these facts makes the Advice stale. **CONFIRMED**

## 28. Advice Apply

Advice must not recompute its business target from a changed world:

```
ACCEPT_ACTIVE        → a concrete offerId
ACCEPT_SUBSTITUTION  → a concrete substitutionId
COUNTER              → a concrete items[]
```

If the corresponding snapshot changed, the stale Advice is not applied. **CONFIRMED**

## 29. Counter

COUNTER must preserve the identity of the original lines and change only permitted commercial
parameters. In the current model `productId`, `unit`, `quantity` must stay the same; price may
change. For a multi-item COUNTER every line is validated. **CONFIRMED**

## 30. REJECT

REJECT must carry a machine-readable `rejectReason`, and the reason must have a corresponding basis.
An arbitrary `REJECT + reason` is not a valid command merely because the enum is syntactically
correct. Semantic validation of the basis is part of the Apply contract. **CONFIRMED**

## 31. Buyer/Seller Assistant

The Assistant is a policy layer:

```
Domain facts → Policy → Advice → Domain Apply
```

The Assistant does not mutate the domain directly. Current deterministic policies are experimental
and are not the final production policy. **CONFIRMED**

## 32. Seller Emulator

The Seller Emulator models seller behavior. Profiles must use the same domain semantics as the core
code — especially CatalogLine matching, stock, unit, price, availability.

After pr_11 it is fixed: the emulator MUST NOT use a simplified `productId`-only matcher when the
domain semantics require `productId + unit`. **CONFIRMED**

## 33. Stock

Stock lookup is defined by `sellerId + productId + unit`. Different units must not be merged into one
stock pool without a special domain rule. **CONFIRMED**

## 34. Stock conflict

```
Stock = 6
Purchase A → 4
Purchase B → 3
```

The combined claims must be detectable as a conflict. But conflict detection does NOT mean
allocation or reservation. Current claims are the diagnostic projection `stockClaims`;
`stockConflicts` is the detection-event log, not a claims registry. **CONFIRMED**

## 35. Partial Availability Seller

A partial-availability emulator must determine stock by the same CatalogLine identity
`sellerId + productId + unit`. It must not sum `Tomatoes / kg` and `Tomatoes / pcs` as one stock
pool. **CONFIRMED** (added after pr_11 — the emulator itself surfaced the need to guard this
boundary).

## 36. Stock allocation

Allocation and reservation are outside Stage 1. Do not pre-introduce `GUARANTEED` / `RESERVED` /
`ALLOCATED` just to resolve a stock race. **CONFIRMED**

## 37. Partial fulfillment

`agreed = 20 kg`, `fulfilled = 5 kg` is allowed when the corresponding rule was accepted by the
buyer. Fulfillment as a production subsystem remains outside Stage 1. **CONFIRMED**

## 38. Offer validity vs agreement (closes experiment OQ-009 / SPEC OQ-004)

`validUntil` is a property of one immutable Offer. `isOfferValid(offer)` is true when `validUntil`
is absent or strictly in the future relative to the world clock (`now < validUntil`). The instant
`now === validUntil` is already expired.

**Decision.** Validity constrains *standing-proposal operations* on the **active** Offer only:

- an expired Offer cannot be accepted (I-028);
- an expired active Offer cannot be countered (I-035);
- replacing an expired standing proposal requires a **new** Offer with a non-counter reason.

Validity does **not** revoke a recorded Acceptance. An already-agreed Offer that later expires:

| Question | Answer |
| --- | --- |
| `agreedOfferId` | stays A |
| `activeOfferId` | stays A (until a new Offer is proposed) |
| Is A historical? | yes — Offer is immutable history |
| Is A still the baseline? | yes — the Acceptance is the commercial fact |
| May SellerPurchase stay STABLE? | yes, if A is still the active pointer and no pending mandatory substitutions |
| New FSM state? | no |
| May a party propose a new Offer? | yes (`PRICE_CHANGE`, `TIME_DISCOUNT`, … — not a counter) |
| New Offer B after A expired | `activeOfferId = B`, `agreedOfferId = A`; B may be accepted if valid |
| Does A still claim stock? | no — `stockClaims` excludes expired Offers (I-025); STABLE ≠ stock guarantee (I-018) |

**Rationale.** Acceptance is a completed historical fact. `validUntil` answers “may this standing
proposal still be accepted or countered?”, not “does the already-recorded agreement evaporate?”.
STABLE means agreement, not a live lease (I-017 / I-018).

**Affected:** Offer, Acceptance, `agreedOfferId`, `activeOfferId`, STABLE, `isOfferValid`, Assistant
baseline (agreed price survives expiration), stock claims (`stockClaims` excludes expired Offers).

**Affected invariants:** I-011, I-017, I-018, I-025, I-028, I-035, I-037, I-038.

**Affected scenarios:** BS-012, BS-031, BS-032, BS-033, BS-034.

A general TTL for the whole SellerPurchase negotiation is still undefined. **OPEN — SPEC OQ-005**
(experiment OQ-010).

## 39. Silence (closes experiment OQ-011)

**Decision.** Silence is the *absence of a domain command*, not a domain entity and not an FSM
state. It does not become `REJECT` or `CANCEL` without an explicit command. `markWaiting` is an
emulator command (SlowSeller), not silence; silence scenarios must not call it.

For **Stage-1 silence semantics**, `waitingSince`, `lastSellerActivity`, and the world clock are
the observation facts the experiment records. A derived duration may be computed from those
facts; it is not stored as its own entity. The experiment does **not** prove that these three
facts are sufficient for every future negotiation/waiting policy.

| Situation | Effect on SellerPurchase |
| --- | --- |
| Active Offer valid + actor does nothing | status, `activeOfferId`, `agreedOfferId` unchanged |
| Active Offer expired + actor does nothing | same pointers and status; `isOfferValid` becomes false |
| Silence before expiration vs after | same: no command ⇒ no lifecycle change; only computed validity differs |

**Rationale.** Inventing REJECT/CANCEL/EXPIRED from inaction would be a hidden business policy.
The experiment records waiting facts so observers (UI, Assistant) can *see* silence; they must not
*rewrite* the negotiation.

**Affected:** `waitingSince`, `lastSellerActivity`, SellerPurchase status, Assistant `WAIT`.

**Affected invariants:** I-026, I-039.

**Affected scenarios:** BS-013, BS-022, BS-026, BS-029, BS-030, BS-035.

## 40. Time (closes experiment OQ-012)

**Decision.**

1. **Time source.** The world's `DeterministicClock` (`Clock.now()`) is the sole source of
   *current* time. Domain operations read the clock; they do not take a "now" parameter.
   `Offer.validUntil` is input data of that Offer (when the standing proposal stops being
   acceptable). It is not a source of current time.
2. **`advance(durationMs)` is a domain operation.** It moves the clock and nothing else. It does
   not create Offers, Acceptances, Substitutions, stock-conflict events, or FSM states, and it
   does not clear pointers. It does **not** recompute STABLE eligibility — passage of time
   changes derived `isOfferValid`, not STABLE (I-038).
3. **Emulator/runtime `tick()` is not a domain operation.** It may call `advance` and then actor
   responses. Domain semantics must not live only in `tick()`.
4. **What passage of time does.** It changes computed `isOfferValid`. It does **not** enter
   `EXPIRED`, `REJECTED`, or `CANCELLED`. `EXPIRED` remains in the status union so the FSM can
   refuse an automatic transition into it (I-026 / I-041); no domain command currently enters it.
5. **`SELLER_UNRESPONSIVE` is not a domain state.** It would be a derived observation from
   `waitingSince` / `lastSellerActivity` / clock, if a UI ever needs it.

**Rationale.** Time is a fact the world owns. Treating `tick()` as the place where expiration
“happens” would give the emulator a private domain. Treating silence as a new FSM state would
multiply statuses without a command.

**Affected:** `DeterministicClock`, `advance`, `isOfferValid`, FSM (`EXPIRED` unused by time).

**Affected invariants:** I-040, I-041.

**Affected scenarios:** BS-022, BS-030, BS-031, BS-035, BS-036.

## 41. SellerPurchase lifecycle

Minimal model:

```
DRAFT → NEGOTIATING / WAITING → STABLE
```

Separate branches: `REJECTED`, `CANCELLED`. `EXPIRED` exists in the status union so the FSM can
refuse an automatic transition into it; time and silence do not enter it (I-041). Not every
observable circumstance should become a separate FSM state. **CONFIRMED** for the time/silence
boundary; the rest of the chart remains **ASSUMED**.

## 42. Purchase status

Purchase status is derived from SellerPurchases; it is not a second source of truth. E.g.
`A → STABLE`, `B → NEGOTIATING`, `C → REJECTED` may yield a derived Purchase status
`PARTIALLY_STABLE`. **CONFIRMED**

## 43. Stage 1 boundaries

Outside the core model: Order, Payment, Reservation, Allocation, Delivery. After STABLE there may be
mock actions `pay()`, `reserve()`, `sendToDelivery()`, but this does not imply production subsystems.
**CONFIRMED**

## 44. Determinism

For the same initial world and the same scenario, the result must be deterministic. Verification must
cover not only the event stream but a canonical snapshot of the WHOLE observable domain state:
Purchase, SellerPurchase, Offer history, Acceptance history, substitutions, catalog, stock conflicts,
fulfillments, relevant pointers. **CONFIRMED** (this closes the earlier insufficient check of only
`status` / `activeOfferId` / `agreedOfferId`).

## 45. Executable Domain Scenarios

Each substantive rule must have a reproducible scenario. Minimal set from the current experiment:

```
CATALOG-UNIT-001         same product + different unit  → independent catalog lines
PURCHASE-ITEM-UNIT-001   same product + different unit  → independent PurchaseItems
CATALOG-AMBIGUOUS-001    same seller+product+unit, different prices → ambiguous
STOCK-UNIT-001           same product + different units → independent stock lines
STOCK-RACE-001           stock=6, A=4, B=3 → conflict detected, no allocation
ADVICE-STALE-OFFER-001   same Offer id + changed content → stale
ADVICE-STALE-TIME-001    Advice → clock advances → apply → stale
COUNTER-MULTI-001        multi-item counter → every line validated
PARTIAL-FULFILLMENT-001  agreed 20 → fulfilled 5 → valid when buyer policy permits
SILENCE-VALID-001        active Offer + no command + time < validUntil → same status/pointers
SILENCE-EXPIRED-001      active Offer + no command + time > validUntil → same status/pointers, not REJECT
AGREED-EXPIRE-001        accepted A expires, no replacement → STABLE, pointers stay A
AGREED-EXPIRE-NEW-001    A accepted, A expires, B proposed → agreed=A, active=B, B acceptable
PRICE-UNIT-001           2 kg × 15 stored as unit price; no linePrice field
PRICE-UNIT-002           2 kg × 15 vs 1 kg × 30 distinguishable; derived totals equal only after I-042
PRICE-OFFER-001          price 15 → 12 is a new immutable Offer
PACKAGE-001              1 package @ 60 representable as a unit (CONFIRMED)
PACKAGE-002              catalog qty 5 → 20: same unit price ok; different unit price AMBIGUOUS
PACKAGE-003              MODEL GAP: current identity cannot represent distinct package bases
PACKAGE-004              package contents / conversion absent — OPEN (OQ-002)
ALT-PRICE-001            primary cheaper than alternative — representation only
ALT-PRICE-002            FIRST_AVAILABLE / PRIMARY_ONLY are not BEST_PRICE; policy OPEN (OQ-008)
PRICE-SNAPSHOT-001       agreed / current / alternative visible together
```

## 46. Newly discovered rule: CatalogLine identity must propagate through the model

pr_11 showed it is not enough to define `CatalogLine = sellerId + productId + unit` only for catalog
lookup. This identity must be used consistently through:

```
Catalog → Resolution → Purchase → SellerPurchase → Offer → Stock → Emulator → Assistant
```

Otherwise different layers get different representations of the same commercial line. **CONFIRMED**

## 47. Newly discovered rule: no silent collapsing

If two objects differ in a field that is part of their domain identity, they must not be silently
merged. In particular `product + kg` and `product + pcs` cannot be reduced to one position.
Similarly, a second ListItem must not be silently dropped merely because `productId` matches, until a
corresponding aggregation policy is defined. **CONFIRMED**

## 48. Open Questions

These SPEC OQs are the canonical domain-level questions. They are **not** the same numbering as
the experiment log in `docs/basket/BASKET_OPEN_QUESTIONS.md` (OQ-001…OQ-028).

- **OQ-001 — Price semantics.** **CLOSED** in v0.4. See §13: `price` is the price of one `unit`.
  A derived line total is `quantity * price` and is not stored.
- **OQ-002 — Package / volume pricing business semantics.** **OPEN.** Stage-1 records a
  representation constraint (see §13.1 / I-045): catalog `quantity` is not a multiplier or unit
  conversion. Whether the domain should later support volume pricing or package contents is
  undecided. PACKAGE-002 / PACKAGE-003 / PACKAGE-004 are evidence of the current limitation, not a policy.
- **OQ-003 — Duplicate ListItems.** What to do with `Tomatoes / 2 kg` and `Tomatoes / 5 kg` in one
  List? **OPEN**
- **OQ-004 — Expired agreed Offer.** **CLOSED** in v0.3 (maps to experiment OQ-009). See §38:
  pointers stay; A remains the baseline; STABLE is not exited; validity still forbids accept/counter
  of the standing proposal.
- **Experiment OQ-011 — Silence facts.** **CLOSED** in v0.3 for Stage-1 silence semantics. See §39:
  silence is not an entity. Stage-1 tests record `waitingSince` + `lastSellerActivity` + clock as
  observation facts. Not a proof of sufficiency for all future waiting policies.
- **Experiment OQ-012 — Passage of time.** **CLOSED** in v0.3 for how time is represented. See §40:
  `SELLER_UNRESPONSIVE` / auto-`EXPIRED` are not domain states; `advance` is the time operation.
  Negotiation lifetime / timeout policy remains **OPEN — SPEC OQ-005**.
- **OQ-005 — Negotiation lifetime.** Is a separate TTL for the whole SellerPurchase negotiation
  needed? **OPEN** (maps to experiment OQ-010)
- **OQ-006 — Allocation.** At which stage does allocation/reservation become necessary? **OPEN**
  (maps to experiment OQ-016)
- **OQ-007 — Partial fulfillment lifecycle.** Where will `agreedQuantity` / `fulfilledQuantity` live
  beyond Stage 1? **OPEN**
- **OQ-008 — Alternative price policy.** If primary is unavailable and the alternative is much more
  expensive than the reference price: `AUTO_ACCEPT` or `ASK_BUYER`? **OPEN** (maps to experiment
  OQ-002)

## 49. Evolution Log

| Version | Source | Change |
| --- | --- | --- |
| v0.1 | Initial model + experiment | base model List → Purchase → SellerPurchase → Offer |
| v0.1 | experiment | Offer immutable |
| v0.1 | experiment | Alternatives separated from Substitution |
| v0.1 | experiment | requested/agreed/fulfilled separated |
| v0.1 | experiment | STABLE ≠ guaranteed availability |
| v0.1 | PR series | Advice as executable command |
| v0.1 | PR series | AdviceBasis / stale protection |
| v0.2 | pr_11 | CatalogLine identity finalized as seller + product + unit |
| v0.2 | pr_11 | SellerPurchaseItem must distinguish product + unit |
| v0.2 | pr_11 | stock/emulator matching must use unit |
| v0.2 | pr_11 | silent collapsing by productId forbidden |
| v0.2 | pr_11 | duplicate ListItem behavior moved to OPEN (SPEC OQ-003); experiment surfaces `DUPLICATE_LINE` |
| v0.2 | pr_11 | package-quantity unit-price assumption recorded as OPEN (SPEC OQ-002), not as proven truth |
| v0.2 | pr_11 | determinism verified by full observable snapshot |
| v0.3 | TZ-BASKET-005 | `validUntil` is standing-proposal validity only; agreed Offer expiry does not clear pointers or exit STABLE (SPEC OQ-004 / exp OQ-009 CLOSED) |
| v0.3 | TZ-BASKET-005 | silence is absence of a command; no auto REJECT/CANCEL/EXPIRED (exp OQ-011 CLOSED) |
| v0.3 | TZ-BASKET-005 | world clock + `advance` are the time model; `tick` is not a domain operation (exp OQ-012 CLOSED) |
| v0.4 | TZ-BASKET-006 | `price` is the price of one `unit`; no stored `linePrice` (SPEC OQ-001 CLOSED) |
| v0.4 | TZ-BASKET-006 | catalog `quantity` is Stage-1 reference size only (I-045); SPEC OQ-002 remains OPEN for package/volume business semantics |

## 50. Rule for the next PR

Before starting the next PR the developer (human or AI) must:

1. read the current `GREENMARKET_DOMAIN_SPEC`;
2. identify the affected invariants;
3. use the existing domain matchers;
4. not introduce their own identity/matching semantics;
5. when a new domain rule is discovered, stop to record it first;
6. add an executable scenario;
7. only then implement the change.

If a PR surfaces new knowledge:

```
Observation → Domain decision → SPEC update → Invariant → Scenario → Implementation → Regression test
```

## 51. Current main technical conclusion

After v0.4, price is split cleanly from package size, and Offer time from v0.3 remains:

```
price          → price of one unit (derived total = quantity × price; not stored)
catalog qty    → Stage-1 reference size (volume/package-contents business semantics OPEN)
validUntil     → may this ACTIVE standing proposal be accepted / countered?
Acceptance     → historical fact; becomes agreedOfferId
advance(clock) → recomputes isOfferValid; does not invent states
silence        → no command ⇒ no lifecycle change
```

```
OQ-009 CLOSED    agreed Offer expiry keeps pointers and STABLE
OQ-011 CLOSED    Stage-1 silence: no command ⇒ no lifecycle change
OQ-012 CLOSED    passage of time: no SELLER_UNRESPONSIVE / auto-EXPIRED

OQ-001 CLOSED    price = price of one unit
OQ-002 OPEN      package/volume business semantics (Stage-1: catalog qty is not a multiplier)
OQ-005 OPEN      negotiation lifetime / TTL
OQ-003 OPEN      duplicate ListItems
OQ-008 OPEN      alternative price policy (not a representation question)
```

CatalogLine identity from v0.2 remains:

```
CatalogLine
    │ identity
    ▼
sellerId + productId + unit
    ├── Resolution
    ├── Purchase creation
    ├── SellerPurchase
    ├── Stock
    ├── Stock conflict
    ├── Seller Emulator
    ├── Buyer/Seller Assistant
    └── Offer comparison
```

The remaining CatalogLine-level open question:

```
productId + unit → PurchaseItem → quantity
```

i.e. what to do with several ListItems of the same product and same unit but different quantities.
This must not be resolved silently in code; it should be closed by the next experiment and then
recorded in the next version of the specification.
