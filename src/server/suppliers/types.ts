// The contract every inventory supplier implements (docs/suppliers.md). A supplier serves one or more
// kinds; the registry (./index.ts) picks one per kind.
import type { StayOffer, TicketKind, TravelOffer } from "@/domain/tickets";
import type { TicketSearch } from "../ticketService";

export type Offer = TravelOffer | StayOffer;

export interface SupplierBooking {
  code: string;
  kind: TicketKind;
  search: TicketSearch;
  offer: Offer;
  contactName: string;
  contactPhone: string;
  travellerNames: string[];
}

export interface Supplier {
  /** Stable id stored with each booking, e.g. "sample". */
  id: string;
  name: string;
  kinds: readonly TicketKind[];
  /** Offers for a validated search. Prices include taxes and fees, in whole Rupiah. */
  search(s: TicketSearch): Promise<Offer[]>;
  /**
   * Confirm one offer just before booking: current price and availability. Return null if it's gone.
   * The booking is created at the price returned here, never at a price from the browser.
   */
  reprice(s: TicketSearch, offerId: string): Promise<Offer | null>;
  /**
   * Optional: issue the ticket or voucher once paid, returning the supplier's reference.
   * Suppliers without it are fulfilled by ops on Tickets & stays (manual reference).
   */
  issue?(b: SupplierBooking): Promise<{ ref: string }>;
}
