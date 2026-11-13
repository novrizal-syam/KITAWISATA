# Kickoff decisions

Decisions on the open questions from the prototype review. Each one says what the build will do.

## 1. Demo SPPD budgets follow the estimate formula
**Decision (2026-11-13):** change the demo data to fit the budget formula. Don't change the formula.

**Why:** every seeded SPPD's `est` was hand-typed and disagreed with `estimate()`. For 046 (Rina Putri, Surabaya, 3 days, flight + hotel + car) the seeded figure was Rp 5,250,000. The formula gives Rp 6,676,000, and the cheapest bookable options plus allowance already cost Rp 5,950,000, so the trip could never be booked.

**Build:** seed data never stores a hand-typed budget. It runs the same estimate function the app uses.
**Prototype:** `prototype/business/index.html` now recomputes `est` for every seeded SPPD (046 now leaves Rp 726,000 after the cheapest booking). The localStorage key moved to `kwb_state_v2`, so old browser state is dropped.

| SPPD | Seeded | Formula |
|---|---:|---:|
| 041 Dimas | 3,830,000 | 5,026,000 |
| 042 Andi | 19,100,000 | 20,920,000 |
| 043 Ayu | 8,450,000 | 9,120,000 |
| 044 Fajar | 1,950,000 | 2,100,000 |
| 045 Budi | 8,600,000 | 8,656,000 |
| 046 Rina | 5,250,000 | 6,676,000 |
| (draft) Dimas | 6,950,000 | 7,516,000 |

## 2. Approval goes up the reporting line to the Director
**Decision:** a request is approved by the requester's superior, then that person's superior, and so on until the Director.

**Build (proposed reading, please confirm):**
- The chain follows `User.managerId` upward and ends at the first user with grade Director, inclusive. Example: Rina → Budi Santoso (Sales Manager) → Andi Kurniawan (Managing Director).
- Nobody approves their own request. A Director has no superior, so a Director's request goes to the Finance budget check (the prototype already does this for SPPD 042).
- The existing rule that Finance checks requests above Rp 10,000,000 stays, after the chain.
- A rejection at any step ends the request.

**Prototype:** not changed. It still shows a single manager step.

## 3. Demo data dates shift relative to today
**Decision:** demo dates move with the current date. They are not fixed calendar dates.

**Build:** the seed takes an anchor date (default: today) and writes every date as an offset from it, so trips, approvals and invoice periods always look current. SPPD numbers (`046/SPPD/NTI/X/2026`) and invoice periods are derived from the shifted dates.
**Prototype:** not changed. It is pinned to 10 October 2026.

## 4. Each Open Trip sets its own terms and cancellation fees
**Decision:** every Open Trip needs its own terms and conditions, including penalties and cancellation fees.

**Build:** an Open Trip has its own terms text plus a cancellation schedule: a list of tiers, each "cancelled at least N days before departure → fee X% of the trip price" (optionally a fixed minimum in Rupiah). Ops edits these per trip, and a booking keeps a copy of the terms in force when it was made, so later edits don't change existing bookings. The 30% down payment stays as it is. The refund is what was paid minus the fee for the tier the cancellation date falls in.
**Open question:** should KITA WISATA offer a default schedule that new trips start from? If so, what are the default tiers?

## Not yet decided
- The extra data models proposed in the kickoff (PolicyException, WebhookEvent, and the rest).
- The colour tokens taken from the prototype.
