import Link from "next/link";
import { STATUS_CLASS, fmtDate, rp } from "@/lib/format";
import type { Locale, T } from "@/i18n";
import type { SppdWithDetails } from "@/server/portal";

export function StatusBadge({ status, t }: { status: keyof typeof STATUS_CLASS; t: T }) {
  return <span className={`badge ${STATUS_CLASS[status]}`}>{t(`status.${status}`)}</span>;
}

export const booked = (s: Pick<SppdWithDetails, "bookings">) => s.bookings.reduce((a, b) => a + b.amount, 0);

export function SppdRow({ s, showEmployee, t, locale }: { s: SppdWithDetails; showEmployee?: boolean; t: T; locale: Locale }) {
  const spent = booked(s);
  const showBooked = s.status === "BOOKED" || s.status === "COMPLETED";
  return (
    <Link href={`/portal/trips/${s.id}`} className="card flex flex-wrap items-center justify-between gap-3 px-4 py-3.5 hover:border-line2">
      <span className="min-w-0">
        <span className="flex flex-wrap items-center gap-2"><b className="text-[15px]">{t("row.toCity", { city: s.dest.name })}</b><StatusBadge status={s.status} t={t} /></span>
        <span className="note block">
          {s.number ?? t("row.noNumber")} · {fmtDate(s.startDate, locale, { year: false })} – {fmtDate(s.endDate, locale)}
          {showEmployee ? ` · ${s.employee.name}` : ""}
        </span>
        <span className="block text-[13px] text-muted">{s.purpose}</span>
      </span>
      <span className="num text-right">
        <b className="block">{rp(showBooked ? spent : s.budget)}</b>
        <span className="note">{showBooked ? t("row.booked") : t("row.budget")}</span>
      </span>
    </Link>
  );
}
