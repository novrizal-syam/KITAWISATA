# Inventory suppliers

Flights, trains and stays on the consumer site come from a **supplier**. Today every kind is served by
the **sample catalogue** (`src/server/suppliers/sample.ts`): sample prices, and fulfilment by ops on
**Tickets & stays**. The search pages say so.

## The contract (`src/server/suppliers/types.ts`)

| Method | When it runs | Must |
|---|---|---|
| `search(search)` | Results page | Return offers with whole-Rupiah totals, taxes and fees included |
| `reprice(search, offerId)` | Checkout page and booking | Confirm current price and availability; `null` if gone. The booking is created at this price. |
| `issue(booking)` *(optional)* | After payment | Issue the ticket or voucher and return the supplier reference. Without it, ops issues by hand. |

Pick the supplier per kind with `SUPPLIER_FLIGHT`, `SUPPLIER_TRAIN` and `SUPPLIER_STAY` (supplier ids). The default is `sample`.

## Adding a real supplier

1. **Agreement and test access.** A sandbox account and API keys, and the supplier's hosts allowed on the server's network.
2. **Adapter.** `src/server/suppliers/<id>.ts` implementing `Supplier`, registered in `src/server/suppliers/index.ts`.
   - Map the supplier's places (IATA codes, station codes, hotel city ids) to ours in `src/domain/tickets.ts`.
   - Keep the supplier's own offer id inside our `offer.id`, so `reprice` can find it again.
3. **Keys.** Store them like the payment gateway keys: encrypted, entered on a settings page, never sent to the browser.
4. **Issuing.** If the supplier can issue, implement `issue()` and call it from Tickets & stays once a booking is paid. Keep the manual path for failures.
5. **Tests.**
   - Unit tests with a stubbed `fetch`, like `src/server/__tests__/gateways.test.ts`.
   - An end-to-end run against the supplier's sandbox.

## Suppliers to choose from (to decide)

- **Flights:** an airline content aggregator or a GDS, such as an NDC/GDS provider, or a local B2B travel API.
- **Trains:** KAI tickets through an authorised reseller's B2B API.
- **Stays:** a hotel wholesaler or bed bank, or an OTA affiliate API.

kitawisata decides which, based on contracts, commission and coverage.
