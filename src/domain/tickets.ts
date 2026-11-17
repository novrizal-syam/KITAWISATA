// Flights, trains and stays for consumers. Until a supplier (airline, rail, hotel) is connected, offers
// come from this deterministic sample catalogue, ported from the consumer prototype. Prices are always
// rebuilt from (search, offer id) on the server; the browser only says which offer it picked.
import { daysBetween, parseDate } from "./dates";
import { roundThousand } from "./money";

export const AIRPORTS = [
  { code: "CGK", city: "Jakarta" }, { code: "DPS", city: "Denpasar" }, { code: "SUB", city: "Surabaya" },
  { code: "YIA", city: "Yogyakarta" }, { code: "LBJ", city: "Labuan Bajo" }, { code: "KNO", city: "Medan" }, { code: "UPG", city: "Makassar" },
] as const;
export const STATIONS = [
  { code: "GMR", name: "Jakarta Gambir" }, { code: "BD", name: "Bandung" }, { code: "YK", name: "Yogyakarta" },
  { code: "SGU", name: "Surabaya Gubeng" }, { code: "SMT", name: "Semarang Tawang" }, { code: "ML", name: "Malang" },
] as const;
export const STAY_CITIES = ["Labuan Bajo", "Bali", "Yogyakarta", "Jakarta", "Bandung", "Surabaya"] as const;

export const MAX_PASSENGERS = 6;
export const MAX_NIGHTS = 14;

export type TicketKind = "FLIGHT" | "TRAIN" | "STAY";

export interface TravelOffer {
  id: string;
  kind: "FLIGHT" | "TRAIN";
  carrier: string; // placeholder brand, e.g. "[Airline A]", or train class for trains
  depart: string; // "07.25"
  arrive: string;
  duration: string;
  baggageKg: number | null;
  farePerPax: number; // includes taxes and fees
  total: number;
}

export interface StayOffer {
  id: string;
  name: string;
  stars: number;
  image: string;
  feature?: "seaView" | "privateVilla" | "family" | "central";
  /** Free text from a real supplier (shown instead of the sample feature label). */
  description?: string;
  /** Absolute photo URL from a real supplier (shown instead of a local sample photo). */
  imageUrl?: string;
  ratePerNight: number;
  rooms: number;
  nights: number;
  total: number;
}

const seedOf = (a: string, b: string, date: string) => (a.length * 7 + b.length * 13 + parseDate(date).getUTCDate()) % 5;

/** Flights between two airports on a date, cheapest first. Taxes (Rp 135.000 per person) included. */
export function flightOffers(from: string, to: string, date: string, pax: number): TravelOffer[] {
  if (from === to) return [];
  const base = [1_150_000, 1_215_000, 1_290_000, 1_360_000, 1_420_000][seedOf(from, to, date)];
  const rows: [string, string, string, string, number, number][] = [
    ["[Airline A]", "07.25", "10.15", "1h 50m", 0, 20], ["[Airline B]", "09.40", "12.35", "1h 55m", 55_000, 15],
    ["[Airline C]", "13.10", "16.00", "1h 50m", 175_000, 20], ["[Airline A]", "18.45", "21.35", "1h 50m", 110_000, 20],
  ];
  return rows.map(([carrier, depart, arrive, duration, extra, bag], i) => {
    const farePerPax = base + extra + 135_000;
    return { id: `f${i}`, kind: "FLIGHT" as const, carrier, depart, arrive, duration, baggageKg: bag, farePerPax, total: farePerPax * pax };
  }).sort((a, b) => a.farePerPax - b.farePerPax);
}

/** Trains between two stations on a date, cheapest first. */
export function trainOffers(from: string, to: string, date: string, pax: number): TravelOffer[] {
  if (from === to) return [];
  const base = [1_150_000, 1_215_000, 1_290_000, 1_360_000, 1_420_000][seedOf(from, to, date)];
  const rows: [string, string, string, string, number][] = [
    ["Executive", "07.25", "13.45", "6h 20m", 0], ["Business", "09.40", "16.25", "6h 45m", 55_000],
    ["Economy", "13.10", "20.20", "7h 10m", 175_000], ["Executive", "18.45", "01.15", "6h 30m", 110_000],
  ];
  return rows.map(([carrier, depart, arrive, duration, extra], i) => {
    const farePerPax = roundThousand((base + extra) * 0.38);
    return { id: `t${i}`, kind: "TRAIN" as const, carrier, depart, arrive, duration, baggageKg: null, farePerPax, total: farePerPax * pax };
  }).sort((a, b) => a.farePerPax - b.farePerPax);
}

/** Stays in a city. One room per two guests. */
export function stayOffers(city: string, nights: number, guests: number): StayOffer[] {
  const rooms = Math.ceil(guests / 2);
  const rows: [string, number, number, string, StayOffer["feature"]][] = [
    [`${city} Harbour Hotel`, 4, 1_100_000, "resort", "seaView"], [`Rumah ${city} Villa`, 4, 1_850_000, "villa", "privateVilla"],
    [`${city} Kampung Homestay`, 3, 450_000, "dieng", "family"], [`Sentral ${city} Hotel`, 3, 690_000, "jakarta", "central"],
  ];
  return rows.map(([name, stars, rate, image, feature], i) => ({
    id: `s${i}`, name, stars, image, feature, ratePerNight: rate, rooms, nights, total: rate * nights * rooms,
  }));
}

export type SearchError = "same" | "pastDate" | "pax" | "nights" | "unknown";

/** Validate a search. Dates are YYYY-MM-DD; `today` is the Jakarta calendar date. */
export function checkSearch(kind: TicketKind, p: { from?: string; to?: string; city?: string; date: string; pax: number; nights?: number }, today: Date): SearchError | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(p.date) || daysBetween(today, parseDate(p.date)) < 0) return "pastDate";
  if (!Number.isInteger(p.pax) || p.pax < 1 || p.pax > MAX_PASSENGERS) return "pax";
  if (kind === "STAY") {
    if (!STAY_CITIES.includes(p.city as (typeof STAY_CITIES)[number])) return "unknown";
    if (!Number.isInteger(p.nights) || p.nights! < 1 || p.nights! > MAX_NIGHTS) return "nights";
    return null;
  }
  const codes: readonly string[] = kind === "FLIGHT" ? AIRPORTS.map((a) => a.code) : STATIONS.map((s) => s.code);
  if (!codes.includes(p.from ?? "") || !codes.includes(p.to ?? "")) return "unknown";
  if (p.from === p.to) return "same";
  return null;
}
