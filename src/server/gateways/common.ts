// Shared types for gateway adapters. Adapters take `fetch` as a parameter so they can be unit-tested.
export type GatewayState = "paid" | "pending" | "expired" | "failed";
export interface GatewayStatus { state: GatewayState; amount: number | null; raw: unknown }
export interface CreatedPayment { providerRef: string; redirectUrl: string }

export class GatewayError extends Error {
  constructor(message: string, public readonly status?: number) { super(message); }
}

export const basic = (key: string) => "Basic " + Buffer.from(key + ":").toString("base64");

/** Base URL for a provider host. Tests point these at a local stand-in through env vars; leave them unset in real use. */
export const baseUrl = (envName: string, host: string) => (process.env[envName] || `https://${host}`).replace(/\/$/, "");
