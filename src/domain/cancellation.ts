// Open Trip cancellation fees (docs/decisions.md §4). Each trip defines its own tiers; a booking
// keeps a snapshot of the terms in force when it was made.
import { daysBetween } from "./dates";

export interface Tier {
  minDaysBefore: number; // applies when cancelled at least this many days before departure
  feePercent: number; // of the booking total
  minFee: number;
}

export interface TermsSnapshot {
  terms: string;
  tiers: Tier[];
}

export interface CancellationQuote {
  daysBefore: number;
  tier: Tier | null; // null: later than every tier, so the full price is charged
  fee: number;
  refund: number;
}

/** A validation problem; `code` is a dictionary key (see src/i18n/en.ts "tier.*"). */
export interface TierIssue {
  code: "tier.days" | "tier.fee" | "tier.minFee" | "tier.duplicate" | "tier.order";
  params: Record<string, number>;
}

export function validateTiers(tiers: readonly Tier[]): TierIssue[] {
  const issues: TierIssue[] = [];
  const days = new Set<number>();
  for (const t of tiers) {
    if (!Number.isInteger(t.minDaysBefore) || t.minDaysBefore < 0) issues.push({ code: "tier.days", params: { v: t.minDaysBefore } });
    if (!Number.isInteger(t.feePercent) || t.feePercent < 0 || t.feePercent > 100) issues.push({ code: "tier.fee", params: { v: t.feePercent } });
    if (t.minFee < 0) issues.push({ code: "tier.minFee", params: { v: t.minFee } });
    if (days.has(t.minDaysBefore)) issues.push({ code: "tier.duplicate", params: { v: t.minDaysBefore } });
    days.add(t.minDaysBefore);
  }
  // Cancelling earlier must never cost more than cancelling later.
  const sorted = [...tiers].sort((a, b) => b.minDaysBefore - a.minDaysBefore);
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i].minDaysBefore !== sorted[i - 1].minDaysBefore && sorted[i].feePercent < sorted[i - 1].feePercent) {
      issues.push({ code: "tier.order", params: { days: sorted[i].minDaysBefore, prev: sorted[i - 1].minDaysBefore } });
    }
  }
  return issues;
}

export function quoteCancellation(
  total: number,
  paid: number,
  tiers: readonly Tier[],
  departDate: Date,
  cancelDate: Date,
): CancellationQuote {
  const daysBefore = daysBetween(cancelDate, departDate);
  const tier = [...tiers].sort((a, b) => b.minDaysBefore - a.minDaysBefore).find((t) => daysBefore >= t.minDaysBefore) ?? null;
  const fee = tier ? Math.min(total, Math.max(Math.round((total * tier.feePercent) / 100), tier.minFee)) : total;
  return { daysBefore, tier, fee, refund: Math.max(0, paid - fee) };
}
