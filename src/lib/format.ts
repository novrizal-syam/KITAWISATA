// Display formatting shared by server and client components. Text labels live in src/i18n.
import { BCP47, type Locale, type T } from "@/i18n";

/** Rupiah always uses Indonesian grouping (Rp 1.250.000), whatever the interface language. */
export const rp = (n: number) => "Rp " + n.toLocaleString("id-ID");

/** Calendar dates are stored as UTC midnight, so format in UTC to avoid shifting the day. */
export const fmtDate = (d: Date, locale: Locale, opts: { year?: boolean } = {}) =>
  d.toLocaleDateString(BCP47[locale], { day: "numeric", month: "short", ...(opts.year === false ? {} : { year: "numeric" }), timeZone: "UTC" });

/** Moments (submitted, decided) shown in Jakarta time. */
export const fmtDay = (d: Date, locale: Locale) =>
  d.toLocaleDateString(BCP47[locale], { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Jakarta" });

export const initials = (name: string) =>
  name.split(" ").filter(Boolean).slice(0, 2).map((w) => w[0]).join("").toUpperCase();

export const days = (t: T, n: number) => t(n === 1 ? "unit.day" : "unit.days", { n });
export const nights = (t: T, n: number) => t(n === 1 ? "unit.night" : "unit.nights", { n });

/** "30+ days: 10% · 14+ days: 50% · later: 100%" */
export const tierSummary = (t: T, tiers: { minDaysBefore: number; feePercent: number }[]) =>
  [...[...tiers].sort((a, b) => b.minDaysBefore - a.minDaysBefore).map((x) => t("ot.tierSummary", { days: x.minDaysBefore, fee: x.feePercent })), t("ot.tierLater")].join(" · ");

export const STATUS_CLASS = {
  DRAFT: "bg-grey-t text-muted",
  PENDING_APPROVAL: "bg-amber-t text-amber",
  APPROVED: "bg-blue-t text-blue",
  BOOKED: "bg-green-t text-green-d",
  COMPLETED: "bg-ink text-white",
  REJECTED: "bg-red-t text-red-d",
  CANCELLED: "bg-grey-t text-muted",
} as const;

/** Translate zod issues (whose messages are dictionary keys) into per-field messages. */
export function fieldErrorsFrom(issues: { path: PropertyKey[]; message: string }[], t: T, tm: (t: T, m: string) => string) {
  const out: Record<string, string> = {};
  for (const i of issues) out[String(i.path[0])] ??= tm(t, i.message);
  return out;
}

/** Basis points as a percentage: 1100 -> "11%", 1150 -> "11.5%" / "11,5%". */
export const fmtPct = (bps: number, locale: Locale) => (bps / 100).toLocaleString(BCP47[locale], { maximumFractionDigits: 2 }) + "%";

export const periodLabel = (t: T, year: number, month: number) => `${t(`month.${month as 1}`)} ${year}`;

/** Short Rupiah for chart labels: Rp 34,7 jt / Rp 34.7m. */
export const rpShort = (n: number, locale: Locale) =>
  n >= 1_000_000 ? `Rp ${(n / 1_000_000).toLocaleString(BCP47[locale], { maximumFractionDigits: 1 })}${locale === "id" ? " jt" : "m"}` : rp(n);
