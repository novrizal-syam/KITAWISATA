import Image from "next/image";
import Link from "next/link";
import { getT } from "@/i18n/server";
import { tripsOnSale } from "@/server/openTripBookingService";
import { fmtDate, rp } from "@/lib/format";

export default async function Home() {
  const [{ t, locale }, trips] = await Promise.all([getT(), tripsOnSale()]);
  return (
    <main>
      <section className="relative isolate overflow-hidden">
        <Image src="/img/padar.jpg" alt={t("site.heroAlt")} fill priority className="-z-10 object-cover" sizes="100vw" />
        <div className="absolute inset-0 -z-10 bg-gradient-to-r from-ink/80 via-ink/50 to-transparent" />
        <div className="mx-auto max-w-6xl px-4 py-20 text-white sm:py-28">
          <p className="text-xs font-extrabold tracking-[.08em] text-white/85 uppercase">{t("site.heroEyebrow")}</p>
          <h1 className="mt-3 max-w-xl text-4xl leading-tight font-extrabold sm:text-5xl">{t("site.heroTitle")}</h1>
          <p className="mt-4 max-w-lg text-lg text-white/90">{t("site.heroBody")}</p>
          <Link href="#trips" className="btn btn-red mt-6">{t("site.heroCta")}</Link>
        </div>
      </section>
      <section id="trips" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-10">
        <h2 className="mb-1 text-2xl font-bold">{t("site.tripsTitle")}</h2>
        <p className="mb-5 text-muted">{t("site.tripsBody")}</p>
        {trips.length === 0 ? <p className="card p-5 text-muted">{t("site.noTrips")}</p> : (
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {trips.map((trip) => {
              const next = trip.departures[0];
              return (
                <li key={trip.id}>
                  <Link href={`/trips/${trip.id}`} className="card block overflow-hidden hover:border-line2">
                    <Image src={`/img/${trip.image}-sm.jpg`} alt={trip.name} width={500} height={300} className="aspect-[5/3] w-full object-cover" />
                    <div className="p-4">
                      <div className="mb-1 flex flex-wrap gap-1.5"><span className="badge bg-grey-t text-muted">{trip.durationLabel}</span><span className="note">{trip.place}</span></div>
                      <b className="block text-[17px]">{trip.name}</b>
                      <p className="note mt-1">{t("site.nextDeparture", { date: fmtDate(next.departDate, locale), seats: next.seatsLeft })}</p>
                      <p className="mt-2"><span className="note">{t("site.from")} </span><b className="num text-red">{rp(trip.pricePerPax)}</b><span className="note">{t("ot.perPerson")}</span></p>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </main>
  );
}
