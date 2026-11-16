import { beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/db", () => ({ db: {} }));
beforeAll(() => { process.env.AUTH_SECRET = "test-secret-at-least-16-chars"; });

const { seal, open } = await import("../secretBox");
const { checkGateway, mergeSecrets } = await import("../paymentSettingsService");

describe("secretBox", () => {
  it("round-trips and uses a fresh IV each time", () => {
    const a = seal("SB-Mid-server-abc123"), b = seal("SB-Mid-server-abc123");
    expect(a).not.toBe(b);
    expect(open(a)).toBe("SB-Mid-server-abc123");
    expect(a).not.toContain("abc123");
  });
  it("rejects tampering", () => {
    const s = seal("secret");
    const raw = Buffer.from(s.slice(3), "base64"); raw[raw.length - 1] ^= 1;
    expect(() => open("v1:" + raw.toString("base64"))).toThrow();
  });
});

describe("mergeSecrets", () => {
  it("keeps saved keys when a field is left blank, replaces filled ones, clears on request", () => {
    expect(mergeSecrets({ serverKey: "old", clientKey: "c" }, { serverKey: "new" }, [])).toEqual({ serverKey: "new", clientKey: "c" });
    expect(mergeSecrets({ serverKey: "old", clientKey: "c" }, {}, ["clientKey"])).toEqual({ serverKey: "old" });
  });
});

const reply = (status: number, body: object) => vi.fn(async (_url: string, _init?: RequestInit) => new Response(JSON.stringify(body), { status }));

describe("checkGateway", () => {
  it("Midtrans: 404 for an unknown order means the key works", async () => {
    const f = reply(404, { status_code: "404" });
    expect(await checkGateway("MIDTRANS", "SANDBOX", { serverKey: "SB-Mid-server-x" }, f as unknown as typeof fetch)).toMatchObject({ ok: true, key: "pay.testOk" });
    expect(f.mock.calls[0][0]).toBe("https://api.sandbox.midtrans.com/v2/kitawisata-connection-test/status");
  });
  it("Midtrans: 401 is a bad key", async () => {
    expect((await checkGateway("MIDTRANS", "SANDBOX", { serverKey: "SB-Mid-server-x" }, reply(401, { status_code: "401" }) as unknown as typeof fetch)).key).toBe("pay.testBadKey");
  });
  it("flags a sandbox key in production mode without calling out", async () => {
    const f = reply(200, {});
    expect((await checkGateway("MIDTRANS", "PRODUCTION", { serverKey: "SB-Mid-server-x" }, f as unknown as typeof fetch)).key).toBe("pay.testModeMismatch");
    expect((await checkGateway("XENDIT", "PRODUCTION", { secretKey: "xnd_development_abc" }, f as unknown as typeof fetch)).key).toBe("pay.testModeMismatch");
    expect(f).not.toHaveBeenCalled();
  });
  it("Xendit: 200 from /balance works", async () => {
    const f = reply(200, { balance: 0 });
    expect((await checkGateway("XENDIT", "SANDBOX", { secretKey: "xnd_development_abc" }, f as unknown as typeof fetch)).ok).toBe(true);
    expect(f.mock.calls[0][0]).toBe("https://api.xendit.co/balance");
  });
  it("reports unreachable hosts and missing keys", async () => {
    const boom = vi.fn(async (_url: string, _init?: RequestInit): Promise<Response> => { throw new Error("connect ECONNREFUSED"); });
    expect(await checkGateway("XENDIT", "SANDBOX", { secretKey: "xnd_development_abc" }, boom as unknown as typeof fetch)).toMatchObject({ ok: false, key: "pay.testUnreachable", params: { host: "api.xendit.co" } });
    expect((await checkGateway("MIDTRANS", "SANDBOX", {}, boom as unknown as typeof fetch)).key).toBe("pay.testMissingKey");
  });
});
