import Link from "next/link";
import { requireRole } from "@/lib/authz";
import { portalUser } from "@/server/portal";
import { spendingReport } from "@/server/billingService";
import { monthParam, reportMonth } from "@/server/period";
import { getT } from "@/i18n/server";
import { periodLabel, rp, rpShort } from "@/lib/format";
import { HBarList, MonthBars, MonthLabels } from "../../_components/bars";

export default async function SpendingReport({ searchParams }: { searchParams: Promise<{ month?: string }> }) {
  const session = await requireRole(["FINANCE_ADMIN"], "/portal/finance/report");
  const me = (await portalUser(session.user.id))!;
  const p = reportMonth((await searchParams).month);
  const [{ t, locale }, r] = await Promise.all([getT(), spendingReport(me.company.id, p.year, p.month)]);
  const period = periodLabel(t, p.year, p.month);
  const short = (n: number) => rpShort(n, locale);
  const tiles = [
    [t("rep.total"), short(r.total), t("rep.bookingsN", { n: r.bookings.length })],
    [t("rep.trips"), String(r.trips), t("rep.tripsSub")],
    [t("rep.avg"), short(r.avgPerTrip), t("rep.avgSub")],
    [t("rep.inPolicy"), `${r.inPolicyPct}%`, r.exceptions === 0 ? t("rep.exceptions0") : r.exceptions === 1 ? t("rep.exceptions1") : t("rep.exceptionsN", { n: r.exceptions })],
  ];

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="eyebrow">{t("rep.eyebrow")}</p>
          <h1 className="text-[28px] font-bold">{p.isCurrent ? t("rep.titleCurrent", { period }) : t("rep.title", { period })}</h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href={`?month=${monthParam(p.prev)}`} className="btn btn-line btn-sm">{t("rep.prev")}</Link>
          {p.next && <Link href={`?month=${monthParam(p.next)}`} className="btn btn-line btn-sm">{t("rep.next")}</Link>}
          <a href={`/portal/finance/report/export?month=${monthParam(p)}`} className="btn btn-line btn-sm" download>{t("rep.export")}</a>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {tiles.map(([l, v, sub]) => (
          <div key={l} className="card p-4"><span className="note">{l}</span><b className="num block text-2xl">{v}</b><span className="note">{sub}</span></div>
        ))}
      </div>

      {r.bookings.length === 0 ? <p className="card p-5 text-muted">{t("rep.empty")}</p> : (
        <div className="grid gap-4 lg:grid-cols-2">
          <section className="card p-5"><h2 className="mb-4 text-base font-bold">{t("rep.byCategory")}</h2>
            <HBarList label={t("rep.byCategory")} rows={r.byCategory.map(([k, v]) => ({ name: t(`need.${k as "FLIGHT"}`), value: v, display: short(v) }))} /></section>
          <section className="card p-5"><h2 className="mb-4 text-base font-bold">{t("rep.byDept")}</h2>
            <HBarList label={t("rep.byDept")} rows={r.byDepartment.map(([k, v]) => ({ name: k, value: v, display: short(v) }))} /></section>
          <section className="card p-5"><h2 className="text-base font-bold">{t("rep.monthly")}</h2><p className="note">{t("rep.monthlySub")}</p>
            <MonthBars label={t("rep.monthly")} bars={r.history.map((h) => ({ key: `${h.year}-${h.month}`, name: periodLabel(t, h.year, h.month), value: h.amount, display: short(h.amount), current: h.current }))} />
            <MonthLabels names={r.history.map((h) => t(`month.${h.month as 1}`).slice(0, 3))} /></section>
          <section className="card p-5"><h2 className="mb-4 text-base font-bold">{t("rep.byTraveller")}</h2>
            <HBarList label={t("rep.byTraveller")} rows={r.byTraveller.map(([k, v]) => ({ name: k, value: v, display: short(v) }))} /></section>
        </div>
      )}

      {r.bookings.length > 0 && (
        <section className="flex flex-col gap-2.5">
          <h2 className="text-lg font-bold">{t("rep.all")}</h2>
          <div className="card overflow-x-auto">
            <table className="w-full text-[13.5px]">
              <thead><tr className="border-b border-line text-left text-[11.5px] tracking-[.06em] text-muted uppercase">
                <th className="px-3 py-2.5">{t("col.sppd")}</th><th className="px-3 py-2.5">{t("col.employee")}</th><th className="px-3 py-2.5">{t("col.item")}</th>
                <th className="px-3 py-2.5">{t("col.policy")}</th><th className="px-3 py-2.5 text-right">{t("col.amount")}</th></tr></thead>
              <tbody>
                {r.bookings.map((b) => (
                  <tr key={b.id} className="border-b border-line last:border-0">
                    <td className="num px-3 py-2.5 font-bold">{b.sppd.number?.split("/")[0] ?? "-"}</td>
                    <td className="px-3 py-2.5">{b.sppd.employee.name}<div className="note">{b.sppd.employee.costCentre}</div></td>
                    <td className="px-3 py-2.5"><span className="note">{t(`need.${b.category}`)} · </span>{b.description}</td>
                    <td className="px-3 py-2.5">{b.inPolicy ? <span className="badge bg-green-t text-green-d">{t("pol.in")}</span> : <span className="badge bg-amber-t text-amber">{t("pol.exception")}</span>}</td>
                    <td className="num px-3 py-2.5 text-right">{rp(b.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}
