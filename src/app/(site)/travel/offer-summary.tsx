import type { StayOffer, TravelOffer } from "@/domain/tickets";
import { AIRPORTS, STATIONS } from "@/domain/tickets";
import { fmtDate, rp } from "@/lib/format";
import { parseDate } from "@/domain/dates";
import type { Locale, MessageKey, T } from "@/i18n";
import type { TicketSearch } from "@/server/ticketService";

const place = (kind: string, c?: string) =>
  kind === "FLIGHT" ? (AIRPORTS.find((a) => a.code === c)?.city ?? c) : (STATIONS.find((s) => s.code === c)?.name ?? c);

/** One-line title and detail lines for a booked or chosen offer. */
export function offerLines(search: TicketSearch, offer: TravelOffer | StayOffer, t: T, locale: Locale) {
  const date = fmtDate(parseDate(search.date), locale);
  if ("name" in offer) {
    return { title: offer.name, lines: [`${t("tk.checkIn")}: ${date}`, t("tk.stayMeta", { nights: offer.nights, guests: search.pax }), t("tk.rooms", { n: offer.rooms })] };
  }
  const carrier = offer.kind === "TRAIN" ? t(`class.${offer.carrier.toUpperCase()}` as MessageKey) : offer.carrier;
  return {
    title: t("tk.route", { from: place(search.kind, search.from)!, to: place(search.kind, search.to)! }),
    lines: [`${carrier} · ${date}`, `${offer.depart} – ${offer.arrive} · ${offer.duration}`, t("tk.paxMeta", { n: search.pax })],
  };
}

export function PriceLines({ offer, t }: { offer: TravelOffer | StayOffer; t: T }) {
  return (
    <div className="num flex flex-col gap-1 text-[14px]">
      {"name" in offer
        ? <div className="flex justify-between"><span className="text-muted">{t("tk.stayLine", { rate: rp(offer.ratePerNight), nights: offer.nights, rooms: offer.rooms })}</span><span>{rp(offer.total)}</span></div>
        : <div className="flex justify-between"><span className="text-muted">{t("tk.paxLine", { fare: rp(offer.farePerPax), n: offer.total / offer.farePerPax })}</span><span>{rp(offer.total)}</span></div>}
      <div className="flex justify-between border-t border-line pt-1.5 font-bold"><span>{t("col.total")}</span><span>{rp(offer.total)}</span></div>
    </div>
  );
}
