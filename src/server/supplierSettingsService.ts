import "server-only";
import { z } from "zod";
import { db } from "@/lib/db";
import { AppError } from "@/lib/errors";
import { addDays, toIsoDate, todayInJakarta } from "@/domain/dates";
import type { TicketKind } from "@/domain/tickets";
import { seal } from "./secretBox";
import { platformSettings } from "./billingService";
import { SUPPLIER_FIELD, connectionSupplier } from "./suppliers";
import { SupplierUnavailable } from "./suppliers/http";
import type { TicketSearch } from "./ticketService";

export class SupplierSettingsError extends AppError {}

async function requireOps(userId: string) {
  const u = await db.user.findUnique({ where: { id: userId } });
  if (u?.role !== "OPS") throw new SupplierSettingsError("err.opsOnly");
  return u;
}

/** Connections as the page sees them: never the API key, only its hint. */
export async function supplierOverview() {
  const [settings, conns] = await Promise.all([platformSettings(), db.supplierConnection.findMany({ orderBy: { name: "asc" } })]);
  return {
    assignment: { FLIGHT: settings.flightSupplierId, TRAIN: settings.trainSupplierId, STAY: settings.staySupplierId } as Record<TicketKind, string | null>,
    connections: conns.map(({ apiKeyEnc: _secret, ...c }) => ({ ...c, hasKey: Boolean(_secret) })),
  };
}

// HTTPS is required; plain HTTP is accepted only for localhost (development and tests).
const baseUrl = z.string().trim().url("v.url").max(300).refine((u) => /^https:\/\//.test(u) || /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?(\/|$)/.test(u), "v.https");
export const connectionInput = z.object({
  id: z.string().optional().transform((v) => v || undefined),
  name: z.string().trim().min(2, "v.supplierName").max(80, "v.invalid"),
  baseUrl,
  apiKey: z.string().trim().max(500).optional().transform((v) => v || undefined),
  clearKey: z.boolean().default(false),
  kinds: z.array(z.enum(["FLIGHT", "TRAIN", "STAY"])).min(1, "v.kinds"),
  canIssue: z.boolean(),
});

export async function saveConnection(opsUserId: string, input: z.infer<typeof connectionInput>) {
  const ops = await requireOps(opsUserId);
  const key = input.clearKey ? { apiKeyEnc: null, apiKeyHint: null } : input.apiKey ? { apiKeyEnc: seal(input.apiKey), apiKeyHint: "••••" + input.apiKey.slice(-4) } : {};
  const data = { name: input.name, baseUrl: input.baseUrl, kinds: input.kinds, canIssue: input.canIssue, updatedBy: ops.name ?? ops.phone, lastTestAt: null, lastTestOk: null, lastTestMessage: null, ...key };
  if (!input.id) return db.supplierConnection.create({ data });
  const settings = await platformSettings();
  // A kind this connection is assigned to can't be dropped from it.
  for (const k of ["FLIGHT", "TRAIN", "STAY"] as const) {
    if (settings[SUPPLIER_FIELD[k]] === input.id && !input.kinds.includes(k)) throw new SupplierSettingsError("err.supplierInUse");
  }
  return db.supplierConnection.update({ where: { id: input.id }, data });
}

export async function deleteConnection(opsUserId: string, id: string) {
  await requireOps(opsUserId);
  const s = await platformSettings();
  if (Object.values(SUPPLIER_FIELD).some((f) => s[f] === id)) throw new SupplierSettingsError("err.supplierInUse");
  await db.supplierConnection.delete({ where: { id } });
}

/** Choose who serves each kind: null for the sample catalogue, or a connection that serves that kind. */
export async function assignSuppliers(opsUserId: string, choice: Record<TicketKind, string | null>) {
  const ops = await requireOps(opsUserId);
  const conns = await db.supplierConnection.findMany();
  for (const [k, id] of Object.entries(choice) as [TicketKind, string | null][]) {
    if (id && !conns.some((c) => c.id === id && c.kinds.includes(k))) throw new SupplierSettingsError("err.supplierKind");
  }
  await db.platformSetting.update({ where: { id: "default" }, data: { flightSupplierId: choice.FLIGHT, trainSupplierId: choice.TRAIN, staySupplierId: choice.STAY, updatedBy: ops.name ?? ops.phone } });
}

const PROBE: Record<TicketKind, (date: string) => TicketSearch> = {
  FLIGHT: (date) => ({ kind: "FLIGHT", from: "CGK", to: "DPS", date, pax: 1 }),
  TRAIN: (date) => ({ kind: "TRAIN", from: "GMR", to: "YK", date, pax: 1 }),
  STAY: (date) => ({ kind: "STAY", city: "Bali", date, pax: 2, nights: 1 }),
};

/** Run a real sample search against the supplier and check its answer follows the API. */
export async function testConnection(opsUserId: string, id: string) {
  await requireOps(opsUserId);
  const supplier = await connectionSupplier(id);
  if (!supplier) throw new SupplierSettingsError("err.bookingChanged");
  const kind = supplier.kinds[0];
  let result: { ok: boolean; key: "sup.testOk" | "sup.testFail"; params: Record<string, string | number> };
  try {
    const offers = await supplier.search(PROBE[kind](toIsoDate(addDays(todayInJakarta(), 30))));
    result = { ok: true, key: "sup.testOk", params: { n: offers.length, kind } };
  } catch (e) {
    if (!(e instanceof SupplierUnavailable)) throw e;
    result = { ok: false, key: "sup.testFail", params: { reason: e.message } };
  }
  await db.supplierConnection.update({ where: { id }, data: { lastTestAt: new Date(), lastTestOk: result.ok, lastTestMessage: JSON.stringify(result) } });
  return result;
}
