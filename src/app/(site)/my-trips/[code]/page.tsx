import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { getT } from "@/i18n/server";
import { quoteFor, tripBookingForViewer } from "@/server/openTripBookingService";
import { daysBetween, todayInJakarta } from "@/domain/dates";
import { nextUnpaid, paidAmount } from "@/domain/openTripBooking";
import type { TermsSnapshot } from "@/domain/cancellation";
import { BCP47 } from "@/i18n";
import { fmtDate, fmtDay, rp } from "@/lib/format";
import { BookingBadge } from "../../_components/booking-bits";
import { FeeTable } from "../../_components/fee-table";
import { CancelForm } from "./cancel-form";

export default async function MyTrip({ params, searchParams }: { params: Promise<{ code: string }>; searchParams: Promise<{ held?: string; cancelled?: string }> }) {
  const { code } = await params;
  const session = await auth();
  if (!session) redirect(`/login?callbackUrl=/my-trips/${code}`);
  const [{ t, locale }, b] = await Promise.all([getT(), tripBookingForViewer(code, { id: session.user.id, role: session.user.role })]);
  if (!b) notFound();
  const sp = await searchParams;
  const trip = b.departure.openTrip;
  const paid = paidAmount(b.instalments);
  const next = nextUnpaid(b.instalments);
  const snapshot = b.termsSnapshot as unknown as TermsSnapshot;
  const active = ["HELD", "CONFIRMED", "PAID"].includes(b.status);
  const canCancel = active && b.userId === session.user.id && daysBetween(todayInJakarta(), b.departure.departDate) > 0;
  const quote = canCancel ? quoteFor(b) : null;
  const holdUntil = b.holdExpiresAt.toLocaleString(BCP47[locale], { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Jakarta" });
  const banner = (msg: string) => <p role="status" className="rounded-xl bg-green-t px-4 py-3 font-semibold text-green-d">{msg}</p>;
  return (
    <main className="mx-auto flex max-w-3xl flex-col gap-4 px-4 py-8">
      <nav className="text-[14px]"><Link href="/my-trips" className="font-semibold text-red">← {t("site.myTrips")}</Link></nav>
      {sp.held && b.status === "HELD" && banner(t("my.heldBanner", { until: holdUntil }))}
      {sp.cancelled && b.status === "CANCELLED" && banner(t("my.cancelledBanner"))}
      <section className="card p-5">
        <div className="flex flex-wrap items-center gap-2"><h1 className="text-2xl font-bold">{trip.name}</h1><BookingBadge status={b.status} t={t} /></div>
        <p className="mt-1 text-muted">{fmtDate(b.departure.departDate, locale)} · {trip.durationLabel} · {t("my.pax", { n: b.pax })}</p>
        <p className="mt-1 text-muted">{t("site.meeting", { place: trip.meetingPoint })}</p>
        <dl className="mt-4 grid gap-2 text-[14px] sm:grid-cols-2">
          <div><dt className="note">{t("my.code")}</dt><dd className="num text-lg font-bold tracking-wider">{b.code}</dd></div>
          <div><dt className="note">{t("my.travellers")}</dt><dd>{b.travellerNames.join(", ")}</dd></div>
        </dl>
      </section>

      {b.status === "HELD" && <p className="rounded-xl bg-amber-t px-4 py-3 text-[14px] font-semibold text-amber">{t("my.heldUntil", { until: holdUntil })}</p>}
      {b.status === "EXPIRED" && <p className="rounded-xl bg-grey-t px-4 py-3 text-[14px] font-semibold text-muted">{t("my.expired")}</p>}

      <section className="card p-5">
        <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2"><h2 className="text-lg font-bold">{t("my.payments")}</h2>
          <span className="num note">{t("my.paidOf", { paid: rp(paid), total: rp(b.total) })}</span></div>
        <div className="mb-3 h-2 overflow-hidden rounded-full bg-grey-t" role="presentation"><div className="h-full bg-green" style={{ width: `${Math.round((paid / b.total) * 100)}%` }} /></div>
        <ul className="num flex flex-col divide-y divide-line">
          {b.instalments.map((i) => (
            <li key={i.id} className="flex flex-wrap justify-between gap-2 py-2">
              <span>{i.seq === 1 && b.plan === "SPLIT" ? t("my.downPayment") : b.plan === "FULL" ? t("book.full") : t("my.instalment", { n: i.seq })} · {t("my.due", { date: fmtDate(i.dueOn, locale) })}</span>
              <span className="flex items-center gap-2"><b>{rp(i.amount)}</b>{i.paidAt ? <span className="badge bg-green-t text-green-d">✓ {t("inv.paid")}</span> : <span className="badge bg-amber-t text-amber">{t("my.unpaid")}</span>}</span>
            </li>
          ))}
        </ul>
        {active && next && (
          <div className="mt-4 rounded-xl bg-ground p-4 text-[14px]">
            <b>{t("my.howToPay")}</b>
            <p className="text-muted">{t("my.howToPayBody", { amount: rp(next.amount), code: b.code, date: fmtDate(next.dueOn, locale) })}</p>
          </div>
        )}
      </section>

      {b.status === "CANCELLED" && (
        <section className="card p-5">
          <h2 className="mb-2 text-lg font-bold">{t("my.cancelled")}</h2>
          <dl className="num flex flex-col gap-1 text-[14px]">
            <div className="flex justify-between"><dt>{t("my.feeKept")}</dt><dd>{rp(b.cancellationFee ?? 0)}</dd></div>
            <div className="flex justify-between font-bold"><dt>{t("my.refund")}</dt><dd>{rp(b.refundAmount ?? 0)}</dd></div>
          </dl>
          {(b.refundAmount ?? 0) > 0 && <p className="note mt-2">{b.refundStatus === "REFUNDED" ? t("my.refunded") : t("my.refundPending")}</p>}
        </section>
      )}

      {quote && <CancelForm code={b.code} quote={quote} held={b.status === "HELD"} />}

      <section className="card p-5">
        <h2 className="mb-1 text-lg font-bold">{t("fees.title")}</h2>
        <p className="note mb-3">{t("my.yourTerms", { date: fmtDay(b.termsAcceptedAt, locale) })}</p>
        <FeeTable tiers={snapshot.tiers} total={b.total} t={t} />
        <details className="mt-3"><summary className="cursor-pointer font-semibold">{t("fees.terms")}</summary><p className="mt-2 text-[14px] whitespace-pre-line text-muted">{snapshot.terms}</p></details>
      </section>
    </main>
  );
}
