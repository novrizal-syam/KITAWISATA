// Monthly corporate invoice, ported from the business prototype's generate():
// travel bookings at cost + a service fee per booking + PPN on the service fee only.
import { addDays } from "./dates";

export interface InvoiceTotals {
  bookingCount: number;
  subtotal: number;
  feePerBooking: number;
  serviceFee: number;
  ppnRateBps: number;
  ppn: number;
  total: number;
}

/** PPN is charged on kitawisata's service fee, not on the travel itself. Rate in basis points (1100 = 11%). */
export function invoiceTotals(amounts: readonly number[], feePerBooking: number, ppnRateBps: number): InvoiceTotals {
  const subtotal = amounts.reduce((a, b) => a + b, 0);
  const serviceFee = amounts.length * feePerBooking;
  const ppn = Math.round((serviceFee * ppnRateBps) / 10_000);
  return { bookingCount: amounts.length, subtotal, feePerBooking, serviceFee, ppnRateBps, ppn, total: subtotal + serviceFee + ppn };
}

/** e.g. invoiceNumber(2026, 10, 30) -> "INV/KW/2026/10/0030". */
export function invoiceNumber(year: number, month: number, seq: number): string {
  return `INV/KW/${year}/${String(month).padStart(2, "0")}/${String(seq).padStart(4, "0")}`;
}

export const periodKey = (year: number, month: number) => `${year}-${String(month).padStart(2, "0")}`;

export const dueDate = (issuedOn: Date, termDays: number) => addDays(issuedOn, termDays);

/** "11%" or "11.5%" for display; basis points in, percent out. */
export const bpsToPercent = (bps: number) => bps / 100;

/** Month of a calendar date (UTC midnight) as { year, month 1-12 }. */
export const monthOf = (d: Date) => ({ year: d.getUTCFullYear(), month: d.getUTCMonth() + 1 });

/** The month before { year, month }. */
export const previousMonth = ({ year, month }: { year: number; month: number }) =>
  month === 1 ? { year: year - 1, month: 12 } : { year, month: month - 1 };

/** [start, end) of a month in Jakarta time, as instants, for filtering booking timestamps. */
export function jakartaMonthRange(year: number, month: number): [Date, Date] {
  const next = month === 12 ? { year: year + 1, month: 1 } : { year, month: month + 1 };
  // WIB is UTC+7 all year (no daylight saving).
  return [new Date(Date.UTC(year, month - 1, 1, -7)), new Date(Date.UTC(next.year, next.month - 1, 1, -7))];
}
