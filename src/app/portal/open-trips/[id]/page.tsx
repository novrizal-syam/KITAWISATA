import { notFound } from "next/navigation";
import { requireRole } from "@/lib/authz";
import { db } from "@/lib/db";
import { toIsoDate } from "@/domain/dates";
import { TripForm } from "../trip-form";

export default async function EditOpenTrip({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await requireRole(["OPS"], `/portal/open-trips/${id}`);
  const t = await db.openTrip.findUnique({ where: { id }, include: { tiers: true, departures: { orderBy: { departDate: "asc" } } } });
  if (!t) notFound();
  return (
    <div className="flex max-w-4xl flex-col gap-5">
      <div><p className="eyebrow">Edit Open Trip</p><h1 className="text-[28px] font-bold">{t.name}</h1></div>
      <TripForm initial={{
        id: t.id, name: t.name, place: t.place, category: t.category, durationLabel: t.durationLabel, pricePerPax: t.pricePerPax,
        meetingPoint: t.meetingPoint, itinerary: t.itinerary, inclusions: t.inclusions, terms: t.terms, active: t.active,
        tiers: t.tiers.map((x) => ({ minDaysBefore: x.minDaysBefore, feePercent: x.feePercent, minFee: x.minFee })),
        departures: t.departures.map((d) => ({ date: toIsoDate(d.departDate), seatsLeft: d.seatsLeft, status: d.status })),
      }} />
    </div>
  );
}
