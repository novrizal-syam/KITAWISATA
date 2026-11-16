import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
const { getOrCreate } = await import("../singleton");

describe("getOrCreate", () => {
  it("returns the existing row without creating", async () => {
    const create = vi.fn();
    expect(await getOrCreate(async () => ({ id: "default" }), create)).toEqual({ id: "default" });
    expect(create).not.toHaveBeenCalled();
  });
  it("re-reads when a parallel request created the row first (P2002)", async () => {
    let rows = 0;
    const find = vi.fn(async () => (rows ? { id: "default" } : null));
    const create = vi.fn(async () => { rows = 1; throw Object.assign(new Error("Unique constraint failed"), { code: "P2002" }); });
    expect(await getOrCreate(find, create)).toEqual({ id: "default" });
    expect(find).toHaveBeenCalledTimes(2);
  });
  it("rethrows other errors", async () => {
    await expect(getOrCreate(async () => null, async () => { throw new Error("db down"); })).rejects.toThrow("db down");
  });
});
