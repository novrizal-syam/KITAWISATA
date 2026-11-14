// Open Trip booking rules: payment schedule, payment progress and the cancellation quote.
import { splitPlan } from "./paymentPlan";
import { quoteCancellation, type TermsSnapshot } from "./cancellation";
import { daysBetween } from "./dates";

export type Plan = "SPLIT" | "FULL";

export interface PlannedInstalment {
  seq: number;
  percent: number;
  dueOn: Date;
  amount: number;
}

/** The payment schedule. SPLIT is only offered more than 14 days before departure (null otherwise). */
export function buildInstalments(plan: Plan, total: number, today: Date, departDate: Date): PlannedInstalment[] | null {
  if (plan === "FULL") return [{ seq: 1, percent: 100, dueOn: today, amount: total }];
  const split = splitPlan(total, today, departDate);
  return split ? split.map((s, i) => ({ seq: i + 1, percent: s.percent, dueOn: s.due, amount: s.amount })) : null;
}

export interface InstalmentState {
  seq: number;
  amount: number;
  dueOn: Date;
  paidAt: Date | null;
}

export const paidAmount = (xs: readonly InstalmentState[]) => xs.filter((x) => x.paidAt).reduce((a, x) => a + x.amount, 0);

export const nextUnpaid = <T extends InstalmentState>(xs: readonly T[]) =>
  [...xs].sort((a, b) => a.seq - b.seq).find((x) => !x.paidAt) ?? null;

/** Status once a payment is recorded: fully paid, or confirmed with more to come. */
export const statusAfterPayment = (xs: readonly InstalmentState[]): "PAID" | "CONFIRMED" =>
  xs.every((x) => x.paidAt) ? "PAID" : "CONFIRMED";

export interface CancelQuote {
  daysBefore: number;
  paid: number;
  /** The trip's fee for this date (share of the total), before capping. */
  tripFee: number;
  /** What kitawisata keeps: the fee, but never more than was paid. Nothing more is charged. */
  feeKept: number;
  refund: number;
  /** Tier that applied; null when later than every tier (100%). */
  feePercent: number;
}

/**
 * Cancellation quote from the booking's own terms snapshot (docs/decisions.md §4).
 * An unpaid hold cancels free of charge.
 */
export function cancelQuote(total: number, instalments: readonly InstalmentState[], snapshot: TermsSnapshot, departDate: Date, today: Date): CancelQuote {
  const paid = paidAmount(instalments);
  const q = quoteCancellation(total, paid, snapshot.tiers, departDate, today);
  const feeKept = Math.min(q.fee, paid);
  return { daysBefore: daysBetween(today, departDate), paid, tripFee: q.fee, feeKept, refund: paid - feeKept, feePercent: q.tier ? q.tier.feePercent : 100 };
}

const CODE_ALPHABET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ"; // no 0/O, 1/I

/** Booking code like KW-7HQ2MX. `rand` returns integers in [0, n). */
export function bookingCode(rand: (n: number) => number): string {
  let s = "";
  for (let i = 0; i < 6; i++) s += CODE_ALPHABET[rand(CODE_ALPHABET.length)];
  return `KW-${s}`;
}
