import { daysBetween, todayInJakarta } from "@/domain/dates";
import { fmtDate } from "@/lib/format";
import type { Locale, T } from "@/i18n";

export function InvoiceStatus({ inv, t, locale }: { inv: { status: "ISSUED" | "PAID"; dueOn: Date }; t: T; locale: Locale }) {
  if (inv.status === "PAID") return <span className="badge bg-green-t text-green-d">{t("inv.paid")}</span>;
  const overdue = daysBetween(inv.dueOn, todayInJakarta()) > 0;
  return overdue
    ? <span className="badge bg-red-t text-red-d">{t("inv.overdue", { date: fmtDate(inv.dueOn, locale) })}</span>
    : <span className="badge bg-amber-t text-amber">{t("inv.due", { date: fmtDate(inv.dueOn, locale) })}</span>;
}
