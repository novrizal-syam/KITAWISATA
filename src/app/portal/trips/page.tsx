import Link from "next/link";
import { PORTAL_ROLES, requireRole } from "@/lib/authz";
import { mySppds, portalUser } from "@/server/portal";
import { fmtDate, rp } from "@/lib/format";
import { getT } from "@/i18n/server";
import { SppdRow } from "../_components/sppd-bits";

export default async function MyTravel() {
  const session = await requireRole(PORTAL_ROLES, "/portal/trips");
  const [me, sppds, { t, locale }] = await Promise.all([portalUser(session.user.id), mySppds(session.user.id), getT()]);
  const ready = sppds.find((s) => s.status === "APPROVED");
  const p = me?.policy;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div><p className="eyebrow">{t("trips.eyebrow")}</p><h1 className="text-[28px] font-bold">{t("trips.hello", { name: me?.name?.split(" ")[0] ?? "" })}</h1></div>
        <Link href="/portal/trips/new" className="btn btn-red">{t("trips.new")}</Link>
      </div>

      {ready && (
        <div className="card flex flex-wrap items-center justify-between gap-3 border-2 border-blue p-5">
          <div>
            <span className="badge bg-blue-t text-blue">{t("trips.ready")}</span>
            <h2 className="mt-2 text-lg font-bold">{t("trips.readyTitle", { city: ready.dest.name, from: fmtDate(ready.startDate, locale, { year: false }), to: fmtDate(ready.endDate, locale, { year: false }) })}</h2>
            <p className="note">{t("trips.readyBody", { number: ready.number ?? "", budget: rp(ready.budget) })}</p>
          </div>
          <Link href={`/portal/trips/${ready.id}`} className="btn btn-red">{t("trips.plan")}</Link>
        </div>
      )}

      {p && me?.grade && (
        <section className="card p-5">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-base font-bold">{t("trips.policyTitle", { grade: t(`grade.${me.grade}`) })}</h2>
            <span className="note">{t("trips.policyMeta", { cc: me.costCentre ?? "-", approver: me.manager?.name ?? t("new.finance") })}</span>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {[[rp(p.hotelNightCap), t("trips.policyHotel")], [t(`class.${p.flightClass}`), t("trips.policyFlight")], [t(`car.${p.carClass}`), t("trips.policyCar")],
              [t(`class.${p.trainClass}`), t("trips.policyTrain")], [rp(p.dailyAllowance), t("trips.policyAllowance")]].map(([v, l]) => (
              <div key={l} className="rounded-xl border border-line p-3"><b className="num block">{v}</b><span className="note">{l}</span></div>
            ))}
          </div>
        </section>
      )}

      <section className="flex flex-col gap-2.5">
        <h2 className="text-lg font-bold">{t("trips.myRequests")}</h2>
        {sppds.length ? sppds.map((s) => <SppdRow key={s.id} s={s} t={t} locale={locale} />) : <p className="card p-5 text-muted">{t("trips.none")}</p>}
      </section>
    </div>
  );
}
