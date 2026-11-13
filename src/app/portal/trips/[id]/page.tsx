import Link from "next/link";
import { notFound } from "next/navigation";
import { PORTAL_ROLES, requireRole } from "@/lib/authz";
import { portalUser, sppdForViewer } from "@/server/portal";
import { NEED_LABEL, fmtDate, rp } from "@/lib/format";
import { tripDays } from "@/domain/dates";
import { StatusBadge, booked } from "../../_components/sppd-bits";
import { ApprovalTimeline } from "../../_components/timeline";

export default async function SppdDetail({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ submitted?: string }> }) {
  const { id } = await params;
  const session = await requireRole(PORTAL_ROLES, `/portal/trips/${id}`);
  const me = await portalUser(session.user.id);
  const s = me && (await sppdForViewer(id, { id: me.id, role: me.role, companyId: me.companyId }));
  if (!s) notFound();
  const { submitted } = await searchParams;
  const spent = booked(s);
  const left = s.budget - spent;

  return (
    <div className="flex flex-col gap-5">
      <div><Link href={s.employeeId === me!.id ? "/portal/trips" : "/portal/approvals"} className="btn btn-line btn-sm">← Back</Link></div>
      {submitted && <p role="status" className="rounded-xl bg-green-t px-4 py-3 font-semibold text-green-d">Request submitted. We&apos;ve sent it to your approver.</p>}
      <div>
        <p className="eyebrow">{s.number ?? "SPPD request"}</p>
        <h1 className="text-[28px] font-bold">Jakarta to {s.dest.name}</h1>
        <p className="mt-1 flex flex-wrap items-center gap-2 text-muted">
          <StatusBadge status={s.status} />
          {s.employee.name} · {fmtDate(s.startDate)} to {fmtDate(s.endDate)} · {tripDays(s.startDate, s.endDate)} days{s.employee.costCentre ? ` · ${s.employee.costCentre}` : ""}
        </p>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1fr_330px]">
        <div className="flex flex-col gap-5">
          <section className="card p-5">
            <h2 className="mb-1 text-base font-bold">Purpose</h2>
            <p>{s.purpose}</p>
            <p className="note mt-2">Needs: {s.needs.map((n) => NEED_LABEL[n]).join(", ")}</p>
          </section>
          {s.status === "APPROVED" && s.employeeId === me!.id && (
            <section className="card border-2 border-blue p-5">
              <h2 className="text-base font-bold">Plan your trip</h2>
              <p className="note">Booking inside your limits is the next part of the portal to be built.</p>
            </section>
          )}
          {s.bookings.length > 0 && (
            <section className="card p-5">
              <h2 className="mb-2 text-base font-bold">Bookings</h2>
              <ul className="flex flex-col divide-y divide-line">
                {s.bookings.map((b) => (
                  <li key={b.id} className="flex justify-between gap-3 py-2">
                    <span>{b.description}{!b.inPolicy && <span className="badge ml-2 bg-amber-t text-amber">Approved exception</span>}</span>
                    <b className="num">{rp(b.amount)}</b>
                  </li>
                ))}
              </ul>
            </section>
          )}
          <section className="card p-5">
            <h2 className="mb-3 text-base font-bold">Approval flow</h2>
            <ApprovalTimeline s={s} />
          </section>
        </div>
        <aside className="card h-fit p-5">
          <h2 className="mb-3 text-base font-bold">Budget</h2>
          <dl className="num flex flex-col gap-1.5">
            <div className="flex justify-between"><dt>Approved</dt><dd className="font-bold">{rp(s.budget)}</dd></div>
            <div className="flex justify-between"><dt>Booked</dt><dd className="font-bold">{rp(spent)}</dd></div>
            <div className="flex justify-between"><dt>Remaining</dt><dd className={`font-bold ${left >= 0 ? "text-green" : "text-red-d"}`}>{rp(left)}</dd></div>
          </dl>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-grey-t" role="presentation">
            <div className="h-full bg-green" style={{ width: `${Math.min(100, (spent / s.budget) * 100)}%` }} />
          </div>
        </aside>
      </div>
    </div>
  );
}
