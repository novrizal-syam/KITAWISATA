import "server-only";
import { randomInt } from "node:crypto";
import { z } from "zod";
import { db } from "@/lib/db";
import { AppError } from "@/lib/errors";
import { daysBetween, todayInJakarta } from "@/domain/dates";
import { bookingCode, buildInstalments, cancelQuote, nextUnpaid, statusAfterPayment } from "@/domain/openTripBooking";
import type { TermsSnapshot } from "@/domain/cancellation";
import { normalisePhone } from "@/lib/otp";
import { platformSettings } from "./billingService";

export class TripBookingError extends AppError {}

export const MAX_PAX = 10;

/** Mark lapsed holds EXPIRED and give their seats back. Called before reading seats or bookings. */
export async function expireHolds(now = new Date()) {
  const lapsed = await db.openTripBooking.findMany({ where: { status: "HELD", holdExpiresAt: { lt: now } }, select: { id: true, departureId: true, pax: true } });
  for (const b of lapsed) {
    await db.$transaction(async (tx) => {
      const r = await tx.openTripBooking.updateMany({ where: { id: b.id, status: "HELD" }, data: { status: "EXPIRED" } });
      if (r.count === 1) await tx.openTripDeparture.update({ where: { id: b.departureId }, data: { seatsLeft: { increment: b.pax } } });
    });
  }
}

/** Trips on sale: active, with at least one upcoming departure that isn't closed. */
export async function tripsOnSale() {
  await expireHolds();
  const today = todayInJakarta();
  const trips = await db.openTrip.findMany({
    where: { active: true },
    include: { departures: { where: { departDate: { gt: today }, status: { not: "CLOSED" } }, orderBy: { departDate: "asc" } } },
    orderBy: { name: "asc" },
  });
  return trips.filter((t) => t.departures.length);
}

export async function tripForSale(id: string) {
  await expireHolds();
  const today = todayInJakarta();
  return db.openTrip.findFirst({
    where: { id, active: true },
    include: { tiers: { orderBy: { minDaysBefore: "desc" } }, departures: { where: { departDate: { gt: today }, status: { not: "CLOSED" } }, orderBy: { departDate: "asc" } } },
  });
}

export const bookingInput = z.object({
  departureId: z.string().min(1, "v.invalid"),
  pax: z.coerce.number({ message: "v.pax" }).int("v.pax").min(1, "v.pax").max(MAX_PAX, "v.pax"),
  plan: z.enum(["SPLIT", "FULL"], { message: "v.invalid" }),
  contactName: z.string().trim().min(2, "v.contactName").max(80, "v.invalid"),
  contactPhone: z.string().trim().min(6, "v.contactPhone"),
  travellerNames: z.array(z.string().trim().min(2, "v.travellerName").max(80, "v.invalid")),
  acceptTerms: z.literal(true, { message: "v.acceptTerms" }),
});
export type BookingInput = z.infer<typeof bookingInput>;

/** Hold seats and create the booking with its payment schedule and a snapshot of the trip's terms. */
export async function createTripBooking(userId: string, input: BookingInput, now = new Date()) {
  if (input.travellerNames.length !== input.pax) throw new TripBookingError("err.travellerCount");
  const phone = normalisePhone(input.contactPhone);
  if (!phone) throw new TripBookingError("login.badPhone");
  await expireHolds(now);
  const settings = await platformSettings();
  const today = todayInJakarta(now);
  return db.$transaction(async (tx) => {
    const dep = await tx.openTripDeparture.findUnique({ where: { id: input.departureId }, include: { openTrip: { include: { tiers: true } } } });
    if (!dep || !dep.openTrip.active || dep.status === "CLOSED" || daysBetween(today, dep.departDate) <= 0) throw new TripBookingError("err.departureGone");
    const trip = dep.openTrip;
    if (!trip.tiers.length) throw new TripBookingError("err.departureGone");
    const total = trip.pricePerPax * input.pax;
    const instalments = buildInstalments(input.plan, total, today, dep.departDate);
    if (!instalments) throw new TripBookingError("err.splitUnavailable");
    // Take the seats only if enough are left; a concurrent booking can't push this below zero.
    const taken = await tx.openTripDeparture.updateMany({ where: { id: dep.id, seatsLeft: { gte: input.pax } }, data: { seatsLeft: { decrement: input.pax } } });
    if (taken.count !== 1) throw new TripBookingError("err.notEnoughSeats", { n: dep.seatsLeft });
    const snapshot: TermsSnapshot = { terms: trip.terms, tiers: trip.tiers.map((t) => ({ minDaysBefore: t.minDaysBefore, feePercent: t.feePercent, minFee: t.minFee })) };
    let code = bookingCode(randomInt);
    while (await tx.openTripBooking.findUnique({ where: { code } })) code = bookingCode(randomInt);
    return tx.openTripBooking.create({
      data: {
        code, departureId: dep.id, userId, pax: input.pax, pricePerPax: trip.pricePerPax, total, plan: input.plan,
        contactName: input.contactName, contactPhone: phone, travellerNames: input.travellerNames,
        termsSnapshot: snapshot as object, termsAcceptedAt: now, holdExpiresAt: new Date(now.getTime() + settings.seatHoldMinutes * 60_000),
        instalments: { create: instalments },
      },
    });
  });
}

