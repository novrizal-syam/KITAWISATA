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

export function validateTiers(tiers: readonly Tier[]): string[] {
  const errors: string[] = [];
  const days = new Set<number>();
  for (const t of tiers) {
    if (!Number.isInteger(t.minDaysBefore) || t.minDaysBefore < 0) errors.push(`Invalid days: ${t.minDaysBefore}`);
    if (!Number.isInteger(t.feePercent) || t.feePercent < 0 || t.feePercent > 100) errors.push(`Invalid fee: ${t.feePercent}%`);
    if (t.minFee < 0) errors.push(`Invalid minimum fee: ${t.minFee}`);
    if (days.has(t.minDaysBefore)) errors.push(`Duplicate tier for ${t.minDaysBefore} days`);
    days.add(t.minDaysBefore);
  }
  // Cancelling earlier must never cost more than cancelling later.
  const sorted = [...tiers].sort((a, b) => b.minDaysBefore - a.minDaysBefore);
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i].minDaysBefore !== sorted[i - 1].minDaysBefore && sorted[i].feePercent < sorted[i - 1].feePercent) {
      errors.push(`Fee for ${sorted[i].minDaysBefore}+ days is lower than for ${sorted[i - 1].minDaysBefore}+ days`);
    }
  }
  return errors;
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
