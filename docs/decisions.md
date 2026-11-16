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

## 7. The app is bilingual (Indonesian and English)
**Decision (2026-11-13):** "make it bilingual".

**Build (`src/i18n`):**
- **Dictionaries:** two dictionaries, `en.ts` and `id.ts`. TypeScript and a unit test check that both have the same keys and placeholders.
- **Language choice:** the **ID | EN** switch in the header and on the login page sets a cookie. Without a choice, the browser's language decides, and Indonesian is the default unless English is preferred over it.
- **Errors:** services and validation raise dictionary keys, not sentences, so error messages appear in the viewer's language.
- **Formatting:** dates follow the language ("18 Nov 2026" in both, with Indonesian month names where they differ). Rupiah always uses Indonesian grouping (`Rp 1.250.000`).
- **What isn't translated:** text people type (trip purpose, job titles, Open Trip descriptions) stays as written. Stored booking descriptions are kept in English so records read the same for everyone.

## 8. Ops enter the real Open Trip fees
**Decision (2026-11-13):** ops enters each trip's real terms and cancellation fees in the Open Trip form.

**Build:** each seeded demo trip carries a **"Placeholder fees, review"** badge on the Open Trips list until ops saves it through the form (`OpenTrip.feesReviewed`). Re-running the seed resets the demo trips to placeholders.

## 9. Monthly invoicing, with PPN as a setting
**Decision (2026-11-14):** invoicing as in the prototype; the PPN rate is a setting ("make it in setting").

**Build:**
- **Invoice amount** (`src/domain/invoice.ts`): travel bookings at cost, plus a service fee per booking, plus PPN on the service fee only.
- **Settings:** kitawisata ops sets them on **Billing settings** (`/portal/billing/settings`):
  - the effective PPN rate, stored in basis points (default 11%, as in the prototype)
  - each company's service fee per booking (default Rp 25,000) and payment terms (default 30 days)

  An issued invoice keeps the rate and fee it was made with.
- **Generating:** ops bills a company on **Billing** (`/portal/billing`) with "Generate invoice now". It bills every uninvoiced booking for the current month.
  - **Numbers:** `INV/KW/<year>/<month>/<seq>`, with the sequence shared by all companies.
  - **Double billing:** bookings are claimed only if they're still uninvoiced, so two runs can't bill the same booking.
  - **Automatic run:** generating on the 1st of each month isn't switched on yet.
- **Payment:** ops records a payment received (who and when). A virtual-account integration will replace this; the prototype's simulated "Pay by VA" button was left out.
- **Finance:**
  - **Spending report** (`/portal/finance/report`): month by month, with CSV export for Excel. It includes everything booked in the month (Jakarta time) and the previous three invoiced months.
  - **Invoice list:** each invoice opens as a document grouped by cost centre.
- **Demo data:** the prototype's three archived invoices are seeded as the three months before the current one.

**To confirm:** the correct effective PPN rate with your tax adviser. Ops can change it at any time.

## 10. Booking Open Trips on the consumer site
**Build:**
- **Pages:** home with trips on sale (`/`), trip page with departures, people, fees and terms (`/trips/[id]`), checkout (`/trips/[id]/book`, sign-in required), and **My Trips** (`/my-trips`).
- **Checkout:** contact details, traveller names, the payment plan, and agreement to the trip's own cancellation fees and terms. The booking stores a snapshot of those terms.
- **Seats:** taken atomically, so a departure can't be overbooked, and returned when a booking is cancelled or its hold lapses.
- **Payment plan:** 30/35/35, or 30/70 within 30 days, or in full. Splitting isn't offered within 14 days of departure.

**Payments:**
- No payment gateway is connected yet, and nothing pretends to take a payment. The traveller sees the amount, due date and booking code to quote on a bank transfer.
- kitawisata ops records each payment on **Trip bookings** (`/portal/trip-bookings`). The first payment confirms the booking; the last makes it fully paid.
- **Seat hold (confirmed 2026-11-16):** an unpaid hold keeps its seats for a time ops sets in Billing settings. The default is **24 hours**, because payments are confirmed by hand. The prototype's 30 minutes only works once a gateway confirms automatically.

**Cancellation:**
- The fee comes from the booking's own terms snapshot, as a share of the total.
- **Confirmed 2026-11-16:** kitawisata keeps the fee but **never more than was paid, and charges nothing more**. For example, a 50% fee with only the 30% down payment paid means no refund and no further charge.
- An unpaid hold cancels free.
- A refund owed is tracked until ops marks it sent.

