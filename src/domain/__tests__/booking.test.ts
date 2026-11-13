import { describe, expect, it } from "vitest";
import { bookingOptions, checkBudget, type BookingPolicy, type CatalogueCity } from "../booking";
import { parseDate } from "../dates";

const STAFF: BookingPolicy = { hotelNightCap: 900_000, flightClass: "ECONOMY", trainClass: "EXECUTIVE", carClass: "SMALL_CAR", dailyAllowance: 350_000 };
const SUB: CatalogueCity = {
  name: "Surabaya", flightFare: 1_250_000, trainFare: 280_000,
  hotels: [
    { id: "a", name: "Harmoni Suites Surabaya", nightlyRate: 880_000 },
    { id: "b", name: "Kota Business Hotel", nightlyRate: 650_000 },
    { id: "c", name: "Grand Tunjungan Hotel", nightlyRate: 1_150_000 },
  ],
};
const FROM = parseDate("2026-10-15"), TO = parseDate("2026-10-17"); // 3 days, 2 nights
const summary = (need: Parameters<typeof bookingOptions>[0]) =>
  bookingOptions(need, STAFF, SUB, FROM, TO).map((o) => [o.id, o.price, o.allowed]);

describe("bookingOptions (prototype prices for SPPD 046)", () => {
  it("flights: economy allowed, business locked", () => {
    expect(summary("FLIGHT")).toEqual([["f1", 2_400_000, true], ["f2", 2_626_000, true], ["f3", 2_500_000, true], ["f4", 6_500_000, false]]);
    expect(bookingOptions("FLIGHT", STAFF, SUB, FROM, TO)[3].lockReason).toBe("Your policy allows Economy");
  });
  it("hotels: cheapest first, priced for the nights, capped per night", () => {
    expect(summary("HOTEL")).toEqual([["h:b", 1_300_000, true], ["h:a", 1_760_000, true], ["h:c", 2_300_000, false]]);
  });
  it("cars: up to the grade's class, priced per day", () => {
    expect(summary("CAR")).toEqual([["c:SMALL_CAR", 1_200_000, true], ["c:MEDIUM_MPV", 1_800_000, false], ["c:SUV", 2_550_000, false], ["c:PREMIUM_SEDAN", 4_200_000, false]]);
  });
  it("trains: all classes up to executive", () => {
    expect(summary("TRAIN")).toEqual([["t1", 308_000, true], ["t2", 448_000, true], ["t3", 560_000, true]]);
  });
  it("no flights or hotels where they don't apply", () => {
    expect(bookingOptions("FLIGHT", STAFF, { ...SUB, flightFare: null }, FROM, TO)).toEqual([]);
    expect(bookingOptions("HOTEL", STAFF, SUB, FROM, FROM)).toEqual([]);
  });
});

describe("checkBudget", () => {
  it("046 cheapest picks leave Rp 726,000", () => {
    expect(checkBudget(6_676_000, 1_050_000, 0, 2_400_000 + 1_300_000 + 1_200_000)).toMatchObject({ remaining: 726_000, ok: true });
  });
  it("counts what is already booked", () => {
    expect(checkBudget(6_676_000, 1_050_000, 4_900_000, 800_000).ok).toBe(false);
  });
});
