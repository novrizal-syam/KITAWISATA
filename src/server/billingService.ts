import "server-only";
import { z } from "zod";
import { db } from "@/lib/db";
import { AppError } from "@/lib/errors";
import { dueDate, invoiceNumber, invoiceTotals, jakartaMonthRange, monthOf, periodKey, previousMonth } from "@/domain/invoice";
import { todayInJakarta } from "@/domain/dates";

export class BillingError extends AppError {}

export async function platformSettings() {
  return db.platformSetting.upsert({ where: { id: "default" }, update: {}, create: { id: "default" } });
}

const percent = z.preprocess(
  (v) => (typeof v === "string" ? Number(v.replace(",", ".").replace(/[^\d.]/g, "")) : v),
  z.number({ message: "v.ppn" }).min(0, "v.ppn").max(100, "v.ppn"),
);
const rupiah = z.preprocess((v) => (typeof v === "string" ? Number(v.replace(/[^\d]/g, "")) : v), z.number({ message: "v.amount" }).int("v.amount").min(0, "v.amount").max(10_000_000, "v.amountMax"));
const termDays = z.preprocess((v) => (typeof v === "string" ? Number(v.replace(/[^\d]/g, "")) : v), z.number({ message: "v.terms30" }).int("v.terms30").min(0, "v.terms30").max(120, "v.terms30"));

export const billingSettingsInput = z.object({
  ppnPercent: percent,
  companies: z.array(z.object({ id: z.string().min(1), serviceFeePerBooking: rupiah, paymentTermDays: termDays })),
});

/** Ops only. The PPN rate and company terms apply to invoices generated afterwards. */
export async function updateBillingSettings(opsUserId: string, input: z.infer<typeof billingSettingsInput>) {
  const ops = await db.user.findUnique({ where: { id: opsUserId } });
  if (ops?.role !== "OPS") throw new BillingError("err.opsOnly");
  const ppnRateBps = Math.round(input.ppnPercent * 100);
  await db.$transaction([
    db.platformSetting.upsert({ where: { id: "default" }, update: { ppnRateBps, updatedBy: ops.name ?? ops.phone }, create: { id: "default", ppnRateBps, updatedBy: ops.name ?? ops.phone } }),
    ...input.companies.map((c) => db.company.update({ where: { id: c.id }, data: { serviceFeePerBooking: c.serviceFeePerBooking, paymentTermDays: c.paymentTermDays } })),
  ]);
}

const lineInclude = {
  sppd: { select: { number: true, employee: { select: { name: true, costCentre: true, department: { select: { name: true } } } } } },
};

/** Uninvoiced bookings of a company. */
const uninvoiced = (companyId: string) =>
  db.tripBooking.findMany({ where: { invoiceId: null, sppd: { companyId } }, include: lineInclude, orderBy: [{ sppd: { number: "asc" } }, { createdAt: "asc" }] });

/** Ops billing page: every company with what would be billed now at current settings. */
export async function billingOverview() {
  const [settings, companies] = await Promise.all([
    platformSettings(),
    db.company.findMany({ orderBy: { name: "asc" }, include: { invoices: { orderBy: { issuedOn: "desc" } } } }),
  ]);
  const rows = await Promise.all(companies.map(async (c) => {
    const open = await uninvoiced(c.id);
    return { company: c, open: invoiceTotals(open.map((b) => b.amount), c.serviceFeePerBooking, settings.ppnRateBps) };
  }));
  return { settings, rows };
}

/**
 * Ops: bill all of a company's uninvoiced bookings now. The period is the current month in Jakarta;
 * the scheduled run on the 1st (not built yet) will call this for the month that just closed.
 */
