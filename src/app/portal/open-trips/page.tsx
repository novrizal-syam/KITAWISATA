import Link from "next/link";
import { requireRole } from "@/lib/authz";
import { db } from "@/lib/db";
import { fmtDate, rp, tierSummary } from "@/lib/format";

export default async function OpenTrips({ searchParams }: { searchParams: Promise<{ saved?: string }> }) {
  await requireRole(["OPS"], "/portal/open-trips");
  const { saved } = await searchParams;
  const trips = await db.openTrip.findMany({ include: { tiers: true, departures: { orderBy: { departDate: "asc" } } }, orderBy: { name: "asc" } });
  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div><p className="eyebrow">kitawisata back office</p><h1 className="text-[28px] font-bold">Open Trips</h1></div>
        <Link href="/portal/open-trips/new" className="btn btn-red">+ New Open Trip</Link>
      </div>
      {saved && <p role="status" className="rounded-xl bg-green-t px-4 py-3 font-semibold text-green-d">Saved {saved}.</p>}
      <div className="flex flex-col gap-2.5">
        {trips.map((t) => (
          <Link key={t.id} href={`/portal/open-trips/${t.id}`} className="card flex flex-wrap items-center justify-between gap-3 px-4 py-3.5 hover:border-line2">
            <span className="min-w-0">
              <span className="flex flex-wrap items-center gap-2"><b className="text-[15px]">{t.name}</b>
                {!t.active && <span className="badge bg-grey-t text-muted">Hidden</span>}
                <span className="note">{t.place} · {t.durationLabel}</span></span>
              <span className="note block">Cancellation: {t.tiers.length ? tierSummary(t.tiers) : <b className="text-red-d">no fees defined</b>}</span>
              <span className="note block">{t.departures.length ? `Departures: ${t.departures.map((d) => fmtDate(d.departDate, { year: false })).join(", ")}` : "No departures yet"}</span>
            </span>
            <b className="num">{rp(t.pricePerPax)}<span className="note font-normal"> / person</span></b>
          </Link>
        ))}
      </div>
    </div>
  );
}
