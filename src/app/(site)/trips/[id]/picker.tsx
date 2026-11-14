"use client";

import Link from "next/link";
import { useState } from "react";
import { useI18n } from "@/i18n/client";
import { parseDate } from "@/domain/dates";
import { buildInstalments } from "@/domain/openTripBooking";
import { fmtDate, rp } from "@/lib/format";

type Dep = { id: string; date: string; seatsLeft: number; status: string };

export function TripPicker({ tripId, pricePerPax, today, departures }: { tripId: string; pricePerPax: number; today: string; departures: Dep[] }) {
  const { t, locale } = useI18n();
  const first = departures.find((d) => d.seatsLeft > 0) ?? departures[0];
  const [depId, setDepId] = useState(first.id);
  const dep = departures.find((d) => d.id === depId)!;
  const [pax, setPax] = useState(Math.min(2, Math.max(1, dep.seatsLeft)));
  const maxPax = Math.min(10, dep.seatsLeft);
  const total = pricePerPax * pax;
  const split = buildInstalments("SPLIT", total, parseDate(today), parseDate(dep.date));
  return (
    <div className="card flex flex-col gap-4 p-5">
      <div><span className="note">{t("site.pricePerPerson")}</span><b className="num block text-2xl text-red">{rp(pricePerPax)}</b></div>
      <fieldset>
        <legend className="mb-2 font-bold">{t("site.chooseDeparture")}</legend>
        <div className="grid grid-cols-2 gap-2">
          {departures.map((d) => (
            <button key={d.id} type="button" disabled={d.seatsLeft === 0} aria-pressed={d.id === depId}
              onClick={() => { setDepId(d.id); setPax((p) => Math.max(1, Math.min(p, d.seatsLeft, 10))); }}
              className={`rounded-xl border px-2 py-2 text-center disabled:opacity-45 ${d.id === depId ? "border-red bg-red-t" : "border-line2 bg-white"}`}>
              <b className="block">{fmtDate(parseDate(d.date), locale, { year: false })}</b>
              <span className={`text-[12px] ${d.id === depId ? "font-bold text-red-d" : "text-muted"}`}>{d.seatsLeft ? t("site.seatsLeft", { n: d.seatsLeft }) : t("site.full")}</span>
              {d.status === "GUARANTEED" && <span className="block text-[11px] font-bold text-green-d">{t("dep.GUARANTEED")}</span>}
            </button>
          ))}
        </div>
      </fieldset>
      <div className="flex items-center justify-between gap-3">
        <b id="pax-label">{t("site.travellers")}</b>
        <div className="flex items-center gap-1 rounded-xl border border-line2" role="group" aria-labelledby="pax-label">
          <button type="button" className="size-10 text-lg font-bold disabled:opacity-40" onClick={() => setPax(pax - 1)} disabled={pax <= 1} aria-label={t("site.fewer")}>−</button>
          <output className="num w-8 text-center font-bold" aria-live="polite">{pax}</output>
          <button type="button" className="size-10 text-lg font-bold disabled:opacity-40" onClick={() => setPax(pax + 1)} disabled={pax >= maxPax} aria-label={t("site.more")}>+</button>
        </div>
      </div>
      <div className="num flex justify-between border-t border-line pt-3 font-bold"><span>{t("col.total")}</span><span>{rp(total)}</span></div>
      <p className="rounded-xl bg-green-t px-3 py-2.5 text-[14px] text-green-d">
        {split ? t("site.payTodaySplit", { amount: rp(split[0].amount), n: pax, rest: split.length - 1, date: fmtDate(split[split.length - 1].dueOn, locale) }) : t("site.payFullOnly")}
      </p>
      <Link href={`/trips/${tripId}/book?dep=${dep.id}&pax=${pax}`} className={`btn btn-red ${dep.seatsLeft ? "" : "pointer-events-none opacity-45"}`} aria-disabled={!dep.seatsLeft}>{t("site.bookNow")}</Link>
      <p className="note">{t("site.feesNote")} <a href="#terms" className="font-semibold underline">{t("fees.title")}</a></p>
    </div>
  );
}
