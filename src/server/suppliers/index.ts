import "server-only";
import { db } from "@/lib/db";
import type { TicketKind } from "@/domain/tickets";
import { open } from "../secretBox";
import { platformSettings } from "../billingService";
import { sampleSupplier } from "./sample";
import { httpSupplier } from "./http";
import type { Supplier } from "./types";

const FIELD = { FLIGHT: "flightSupplierId", TRAIN: "trainSupplierId", STAY: "staySupplierId" } as const;

/** Build the adapter for a stored connection (decrypting its API key on the server only). */
export async function connectionSupplier(id: string): Promise<Supplier | null> {
  const c = await db.supplierConnection.findUnique({ where: { id } });
  if (!c) return null;
  return httpSupplier({ id: c.id, name: c.name, baseUrl: c.baseUrl, apiKey: c.apiKeyEnc ? open(c.apiKeyEnc) : undefined, kinds: c.kinds, canIssue: c.canIssue });
}

/** The supplier serving a kind, as chosen on Supplier settings; the sample catalogue when none is chosen. */
export async function supplierFor(kind: TicketKind): Promise<Supplier> {
  const id = (await platformSettings())[FIELD[kind]];
  if (!id) return sampleSupplier;
  const s = await connectionSupplier(id);
  return s && s.kinds.includes(kind) ? s : sampleSupplier;
}

/** The supplier that sold a booking (for issuing). */
export async function supplierById(id: string): Promise<Supplier | null> {
  return id === "sample" ? sampleSupplier : connectionSupplier(id);
}

export const SUPPLIER_FIELD = FIELD;
