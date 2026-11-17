import Link from "next/link";
import { requireRole } from "@/lib/authz";
import { db } from "@/lib/db";
import { getT } from "@/i18n/server";
import { allTicketBookings, type TicketSearch } from "@/server/ticketService";
import type { StayOffer, TravelOffer } from "@/domain/tickets";
import { rp } from "@/lib/format";
import { TicketBadge } from "../../(site)/_components/booking-bits";
import { offerLines } from "../../(site)/travel/offer-summary";
import { TicketRowActions } from "./row-actions";

export default async function TicketBookings({ searchParams }: { searchParams: Promise<{ done?: string; code?: string }> }) {
  await requireRole(["OPS"], "/portal/ticket-bookings");
  const sp = await searchParams;
  const [{ t, locale }, bookings, issuers] = await Promise.all([getT(), allTicketBookings(), db.supplierConnection.findMany({ where: { canIssue: true }, select: { id: true, name: true } })]);
  const issuerName = (id: string) => issuers.find((s) => s.id === id)?.name;
  const done = sp.done && sp.code ? t(`tko.done.${sp.done as "pay"}`, { code: sp.code }) : null;
  return (
    <div className="flex flex-col gap-5">
      <div><p className="eyebrow">{t("ot.eyebrow")}</p><h1 className="text-[28px] font-bold">{t("tko.title")}</h1><p className="mt-1 text-muted">{t("tko.intro")}</p></div>
      {done && <p role="status" className="rounded-xl bg-green-t px-4 py-3 font-semibold text-green-d">{done}</p>}
      <div className="card overflow-x-auto">
        {bookings.length === 0 ? <p className="p-5 text-muted">{t("tb.none")}</p> : (
          <table className="w-full text-[13.5px]">
            <thead><tr className="border-b border-line text-left text-[11.5px] tracking-[.06em] text-muted uppercase">
              <th className="px-3 py-2.5">{t("my.code")}</th><th className="px-3 py-2.5">{t("tko.item")}</th><th className="px-3 py-2.5">{t("tb.contact")}</th>
              <th className="px-3 py-2.5">{t("col.status")}</th><th className="px-3 py-2.5 text-right">{t("col.total")}</th><th /></tr></thead>
            <tbody>
              {bookings.map((b) => {
                const { title, lines } = offerLines(b.search as unknown as TicketSearch, b.offer as unknown as TravelOffer | StayOffer, t, locale);
                return (
                  <tr key={b.id} className="border-b border-line align-top last:border-0">
                    <td className="num px-3 py-2.5 font-bold"><Link href={`/my-trips/tickets/${b.code}`} className="hover:underline">{b.code}</Link><div className="note font-normal">{t(`tk.kind.${b.kind}`)}{b.supplierId !== "sample" ? ` · ${issuerName(b.supplierId) ?? t("sup.supplier")}` : ""}</div></td>
                    <td className="px-3 py-2.5">{title}<div className="note">{lines[0]}</div><div className="note">{b.travellerNames.join(", ")}</div></td>
                    <td className="px-3 py-2.5">{b.contactName}<div className="note num">{b.contactPhone}</div></td>
                    <td className="px-3 py-2.5"><TicketBadge status={b.status} t={t} />{b.issuedRef && <div className="note num mt-1">{b.issuedRef}</div>}
                      {b.refundStatus !== "NONE" && <div className="note mt-1">{t(b.refundStatus === "REFUNDED" ? "tb.refundDone" : "tb.refundOwed", { amount: rp(b.refundAmount ?? 0) })}</div>}</td>
                    <td className="num px-3 py-2.5 text-right">{rp(b.total)}</td>
                    <td className="px-3 py-2.5 text-right"><TicketRowActions id={b.id} code={b.code} status={b.status} refundPending={b.refundStatus === "PENDING"} total={b.total} kind={b.kind} supplierName={issuerName(b.supplierId)} /></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
