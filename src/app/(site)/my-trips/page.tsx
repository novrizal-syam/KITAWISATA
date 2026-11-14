import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getT } from "@/i18n/server";
import { myTripBookings } from "@/server/openTripBookingService";
import { paidAmount } from "@/domain/openTripBooking";
import { fmtDate, rp } from "@/lib/format";
import { BookingBadge } from "../_components/booking-bits";

export default async function MyTrips() {
  const session = await auth();
  if (!session) redirect("/login?callbackUrl=/my-trips");
  const [{ t, locale }, bookings] = await Promise.all([getT(), myTripBookings(session.user.id)]);
  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="mb-5 text-2xl font-bold">{t("site.myTrips")}</h1>
      {bookings.length === 0 ? (
        <div className="card p-6"><p className="text-muted">{t("my.none")}</p><Link href="/#trips" className="btn btn-red mt-4">{t("site.heroCta")}</Link></div>
      ) : (
        <ul className="flex flex-col gap-3">
          {bookings.map((b) => (
            <li key={b.id}>
              <Link href={`/my-trips/${b.code}`} className="card flex gap-4 overflow-hidden hover:border-line2">
                <Image src={`/img/${b.departure.openTrip.image}-sm.jpg`} alt="" width={160} height={120} className="hidden w-40 object-cover sm:block" />
                <span className="flex min-w-0 flex-1 flex-col gap-1 p-4">
                  <span className="flex flex-wrap items-center gap-2"><b className="text-[16px]">{b.departure.openTrip.name}</b><BookingBadge status={b.status} t={t} /></span>
                  <span className="note">{b.code} · {fmtDate(b.departure.departDate, locale)} · {t("my.pax", { n: b.pax })}</span>
                  <span className="num text-[14px]">{t("my.paidOf", { paid: rp(paidAmount(b.instalments)), total: rp(b.total) })}</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
