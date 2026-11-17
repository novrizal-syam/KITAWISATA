import { describe, expect, it, vi } from "vitest";
import { sampleSupplier } from "../suppliers/sample";
import { SupplierUnavailable, httpSupplier } from "../suppliers/http";

type F = typeof fetch;
const S = { kind: "FLIGHT" as const, from: "CGK", to: "DPS", date: "2026-12-01", pax: 2 };
const OFFER = { id: "sup-1", kind: "FLIGHT", carrier: "Air Contoh", depart: "08.00", arrive: "10.50", duration: "1h 50m", baggageKg: 20, farePerPax: 1_400_000, total: 2_800_000 };
const reply = (status: number, body: unknown) => vi.fn(async (_u: string, _i?: RequestInit) => new Response(JSON.stringify(body), { status }));
const conn = (f: unknown, canIssue = false) => httpSupplier({ id: "c1", name: "Contoh", baseUrl: "https://sup.example/kw/v1/", apiKey: "k-123", kinds: ["FLIGHT"], canIssue }, f as F);

describe("sample supplier", () => {
  it("reprice finds the same offer search returned, and null for unknown ids", async () => {
    const offers = await sampleSupplier.search(S);
    expect(await sampleSupplier.reprice(S, offers[0].id)).toEqual(offers[0]);
    expect(await sampleSupplier.reprice(S, "f9")).toBeNull();
  });
});

describe("HTTP supplier (kitawisata supplier API)", () => {
  it("posts the search with a Bearer key and returns validated offers", async () => {
    const f = reply(200, { offers: [OFFER, { ...OFFER, id: "sup-2", extra: "ignored" }] });
    const offers = await conn(f).search(S);
    expect(offers.map((o) => o.id)).toEqual(["sup-1", "sup-2"]);
    expect(offers[1]).not.toHaveProperty("extra");
    const [url, init] = f.mock.calls[0];
    expect(url).toBe("https://sup.example/kw/v1/search");
    expect((init!.headers as Record<string, string>).Authorization).toBe("Bearer k-123");
    expect(JSON.parse(init!.body as string)).toEqual({ kind: "FLIGHT", search: S });
  });
  it.each([
    ["a price that isn't whole Rupiah", { offers: [{ ...OFFER, total: 12.5 }] }],
    ["an offer of the wrong kind", { offers: [{ ...OFFER, kind: "TRAIN" }] }],
    ["a missing field", { offers: [{ ...OFFER, carrier: undefined }] }],
    ["no offers array", { results: [] }],
  ])("rejects %s as unavailable", async (_, body) => {
    await expect(conn(reply(200, body)).search(S)).rejects.toBeInstanceOf(SupplierUnavailable);
  });
  it("treats HTTP errors and network failures as unavailable", async () => {
    await expect(conn(reply(500, {})).search(S)).rejects.toThrow(/HTTP 500/);
    await expect(conn(vi.fn(async () => { throw new Error("ECONNREFUSED"); })).search(S)).rejects.toThrow(/ECONNREFUSED/);
  });
  it("reprice returns the confirmed offer, or null when gone or for a different id", async () => {
    expect((await conn(reply(200, { offer: OFFER })).reprice(S, "sup-1"))?.total).toBe(2_800_000);
    expect(await conn(reply(200, { offer: null })).reprice(S, "sup-1")).toBeNull();
    expect(await conn(reply(200, { offer: OFFER })).reprice(S, "other")).toBeNull();
  });
  it("offers issue() only when the connection can issue", async () => {
    expect(conn(reply(200, {})).issue).toBeUndefined();
    expect(await conn(reply(200, { ref: "PNR XYZ789" }), true).issue!({ code: "KT-1", kind: "FLIGHT", search: S, offer: OFFER as never, contactName: "A", contactPhone: "+62", travellerNames: ["A"] })).toEqual({ ref: "PNR XYZ789" });
  });
});
