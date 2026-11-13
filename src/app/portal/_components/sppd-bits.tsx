import Link from "next/link";
import { STATUS_BADGE, fmtDate, rp } from "@/lib/format";
import type { SppdWithDetails } from "@/server/portal";

export function StatusBadge({ status }: { status: keyof typeof STATUS_BADGE }) {
  const [label, cls] = STATUS_BADGE[status];
  return <span className={`badge ${cls}`}>{label}</span>;
}

export const booked = (s: Pick<SppdWithDetails, "bookings">) => s.bookings.reduce((a, b) => a + b.amount, 0);

export function SppdRow({ s, showEmployee }: { s: SppdWithDetails; showEmployee?: boolean }) {
  const spent = booked(s);
  const showBooked = s.status === "BOOKED" || s.status === "COMPLETED";
  return (
    <Link href={`/portal/trips/${s.id}`} className="card flex flex-wrap items-center justify-between gap-3 px-4 py-3.5 hover:border-line2">
      <span className="min-w-0">
        <span className="flex flex-wrap items-center gap-2"><b className="text-[15px]">Jakarta to {s.dest.name}</b><StatusBadge status={s.status} /></span>
        <span className="note block">
          {s.number ?? "Number is issued on approval"} · {fmtDate(s.startDate, { year: false })} to {fmtDate(s.endDate)}
          {showEmployee ? ` · ${s.employee.name}` : ""}
        </span>
        <span className="block text-[13px] text-muted">{s.purpose}</span>
      </span>
      <span className="num text-right">
        <b className="block">{rp(showBooked ? spent : s.budget)}</b>
        <span className="note">{showBooked ? "booked" : "approved budget"}</span>
      </span>
    </Link>
  );
}
