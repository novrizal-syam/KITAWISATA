import "server-only";
import { randomInt } from "node:crypto";
import { db } from "@/lib/db";
import { AppError } from "@/lib/errors";
import { nextUnpaid, statusAfterPayment } from "@/domain/openTripBooking";
import { expireHolds } from "./openTripBookingService";
import { expireTickets } from "./ticketService";
import { gatewayConfig } from "./paymentSettingsService";
import { createSnap, midtransStatus, verifyMidtransSignature } from "./gateways/midtrans";
import { createXenditInvoice, verifyXenditToken, xenditInvoiceStatus } from "./gateways/xendit";
import { GatewayError, type GatewayStatus } from "./gateways/common";

export class GatewayPaymentError extends AppError {}

const appUrl = () => (process.env.APP_URL || "http://localhost:3000").replace(/\/$/, "");
export const webhookUrls = () => ({ midtrans: `${appUrl()}/api/payments/midtrans/notify`, xendit: `${appUrl()}/api/payments/xendit/callback` });

/** Whether customers can pay online now: a gateway is chosen and its keys are saved. */
export async function gatewayReady() {
  const c = await gatewayConfig().catch(() => null);
  if (!c) return null;
  if (c.provider === "MIDTRANS" && c.secrets.serverKey) return c;
  if (c.provider === "XENDIT" && c.secrets.secretKey && c.secrets.callbackToken) return c;
  return null;
}

const ORDER_ALPHABET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";
const suffix = () => Array.from({ length: 4 }, () => ORDER_ALPHABET[randomInt(ORDER_ALPHABET.length)]).join("");

async function createAtProvider(c: NonNullable<Awaited<ReturnType<typeof gatewayReady>>>, a: { orderId: string; amount: number; name: string; phone: string; item: string; returnPath: string; expiryMinutes: number }) {
  const back = `${appUrl()}/pay/return?order=${encodeURIComponent(a.orderId)}`;
  try {
    return c.provider === "MIDTRANS"
      ? await createSnap({ serverKey: c.secrets.serverKey!, mode: c.mode, orderId: a.orderId, amount: a.amount, name: a.name, phone: a.phone, itemName: a.item, finishUrl: back, expiryMinutes: a.expiryMinutes })
      : await createXenditInvoice({ secretKey: c.secrets.secretKey!, externalId: a.orderId, amount: a.amount, description: a.item, name: a.name, phone: a.phone, successUrl: back, failureUrl: back, durationSeconds: a.expiryMinutes * 60 });
  } catch (e) {
    if (e instanceof GatewayError || e instanceof TypeError) throw new GatewayPaymentError("err.gatewayDown");
    throw e;
  }
}

/** Minutes the provider should keep the payment open: what is left of the hold, at least 15. */
const minutesLeft = (until: Date | null, fallback: number) => (until ? Math.max(15, Math.floor((until.getTime() - Date.now()) / 60_000)) : fallback);

/** Start paying the next instalment of the traveller's own Open Trip booking. Returns the provider's payment page. */
export async function startOpenTripPayment(userId: string, code: string) {
  const c = await gatewayReady();
  if (!c) throw new GatewayPaymentError("err.gatewayOff");
  await expireHolds();
  const b = await db.openTripBooking.findUnique({ where: { code }, include: { instalments: true, departure: { include: { openTrip: true } } } });
  if (!b || b.userId !== userId) throw new GatewayPaymentError("err.notYourBooking");
  if (b.status !== "HELD" && b.status !== "CONFIRMED") throw new GatewayPaymentError("err.cannotRecordPayment");
  const next = nextUnpaid(b.instalments);
  if (!next) throw new GatewayPaymentError("err.cannotRecordPayment");
  const orderId = `${b.code}-${next.seq}-${suffix()}`;
  const created = await createAtProvider(c, {
    orderId, amount: next.amount, name: b.contactName, phone: b.contactPhone, item: `${b.departure.openTrip.name} (${b.code}) #${next.seq}`,
    returnPath: `/my-trips/${b.code}`, expiryMinutes: minutesLeft(b.status === "HELD" ? b.holdExpiresAt : null, 24 * 60),
  });
  await db.paymentAttempt.create({ data: { orderId, provider: c.provider, mode: c.mode, amount: next.amount, providerRef: created.providerRef, redirectUrl: created.redirectUrl, openTripInstalmentId: next.id, userId } });
  return created.redirectUrl;
}

