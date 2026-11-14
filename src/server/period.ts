import "server-only";
import { monthOf, previousMonth } from "@/domain/invoice";
import { todayInJakarta } from "@/domain/dates";

/** Parse ?month=YYYY-MM, defaulting to (and capped at) the current month in Jakarta. */
export function reportMonth(param?: string) {
  const now = monthOf(todayInJakarta());
  const m = param?.match(/^(\d{4})-(\d{2})$/);
  const asked = m ? { year: Number(m[1]), month: Number(m[2]) } : now;
  const valid = asked.month >= 1 && asked.month <= 12 && asked.year >= 2020 && (asked.year * 12 + asked.month) <= (now.year * 12 + now.month);
  const p = valid ? asked : now;
  const next = p.month === 12 ? { year: p.year + 1, month: 1 } : { year: p.year, month: p.month + 1 };
  return { ...p, isCurrent: p.year === now.year && p.month === now.month, prev: previousMonth(p), next: (next.year * 12 + next.month) <= (now.year * 12 + now.month) ? next : null };
}

export const monthParam = (p: { year: number; month: number }) => `${p.year}-${String(p.month).padStart(2, "0")}`;
