import { describe, expect, it } from "vitest";
import { fromAcceptLanguage, makeT, tMaybe } from "..";
import { en } from "../en";
import { id } from "../id";

describe("dictionaries", () => {
  it("define the same keys", () => expect(Object.keys(id).sort()).toEqual(Object.keys(en).sort()));
  it("use the same placeholders in both languages", () => {
    const ph = (s: string) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort().join(",");
    const mismatched = (Object.keys(en) as (keyof typeof en)[]).filter((k) => ph(en[k]) !== ph(id[k]));
    expect(mismatched).toEqual([]);
  });
});

describe("makeT", () => {
  it("translates and fills placeholders", () => {
    expect(makeT("id")("trips.hello", { name: "Rina" })).toBe("Halo, Rina");
    expect(makeT("en")("plan.footer", { n: 1, total: 3, allowance: "Rp 1.050.000" })).toBe("Selected 1 of 3 · daily allowance Rp 1.050.000 paid with salary");
  });
  it("leaves unknown placeholders visible", () => expect(makeT("en")("trips.hello")).toBe("Hello, {name}"));
  it("tMaybe translates keys and passes other text through", () => {
    const t = makeT("id");
    expect(tMaybe(t, "v.dest")).toBe("Pilih tujuan");
    expect(tMaybe(t, "Something else")).toBe("Something else");
  });
});

describe("fromAcceptLanguage", () => {
  it.each([
    [null, "id"], ["", "id"], ["id-ID,id;q=0.9,en;q=0.8", "id"], ["en-US,en;q=0.9", "en"],
    ["en-GB,id;q=0.5", "en"], ["fr-FR,id;q=0.7,en;q=0.5", "id"], ["de-DE", "id"], ["in", "id"],
  ])("%s -> %s", (h, out) => expect(fromAcceptLanguage(h)).toBe(out));
});
