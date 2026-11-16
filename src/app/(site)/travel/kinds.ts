import type { TicketKind } from "@/domain/tickets";

export const KIND_BY_SLUG: Record<string, TicketKind> = { flights: "FLIGHT", trains: "TRAIN", stays: "STAY" };
export const SLUG_BY_KIND: Record<TicketKind, string> = { FLIGHT: "flights", TRAIN: "trains", STAY: "stays" };
export const BANNER: Record<TicketKind, string> = { FLIGHT: "plane", TRAIN: "train", STAY: "resort" };

/** Query string of a search, for links between search, checkout and back. */
export const searchQuery = (s: Record<string, string | number | undefined>) =>
  new URLSearchParams(Object.entries(s).filter(([k, v]) => v !== undefined && v !== "" && k !== "kind").map(([k, v]) => [k, String(v)])).toString();
