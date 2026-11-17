import "server-only";
import { randomInt } from "node:crypto";
import { z } from "zod";
import { db } from "@/lib/db";
import { AppError } from "@/lib/errors";
import { normalisePhone } from "@/lib/otp";
import { parseDate, todayInJakarta } from "@/domain/dates";
import { bookingCode } from "@/domain/openTripBooking";
import { checkSearch, type SearchError, type StayOffer, type TicketKind, type TravelOffer } from "@/domain/tickets";
import { supplierById, supplierFor } from "./suppliers";
import { SupplierUnavailable } from "./suppliers/http";
import { platformSettings } from "./billingService";

export class TicketError extends AppError {}

export interface TicketSearch { kind: TicketKind; from?: string; to?: string; city?: string; date: string; pax: number; nights?: number }

/** Read a search from query/form values. Returns the search and any problem with it. */
export function readSearch(kind: TicketKind, v: Record<string, string | undefined>, today = todayInJakarta()): { search: TicketSearch; error: SearchError | null } {
  const search: TicketSearch = kind === "STAY"
    ? { kind, city: v.city ?? "", date: v.date ?? "", pax: Number(v.pax ?? 2), nights: Number(v.nights ?? 1) }
    : { kind, from: v.from ?? "", to: v.to ?? "", date: v.date ?? "", pax: Number(v.pax ?? 1) };
  return { search, error: checkSearch(kind, search, today) };
}

/** Offers from the supplier serving this kind (src/server/suppliers). */
export async function offersFor(s: TicketSearch): Promise<(TravelOffer | StayOffer)[]> {
  return (await supplierFor(s.kind)).search(s);
}

/** Offers and who supplied them; `unavailable` when the supplier can't be reached or answered badly. */
export async function searchOffers(s: TicketSearch) {
  const supplier = await supplierFor(s.kind);
  try {
    return { supplier: { id: supplier.id, name: supplier.name }, offers: await supplier.search(s), unavailable: false };
  } catch (e) {
    if (!(e instanceof SupplierUnavailable)) throw e;
    console.error("[supplier] search failed:", e.message);
    return { supplier: { id: supplier.id, name: supplier.name }, offers: [], unavailable: true };
  }
}

/** The supplier's current price and availability for one offer, or null if it's gone. */
export async function repriceOffer(s: TicketSearch, offerId: string) {
  const supplier = await supplierFor(s.kind);
  try {
    return { supplierId: supplier.id, offer: await supplier.reprice(s, offerId) };
  } catch (e) {
    if (!(e instanceof SupplierUnavailable)) throw e;
    console.error("[supplier] reprice failed:", e.message);
    throw new TicketError("err.supplierDown");
  }
}

export const ticketInput = z.object({
  offerId: z.string().min(1, "v.invalid"),
  contactName: z.string().trim().min(2, "v.contactName").max(80, "v.invalid"),
  contactPhone: z.string().trim().min(6, "v.contactPhone"),
  travellerNames: z.array(z.string().trim().min(2, "v.travellerName").max(80, "v.invalid")),
});

export async function createTicketBooking(userId: string, kind: TicketKind, raw: Record<string, string | undefined>, input: z.infer<typeof ticketInput>, now = new Date()) {
  const { search, error } = readSearch(kind, raw, todayInJakarta(now));
  if (error) throw new TicketError(`search.${error}`);
  // A stay needs one name per room's lead guest; flights and trains one per passenger.
  const names = kind === "STAY" ? 1 : search.pax;
  if (input.travellerNames.length !== names) throw new TicketError("err.travellerCount");
  const phone = normalisePhone(input.contactPhone);
  if (!phone) throw new TicketError("login.badPhone");
  const { offer, supplierId } = await repriceOffer(search, input.offerId);
  if (!offer) throw new TicketError("err.optionGone");
  const settings = await platformSettings();
  let code = bookingCode(randomInt).replace("KW-", "KT-");
  while (await db.ticketBooking.findUnique({ where: { code } })) code = bookingCode(randomInt).replace("KW-", "KT-");
  return db.ticketBooking.create({
    data: {
      code, kind, userId, supplierId, search: search as object, offer: offer as object, travelDate: parseDate(search.date), pax: search.pax, total: offer.total,
      contactName: input.contactName, contactPhone: phone, travellerNames: input.travellerNames,
      holdExpiresAt: new Date(now.getTime() + settings.seatHoldMinutes * 60_000),
    },
  });
}

