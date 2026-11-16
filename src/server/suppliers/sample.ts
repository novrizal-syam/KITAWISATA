// The sample catalogue from the consumer prototype (src/domain/tickets.ts), as a supplier.
// Fulfilled by ops: no issue().
import { flightOffers, stayOffers, trainOffers } from "@/domain/tickets";
import type { Supplier } from "./types";

export const sampleSupplier: Supplier = {
  id: "sample",
  name: "Sample catalogue",
  kinds: ["FLIGHT", "TRAIN", "STAY"],
  async search(s) {
    if (s.kind === "FLIGHT") return flightOffers(s.from!, s.to!, s.date, s.pax);
    if (s.kind === "TRAIN") return trainOffers(s.from!, s.to!, s.date, s.pax);
    return stayOffers(s.city!, s.nights!, s.pax);
  },
  async reprice(s, offerId) {
    return (await this.search(s)).find((o) => o.id === offerId) ?? null;
  },
};
