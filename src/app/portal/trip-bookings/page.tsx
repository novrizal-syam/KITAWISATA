import Link from "next/link";
import { requireRole } from "@/lib/authz";
import { getT } from "@/i18n/server";
import { allTripBookings } from "@/server/openTripBookingService";
import { nextUnpaid, paidAmount } from "@/domain/openTripBooking";
import { fmtDate, rp } from "@/lib/format";
import { BookingBadge } from "../../(site)/_components/booking-bits";
import { MarkRefunded, RecordTripPayment } from "./buttons";

export default async function TripBookings({ searchParams }: { searchParams: Promise<{ paid?: string; seq?: string; refunded?: string }> }) {
  await requireRole(["OPS"], "/portal/trip-bookings");
  const sp = await searchParams;
  const [{ t, locale }, bookings] = await Promise.all([getT(), allTripBookings()]);
  return (
    <div className="flex flex-col gap-5">
      <div><p className="eyebrow">{t("ot.eyebrow")}</p><h1 className="text-[28px] font-bold">{t("tb.title")}</h1><p className="mt-1 text-muted">{t("tb.intro")}</p></div>
      {sp.paid && <p role="status" className="rounded-xl bg-green-t px-4 py-3 font-semibold text-green-d">{t("tb.paidRecorded", { code: sp.paid, n: sp.seq ?? "" })}</p>}
      {sp.refunded && <p role="status" className="rounded-xl bg-green-t px-4 py-3 font-semibold text-green-d">{t("tb.refundRecorded", { code: sp.refunded })}</p>}
      <div className="card overflow-x-auto">
        {bookings.length === 0 ? <p className="p-5 text-muted">{t("tb.none")}</p> : (
          <table className="w-full text-[13.5px]">
            <thead><tr className="border-b border-line text-left text-[11.5px] tracking-[.06em] text-muted uppercase">
              <th className="px-3 py-2.5">{t("my.code")}</th><th className="px-3 py-2.5">{t("tb.trip")}</th><th className="px-3 py-2.5">{t("tb.contact")}</th>
              <th className="px-3 py-2.5">{t("col.status")}</th><th className="px-3 py-2.5 text-right">{t("tb.paid")}</th><th /></tr></thead>
            <tbody>
              {bookings.map((b) => {
                const next = nextUnpaid(b.instalments);
                const canRecord = (b.status === "HELD" || b.status === "CONFIRMED") && next;
                return (
                  <tr key={b.id} className="border-b border-line align-top last:border-0">
                    <td className="num px-3 py-2.5 font-bold"><Link href={`/my-trips/${b.code}`} className="hover:underline">{b.code}</Link></td>
                    <td className="px-3 py-2.5">{b.departure.openTrip.name}<div className="note">{fmtDate(b.departure.departDate, locale)} · {t("my.pax", { n: b.pax })}</div></td>
                    <td className="px-3 py-2.5">{b.contactName}<div className="note num">{b.contactPhone}</div></td>
                    <td className="px-3 py-2.5"><BookingBadge status={b.status} t={t} />
                      {b.status === "CANCELLED" && (b.refundAmount ?? 0) > 0 && <div className="note mt-1">{t(b.refundStatus === "REFUNDED" ? "tb.refundDone" : "tb.refundOwed", { amount: rp(b.refundAmount ?? 0) })}</div>}</td>
                    <td className="num px-3 py-2.5 text-right">{rp(paidAmount(b.instalments))}<div className="note">/ {rp(b.total)}</div></td>
                    <td className="px-3 py-2.5 text-right">
                      {canRecord && <RecordTripPayment bookingId={b.id} label={t("tb.record", { amount: rp(next.amount) })} confirmText={t("tb.confirmPayment", { amount: rp(next.amount), code: b.code })} />}
                      {b.status === "CANCELLED" && b.refundStatus === "PENDING" && <MarkRefunded bookingId={b.id} code={b.code} />}
                    </td>
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
