import Link from "next/link";
import { requireRole } from "@/lib/authz";
import { db } from "@/lib/db";
import { fmtDate, rp, tierSummary } from "@/lib/format";
import { getT } from "@/i18n/server";

export default async function OpenTrips({ searchParams }: { searchParams: Promise<{ saved?: string }> }) {
  await requireRole(["OPS"], "/portal/open-trips");
  const { saved } = await searchParams;
  const { t, locale } = await getT();
  const trips = await db.openTrip.findMany({ include: { tiers: true, departures: { orderBy: { departDate: "asc" } } }, orderBy: { name: "asc" } });
  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div><p className="eyebrow">{t("ot.eyebrow")}</p><h1 className="text-[28px] font-bold">{t("ot.title")}</h1></div>
        <Link href="/portal/open-trips/new" className="btn btn-red">{t("ot.new")}</Link>
      </div>
      {saved && <p role="status" className="rounded-xl bg-green-t px-4 py-3 font-semibold text-green-d">{t("ot.saved", { name: saved })}</p>}
      <div className="flex flex-col gap-2.5">
        {trips.map((trip) => (
          <Link key={trip.id} href={`/portal/open-trips/${trip.id}`} className="card flex flex-wrap items-center justify-between gap-3 px-4 py-3.5 hover:border-line2">
            <span className="min-w-0">
              <span className="flex flex-wrap items-center gap-2"><b className="text-[15px]">{trip.name}</b>
                {!trip.active && <span className="badge bg-grey-t text-muted">{t("ot.hidden")}</span>}
                {!trip.feesReviewed && <span className="badge bg-amber-t text-amber">{t("ot.placeholder")}</span>}
                <span className="note">{trip.place} · {trip.durationLabel}</span></span>
              <span className="note block">{trip.tiers.length ? t("ot.cancellation", { summary: tierSummary(t, trip.tiers) }) : <b className="text-red-d">{t("ot.cancellation", { summary: t("ot.noFees") })}</b>}</span>
              <span className="note block">{trip.departures.length ? t("ot.departures", { dates: trip.departures.map((d) => fmtDate(d.departDate, locale, { year: false })).join(", ") }) : t("ot.noDepartures")}</span>
            </span>
            <b className="num">{rp(trip.pricePerPax)}<span className="note font-normal">{t("ot.perPerson")}</span></b>
          </Link>
        ))}
      </div>
    </div>
  );
}
