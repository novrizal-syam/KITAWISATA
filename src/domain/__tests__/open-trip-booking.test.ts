import { describe, expect, it } from "vitest";
import { bookingCode, buildInstalments, cancelQuote, nextUnpaid, paidAmount, statusAfterPayment } from "../openTripBooking";
import { parseDate, toIsoDate } from "../dates";

const TODAY = parseDate("2026-11-14");
const TERMS = { terms: "…", tiers: [{ minDaysBefore: 30, feePercent: 10, minFee: 0 }, { minDaysBefore: 14, feePercent: 50, minFee: 0 }, { minDaysBefore: 7, feePercent: 75, minFee: 0 }] };

describe("buildInstalments", () => {
  it("split 30/35/35 for Labuan Bajo, 2 people (prototype: Rp 1.470.000 today)", () => {
    const s = buildInstalments("SPLIT", 4_900_000, TODAY, parseDate("2026-12-31"))!;
    expect(s.map((x) => [x.seq, x.percent, toIsoDate(x.dueOn), x.amount])).toEqual([
      [1, 30, "2026-11-14", 1_470_000], [2, 35, "2026-12-01", 1_715_000], [3, 35, "2026-12-17", 1_715_000],
    ]);
  });
  it("split is not offered within 14 days", () => expect(buildInstalments("SPLIT", 950_000, TODAY, parseDate("2026-11-24"))).toBeNull());
  it("full payment is one instalment due today", () => expect(buildInstalments("FULL", 950_000, TODAY, parseDate("2026-11-24"))).toEqual([{ seq: 1, percent: 100, dueOn: TODAY, amount: 950_000 }]));
});

describe("payment progress", () => {
  const xs = [
    { seq: 2, amount: 1_715_000, dueOn: TODAY, paidAt: null },
    { seq: 1, amount: 1_470_000, dueOn: TODAY, paidAt: new Date() },
    { seq: 3, amount: 1_715_000, dueOn: TODAY, paidAt: null },
  ];
  it("sums what is paid and finds the next instalment in order", () => {
    expect(paidAmount(xs)).toBe(1_470_000);
    expect(nextUnpaid(xs)?.seq).toBe(2);
    expect(statusAfterPayment(xs)).toBe("CONFIRMED");
    expect(statusAfterPayment(xs.map((x) => ({ ...x, paidAt: new Date() })))).toBe("PAID");
    expect(nextUnpaid(xs.map((x) => ({ ...x, paidAt: new Date() })))).toBeNull();
  });
});

describe("cancelQuote", () => {
  const dep = parseDate("2026-12-31");
  const paidDp = [{ seq: 1, amount: 1_470_000, dueOn: TODAY, paidAt: new Date() }, { seq: 2, amount: 3_430_000, dueOn: TODAY, paidAt: null }];
  it("47 days out, down payment paid: 10% fee, rest refunded", () => {
    expect(cancelQuote(4_900_000, paidDp, TERMS, dep, TODAY)).toEqual({ daysBefore: 47, paid: 1_470_000, tripFee: 490_000, feeKept: 490_000, refund: 980_000, feePercent: 10 });
  });
  it("fee above what was paid: keeps what was paid, charges nothing more", () => {
    expect(cancelQuote(4_900_000, paidDp, TERMS, dep, parseDate("2026-12-10"))).toMatchObject({ feePercent: 50, tripFee: 2_450_000, feeKept: 1_470_000, refund: 0 });
  });
  it("unpaid hold cancels free", () => {
    expect(cancelQuote(4_900_000, [{ seq: 1, amount: 4_900_000, dueOn: TODAY, paidAt: null }], TERMS, dep, TODAY)).toMatchObject({ paid: 0, feeKept: 0, refund: 0 });
  });
  it("after the last tier: 100%", () => expect(cancelQuote(4_900_000, paidDp, TERMS, dep, parseDate("2026-12-29")).feePercent).toBe(100));
});

describe("bookingCode", () => {
  it("is KW- plus six unambiguous characters", () => {
    let i = 0;
    expect(bookingCode(() => i++ % 32)).toBe("KW-234567");
    expect(bookingCode((n) => Math.floor(Math.random() * n))).toMatch(/^KW-[2-9A-HJ-NP-Z]{6}$/);
  });
});