/** Start paying the traveller's own ticket or stay in full. */
export async function startTicketPayment(userId: string, code: string) {
  const c = await gatewayReady();
  if (!c) throw new GatewayPaymentError("err.gatewayOff");
  await expireTickets();
  const b = await db.ticketBooking.findUnique({ where: { code } });
  if (!b || b.userId !== userId) throw new GatewayPaymentError("err.notYourBooking");
  if (b.status !== "AWAITING_PAYMENT") throw new GatewayPaymentError("err.cannotRecordPayment");
  const orderId = `${b.code}-${suffix()}`;
  const created = await createAtProvider(c, { orderId, amount: b.total, name: b.contactName, phone: b.contactPhone, item: `kitawisata ${b.kind.toLowerCase()} ${b.code}`, returnPath: `/my-trips/tickets/${b.code}`, expiryMinutes: minutesLeft(b.holdExpiresAt, 60) });
  await db.paymentAttempt.create({ data: { orderId, provider: c.provider, mode: c.mode, amount: b.total, providerRef: created.providerRef, redirectUrl: created.redirectUrl, ticketBookingId: b.id, userId } });
  return created.redirectUrl;
}

/** Ask the provider for the attempt's real status. */
async function providerStatus(a: { provider: string; mode: "SANDBOX" | "PRODUCTION"; orderId: string; providerRef: string | null }): Promise<GatewayStatus> {
  const c = await gatewayConfig();
  if (a.provider === "MIDTRANS") return midtransStatus({ serverKey: c.secrets.serverKey!, mode: a.mode, orderId: a.orderId });
  return xenditInvoiceStatus({ secretKey: c.secrets.secretKey!, invoiceId: a.providerRef! });
}

export type ConfirmOutcome = "paid" | "unapplied" | "pending" | "expired" | "failed" | "already";

/**
 * Confirm an attempt with the provider and, if paid, record it on the booking exactly once.
 * Used by webhooks and by the return page. Money that can't be applied is kept for ops to review.
 */