**Also fixed:** React 19 cleared typed form fields whenever the server returned an error, for example contact and traveller names. All forms where people type now keep their values (`src/lib/use-action-form.ts`).

## 11. Payment gateway connection is a setting
**Decision (2026-11-16):** "make these connection later on setting for payment gateway".

**Build:** ops configures payments on **Payment settings** (`/portal/payments`):
- **Provider:** bank transfer (default), Midtrans or Xendit, with a sandbox/production mode.
- **Bank transfer details** (bank, account number, holder): once set, they appear in travellers' "how to pay" and on company invoices.
- **Gateway keys:** write-only. They're encrypted before saving with AES-256-GCM (`src/server/secretBox.ts`), keyed from `PAYMENT_SECRETS_KEY` or else `AUTH_SECRET`. They're never sent back to the browser; only "••••last4" hints are. A blank field keeps the saved key.
- **Test connection:** a read-only call. For Midtrans, a status lookup of an unknown order; for Xendit, `/balance`. It also flags a key that belongs to the other mode.

**Not built yet:** taking payments through the gateway, meaning checkout redirect or Snap, payment notifications (webhooks) and automatic confirmation. It needs a sandbox account and network access to the provider. Once it's in, the seat hold can drop to about 30 minutes. Until then, customers pay by bank transfer and ops records payments.

## 12. Flights, trains and stays on the consumer site
**Build:**
- **Search and results** (`/travel/flights`, `/travel/trains`, `/travel/stays`), then checkout (sign-in required), then **My Trips**, which lists tickets alongside Open Trips.
- **Inventory:** no airline, rail or hotel supplier is connected, so offers come from a deterministic **sample catalogue** ported from the prototype (`src/domain/tickets.ts`), with placeholder carriers such as "[Airline A]". The pages say so.
- **Pricing:** the server re-prices the chosen offer from the search plus the offer id; the browser never sends a price.
- **Payment:** paid in full by bank transfer (gateway next), due before the hold time in Billing settings. Unpaid bookings lapse, and travellers can cancel free before paying.
- **Fulfilment by ops** (**Tickets & stays**, `/portal/ticket-bookings`): record the payment, then issue with the ticket/PNR or voucher reference, which the traveller sees. If it can't be issued, ops cancels it and a **full refund** is owed, as the prototype promised, then marks the refund sent.

**Next:** take payments through the gateway, then connect real suppliers.

## 13. Online payment through Midtrans and Xendit
**Decision (2026-11-16):** build both ("both and continue").

**Build:** when Payment settings has a gateway chosen and its keys saved, travellers see **Pay now** on Open Trip instalments and tickets. Bank transfer stays available as the fallback.
- **Midtrans:** a Snap transaction (`/snap/v1/transactions`), with the expiry set to the remaining seat hold. HTTP notifications go to `/api/payments/midtrans/notify` and are verified with `SHA512(order_id + status_code + gross_amount + server_key)`.
- **Xendit:** an invoice (`/v2/invoices`, IDR). Callbacks go to `/api/payments/xendit/callback` and are verified with the `x-callback-token`.
- **Never trust a notification:** after verifying it, the app re-reads the status from the provider (Midtrans `/v2/{order}/status`, Xendit `/v2/invoices/{id}`) before recording anything. The return page `/pay/return` does the same, in case the customer comes back before the notification arrives.
- **Exactly once:** each attempt is claimed once, so replayed notifications change nothing. The amount must match. The payment is recorded on that instalment or ticket "by Midtrans/Xendit".
- **Late or mismatched money** (for example a hold that lapsed while the customer paid) is marked **PAID_UNAPPLIED**. It's never silently applied; it's listed on Payment settings for ops to refund or apply by hand, then mark resolved.
- **Webhook URLs:** Payment settings shows them. Set `APP_URL` to the public site address.

**Verified:** unit tests for signatures, tokens, status mapping and request shapes. An end-to-end test against a local stand-in covers both providers, replays, forged notifications, wrong tokens, late payments and expiry (`e2e/`).

**Still to check against the real sandboxes** (needs keys and network access to the provider hosts):
1. Paste the webhook URL into the provider dashboard.
2. Pay a test booking with each provider's simulator.
3. Confirm the notification arrives and the booking updates.
4. Confirm the return redirect works.

Then lower the seat hold to about 30 minutes in Billing settings.

## Not yet decided
- The extra data models proposed in the kickoff. Phase 2 includes `PolicyException`, which SPPD 044's approved hotel exception needs. `WebhookEvent` and the payment models wait for the payments phase.
