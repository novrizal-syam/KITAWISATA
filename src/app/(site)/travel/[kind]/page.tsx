import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getT } from "@/i18n/server";
import type { MessageKey, T } from "@/i18n";
import { AIRPORTS, MAX_NIGHTS, MAX_PASSENGERS, STATIONS, STAY_CITIES, type StayOffer, type TravelOffer } from "@/domain/tickets";
import { addDays, parseDate, toIsoDate, todayInJakarta } from "@/domain/dates";
import { readSearch, searchOffers } from "@/server/ticketService";
import { supplierFor } from "@/server/suppliers";
import { fmtDate, rp } from "@/lib/format";
import { BANNER, KIND_BY_SLUG, searchQuery } from "../kinds";

export default async function TravelSearch({ params, searchParams }: { params: Promise<{ kind: string }>; searchParams: Promise<Record<string, string | undefined>> }) {
  const slug = (await params).kind;
  const kind = KIND_BY_SLUG[slug];
  if (!kind) notFound();
  const { t, locale } = await getT();
  const sp = await searchParams;
  const today = todayInJakarta();
  const defaults = kind === "STAY" ? { city: "Bali", date: toIsoDate(addDays(today, 14)), pax: "2", nights: "2" }
    : kind === "FLIGHT" ? { from: "CGK", to: "DPS", date: toIsoDate(addDays(today, 14)), pax: "1" } : { from: "GMR", to: "YK", date: toIsoDate(addDays(today, 14)), pax: "1" };
  const searched = Boolean(sp.date);
  const values = { ...defaults, ...Object.fromEntries(Object.entries(sp).filter(([, v]) => v)) };
  const { search, error } = readSearch(kind, values, today);
  const result = searched && !error ? await searchOffers(search) : null;
  const offers = result?.offers ?? [];
  const sample = result ? result.supplier.id === "sample" : (await supplierFor(kind)).id === "sample";
  const places = kind === "FLIGHT" ? AIRPORTS.map((a) => [a.code, `${a.city} (${a.code})`]) : STATIONS.map((s) => [s.code, s.name]);
  const placeName = (c?: string) => places.find(([code]) => code === c)?.[1] ?? c;
  const k = kind.toLowerCase() as "flight" | "train" | "stay";
  const q = searchQuery(search as unknown as Record<string, string>);

  return (
    <main className="mx-auto flex max-w-6xl flex-col gap-5 px-4 py-6">
      <section className="relative isolate overflow-hidden rounded-2xl">
        <Image src={`/img/${BANNER[kind]}.jpg`} alt="" fill className="-z-10 object-cover" sizes="100vw" priority />
        <div className="absolute inset-0 -z-10 bg-gradient-to-r from-ink/80 to-ink/20" />
        <div className="px-6 py-10 text-white"><p className="text-xs font-extrabold tracking-[.08em] uppercase">{t(`tk.${k}.eyebrow`)}</p><h1 className="mt-2 text-3xl font-extrabold">{t(`tk.${k}.title`)}</h1></div>
      </section>
      {sample && <p className="rounded-xl bg-amber-t px-4 py-2.5 text-[13.5px] font-semibold text-amber">{t("tk.sample")}</p>}

      <form className="card flex flex-wrap items-end gap-3 p-4" method="get">
        {kind === "STAY" ? (
          <label className="field min-w-40 flex-1">{t("tk.city")}
            <select name="city" className="input" defaultValue={values.city}>{STAY_CITIES.map((c) => <option key={c}>{c}</option>)}</select></label>
        ) : (<>
          <label className="field min-w-40 flex-1">{t("tk.from")}<select name="from" className="input" defaultValue={values.from}>{places.map(([c, n]) => <option key={c} value={c}>{n}</option>)}</select></label>
          <label className="field min-w-40 flex-1">{t("tk.to")}<select name="to" className="input" defaultValue={values.to}>{places.map(([c, n]) => <option key={c} value={c}>{n}</option>)}</select></label>
        </>)}
        <label className="field">{t(kind === "STAY" ? "tk.checkIn" : "tk.date")}<input type="date" name="date" className="input" min={toIsoDate(today)} defaultValue={values.date} required /></label>
        {kind === "STAY" && <label className="field w-24">{t("tk.nights")}<select name="nights" className="input" defaultValue={values.nights}>{Array.from({ length: MAX_NIGHTS }, (_, i) => <option key={i}>{i + 1}</option>)}</select></label>}
        <label className="field w-28">{t(kind === "STAY" ? "tk.guests" : "tk.passengers")}<select name="pax" className="input" defaultValue={values.pax}>{Array.from({ length: MAX_PASSENGERS }, (_, i) => <option key={i}>{i + 1}</option>)}</select></label>
        <button className="btn btn-red">{t("tk.search")}</button>
      </form>

      {searched && error && <p role="alert" className="card p-5 font-semibold text-red-d">{t(`search.${error}`)}</p>}
      {result?.unavailable && <p role="alert" className="card p-5 font-semibold text-red-d">{t("tk.supplierDown")}</p>}
      {searched && !error && !result?.unavailable && (
        <section className="flex flex-col gap-3">
          <div>
            <p className="eyebrow">{t("tk.payFull")}</p>
            <h2 className="text-2xl font-bold">{kind === "STAY" ? t("tk.staysIn", { city: search.city! }) : t("tk.route", { from: placeName(search.from)!, to: placeName(search.to)! })}</h2>
            <p className="text-muted">{fmtDate(parseDate(search.date), locale)} · {kind === "STAY" ? t("tk.stayMeta", { nights: search.nights!, guests: search.pax }) : t("tk.paxMeta", { n: search.pax })}</p>
          </div>
          <ul className="flex flex-col gap-3">
            {offers.map((o, i) => (
              <li key={o.id} className="card flex flex-wrap items-center gap-4 p-4">
                {"name" in o ? <StayRow o={o as StayOffer} t={t} /> : <TravelRow o={o as TravelOffer} t={t} cheapest={i === 0} />}
                <div className="ml-auto flex flex-col items-end gap-1.5">
                  <span className="note">{"name" in o ? t("tk.perNight", { amount: rp((o as StayOffer).ratePerNight) }) : t("tk.perPax", { amount: rp((o as TravelOffer).farePerPax) })}</span>
                  <b className="num text-xl text-red">{rp(o.total)}</b>
                  <Link href={`/travel/${slug}/book?${q}&offer=${o.id}`} className="btn btn-red btn-sm">{t(kind === "STAY" ? "tk.selectRoom" : "tk.select")}</Link>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}

function TravelRow({ o, t, cheapest }: { o: TravelOffer; t: T; cheapest: boolean }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="flex items-center gap-2"><b>{o.kind === "TRAIN" ? t(`class.${o.carrier.toUpperCase()}` as MessageKey) : o.carrier}</b>{cheapest && <span className="badge bg-red-t text-red-d">{t("tk.cheapest")}</span>}</span>
      <span className="num flex items-baseline gap-3"><b className="text-xl">{o.depart}</b><span className="note">{o.duration} · {t("tk.direct")}</span><b className="text-xl">{o.arrive}</b></span>
      <span className="note">{o.baggageKg ? t("tk.baggage", { kg: o.baggageKg }) : t("tk.seatAtBooking")}</span>
    </div>
  );
}

function StayRow({ o, t }: { o: StayOffer; t: T }) {
  return (
    <div className="flex items-center gap-4">
      {o.imageUrl
        // Supplier photos come from the supplier's own host; shown as-is rather than through the image optimiser.
        // eslint-disable-next-line @next/next/no-img-element
        ? <img src={o.imageUrl} alt="" width={140} height={96} loading="lazy" className="hidden h-24 w-36 rounded-xl object-cover sm:block" />
        : <Image src={`/img/${o.image}-sm.jpg`} alt="" width={140} height={96} className="hidden h-24 w-36 rounded-xl object-cover sm:block" />}
      <div className="flex flex-col gap-1">
        <b className="text-[17px]">{o.name}</b>
        <span aria-label={t("tk.stars", { n: o.stars })} className="text-amber">{"★".repeat(o.stars)}</span>
        <span className="note">{o.description ?? (o.feature ? t(`tk.feature.${o.feature}`) : "")} · {t("tk.rooms", { n: o.rooms })}</span>
      </div>
    </div>
  );
}
