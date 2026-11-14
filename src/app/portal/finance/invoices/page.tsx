import Link from "next/link";
import { requireRole } from "@/lib/authz";
import { portalUser } from "@/server/portal";
import { invoicesForCompany } from "@/server/billingService";
import { reportMonth } from "@/server/period";
import { getT } from "@/i18n/server";
import { db } from "@/lib/db";
import { fmtDate, periodLabel, rp } from "@/lib/format";
import { InvoiceStatus } from "../../_components/invoice-bits";

export default async function FinanceInvoices() {
  const session = await requireRole(["FINANCE_ADMIN"], "/portal/finance/invoices");
  const me = (await portalUser(session.user.id))!;
  const p = reportMonth();
  const [{ t, locale }, invoices, open] = await Promise.all([
    getT(), invoicesForCompany(me.company.id),
    db.tripBooking.findMany({ where: { invoiceId: null, sppd: { companyId: me.company.id } }, select: { amount: true } }),
  ]);
  const openTotal = open.reduce((a, b) => a + b.amount, 0);
  return (
    <div className="flex flex-col gap-5">
      <div><p className="eyebrow">{t("inv.eyebrow")}</p><h1 className="text-[28px] font-bold">{t("inv.title")}</h1></div>
      <div className="card flex flex-wrap items-center justify-between gap-4 p-5">
        <div>
          <div className="note">{t("inv.open", { period: periodLabel(t, p.year, p.month) })}</div>
          <b className="num text-[22px]">{rp(openTotal)}</b>
          <div className="note">{t("inv.openSub", { n: open.length })}</div>
        </div>
        <Link href="/portal/finance/report" className="btn btn-line">{t("inv.seeReport")}</Link>
      </div>
      <div className="card overflow-x-auto">
        {invoices.length === 0 ? <p className="p-5 text-muted">{t("inv.none")}</p> : (
          <table className="w-full text-[13.5px]">
            <thead><tr className="border-b border-line text-left text-[11.5px] tracking-[.06em] text-muted uppercase">
              <th className="px-3 py-2.5">{t("col.invoice")}</th><th className="px-3 py-2.5">{t("col.period")}</th><th className="px-3 py-2.5">{t("col.issued")}</th>
              <th className="px-3 py-2.5">{t("col.status")}</th><th className="px-3 py-2.5 text-right">{t("col.total")}</th><th /></tr></thead>
            <tbody>
              {invoices.map((i) => (
                <tr key={i.id} className="border-b border-line last:border-0">
                  <td className="num px-3 py-2.5 font-bold">{i.number}</td>
                  <td className="px-3 py-2.5">{periodLabel(t, i.periodYear, i.periodMonth)}</td>
                  <td className="px-3 py-2.5">{fmtDate(i.issuedOn, locale)}</td>
                  <td className="px-3 py-2.5"><InvoiceStatus inv={i} t={t} locale={locale} /></td>
                  <td className="num px-3 py-2.5 text-right font-bold">{rp(i.total)}</td>
                  <td className="px-3 py-2.5 text-right"><Link href={`/portal/invoices/${i.id}`} className="btn btn-line btn-sm">{t("inv.view")}</Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
