import { Fragment } from "react";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/authz";
import { db } from "@/lib/db";
import { invoiceForViewer } from "@/server/billingService";
import { getT } from "@/i18n/server";
import { fmtDate, fmtDay, fmtPct, periodLabel, rp } from "@/lib/format";
import { InvoiceStatus } from "../../_components/invoice-bits";

export default async function InvoicePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await requireRole(["FINANCE_ADMIN", "OPS"], `/portal/invoices/${id}`);
  const me = await db.user.findUnique({ where: { id: session.user.id }, select: { role: true, companyId: true } });
  const inv = me && (await invoiceForViewer(id, me));
  if (!inv) notFound();
  const { t, locale } = await getT();
  const byCc = new Map<string, typeof inv.bookings>();
  for (const b of inv.bookings) {
    const cc = b.sppd.employee.costCentre ?? "-";
    byCc.set(cc, [...(byCc.get(cc) ?? []), b]);
  }
  return (
    <div className="flex max-w-4xl flex-col gap-5">
      <div><Link href={me!.role === "OPS" ? "/portal/billing" : "/portal/finance/invoices"} className="btn btn-line btn-sm">{t("common.back")}</Link></div>
      <article className="card p-6">
        <div className="mb-5 flex flex-wrap items-start justify-between gap-4 border-b border-line pb-5">
          <Image src="/logo.png" alt="kitawisata" width={148} height={30} />
          <div className="text-right"><b className="num block text-lg">{inv.number}</b><InvoiceStatus inv={inv} t={t} locale={locale} /></div>
        </div>
        <div className="mb-5 grid gap-4 text-[13.5px] sm:grid-cols-3">
          <div><div className="note">{t("inv.billTo")}</div><b>{inv.company.name}</b><div className="note">{t("inv.attn")}</div></div>
          <div><div className="note">{t("inv.periodLabel")}</div><b>{periodLabel(t, inv.periodYear, inv.periodMonth)}</b>
            <div className="note">{inv.bookings.length ? t("inv.generatedFrom", { n: inv.bookingCount }) : t("inv.archived")}</div></div>
          <div><div className="note">{t("inv.issuedDue")}</div><b>{fmtDate(inv.issuedOn, locale)} · {fmtDate(inv.dueOn, locale)}</b>
            <div className="note">{t("inv.termsNet", { n: Math.round((inv.dueOn.getTime() - inv.issuedOn.getTime()) / 864e5) })}</div></div>
        </div>
        {inv.bookings.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-[13.5px]">
              <thead><tr className="border-b border-line text-left text-[11.5px] tracking-[.06em] text-muted uppercase">
                <th className="px-3 py-2">{t("col.sppd")}</th><th className="px-3 py-2">{t("col.employee")}</th><th className="px-3 py-2">{t("col.item")}</th><th className="px-3 py-2 text-right">{t("col.amount")}</th></tr></thead>
              <tbody>
                {[...byCc.entries()].map(([cc, lines]) => (
                  <Fragment key={cc}>
                    <tr className="bg-ground"><td colSpan={4} className="px-3 py-2 text-[12.5px] font-extrabold tracking-[.04em] uppercase">{t("inv.cc", { cc })}</td></tr>
                    {lines.map((l) => (
                      <tr key={l.id} className="border-b border-line">
                        <td className="num px-3 py-2">{l.sppd.number?.split("/")[0] ?? "-"}</td><td className="px-3 py-2">{l.sppd.employee.name}</td>
                        <td className="px-3 py-2">{l.description}{!l.inPolicy && <span className="badge ml-2 bg-amber-t text-amber">{t("pol.exception")}</span>}</td>
                        <td className="num px-3 py-2 text-right">{rp(l.amount)}</td>
                      </tr>
                    ))}
                    <tr className="border-b border-line"><td colSpan={3} className="note px-3 py-2 text-right">{t("inv.ccSubtotal", { cc })}</td>
                      <td className="num px-3 py-2 text-right font-bold">{rp(lines.reduce((a, b) => a + b.amount, 0))}</td></tr>
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <dl className="num mt-5 ml-auto flex max-w-sm flex-col gap-1.5">
          <div className="flex justify-between gap-4"><dt>{t("inv.travel")}</dt><dd>{rp(inv.subtotal)}</dd></div>
          <div className="flex justify-between gap-4"><dt>{t("inv.fee", { n: inv.bookingCount, fee: rp(inv.feePerBooking) })}</dt><dd>{rp(inv.serviceFee)}</dd></div>
          <div className="flex justify-between gap-4"><dt>{t("inv.ppn", { rate: fmtPct(inv.ppnRateBps, locale) })}</dt><dd>{rp(inv.ppn)}</dd></div>
          <div className="mt-1 flex justify-between gap-4 border-t-2 border-ink pt-2 text-[17px] font-bold"><dt>{t("inv.totalDue")}</dt><dd>{rp(inv.total)}</dd></div>
        </dl>
        <div className="mt-6 rounded-xl bg-ground p-4 text-[13px]">
          {inv.status === "PAID"
            ? <p>{t("inv.paidOn", { date: fmtDay(inv.paidAt!, locale), name: inv.paidRecordedBy ?? "kitawisata" })}</p>
            : <><b>{t("inv.howToPay")}</b><p className="text-muted">{t("inv.howToPayBody", { date: fmtDate(inv.dueOn, locale), number: inv.number })}</p></>}
        </div>
      </article>
    </div>
  );
}
