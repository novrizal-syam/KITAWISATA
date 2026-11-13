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

**Build (implemented in `src/domain/approval.ts`; my reading, please confirm):**
- The chain follows `User.managerId` upward and ends at the first user with grade Director, inclusive. Example: Rina → Budi Santoso (Sales Manager) → Andi Kurniawan (Managing Director).
- Nobody approves their own request. A Director has no superior, so a Director's request goes to the Finance budget check (the prototype already does this for SPPD 042).
- The existing rule that Finance checks requests above Rp 10,000,000 stays, after the chain.
- A rejection at any step ends the request.
- A finance admin never checks their own request. If they are the only finance admin, the Director's approval at the end of their chain is final.

**Prototype:** not changed. It still shows a single manager step.

## 3. Demo data dates shift relative to today
**Decision:** demo dates move with the current date. They are not fixed calendar dates.

**Build (implemented in `prisma/seed.ts`):** the seed takes an anchor date (today in Jakarta, or `DEMO_ANCHOR=YYYY-MM-DD`) and shifts every date by the same amount. Business data treats the prototype's 10 October 2026 as "today"; Open Trip departures are already days from today. SPPD numbers use the Roman month of the shifted approval date, so `046/SPPD/NTI/X/2026` can become `046/SPPD/NTI/XI/2026`. Invoices arrive in a later phase and will follow the same rule.
**Prototype:** not changed. It is pinned to 10 October 2026.

## 4. Each Open Trip sets its own terms and cancellation fees
**Decision:** every Open Trip needs its own terms and conditions, including penalties and cancellation fees.

**Build:** an Open Trip has its own terms text plus a cancellation schedule: a list of tiers, each "cancelled at least N days before departure → fee X% of the trip price" (optionally a fixed minimum in Rupiah). Ops edits these per trip, and a booking keeps a copy of the terms in force when it was made, so later edits don't change existing bookings. The 30% down payment stays as it is. The refund is what was paid minus the fee for the tier the cancellation date falls in.
**Implemented:** `OpenTrip.terms`, `CancellationTier`, `OpenTripBooking.termsSnapshot`, and `src/domain/cancellation.ts` (the fee is charged on the booking total; the refund is what was paid minus the fee, never below zero; tiers must not get cheaper closer to departure).
**Open question:** should KITA WISATA offer a default schedule that new trips start from? If so, what are the default tiers? The demo trips use a placeholder schedule (30+ days: 10%, 14+ days: 50%, 7+ days: 75%, later: 100%) and placeholder terms text.

## 5. Booking in parts (kickoff gap)
The prototype books every selected item at once and then closes the trip, so an item left out can never be booked.
**Build:** an employee can book some items now and the rest later. The SPPD becomes Booked once every requested
item has a booking. The budget check always counts what is already booked and reserves the daily allowance
(paid with salary). Flight and train options are the prototype's sample carriers and times until a supplier is connected.

## Not yet decided
- The extra data models proposed in the kickoff. Phase 2 includes `PolicyException`, which SPPD 044's approved hotel exception needs. `WebhookEvent` and the payment models wait for the payments phase.
- The colour tokens and font taken from the prototype. The portal uses them now (`src/app/globals.css`); changing them is a one-file edit.
- Interface language: the portal and login are in English, like the prototypes. Say if they should be in Indonesian.