const bookingInclude = { departure: { include: { openTrip: true } }, instalments: { orderBy: { seq: "asc" as const } } };

export async function myTripBookings(userId: string) {
  await expireHolds();
  return db.openTripBooking.findMany({ where: { userId }, include: bookingInclude, orderBy: { createdAt: "desc" } });
}

/** The traveller's own booking, or any booking for ops. */
export async function tripBookingForViewer(code: string, viewer: { id: string; role: string }) {
  await expireHolds();
  const b = await db.openTripBooking.findUnique({ where: { code }, include: bookingInclude });
  return b && (b.userId === viewer.id || viewer.role === "OPS") ? b : null;
}

export type TripBookingWithDetails = NonNullable<Awaited<ReturnType<typeof tripBookingForViewer>>>;

export const quoteFor = (b: TripBookingWithDetails, today = todayInJakarta()) =>
  cancelQuote(b.total, b.instalments, b.termsSnapshot as unknown as TermsSnapshot, b.departure.departDate, today);

/** The traveller cancels before departure; the fee comes from the booking's own terms snapshot. */
export async function cancelTripBooking(userId: string, code: string, now = new Date()) {
  const b = await tripBookingForViewer(code, { id: userId, role: "TRAVELLER" });
  if (!b || b.userId !== userId) throw new TripBookingError("err.notYourBooking");
  if (!["HELD", "CONFIRMED", "PAID"].includes(b.status)) throw new TripBookingError("err.cannotCancel");
  const today = todayInJakarta(now);
  if (daysBetween(today, b.departure.departDate) <= 0) throw new TripBookingError("err.cannotCancel");
  const q = quoteFor(b, today);
  return db.$transaction(async (tx) => {
    const r = await tx.openTripBooking.updateMany({
      where: { id: b.id, status: b.status, updatedAt: b.updatedAt },
      data: { status: "CANCELLED", cancelledAt: now, cancellationFee: q.feeKept, refundAmount: q.refund, refundStatus: q.refund > 0 ? "PENDING" : "NONE" },
    });
    if (r.count !== 1) throw new TripBookingError("err.bookingChanged");
    await tx.openTripDeparture.update({ where: { id: b.departureId }, data: { seatsLeft: { increment: b.pax } } });
    return q;
  });
}

// ---------- ops ----------

async function requireOps(userId: string) {
  const u = await db.user.findUnique({ where: { id: userId } });
  if (u?.role !== "OPS") throw new TripBookingError("err.opsOnly");
  return u;
}

export async function allTripBookings() {
  await expireHolds();
  return db.openTripBooking.findMany({ include: { ...bookingInclude, user: { select: { name: true, phone: true } } }, orderBy: { createdAt: "desc" }, take: 200 });
}

/** Ops records that the next instalment arrived. A hold that has lapsed can't be confirmed. */
export async function recordInstalmentPayment(opsUserId: string, bookingId: string, now = new Date()) {
  const ops = await requireOps(opsUserId);
  await expireHolds(now);
  return db.$transaction(async (tx) => {
    const b = await tx.openTripBooking.findUnique({ where: { id: bookingId }, include: { instalments: true } });
    if (!b || !["HELD", "CONFIRMED"].includes(b.status)) throw new TripBookingError("err.cannotRecordPayment");
    const next = nextUnpaid(b.instalments);
    if (!next) throw new TripBookingError("err.cannotRecordPayment");
    const r = await tx.openTripInstalment.updateMany({ where: { id: next.id, paidAt: null }, data: { paidAt: now, paidRecordedBy: ops.name ?? ops.phone } });
    if (r.count !== 1) throw new TripBookingError("err.bookingChanged");
    const after = b.instalments.map((i) => (i.id === next.id ? { ...i, paidAt: now } : i));
    await tx.openTripBooking.update({ where: { id: b.id }, data: { status: statusAfterPayment(after) } });
    return { code: b.code, seq: next.seq };
  });
}

export async function markRefunded(opsUserId: string, bookingId: string) {
  await requireOps(opsUserId);
  const r = await db.openTripBooking.updateMany({ where: { id: bookingId, refundStatus: "PENDING" }, data: { refundStatus: "REFUNDED", refundedAt: new Date() } });
  if (r.count !== 1) throw new TripBookingError("err.bookingChanged");
}
