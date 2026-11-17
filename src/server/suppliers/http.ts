// Adapter for suppliers that implement the kitawisata supplier API (docs/suppliers.md):
// POST {base}/search, POST {base}/reprice, POST {base}/issue, JSON, "Authorization: Bearer <key>".
// Every response is validated; anything malformed is treated as the supplier being unavailable.
import { z } from "zod";
import type { TicketKind } from "@/domain/tickets";
import type { Offer, Supplier, SupplierBooking } from "./types";

export class SupplierUnavailable extends Error {}

const rupiah = z.number().int().positive().max(1_000_000_000);
const travelOffer = z.object({
  id: z.string().min(1).max(200), kind: z.enum(["FLIGHT", "TRAIN"]), carrier: z.string().min(1).max(80),
  depart: z.string().max(20), arrive: z.string().max(20), duration: z.string().max(20),
  baggageKg: z.number().int().min(0).max(100).nullable(), farePerPax: rupiah, total: rupiah,
}).strip();
const stayOffer = z.object({
  id: z.string().min(1).max(200), name: z.string().min(1).max(120), stars: z.number().int().min(0).max(5),
  image: z.string().max(40).default("resort"), imageUrl: z.string().url().max(500).optional(), description: z.string().max(200).optional(),
  ratePerNight: rupiah, rooms: z.number().int().min(1).max(10), nights: z.number().int().min(1).max(30), total: rupiah,
}).strip();
const offerFor = (kind: TicketKind) => (kind === "STAY" ? stayOffer : travelOffer.refine((o) => o.kind === kind, "wrong kind"));

export interface HttpSupplierConfig { id: string; name: string; baseUrl: string; apiKey?: string; kinds: TicketKind[]; canIssue: boolean }

export function httpSupplier(c: HttpSupplierConfig, doFetch: typeof fetch = fetch): Supplier {
  const call = async (path: string, body: unknown) => {
    let res: Response;
    try {
      res = await doFetch(`${c.baseUrl.replace(/\/$/, "")}${path}`, {
        method: "POST", headers: { "Content-Type": "application/json", Accept: "application/json", ...(c.apiKey ? { Authorization: `Bearer ${c.apiKey}` } : {}) },
        body: JSON.stringify(body), signal: AbortSignal.timeout(15_000),
      });
    } catch (e) {
      throw new SupplierUnavailable(`${c.name}: ${e instanceof Error ? e.message : String(e)}`);
    }
    if (!res.ok) throw new SupplierUnavailable(`${c.name}: HTTP ${res.status}`);
    return res.json().catch(() => { throw new SupplierUnavailable(`${c.name}: invalid JSON`); });
  };
  const parse = <T>(schema: z.ZodType<T>, data: unknown, what: string): T => {
    const r = schema.safeParse(data);
    if (!r.success) throw new SupplierUnavailable(`${c.name}: bad ${what} (${r.error.issues[0]?.path.join(".")}: ${r.error.issues[0]?.message})`);
    return r.data;
  };
  const supplier: Supplier = {
    id: c.id, name: c.name, kinds: c.kinds,
    async search(s) {
      const body = parse(z.object({ offers: z.array(offerFor(s.kind)).max(50) }), await call("/search", { kind: s.kind, search: s }), "search response");
      return body.offers as Offer[];
    },
    async reprice(s, offerId) {
      const body = parse(z.object({ offer: offerFor(s.kind).nullable() }), await call("/reprice", { kind: s.kind, search: s, offerId }), "reprice response");
      return body.offer && body.offer.id === offerId ? (body.offer as Offer) : null;
    },
  };
  if (c.canIssue) {
    supplier.issue = async (b: SupplierBooking) =>
      parse(z.object({ ref: z.string().min(1).max(60) }), await call("/issue", { booking: b }), "issue response");
  }
  return supplier;
}