export async function confirmAttempt(orderId: string, event?: unknown): Promise<{ outcome: ConfirmOutcome; attempt: { orderId: string; ticketCode?: string; tripCode?: string } }> {
  const a = await db.paymentAttempt.findUnique({ where: { orderId }, include: { openTripInstalment: { include: { booking: true } }, ticketBooking: true } });
  if (!a) throw new GatewayPaymentError("err.unknownPayment");
  const ref = { orderId, ticketCode: a.ticketBooking?.code, tripCode: a.openTripInstalment?.booking.code };
  // Already settled (often the webhook arrived before the customer came back): report what was recorded.
  if (a.status !== "PENDING") {
    const recorded = { PAID: "already", PAID_UNAPPLIED: "unapplied", EXPIRED: "expired", FAILED: "failed" } as const;
    return { outcome: recorded[a.status], attempt: ref };
  }
  const s = await providerStatus(a);
  if (s.state === "pending") return { outcome: "pending", attempt: ref };
  if (s.state === "expired" || s.state === "failed") {
    await db.paymentAttempt.updateMany({ where: { id: a.id, status: "PENDING" }, data: { status: s.state === "expired" ? "EXPIRED" : "FAILED", lastEvent: (event ?? s.raw) as object } });
    return { outcome: s.state, attempt: ref };
  }
  // Paid. Bring holds up to date first, so a lapsed hold isn't confirmed by a late payment.
  await expireHolds(); await expireTickets();
  const recorder = a.provider === "MIDTRANS" ? "Midtrans" : "Xendit";
  const outcome = await db.$transaction(async (tx) => {
    const claimed = await tx.paymentAttempt.updateMany({ where: { id: a.id, status: "PENDING" }, data: { status: "PAID", paidAt: new Date(), lastEvent: (event ?? s.raw) as object } });
    if (claimed.count !== 1) return "already" as const;
    const unapplied = async (note: string) => { await tx.paymentAttempt.update({ where: { id: a.id }, data: { status: "PAID_UNAPPLIED", note } }); return "unapplied" as const; };
    if (s.amount !== null && s.amount !== a.amount) return unapplied(`amount ${s.amount} != ${a.amount}`);
    if (a.openTripInstalmentId) {
      const inst = await tx.openTripInstalment.findUniqueOrThrow({ where: { id: a.openTripInstalmentId }, include: { booking: { include: { instalments: true } } } });
      if (inst.paidAt) return unapplied("instalment already paid");
      if (inst.booking.status !== "HELD" && inst.booking.status !== "CONFIRMED") return unapplied(`booking ${inst.booking.status}`);
      const r = await tx.openTripInstalment.updateMany({ where: { id: inst.id, paidAt: null }, data: { paidAt: new Date(), paidRecordedBy: recorder } });
      if (r.count !== 1) return unapplied("instalment changed");
      const after = inst.booking.instalments.map((i) => (i.id === inst.id ? { ...i, paidAt: new Date() } : i));
      await tx.openTripBooking.update({ where: { id: inst.bookingId }, data: { status: statusAfterPayment(after) } });
      return "paid" as const;
    }
    const r = await tx.ticketBooking.updateMany({ where: { id: a.ticketBookingId!, status: "AWAITING_PAYMENT" }, data: { status: "PAID", paidAt: new Date(), paidRecordedBy: recorder } });
    return r.count === 1 ? ("paid" as const) : unapplied("ticket no longer awaiting payment");
  });
  return { outcome, attempt: ref };
}

/** Midtrans HTTP notification: check the signature, then confirm with Midtrans itself. */
export async function handleMidtransNotification(body: Record<string, unknown>) {
  const c = await gatewayConfig();
  if (!c.secrets.serverKey || !verifyMidtransSignature(body as Record<string, string>, c.secrets.serverKey)) return { status: 401 as const };
  const a = await db.paymentAttempt.findUnique({ where: { orderId: String(body.order_id) } });
  if (!a || a.provider !== "MIDTRANS") return { status: 404 as const };
  return { status: 200 as const, result: await confirmAttempt(a.orderId, body) };
}

/** Xendit invoice callback: check the callback token, then confirm with Xendit itself. */
export async function handleXenditCallback(token: string | null, body: Record<string, unknown>) {
  const c = await gatewayConfig();
  if (!verifyXenditToken(token, c.secrets.callbackToken)) return { status: 401 as const };
  const a = await db.paymentAttempt.findUnique({ where: { orderId: String(body.external_id) } });
  if (!a || a.provider !== "XENDIT" || a.providerRef !== String(body.id)) return { status: 404 as const };
  return { status: 200 as const, result: await confirmAttempt(a.orderId, body) };
}

// ---------- ops ----------

export async function unappliedPayments() {
  return db.paymentAttempt.findMany({ where: { status: "PAID_UNAPPLIED", resolvedAt: null }, include: { openTripInstalment: { include: { booking: true } }, ticketBooking: true }, orderBy: { paidAt: "desc" } });
}

export async function resolveUnapplied(opsUserId: string, id: string) {
  const ops = await db.user.findUnique({ where: { id: opsUserId } });
  if (ops?.role !== "OPS") throw new GatewayPaymentError("err.opsOnly");
  const r = await db.paymentAttempt.updateMany({ where: { id, status: "PAID_UNAPPLIED", resolvedAt: null }, data: { resolvedAt: new Date(), resolvedBy: ops.name ?? ops.phone } });
  if (r.count !== 1) throw new GatewayPaymentError("err.bookingChanged");
}