export async function expireTickets(now = new Date()) {
  await db.ticketBooking.updateMany({ where: { status: "AWAITING_PAYMENT", holdExpiresAt: { lt: now } }, data: { status: "EXPIRED" } });
}

export async function myTicketBookings(userId: string) {
  await expireTickets();
  return db.ticketBooking.findMany({ where: { userId }, orderBy: { createdAt: "desc" } });
}

export async function ticketForViewer(code: string, viewer: { id: string; role: string }) {
  await expireTickets();
  const b = await db.ticketBooking.findUnique({ where: { code } });
  return b && (b.userId === viewer.id || viewer.role === "OPS") ? b : null;
}

/** Travellers can cancel before paying; nothing is charged. */
export async function cancelUnpaidTicket(userId: string, code: string) {
  const r = await db.ticketBooking.updateMany({ where: { code, userId, status: "AWAITING_PAYMENT" }, data: { status: "CANCELLED", cancelledAt: new Date(), cancelReason: "traveller" } });
  if (r.count !== 1) throw new TicketError("err.cannotCancel");
}

// ---------- ops ----------

async function requireOps(userId: string) {
  const u = await db.user.findUnique({ where: { id: userId } });
  if (u?.role !== "OPS") throw new TicketError("err.opsOnly");
  return u;
}

export async function allTicketBookings() {
  await expireTickets();
  return db.ticketBooking.findMany({ orderBy: { createdAt: "desc" }, take: 200 });
}

export async function recordTicketPayment(opsUserId: string, id: string) {
  const ops = await requireOps(opsUserId);
  await expireTickets();
  const r = await db.ticketBooking.updateMany({ where: { id, status: "AWAITING_PAYMENT" }, data: { status: "PAID", paidAt: new Date(), paidRecordedBy: ops.name ?? ops.phone } });
  if (r.count !== 1) throw new TicketError("err.cannotRecordPayment");
}

export const issueInput = z.object({ ref: z.string().trim().min(3, "v.issuedRef").max(60, "v.issuedRef") });

export async function issueTicket(opsUserId: string, id: string, ref: string) {
  await requireOps(opsUserId);
  const r = await db.ticketBooking.updateMany({ where: { id, status: "PAID" }, data: { status: "ISSUED", issuedRef: ref, issuedAt: new Date() } });
  if (r.count !== 1) throw new TicketError("err.bookingChanged");
}

/** Ask the supplier that sold the booking to issue it; on success record its reference. */
export async function issueViaSupplier(opsUserId: string, id: string) {
  await requireOps(opsUserId);
  const b = await db.ticketBooking.findUnique({ where: { id } });
  if (!b || b.status !== "PAID") throw new TicketError("err.bookingChanged");
  const supplier = await supplierById(b.supplierId);
  if (!supplier?.issue) throw new TicketError("err.supplierCantIssue");
  let ref: string;
  try {
    ref = (await supplier.issue({ code: b.code, kind: b.kind, search: b.search as unknown as TicketSearch, offer: b.offer as never, contactName: b.contactName, contactPhone: b.contactPhone, travellerNames: b.travellerNames })).ref;
  } catch (e) {
    if (!(e instanceof SupplierUnavailable)) throw e;
    console.error("[supplier] issue failed:", e.message);
    throw new TicketError("err.supplierIssueFailed");
  }
  const r = await db.ticketBooking.updateMany({ where: { id, status: "PAID" }, data: { status: "ISSUED", issuedRef: ref, issuedAt: new Date() } });
  if (r.count !== 1) throw new TicketError("err.bookingChanged");
  return ref;
}

/** The supplier couldn't issue it: cancel and owe a full refund (as the prototype promises). */
export async function cannotIssue(opsUserId: string, id: string) {
  await requireOps(opsUserId);
  const b = await db.ticketBooking.findUnique({ where: { id } });
  if (!b || b.status !== "PAID") throw new TicketError("err.bookingChanged");
  const r = await db.ticketBooking.updateMany({
    where: { id, status: "PAID" },
    data: { status: "CANCELLED", cancelledAt: new Date(), cancelReason: "not-issued", refundAmount: b.total, refundStatus: "PENDING" },
  });
  if (r.count !== 1) throw new TicketError("err.bookingChanged");
}

export async function markTicketRefunded(opsUserId: string, id: string) {
  await requireOps(opsUserId);
  const r = await db.ticketBooking.updateMany({ where: { id, refundStatus: "PENDING" }, data: { refundStatus: "REFUNDED", refundedAt: new Date() } });
  if (r.count !== 1) throw new TicketError("err.bookingChanged");
}
