import { describe, expect, it } from "vitest";
import { estimateBudget, type Need, type PolicyLimits } from "../estimate";
import { parseDate } from "../dates";

const POLICY: Record<string, PolicyLimits> = {
  STAFF: { hotelNightCap: 900_000, flightClass: "ECONOMY", carClass: "SMALL_CAR", dailyAllowance: 350_000 },
  SUPERVISOR: { hotelNightCap: 1_200_000, flightClass: "ECONOMY", carClass: "MEDIUM_MPV", dailyAllowance: 450_000 },
  MANAGER: { hotelNightCap: 1_800_000, flightClass: "ECONOMY", carClass: "SUV", dailyAllowance: 600_000 },
  DIRECTOR: { hotelNightCap: 3_500_000, flightClass: "BUSINESS", carClass: "PREMIUM_SEDAN", dailyAllowance: 900_000 },
};
const CITY = {
  SUB: { flightFare: 1_250_000, trainFare: 280_000 },
  DPS: { flightFare: 1_350_000, trainFare: null },
  BPN: { flightFare: 1_700_000, trainFare: null },
  BDO: { flightFare: null, trainFare: 250_000 },
  UPG: { flightFare: 1_550_000, trainFare: null },
  KNO: { flightFare: 1_650_000, trainFare: null },
};

// Expected totals are what the business prototype's estimate() returns for its seeded SPPDs
// (docs/decisions.md §1).
describe("estimateBudget matches the prototype formula", () => {
  it.each<[string, keyof typeof POLICY, keyof typeof CITY, string, string, Need[], number]>([
    ["041 Dimas", "STAFF", "SUB", "2026-10-01", "2026-10-02", ["FLIGHT", "HOTEL", "CAR"], 5_026_000],
    ["042 Andi", "DIRECTOR", "DPS", "2026-10-03", "2026-10-05", ["FLIGHT", "HOTEL", "CAR"], 20_920_000],
    ["043 Ayu", "SUPERVISOR", "BPN", "2026-10-06", "2026-10-08", ["FLIGHT", "HOTEL", "CAR"], 9_120_000],
    ["044 Fajar", "STAFF", "BDO", "2026-10-07", "2026-10-08", ["TRAIN", "HOTEL"], 2_100_000],
    ["045 Budi", "MANAGER", "UPG", "2026-10-13", "2026-10-15", ["FLIGHT", "HOTEL"], 8_656_000],
    ["046 Rina", "STAFF", "SUB", "2026-10-15", "2026-10-17", ["FLIGHT", "HOTEL", "CAR"], 6_676_000],
    ["draft Dimas", "STAFF", "KNO", "2026-10-20", "2026-10-22", ["FLIGHT", "HOTEL", "CAR"], 7_516_000],
  ])("%s", (_, grade, city, from, to, needs, total) => {
    expect(estimateBudget(POLICY[grade], CITY[city], parseDate(from), parseDate(to), needs).total).toBe(total);
  });

  it("breaks 046 down into lines", () => {
    const e = estimateBudget(POLICY.STAFF, CITY.SUB, parseDate("2026-10-15"), parseDate("2026-10-17"), ["FLIGHT", "HOTEL", "CAR"]);
    expect(e).toMatchObject({ days: 3, nights: 2 });
    expect(e.lines).toEqual({ FLIGHT: 2_626_000, HOTEL: 1_800_000, CAR: 1_200_000, ALLOWANCE: 1_050_000 });
  });

  it("skips a flight to a city without one, and a hotel on a same-day trip", () => {
    const e = estimateBudget(POLICY.STAFF, CITY.BDO, parseDate("2026-10-07"), parseDate("2026-10-07"), ["FLIGHT", "HOTEL"]);
    expect(e.lines).toEqual({ ALLOWANCE: 350_000 });
  });
});
