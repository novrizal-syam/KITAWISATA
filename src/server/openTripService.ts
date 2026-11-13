import "server-only";
import { z } from "zod";
import { db } from "@/lib/db";
import { AppError } from "@/lib/errors";
import type { MessageKey } from "@/i18n";
import { validateTiers } from "@/domain/cancellation";
import { parseDate } from "@/domain/dates";

export class OpenTripError extends AppError {}

export const CATEGORIES = ["island", "mountain", "diving", "weekend", "city", "culture"] as const;

const int = (min: number, max: number, msg: MessageKey) =>
  z.preprocess((v) => (typeof v === "string" ? Number(v.replace(/[^\d-]/g, "")) : v), z.number({ message: msg }).int().min(min, msg).max(max, msg));

export const openTripInput = z.object({
  name: z.string().trim().min(3, "v.tripName").max(80, "v.invalid"),
  place: z.string().trim().min(2, "v.place").max(80, "v.invalid"),
  category: z.enum(CATEGORIES, { message: "v.invalid" }),
  durationLabel: z.string().trim().regex(/^\d+D\d+N$/, "v.duration"),
  pricePerPax: int(50_000, 100_000_000, "v.price"),
  meetingPoint: z.string().trim().min(3, "v.meeting").max(120, "v.invalid"),
  itinerary: z.array(z.string().trim().min(1)).min(1, "v.itinerary"),
  inclusions: z.string().trim().min(3, "v.inclusions").max(400, "v.invalid"),
  terms: z.string().trim().min(20, "v.terms").max(4000, "v.invalid"),
  tiers: z.array(z.object({
    minDaysBefore: int(0, 365, "v.tierDays"),
    feePercent: int(0, 100, "v.tierFee"),
    minFee: int(0, 100_000_000, "v.tierMin"),
  })).min(1, "v.tiers"),
  departures: z.array(z.object({
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "v.depDate"),
    seatsLeft: int(0, 500, "v.depSeats"),
    status: z.enum(["OPEN", "NEEDS_MORE", "GUARANTEED", "CLOSED"], { message: "v.invalid" }),
  })),
  active: z.boolean(),
});
export type OpenTripInput = z.infer<typeof openTripInput>;

const slug = (s: string) => s.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40) || "trip";

function check(input: OpenTripInput) {
  const issues = validateTiers(input.tiers);
  if (issues.length) throw new OpenTripError(issues[0].code, issues[0].params);
  const dates = input.departures.map((d) => d.date);
  if (new Set(dates).size !== dates.length) throw new OpenTripError("err.depDuplicate");
}

const tripData = (i: OpenTripInput) => ({
  name: i.name, place: i.place, category: i.category, durationLabel: i.durationLabel, pricePerPax: i.pricePerPax,
  meetingPoint: i.meetingPoint, itinerary: i.itinerary, inclusions: i.inclusions, terms: i.terms, active: i.active,
  // Saving through the form means ops has set this trip's real terms and fees.
  feesReviewed: true,
});

export async function createOpenTrip(input: OpenTripInput) {
  check(input);
  let id = slug(input.name);
  for (let n = 2; await db.openTrip.findUnique({ where: { id } }); n++) id = `${slug(input.name)}-${n}`;
  return db.openTrip.create({
    data: {
      id, ...tripData(input),
      tiers: { create: input.tiers },
      departures: { create: input.departures.map((d) => ({ departDate: parseDate(d.date), seatsLeft: d.seatsLeft, status: d.status })) },
    },
  });
}

/**
 * Edit a trip. New cancellation tiers apply to bookings made from now on: existing bookings keep the
 * terms snapshot they were made with. A departure that already has bookings can't be removed.
 */
export async function updateOpenTrip(id: string, input: OpenTripInput) {
  check(input);
  return db.$transaction(async (tx) => {
    const trip = await tx.openTrip.findUnique({ where: { id }, include: { departures: { include: { _count: { select: { bookings: true } } } } } });
    if (!trip) throw new OpenTripError("err.tripGone");
    const keep = new Set(input.departures.map((d) => d.date));
    for (const d of trip.departures) {
      const iso = d.departDate.toISOString().slice(0, 10);
      if (!keep.has(iso)) {
        if (d._count.bookings) throw new OpenTripError("err.depHasBookings", { date: iso });
        await tx.openTripDeparture.delete({ where: { id: d.id } });
      }
    }
    for (const d of input.departures) {
      const departDate = parseDate(d.date);
      await tx.openTripDeparture.upsert({
        where: { openTripId_departDate: { openTripId: id, departDate } },
        update: { seatsLeft: d.seatsLeft, status: d.status },
        create: { openTripId: id, departDate, seatsLeft: d.seatsLeft, status: d.status },
      });
    }
    await tx.cancellationTier.deleteMany({ where: { openTripId: id } });
    await tx.cancellationTier.createMany({ data: input.tiers.map((t) => ({ openTripId: id, ...t })) });
    return tx.openTrip.update({ where: { id }, data: tripData(input) });
  });
}

/** Read the trip form. Repeated rows arrive as parallel arrays (tier.days[], tier.fee[], ...). */
export function parseOpenTripForm(form: FormData) {
  const all = (k: string) => form.getAll(k).map(String);
  const [days, fee, minFee] = [all("tier.days"), all("tier.fee"), all("tier.minFee")];
  const [dDate, dSeats, dStatus] = [all("dep.date"), all("dep.seats"), all("dep.status")];
  return openTripInput.safeParse({
    name: form.get("name"), place: form.get("place"), category: form.get("category"),
    durationLabel: String(form.get("durationLabel") ?? "").toUpperCase(), pricePerPax: form.get("pricePerPax"),
    meetingPoint: form.get("meetingPoint"), inclusions: form.get("inclusions"), terms: form.get("terms"),
    itinerary: String(form.get("itinerary") ?? "").split("\n").map((l) => l.trim()).filter(Boolean),
    tiers: days.map((d, i) => ({ minDaysBefore: d, feePercent: fee[i], minFee: minFee[i] || "0" })),
    departures: dDate.map((d, i) => ({ date: d, seatsLeft: dSeats[i], status: dStatus[i] })).filter((d) => d.date),
    active: form.get("active") === "on",
  });
}
