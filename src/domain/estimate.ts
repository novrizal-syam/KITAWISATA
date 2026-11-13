// Budget estimate for an SPPD. Ported from the business prototype's estimate() so seeded and
// newly submitted budgets agree (docs/decisions.md §1).
import { roundThousand } from "./money";
import { tripDays } from "./dates";

export type Need = "FLIGHT" | "TRAIN" | "HOTEL" | "CAR";
export type CarClass = "SMALL_CAR" | "MEDIUM_MPV" | "SUV" | "PREMIUM_SEDAN";

export interface PolicyLimits {
  hotelNightCap: number;
  flightClass: "ECONOMY" | "BUSINESS";
  carClass: CarClass;
  dailyAllowance: number;
}

export interface Destination {
  flightFare: number | null; // one-way reference economy fare
  trainFare: number | null; // one-way executive fare
}

/** Daily price of a car with driver, by class. */
export const CAR_DAILY_RATE: Record<CarClass, number> = {
  SMALL_CAR: 400_000,
  MEDIUM_MPV: 600_000,
  SUV: 850_000,
  PREMIUM_SEDAN: 1_400_000,
};

/** Business class is priced at 2.6x the reference fare; the economy estimate allows 5% headroom. */
const BUSINESS_FARE_FACTOR = 2.6;
const ECONOMY_ESTIMATE_FACTOR = 1.05;

export interface Estimate {
  days: number;
  nights: number;
  lines: Partial<Record<Need | "ALLOWANCE", number>>;
  total: number;
}

export function estimateBudget(
  policy: PolicyLimits,
  dest: Destination,
  start: Date,
  end: Date,
  needs: readonly Need[],
): Estimate {
  const days = Math.max(1, tripDays(start, end));
  const nights = Math.max(0, days - 1);
  const lines: Estimate["lines"] = {};
  if (needs.includes("FLIGHT") && dest.flightFare) {
    const factor = policy.flightClass === "BUSINESS" ? BUSINESS_FARE_FACTOR : ECONOMY_ESTIMATE_FACTOR;
    lines.FLIGHT = roundThousand(dest.flightFare * factor) * 2; // return trip
  }
  if (needs.includes("TRAIN") && dest.trainFare) lines.TRAIN = dest.trainFare * 2;
  if (needs.includes("HOTEL") && nights) lines.HOTEL = policy.hotelNightCap * nights;
  if (needs.includes("CAR")) lines.CAR = CAR_DAILY_RATE[policy.carClass] * days;
  lines.ALLOWANCE = policy.dailyAllowance * days;
  const total = Object.values(lines).reduce((a, b) => a + (b ?? 0), 0);
  return { days, nights, lines, total };
}
