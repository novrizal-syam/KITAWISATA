import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getT } from "@/i18n/server";
import { tripForSale } from "@/server/openTripBookingService";
import { toIsoDate, todayInJakarta } from "@/domain/dates";
import { FeeTable } from "../../_components/fee-table";
import { TripPicker } from "./picker";

export default async function TripPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [{ t }, trip] = await Promise.all([getT(), tripForSale(id)]);
  if (!trip || !trip.departures.length) notFound();
  return (
    <main className="mx-auto grid max-w-6xl gap-6 px-4 py-6 lg:grid-cols-[1fr_340px]">
      <div className="flex min-w-0 flex-col gap-5">
        <nav className="text-[14px]"><Link href="/" className="font-semibold text-red">{t("site.home")}</Link> <span className="text-muted">/ {trip.name}</span></nav>
        <section className="card overflow-hidden">
          <Image src={`/img/${trip.image}.jpg`} alt={trip.name} width={1280} height={720} priority className="aspect-[16/8] w-full object-cover" />
          <div className="p-5">
            <div className="mb-2 flex flex-wrap items-center gap-2"><span className="badge bg-grey-t text-muted">{trip.durationLabel}</span><span className="note">{trip.place}</span></div>
            <h1 className="text-3xl font-bold">{trip.name}</h1>
            <p className="mt-1 text-muted">{t("site.meeting", { place: trip.meetingPoint })}</p>
          </div>
        </section>
        <section className="card p-5">
          <h2 className="mb-3 text-lg font-bold">{t("site.itinerary")}</h2>
          <ol className="flex flex-col gap-2">{trip.itinerary.map((d, i) => <li key={i} className="grid grid-cols-[4.5rem_1fr] gap-2"><b className="text-red">{t("site.day", { n: i + 1 })}</b><span>{d}</span></li>)}</ol>
          <h2 className="mt-5 mb-1 text-lg font-bold">{t("site.included")}</h2>
          <p className="text-muted">{trip.inclusions}</p>
        </section>
        <section className="card p-5" id="terms">
          <h2 className="mb-1 text-lg font-bold">{t("fees.title")}</h2>
          <p className="note mb-3">{t("fees.intro")}</p>
          <FeeTable tiers={trip.tiers} t={t} />
          <details className="mt-4"><summary className="cursor-pointer font-semibold">{t("fees.terms")}</summary>
            <p className="mt-2 text-[14px] whitespace-pre-line text-muted">{trip.terms}</p></details>
        </section>
      </div>
      <aside className="lg:sticky lg:top-20 lg:self-start">
        <TripPicker tripId={trip.id} pricePerPax={trip.pricePerPax} today={toIsoDate(todayInJakarta())}
          departures={trip.departures.map((d) => ({ id: d.id, date: toIsoDate(d.departDate), seatsLeft: d.seatsLeft, status: d.status }))} />
      </aside>
    </main>
  );
}
