// Bookable options for an approved SPPD and the budget check, ported from the business
// prototype's vPlan(). Prices are always rebuilt on the server from catalogue data; the client
// only sends which option it picked.
import { roundThousand } from "./money";
import { tripDays } from "./dates";
import { CAR_DAILY_RATE, type CarClass, type Need } from "./estimate";

export type FlightClass = "ECONOMY" | "BUSINESS";
export type TrainClass = "ECONOMY" | "BUSINESS" | "EXECUTIVE";

export interface BookingPolicy {
  hotelNightCap: number;
  flightClass: FlightClass;
  trainClass: TrainClass;
  carClass: CarClass;
  dailyAllowance: number;
}

export interface CatalogueCity {
  name: string;
  flightFare: number | null;
  trainFare: number | null;
  hotels: { id: string; name: string; nightlyRate: number }[];
}

export interface BookingOption {
  id: string;
  need: Need;
  name: string;
  detail: string;
  price: number;
  allowed: boolean;
  /** Why it is locked, when not allowed. */
  lockReason?: string;
  /** Stored on the booking. */
  description: string;
}

const FLIGHT_RANK: FlightClass[] = ["ECONOMY", "BUSINESS"];
const TRAIN_RANK: TrainClass[] = ["ECONOMY", "BUSINESS", "EXECUTIVE"];
const CAR_RANK: CarClass[] = ["SMALL_CAR", "MEDIUM_MPV", "SUV", "PREMIUM_SEDAN"];
const LABEL: Record<string, string> = {
  ECONOMY: "Economy", BUSINESS: "Business", EXECUTIVE: "Executive",
  SMALL_CAR: "Small car", MEDIUM_MPV: "Medium MPV", SUV: "SUV", PREMIUM_SEDAN: "Premium sedan",
};
const CAR_DETAIL: Record<CarClass, string> = {
  SMALL_CAR: "City car, 4 seats, with driver", MEDIUM_MPV: "7 seats, with driver",
  SUV: "7 seats, with driver", PREMIUM_SEDAN: "Executive sedan, with driver",
};
const plural = (n: number, w: string) => `${n} ${w}${n === 1 ? "" : "s"}`;
const rp = (n: number) => "Rp " + n.toLocaleString("id-ID");

/** Sample carriers and times, as in the prototype; real inventory comes with the supplier integration. */
const FLIGHTS: { id: string; carrier: string; time: string; cls: FlightClass; factor: number; extra?: string }[] = [
  { id: "f1", carrier: "[Airline A]", time: "06.10", cls: "ECONOMY", factor: 0.96 },
  { id: "f2", carrier: "[Airline B]", time: "09.30", cls: "ECONOMY", factor: 1.05 },
  { id: "f3", carrier: "[Airline C]", time: "15.45", cls: "ECONOMY", factor: 1.0 },
  { id: "f4", carrier: "[Airline A]", time: "07.40", cls: "BUSINESS", factor: 2.6, extra: ", lounge" },
];
const TRAINS: { id: string; time: string; cls: TrainClass; factor: number }[] = [
  { id: "t1", time: "07.00", cls: "ECONOMY", factor: 0.55 },
  { id: "t2", time: "08.15", cls: "BUSINESS", factor: 0.8 },
  { id: "t3", time: "09.00", cls: "EXECUTIVE", factor: 1.0 },
];

export function bookingOptions(need: Need, policy: BookingPolicy, city: CatalogueCity, start: Date, end: Date): BookingOption[] {
  const days = Math.max(1, tripDays(start, end));
  const nights = Math.max(0, days - 1);
  switch (need) {
    case "FLIGHT":
      if (!city.flightFare) return [];
      return FLIGHTS.map((f) => ({
        id: f.id, need, name: `${f.carrier} ${f.time}`, detail: `Jakarta CGK to ${city.name}, direct${f.extra ?? ""} · return`,
        price: roundThousand(city.flightFare! * f.factor) * 2,
        allowed: FLIGHT_RANK.indexOf(f.cls) <= FLIGHT_RANK.indexOf(policy.flightClass),
        lockReason: `Your policy allows ${LABEL[policy.flightClass]}`,
        description: `${f.carrier} CGK-${city.name} return, ${LABEL[f.cls]}`,
      }));
    case "TRAIN":
      if (!city.trainFare) return [];
      return TRAINS.map((t) => ({
        id: t.id, need, name: `${LABEL[t.cls]}, ${t.time}`, detail: `Jakarta Gambir to ${city.name} · return`,
        price: (t.factor === 1 ? city.trainFare! : roundThousand(city.trainFare! * t.factor)) * 2,
        allowed: TRAIN_RANK.indexOf(t.cls) <= TRAIN_RANK.indexOf(policy.trainClass),
        lockReason: `Your policy allows up to ${LABEL[policy.trainClass]}`,
        description: `${LABEL[t.cls]} train, Gambir-${city.name} return`,
      }));
    case "HOTEL":
      if (!nights) return [];
      return [...city.hotels].sort((a, b) => a.nightlyRate - b.nightlyRate).map((h) => ({
        id: `h:${h.id}`, need, name: h.name, detail: `${rp(h.nightlyRate)} per night · ${plural(nights, "night")}`,
        price: h.nightlyRate * nights, allowed: h.nightlyRate <= policy.hotelNightCap,
        lockReason: `Above your ${rp(policy.hotelNightCap)} per night limit`,
        description: `${h.name}, ${plural(nights, "night")}`,
      }));
    case "CAR":
      return CAR_RANK.map((c) => ({
        id: `c:${c}`, need, name: LABEL[c], detail: `${CAR_DETAIL[c]} · ${rp(CAR_DAILY_RATE[c])} per day × ${days}`,
        price: CAR_DAILY_RATE[c] * days, allowed: CAR_RANK.indexOf(c) <= CAR_RANK.indexOf(policy.carClass),
        lockReason: `Your policy allows up to ${LABEL[policy.carClass]}`,
        description: `${LABEL[c]} with driver, ${plural(days, "day")}`,
      }));
  }
}

export interface BudgetCheck {
  allowance: number; // paid with salary, but reserved from the budget
  alreadyBooked: number;
  selected: number;
  remaining: number;
  ok: boolean;
}

export function checkBudget(budget: number, allowance: number, alreadyBooked: number, selected: number): BudgetCheck {
  const remaining = budget - allowance - alreadyBooked - selected;
  return { allowance, alreadyBooked, selected, remaining, ok: remaining >= 0 };
}
