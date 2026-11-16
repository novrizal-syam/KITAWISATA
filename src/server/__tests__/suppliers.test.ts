import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
const { supplierFor, isSample } = await import("../suppliers");

afterEach(() => { delete process.env.SUPPLIER_FLIGHT; });

describe("supplier registry", () => {
  it("defaults every kind to the sample catalogue", () => {
    for (const k of ["FLIGHT", "TRAIN", "STAY"] as const) expect(supplierFor(k).id).toBe("sample");
    expect(isSample("STAY")).toBe(true);
  });
  it("rejects an unknown supplier id instead of silently using the sample", () => {
    process.env.SUPPLIER_FLIGHT = "nope";
    expect(() => supplierFor("FLIGHT")).toThrow(/No supplier "nope" for FLIGHT/);
  });
  it("sample reprice finds the same offer search returned, and null for unknown ids", async () => {
    const s = { kind: "FLIGHT" as const, from: "CGK", to: "DPS", date: "2026-12-01", pax: 2 };
    const offers = await supplierFor("FLIGHT").search(s);
    expect(await supplierFor("FLIGHT").reprice(s, offers[0].id)).toEqual(offers[0]);
    expect(await supplierFor("FLIGHT").reprice(s, "f9")).toBeNull();
  });
});
