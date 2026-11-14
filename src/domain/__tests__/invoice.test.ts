import { describe, expect, it } from "vitest";
import { dueDate, invoiceNumber, invoiceTotals, jakartaMonthRange, previousMonth } from "../invoice";
import { parseDate, toIsoDate } from "../dates";

describe("invoiceTotals (prototype figures)", () => {
  // The prototype's 13 October bookings for PT Nusantara Trading Indonesia.
  const OCT = [2_500_000, 880_000, 400_000, 7_020_000, 6_400_000, 2_800_000, 3_400_000, 2_200_000, 1_200_000, 500_000, 950_000, 3_100_000, 3_300_000];

  it("13 bookings: Rp 34.650.000 + fee Rp 325.000 + PPN 11% Rp 35.750", () => {
    expect(invoiceTotals(OCT, 25_000, 1100)).toEqual({
      bookingCount: 13, subtotal: 34_650_000, feePerBooking: 25_000, serviceFee: 325_000, ppnRateBps: 1100, ppn: 35_750, total: 35_010_750,
    });
  });

  it("archived July: fee Rp 500.000 and PPN Rp 55.000", () => {
    const t = invoiceTotals(Array(20).fill(1_895_000), 25_000, 1100);
    expect([t.serviceFee, t.ppn]).toEqual([500_000, 55_000]);
  });

  it("uses the configured rate and rounds to whole Rupiah", () => {
    expect(invoiceTotals([1_000_000], 25_000, 1200).ppn).toBe(3_000);
    expect(invoiceTotals([1_000_000, 1], 33_333, 1100).ppn).toBe(7_333); // 66.666 × 11% = 7.333,26
  });

  it("is zero for no bookings", () => expect(invoiceTotals([], 25_000, 1100).total).toBe(0));
});

describe("numbering and dates", () => {
  it("formats invoice numbers", () => {
    expect(invoiceNumber(2026, 7, 31)).toBe("INV/KW/2026/07/0031");
    expect(invoiceNumber(2026, 11, 1)).toBe("INV/KW/2026/11/0001");
  });
  it("NET-30 due date", () => expect(toIsoDate(dueDate(parseDate("2026-10-01"), 30))).toBe("2026-10-31"));
  it("previous month wraps the year", () => expect(previousMonth({ year: 2026, month: 1 })).toEqual({ year: 2025, month: 12 }));
  it("Jakarta month range starts at 00:00 WIB", () => {
    const [a, b] = jakartaMonthRange(2026, 11);
    expect([a.toISOString(), b.toISOString()]).toEqual(["2026-10-31T17:00:00.000Z", "2026-11-30T17:00:00.000Z"]);
  });
});
