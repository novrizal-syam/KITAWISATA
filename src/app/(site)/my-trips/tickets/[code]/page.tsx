import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { getT } from "@/i18n/server";
import { ticketForViewer, type TicketSearch } from "@/server/ticketService";
import { bankTransferDetails } from "@/server/paymentSettingsService";
import type { StayOffer, TravelOffer } from "@/domain/tickets";
import { BCP47 } from "@/i18n";
import { rp } from "@/lib/format";
import { PriceLines, offerLines } from "../../../travel/offer-summary";
import { TicketBadge } from "../../../_components/booking-bits";
import { CancelTicketForm } from "./cancel-form";

export default async function TicketPage({ params, searchParams }: { params: Promise<{ code: string }>; searchParams: Promise<{ created?: string }> }) {
  const { code } = await params;
  const session = await auth();
  if (!session) redirect(`/login?callbackUrl=/my-trips/tickets/${code}`);
  const [{ t, locale }, b, bank] = await Promise.all([getT(), ticketForViewer(code, { id: session.user.id, role: session.user.role }), bankTransferDetails()]);
  if (!b) notFound();
  const offer = b.offer as unknown as TravelOffer | StayOffer;
  const { title, lines } = offerLines(b.search as unknown as TicketSearch, offer, t, locale);
  const until = b.holdExpiresAt.toLocaleString(BCP47[locale], { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Jakarta" });
  const created = (await searchParams).created;
  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-4 px-4 py-8">
      <nav className="text-[14px]"><Link href="/my-trips" className="font-semibold text-red">← {t("site.myTrips")}</Link></nav>
      {created && b.status === "AWAITING_PAYMENT" && <p role="status" className="rounded-xl bg-green-t px-4 py-3 font-semibold text-green-d">{t("tk.createdBanner", { until })}</p>}
      <section className="card p-5">
        <div className="flex flex-wrap items-center gap-2"><h1 className="text-2xl font-bold">{title}</h1><TicketBadge status={b.status} t={t} /></div>
        {lines.map((l) => <p key={l} className="text-muted">{l}</p>)}
        <dl className="mt-4 grid gap-2 text-[14px] sm:grid-cols-2">
          <div><dt className="note">{t("my.code")}</dt><dd className="num text-lg font-bold tracking-wider">{b.code}</dd></div>
          <div><dt className="note">{t(b.kind === "STAY" ? "tk.leadGuest" : "tk.passengers")}</dt><dd>{b.travellerNames.join(", ")}</dd></div>
          {b.issuedRef && <div className="sm:col-span-2"><dt className="note">{t(b.kind === "STAY" ? "tk.voucher" : "tk.ticketRef")}</dt><dd className="num text-lg font-bold">{b.issuedRef}</dd></div>}
        </dl>
      </section>
      <section className="card p-5">
        <h2 className="mb-2 text-lg font-bold">{t("my.payments")}</h2>
        <PriceLines offer={offer} t={t} />
        {b.status === "AWAITING_PAYMENT" && (
          <div className="mt-4 rounded-xl bg-ground p-4 text-[14px]">
            <b>{t("my.howToPay")}</b>
            <p className="text-muted">{t("tk.howToPay", { amount: rp(b.total), code: b.code, until })}</p>
            {bank && <p className="mt-2">{t("pay.toAccount", { bank: bank.bank, number: bank.number, holder: bank.holder })}</p>}
          </div>
        )}
        {b.status === "PAID" && <p className="mt-3 rounded-xl bg-blue-t px-4 py-3 text-[14px] font-semibold text-blue">{t("tk.paidIssuing")}</p>}
        {b.status === "EXPIRED" && <p className="mt-3 rounded-xl bg-grey-t px-4 py-3 text-[14px] font-semibold text-muted">{t("tk.expired")}</p>}
        {b.status === "CANCELLED" && (
          <p className="mt-3 rounded-xl bg-grey-t px-4 py-3 text-[14px] font-semibold text-muted">
            {b.cancelReason === "not-issued" ? t(b.refundStatus === "REFUNDED" ? "tk.notIssuedRefunded" : "tk.notIssued", { amount: rp(b.refundAmount ?? 0) }) : t("tk.cancelled")}
          </p>
        )}
      </section>
      {b.status === "AWAITING_PAYMENT" && b.userId === session.user.id && <CancelTicketForm code={b.code} />}
    </main>
  );
}
