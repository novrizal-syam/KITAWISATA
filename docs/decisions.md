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

## 2. Approval rules are a company setting
**Decision (2026-11-13):** the first answer was "their superior until director". Then: "make the setting for approval".

**Build:** Finance sets the rules on **Settings → Approval rules** (`/portal/settings/approvals`), stored on the company:
- **Who approves** (`approvalMode`):
  - Direct superior only.
  - Every superior up to the Director (default).
  - Direct superior, and up to the Director when the budget is above an amount (`fullChainOver`, default Rp 5,000,000).
- **Finance budget check** above an amount (`financeReviewOver`, default Rp 10,000,000).

Rules that hold in every mode (`src/domain/approval.ts`):
- Nobody approves their own request. A Director's own request goes to the Finance budget check.
- A finance admin never checks their own request. If they are the only finance admin, the last superior's approval is final.
- A rejection at any step ends the request.
- Changes apply to requests submitted afterwards; requests already waiting keep their approvers. The page shows who changed the rules last and when.

**Prototype:** not changed. It still shows a single manager step.

## 3. Demo data dates shift relative to today
**Decision:** demo dates move with the current date. They are not fixed calendar dates.

**Build (implemented in `prisma/seed.ts`):** the seed takes an anchor date (today in Jakarta, or `DEMO_ANCHOR=YYYY-MM-DD`) and shifts every date by the same amount. Business data treats the prototype's 10 October 2026 as "today"; Open Trip departures are already days from today. SPPD numbers use the Roman month of the shifted approval date, so `046/SPPD/NTI/X/2026` can become `046/SPPD/NTI/XI/2026`. Invoices arrive in a later phase and will follow the same rule.
**Prototype:** not changed. It is pinned to 10 October 2026.

## 4. Each Open Trip defines its own terms and cancellation fees when it is created
**Decision (2026-11-13):** every Open Trip has its own terms and penalties. Then: the cancellation fees are defined when the trip is first made, in the Open Trip section.

**Build:**
- **Where:** kitawisata ops creates and edits trips at **Open Trips** (`/portal/open-trips`).
- **What the form needs:** the trip details, the terms text, and at least one cancellation tier ("at least N days before departure → X% of the booking total, optional minimum fee in Rupiah"). Cancelling later than the last tier costs 100%.
- **Validation:** tiers can't get cheaper closer to departure, and the form shows a worked example of fee and refund for each tier.
- **Existing bookings:** a booking keeps a snapshot of the terms and tiers in force when it was made (`OpenTripBooking.termsSnapshot`), so later edits don't change it. A departure that has bookings can't be removed; close it instead.
- **Fee rules** (`src/domain/cancellation.ts`): the fee is charged on the booking total; the refund is what was paid minus the fee, never below zero.
- **Demo trips:** these use placeholder tiers (30+ days: 10%, 14+ days: 50%, 7+ days: 75%) and placeholder terms until ops replaces them with each trip's real terms.

## 5. Booking in parts (kickoff gap)
The prototype books every selected item at once and then closes the trip, so an item left out can never be booked.
**Build:** an employee can book some items now and the rest later. The SPPD becomes Booked once every requested
item has a booking. The budget check always counts what is already booked and reserves the daily allowance
(paid with salary). Flight and train options are the prototype's sample carriers and times until a supplier is connected.

## 6. Brand colours and font come from the logo
**Decision (2026-11-13):** "for color and font use the kita wisata logo theme".

**Build (`src/app/globals.css`):**
- **Brand colour:** the logo's single colour, red `#C82024`, used for buttons, links, highlights and the keyboard focus ring. The darker shade `#9F1A1D` is for hover and the light tint `#FBE9E9` for highlights.
- **Font:** Open Sans, the closest open-licence match to the wordmark, self-hosted (OFL-1.1) from `@fontsource-variable/open-sans`.
- **Unchanged:** the neutral greys and the green, amber and blue status colours stay from the prototype because they carry meaning (approved, waiting, info).
- **Removed:** the prototype's gold accent, which isn't in the logo.

## Not yet decided
- The extra data models proposed in the kickoff. Phase 2 includes `PolicyException`, which SPPD 044's approved hotel exception needs. `WebhookEvent` and the payment models wait for the payments phase.
- Interface language: the portal and login are in English, like the prototypes. Say if they should be in Indonesian.