export async function generateInvoice(opsUserId: string, companyId: string, today = todayInJakarta()) {
  const ops = await db.user.findUnique({ where: { id: opsUserId } });
  if (ops?.role !== "OPS") throw new BillingError("err.opsOnly");
  const settings = await platformSettings();
  return db.$transaction(async (tx) => {
    const company = await tx.company.findUniqueOrThrow({ where: { id: companyId } });
    const bookings = await tx.tripBooking.findMany({ where: { invoiceId: null, sppd: { companyId } }, select: { id: true, amount: true } });
    if (!bookings.length) throw new BillingError("err.nothingToBill");
    const { year, month } = monthOf(today);
    const counter = await tx.invoiceCounter.upsert({ where: { period: periodKey(year, month) }, update: { seq: { increment: 1 } }, create: { period: periodKey(year, month), seq: 1 } });
    const totals = invoiceTotals(bookings.map((b) => b.amount), company.serviceFeePerBooking, settings.ppnRateBps);
    const invoice = await tx.invoice.create({
      data: {
        number: invoiceNumber(year, month, counter.seq), companyId, periodYear: year, periodMonth: month,
        issuedOn: today, dueOn: dueDate(today, company.paymentTermDays), ...totals,
      },
    });
    // Claim only bookings still uninvoiced; if another run took some, roll the whole thing back.
    const claimed = await tx.tripBooking.updateMany({ where: { id: { in: bookings.map((b) => b.id) }, invoiceId: null }, data: { invoiceId: invoice.id } });
    if (claimed.count !== bookings.length) throw new BillingError("err.billingConflict");
    return invoice;
  });
}

/** Ops records that a transfer arrived. A virtual-account integration will do this automatically later. */
export async function recordPayment(opsUserId: string, invoiceId: string) {
  const ops = await db.user.findUnique({ where: { id: opsUserId } });
  if (ops?.role !== "OPS") throw new BillingError("err.opsOnly");
  const r = await db.invoice.updateMany({ where: { id: invoiceId, status: "ISSUED" }, data: { status: "PAID", paidAt: new Date(), paidRecordedBy: ops.name ?? ops.phone } });
  if (r.count !== 1) throw new BillingError("err.alreadyPaid");
}

export async function invoicesForCompany(companyId: string) {
  return db.invoice.findMany({ where: { companyId }, orderBy: { issuedOn: "desc" } });
}

/** An invoice the viewer may open: ops, or a finance admin of the billed company. */
export async function invoiceForViewer(id: string, viewer: { role: string; companyId: string | null }) {
  const inv = await db.invoice.findUnique({ where: { id }, include: { company: true, bookings: { include: lineInclude, orderBy: { createdAt: "asc" } } } });
  if (!inv) return null;
  return viewer.role === "OPS" || (viewer.role === "FINANCE_ADMIN" && viewer.companyId === inv.companyId) ? inv : null;
}

export type ReportBooking = Awaited<ReturnType<typeof reportBookings>>[number];

async function reportBookings(companyId: string, year: number, month: number) {
  const [from, to] = jakartaMonthRange(year, month);
  return db.tripBooking.findMany({
    where: { sppd: { companyId }, createdAt: { gte: from, lt: to } },
    include: { sppd: { select: { id: true, number: true, employee: { select: { name: true, costCentre: true, department: { select: { name: true } } } } } } },
    orderBy: [{ sppd: { number: "asc" } }, { createdAt: "asc" }],
  });
}

/** Finance spending report for one month: everything booked in that month (Jakarta time). */
export async function spendingReport(companyId: string, year: number, month: number) {
  const bookings = await reportBookings(companyId, year, month);
  const sum = (xs: { amount: number }[]) => xs.reduce((a, b) => a + b.amount, 0);
  const group = (key: (b: ReportBooking) => string) => {
    const m = new Map<string, number>();
    for (const b of bookings) m.set(key(b), (m.get(key(b)) ?? 0) + b.amount);
    return [...m.entries()].sort((a, b) => b[1] - a[1]);
  };
  const total = sum(bookings);
  const trips = new Set(bookings.map((b) => b.sppd.id)).size;
  const inPolicy = bookings.filter((b) => b.inPolicy).length;
  // History: the three invoiced months before this one, then this month so far.
  let p = { year, month };
  const history: { year: number; month: number; amount: number; current: boolean }[] = [];
  for (let i = 0; i < 3; i++) {
    p = previousMonth(p);
    const inv = await db.invoice.findMany({ where: { companyId, periodYear: p.year, periodMonth: p.month }, select: { subtotal: true } });
    history.unshift({ ...p, amount: inv.reduce((a, b) => a + b.subtotal, 0), current: false });
  }
  history.push({ year, month, amount: total, current: true });
  return {
    year, month, bookings, total, trips, avgPerTrip: trips ? Math.round(total / trips) : 0,
    inPolicyPct: bookings.length ? Math.round((inPolicy / bookings.length) * 100) : 100,
    exceptions: bookings.length - inPolicy,
    byCategory: group((b) => b.category), byDepartment: group((b) => b.sppd.employee.department?.name ?? "-"),
    byTraveller: group((b) => b.sppd.employee.name ?? "-").slice(0, 5), history,
  };
}
