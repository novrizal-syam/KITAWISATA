import { describe, expect, it } from "vitest";
import { checkSearch, flightOffers, stayOffers, trainOffers } from "../tickets";
import { parseDate } from "../dates";

const TODAY = parseDate("2026-11-16");

describe("flightOffers", () => {
  it("four flights, cheapest first, taxes included, priced per passenger", () => {
    const f = flightOffers("CGK", "DPS", "2026-12-01", 2);
    expect(f).toHaveLength(4);
    expect(f.map((x) => x.farePerPax)).toEqual([...f.map((x) => x.farePerPax)].sort((a, b) => a - b));
    expect(f[0]).toMatchObject({ carrier: "[Airline A]", depart: "07.25", total: f[0].farePerPax * 2 });
    expect(f[0].farePerPax).toBeGreaterThan(1_150_000 + 135_000 - 1);
  });
  it("is deterministic for the same search (so the server can re-price an offer id)", () => {
    expect(flightOffers("CGK", "DPS", "2026-12-01", 1)).toEqual(flightOffers("CGK", "DPS", "2026-12-01", 1));
  });
  it("no flights to the same airport", () => expect(flightOffers("CGK", "CGK", "2026-12-01", 1)).toEqual([]));
});

describe("trainOffers", () => {
  it("prices round to Rp 1.000 and have no baggage limit", () => {
    const t = trainOffers("GMR", "YK", "2026-12-01", 1);
    expect(t.every((x) => x.farePerPax % 1000 === 0 && x.baggageKg === null)).toBe(true);
  });
});

describe("stayOffers", () => {
  it("one room per two guests, priced for the nights", () => {
    const s = stayOffers("Bali", 3, 3);
    expect(s[0]).toMatchObject({ name: "Bali Harbour Hotel", rooms: 2, nights: 3, total: 1_100_000 * 3 * 2 });
  });
});

describe("checkSearch", () => {
  it.each([
    ["FLIGHT", { from: "CGK", to: "DPS", date: "2026-12-01", pax: 1 }, null],
    ["FLIGHT", { from: "CGK", to: "CGK", date: "2026-12-01", pax: 1 }, "same"],
    ["FLIGHT", { from: "CGK", to: "XXX", date: "2026-12-01", pax: 1 }, "unknown"],
    ["FLIGHT", { from: "CGK", to: "DPS", date: "2026-11-15", pax: 1 }, "pastDate"],
    ["TRAIN", { from: "GMR", to: "BD", date: "2026-11-16", pax: 7 }, "pax"],
    ["STAY", { city: "Bali", date: "2026-12-01", pax: 2, nights: 0 }, "nights"],
    ["STAY", { city: "Atlantis", date: "2026-12-01", pax: 2, nights: 2 }, "unknown"],
    ["STAY", { city: "Bali", date: "2026-12-01", pax: 2, nights: 2 }, null],
  ] as const)("%s %j -> %s", (kind, p, out) => expect(checkSearch(kind, p, TODAY)).toBe(out));
});
