import { describe, expect, it } from "vitest";
import { quoteCancellation, validateTiers, type Tier } from "../cancellation";
import { splitPlan } from "../paymentPlan";
import { parseDate, shiftFrom, toIsoDate, tripDays } from "../dates";
import { sppdNumber } from "../sppdNumber";

const TIERS: Tier[] = [
  { minDaysBefore: 30, feePercent: 10, minFee: 0 },
  { minDaysBefore: 14, feePercent: 50, minFee: 0 },
  { minDaysBefore: 7, feePercent: 75, minFee: 0 },
];
const DEP = parseDate("2026-12-20");

describe("quoteCancellation", () => {
  it.each([
    ["2026-11-01", 49, 10, 490_000],
    ["2026-11-20", 30, 10, 490_000], // exactly on a boundary uses that tier
    ["2026-11-21", 29, 50, 2_450_000],
    ["2026-12-13", 7, 75, 3_675_000],
  ])("cancelled on %s (%i days before) -> %i%%", (on, days, pct, fee) => {
    const q = quoteCancellation(4_900_000, 4_900_000, TIERS, DEP, parseDate(on));
    expect(q).toMatchObject({ daysBefore: days, fee, refund: 4_900_000 - fee });
    expect(q.tier?.feePercent).toBe(pct);
  });

  it("charges the full price later than every tier", () => {
    expect(quoteCancellation(4_900_000, 1_470_000, TIERS, DEP, parseDate("2026-12-18"))).toMatchObject({ tier: null, fee: 4_900_000, refund: 0 });
  });

  it("never refunds more than was paid", () => {
    // Paid only the 30% down payment; 50% fee is larger than what was paid.
    expect(quoteCancellation(4_900_000, 1_470_000, TIERS, DEP, parseDate("2026-11-25")).refund).toBe(0);
  });

  it("applies a minimum fee", () => {
    const q = quoteCancellation(750_000, 750_000, [{ minDaysBefore: 30, feePercent: 10, minFee: 100_000 }], DEP, parseDate("2026-10-01"));
    expect(q).toMatchObject({ fee: 100_000, refund: 650_000 });
  });
});

describe("validateTiers", () => {
  it("accepts a sensible schedule", () => expect(validateTiers(TIERS)).toEqual([]));
  it("rejects a fee that drops closer to departure", () => {
    expect(validateTiers([{ minDaysBefore: 30, feePercent: 50, minFee: 0 }, { minDaysBefore: 7, feePercent: 20, minFee: 0 }])).toHaveLength(1);
  });
  it("rejects bad numbers and duplicates", () => {
    expect(validateTiers([{ minDaysBefore: 7, feePercent: 120, minFee: 0 }, { minDaysBefore: 7, feePercent: 50, minFee: -1 }]).length).toBe(3);
  });
});

describe("splitPlan (consumer prototype rules)", () => {
  const today = parseDate("2026-11-13");
  it("30/35/35 more than 30 days out", () => {
    const p = splitPlan(4_900_000, today, parseDate("2026-12-30"))!;
    expect(p.map((x) => [x.percent, toIsoDate(x.due), x.amount])).toEqual([
      [30, "2026-11-13", 1_470_000], [35, "2026-11-30", 1_715_000], [35, "2026-12-16", 1_715_000],
    ]);
  });
  it("30/70 between 15 and 30 days out", () => {
    expect(splitPlan(950_000, today, parseDate("2026-12-03"))!.map((x) => x.amount)).toEqual([285_000, 665_000]);
  });
  it("pay in full within 14 days", () => expect(splitPlan(950_000, today, parseDate("2026-11-27"))).toBeNull());
});

describe("dates and numbering", () => {
  it("counts trip days inclusively", () => expect(tripDays(parseDate("2026-10-15"), parseDate("2026-10-17"))).toBe(3));
  it("shifts demo dates so the reference day becomes the anchor", () => {
    const at = shiftFrom(parseDate("2026-10-10"), parseDate("2026-11-13"));
    expect(toIsoDate(at("2026-10-15"))).toBe("2026-11-18");
    expect(toIsoDate(at("2026-09-24"))).toBe("2026-10-28");
  });
  it("formats SPPD numbers with the Roman month", () => {
    expect(sppdNumber(46, "NTI", parseDate("2026-10-08"))).toBe("046/SPPD/NTI/X/2026");
    expect(sppdNumber(7, "NTI", parseDate("2027-01-02"))).toBe("007/SPPD/NTI/I/2027");
  });
});
