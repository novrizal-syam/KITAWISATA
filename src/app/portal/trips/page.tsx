import Link from "next/link";
import { PORTAL_ROLES, requireRole } from "@/lib/authz";
import { mySppds, portalUser } from "@/server/portal";
import { CAR_LABEL, FLIGHT_LABEL, GRADE_LABEL, TRAIN_LABEL, fmtDate, rp } from "@/lib/format";
import { SppdRow } from "../_components/sppd-bits";

export default async function MyTravel() {
  const session = await requireRole(PORTAL_ROLES, "/portal/trips");
  const [me, sppds] = await Promise.all([portalUser(session.user.id), mySppds(session.user.id)]);
  const ready = sppds.find((s) => s.status === "APPROVED");
  const p = me?.policy;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div><p className="eyebrow">My travel</p><h1 className="text-[28px] font-bold">Hello, {me?.name?.split(" ")[0]}</h1></div>
        <Link href="/portal/trips/new" className="btn btn-red">+ New SPPD request</Link>
      </div>

      {ready && (
        <div className="card flex flex-wrap items-center justify-between gap-3 border-2 border-blue p-5">
          <div>
            <span className="badge bg-blue-t text-blue">Ready to plan</span>
            <h2 className="mt-2 text-lg font-bold">Jakarta to {ready.dest.name}, {fmtDate(ready.startDate, { year: false })} to {fmtDate(ready.endDate, { year: false })}</h2>
            <p className="note">{ready.number} approved. Budget {rp(ready.budget)}.</p>
          </div>
          <Link href={`/portal/trips/${ready.id}`} className="btn btn-red">Plan my trip</Link>
        </div>
      )}

      {p && me?.grade && (
        <section className="card p-5">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-base font-bold">My travel policy · {GRADE_LABEL[me.grade]}</h2>
            <span className="note">Set by Finance · cost centre {me.costCentre ?? "-"} · approver {me.manager?.name ?? "Finance"}</span>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {[[rp(p.hotelNightCap), "Hotel, per night max"], [FLIGHT_LABEL[p.flightClass], "Flight class"], [CAR_LABEL[p.carClass], "Car rental, up to"],
              [TRAIN_LABEL[p.trainClass], "Train class, up to"], [rp(p.dailyAllowance), "Daily allowance"]].map(([v, l]) => (
              <div key={l} className="rounded-xl border border-line p-3"><b className="num block">{v}</b><span className="note">{l}</span></div>
            ))}
          </div>
        </section>
      )}

      <section className="flex flex-col gap-2.5">
        <h2 className="text-lg font-bold">My SPPD requests</h2>
        {sppds.length ? sppds.map((s) => <SppdRow key={s.id} s={s} />) : <p className="card p-5 text-muted">No requests yet.</p>}
      </section>
    </div>
  );
}
