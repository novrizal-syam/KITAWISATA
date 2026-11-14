import Link from "next/link";
import { requireRole } from "@/lib/authz";
import { billingOverview } from "@/server/billingService";
import { getT } from "@/i18n/server";
import { periodLabel, rp } from "@/lib/format";
import { InvoiceStatus } from "../_components/invoice-bits";
import { GenerateButton, RecordPaymentButton } from "./forms";

export default async function Billing({ searchParams }: { searchParams: Promise<{ generated?: string; company?: string; paid?: string }> }) {
  await requireRole(["OPS"], "/portal/billing");
  const sp = await searchParams;
  const [{ t, locale }, { rows }] = await Promise.all([getT(), billingOverview()]);
  const flow = [t("bill.flow1"), t("bill.flow2"), t("bill.flow3"), t("bill.flow4"), t("bill.flow5")];
  const all = rows.flatMap((r) => r.company.invoices.map((i) => ({ ...i, companyName: r.company.name })));
  return (
    <div className="flex flex-col gap-5">
      <div><p className="eyebrow">{t("bill.eyebrow")}</p><h1 className="text-[28px] font-bold">{t("bill.title")}</h1></div>
      {sp.generated && <p role="status" className="rounded-xl bg-green-t px-4 py-3 font-semibold text-green-d">{t("bill.generated", { number: sp.generated, company: sp.company ?? "" })}</p>}
      {sp.paid && <p role="status" className="rounded-xl bg-green-t px-4 py-3 font-semibold text-green-d">{t("bill.paidRecorded", { number: sp.paid })}</p>}
      <section className="card p-5">
        <h2 className="mb-3 text-base font-bold">{t("bill.how")}</h2>
        <ol className="flex flex-wrap items-center gap-2 text-[13px] font-semibold">
          {flow.map((f, i) => <li key={f} className="flex items-center gap-2"><span className="rounded-lg border border-line2 px-2.5 py-1.5">{f}</span>{i < flow.length - 1 && <span aria-hidden className="text-muted">→</span>}</li>)}
        </ol>
        <p className="note mt-3">{t("bill.autoNote")}</p>
      </section>
      <div className="card overflow-x-auto">
        <table className="w-full text-[13.5px]">
          <thead><tr className="border-b border-line text-left text-[11.5px] tracking-[.06em] text-muted uppercase">
            <th className="px-3 py-2.5">{t("col.company")}</th><th className="px-3 py-2.5">{t("col.uninvoiced")}</th><th className="px-3 py-2.5 text-right">{t("col.amount")}</th>
            <th className="px-3 py-2.5 text-right">{t("col.feePpn")}</th><th /></tr></thead>
          <tbody>
            {rows.map(({ company: c, open }) => (
              <tr key={c.id} className="border-b border-line last:border-0">
                <td className="px-3 py-2.5"><b>{c.name}</b><div className="note">{t("inv.termsNet", { n: c.paymentTermDays })}</div></td>
                <td className="num px-3 py-2.5">{open.bookingCount}</td>
                <td className="num px-3 py-2.5 text-right">{rp(open.subtotal)}</td>
                <td className="num px-3 py-2.5 text-right">{rp(open.serviceFee + open.ppn)}</td>
                <td className="px-3 py-2.5 text-right"><GenerateButton companyId={c.id} companyName={c.name} disabled={open.bookingCount === 0} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <section className="flex flex-col gap-2.5">
        <h2 className="text-lg font-bold">{t("bill.invoices")}</h2>
        <div className="card overflow-x-auto">
          <table className="w-full text-[13.5px]">
            <thead><tr className="border-b border-line text-left text-[11.5px] tracking-[.06em] text-muted uppercase">
              <th className="px-3 py-2.5">{t("col.invoice")}</th><th className="px-3 py-2.5">{t("col.company")}</th><th className="px-3 py-2.5">{t("col.period")}</th>
              <th className="px-3 py-2.5">{t("col.status")}</th><th className="px-3 py-2.5 text-right">{t("col.total")}</th><th /></tr></thead>
            <tbody>
              {all.map((i) => (
                <tr key={i.id} className="border-b border-line last:border-0">
                  <td className="num px-3 py-2.5 font-bold"><Link href={`/portal/invoices/${i.id}`} className="underline-offset-2 hover:underline">{i.number}</Link></td>
                  <td className="px-3 py-2.5">{i.companyName}</td>
                  <td className="px-3 py-2.5">{periodLabel(t, i.periodYear, i.periodMonth)}</td>
                  <td className="px-3 py-2.5"><InvoiceStatus inv={i} t={t} locale={locale} /></td>
                  <td className="num px-3 py-2.5 text-right">{rp(i.total)}</td>
                  <td className="px-3 py-2.5 text-right">{i.status === "ISSUED" && <RecordPaymentButton invoiceId={i.id} number={i.number} />}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
