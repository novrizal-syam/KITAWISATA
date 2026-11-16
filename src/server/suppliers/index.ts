import "server-only";
import type { TicketKind } from "@/domain/tickets";
import { sampleSupplier } from "./sample";
import type { Supplier } from "./types";

/** Every supplier the app knows. Add new adapters here (docs/suppliers.md). */
const SUPPLIERS: Supplier[] = [sampleSupplier];

/**
 * The supplier serving a kind: SUPPLIER_FLIGHT / SUPPLIER_TRAIN / SUPPLIER_STAY (a supplier id),
 * defaulting to the sample catalogue.
 */
export function supplierFor(kind: TicketKind): Supplier {
  const id = process.env[`SUPPLIER_${kind}`] || "sample";
  const s = SUPPLIERS.find((x) => x.id === id && x.kinds.includes(kind));
  if (!s) throw new Error(`No supplier "${id}" for ${kind}`);
  return s;
}

/** True while the kind is served by the sample catalogue (the search page says so). */
export const isSample = (kind: TicketKind) => supplierFor(kind).id === "sample";
