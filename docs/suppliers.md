# Inventory suppliers

Flights, trains and stays on the consumer site come from a **supplier**. Until one is connected, every kind is
served by the **sample catalogue** (`src/server/suppliers/sample.ts`): sample prices, fulfilment by ops on
**Tickets & stays**, and a "sample prices" notice on the search page.

## Connecting a supplier later: Supplier settings

Ops opens **Portal → Supplier settings** (`/portal/suppliers`). No code change or deploy is needed.

1. **Connect a supplier.** Enter:
   - a name;
   - the API address (https only; plain http is accepted for localhost testing);
   - the API key;
   - the kinds it serves (flights, trains, stays);
   - whether it can issue tickets.

   The key is stored encrypted (AES-256-GCM). It's write-only: the page only ever shows its last 4 characters.
2. **Test connection.** Runs a sample search 30 days ahead:
   - flights: CGK → DPS
   - trains: GMR → YK
   - stays: Bali

   It reports how many valid offers came back, or why the test failed.
3. **Choose who serves each kind.** One choice each for flights, trains and stays: the sample catalogue or a connected supplier that serves that kind. Travellers see the change on their next search.
4. **Switch back** at any time by choosing the sample catalogue. A supplier can't be removed while it is chosen, and a kind can't be unticked while that supplier serves it.

Each ticket booking records which supplier it came from. On **Tickets & stays**, a paid booking from a supplier that can issue shows **Issue via {name}**. That button calls the supplier and stores its reference. The manual "issue with a reference" path stays available for failures.

If the supplier is down or answers with bad data:
- the search page says "we can't reach our supplier right now";
- checkout won't book at an unconfirmed price.

## The kitawisata supplier API (what a supplier, or a small bridge in front of it, must implement)

Every call is an HTTPS `POST` to `{API address}/…` with a JSON body and the header `Authorization: Bearer <API key>`. Rules:

- **Timeout:** 15 seconds.
- **Amounts:** whole Rupiah, taxes and fees included.
- **Unknown fields** are ignored.
- **A malformed answer** makes the whole response count as "unavailable", so nothing half-valid is ever shown.

### `POST /search`
```json
{ "kind": "FLIGHT", "search": { "kind": "FLIGHT", "from": "CGK", "to": "DPS", "date": "2026-12-07", "pax": 2 } }
```
- **Trains:** the same shape, with station codes such as `GMR` and `YK`.
- **Stays:** the search is `{ "kind": "STAY", "city": "Bali", "date": "2026-12-07", "pax": 2, "nights": 2 }`. Here `date` is check-in and `pax` is guests.

Answer for a flight or train (`kind` must match the request):
```json
{ "offers": [ { "id": "ca1-CGK-DPS-2026-12-07", "kind": "FLIGHT", "carrier": "Contoh Air",
  "depart": "06.00", "arrive": "08.50", "duration": "1h 50m", "baggageKg": 20,
  "farePerPax": 1390000, "total": 2780000 } ] }
```
- **Trains:** use `"kind": "TRAIN"`. `carrier` holds the train name and class, and `baggageKg` may be `null`.

Answer for a stay:
```json
{ "offers": [ { "id": "h-123", "name": "Hotel Contoh Seminyak", "stars": 4,
  "ratePerNight": 950000, "rooms": 1, "nights": 2, "total": 1900000,
  "description": "Pool, breakfast", "imageUrl": "https://…" } ] }
```
- **Optional fields:** `description` (up to 200 characters) and `imageUrl` (an absolute URL).

### `POST /reprice`
```json
{ "kind": "FLIGHT", "search": { … }, "offerId": "ca1-CGK-DPS-2026-12-07" }
```
- **Answer:** `{ "offer": { …same shape… } }` with the current price, or `{ "offer": null }` if it's gone.
- **When it runs:** on the checkout page and again when the booking is created.
- **Price:** the booking uses this price.
- **The id must not change:** an offer with a different `id` counts as gone.

Keep the supplier's own offer reference inside `id` so it can be found again.

### `POST /issue` (only if "can issue" is ticked)
```json
{ "booking": { "code": "KT-AB12CD", "kind": "FLIGHT", "search": { … }, "offer": { … },
  "contactName": "…", "contactPhone": "…", "travellerNames": ["…"] } }
```
- **Answer:** `{ "ref": "PNR123" }`.
- **When it runs:** only after the booking is paid in full.

### Errors
- Any non-2xx status, a timeout or an invalid body counts as "unavailable".
- Return `401` for a wrong key.

## Code map

| File | Role |
|---|---|
| `src/server/suppliers/types.ts` | The `Supplier` interface: `search`, `reprice`, optional `issue` |
| `src/server/suppliers/http.ts` | The HTTP adapter for the API above, with schema validation |
| `src/server/suppliers/index.ts` | Picks the supplier per kind from Platform settings, falling back to the sample |
| `src/server/supplierSettingsService.ts` | Connect, test, choose and remove |
| `e2e/mock-supplier.js`, `e2e/suppliers.e2e.js` | Local stand-in and end-to-end test |

A supplier whose API doesn't follow this contract needs either:
- a small bridge service that translates to it, or
- its own adapter implementing `Supplier`, registered in `index.ts`.

## Suppliers to choose from (to decide)

- **Flights:** an airline content aggregator or GDS (NDC/GDS provider), or a local B2B travel API.
- **Trains:** KAI tickets through an authorised reseller's B2B API.
- **Stays:** a hotel wholesaler or bed bank, or an OTA affiliate API.

kitawisata decides which, based on contracts, commission and coverage. Each one also needs its API host allowed on the server's outbound network.
