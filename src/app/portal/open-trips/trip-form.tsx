"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { saveOpenTrip, type TripFormState } from "./actions";
import { quoteCancellation, validateTiers, type Tier } from "@/domain/cancellation";
import { addDays, todayInJakarta, toIsoDate } from "@/domain/dates";
import { rp } from "@/lib/format";
import { useI18n } from "@/i18n/client";

export type TripFormValues = {
  id?: string; name: string; place: string; category: string; durationLabel: string; pricePerPax: number;
  meetingPoint: string; itinerary: string[]; inclusions: string; terms: string; active: boolean;
  tiers: Tier[]; departures: { date: string; seatsLeft: number; status: string }[];
};

const CATEGORIES = ["island", "mountain", "diving", "weekend", "city", "culture"];
const STATUSES = ["OPEN", "NEEDS_MORE", "GUARANTEED", "CLOSED"] as const;
const num = (s: string) => Number(s.replace(/[^\d]/g, "")) || 0;

export function TripForm({ initial }: { initial?: TripFormValues }) {
  const { t } = useI18n();
  const [state, action, pending] = useActionState<TripFormState, FormData>(saveOpenTrip, {});
  const [price, setPrice] = useState(initial ? initial.pricePerPax.toLocaleString("id-ID") : "");
  const [tiers, setTiers] = useState<{ days: string; fee: string; minFee: string }[]>(
    initial?.tiers.length ? [...initial.tiers].sort((a, b) => b.minDaysBefore - a.minDaysBefore).map((t) => ({ days: String(t.minDaysBefore), fee: String(t.feePercent), minFee: t.minFee ? t.minFee.toLocaleString("id-ID") : "" }))
      : [{ days: "30", fee: "", minFee: "" }],
  );
  const [deps, setDeps] = useState(initial?.departures ?? []);
  const parsedTiers: Tier[] = tiers.filter((t) => t.days !== "" && t.fee !== "").map((t) => ({ minDaysBefore: num(t.days), feePercent: num(t.fee), minFee: num(t.minFee) }));
  const tierErrors = validateTiers(parsedTiers);
  const p = num(price);
  // Preview on a fully paid booking for one person, departing 60 days from today.
  const today = todayInJakarta(), dep = addDays(today, 60);
  const previewDays = [...new Set([...parsedTiers.map((t) => t.minDaysBefore), 0])].sort((a, b) => b - a);
  const err = (k: string) => state.fieldErrors?.[k] && <span className="text-[13px] font-semibold tracking-normal text-red-d normal-case">{state.fieldErrors[k]}</span>;
  const setTier = (i: number, k: "days" | "fee" | "minFee", v: string) => setTiers(tiers.map((t, j) => (j === i ? { ...t, [k]: k === "minFee" ? (v ? num(v).toLocaleString("id-ID") : "") : v.replace(/[^\d]/g, "") } : t)));

  return (
    <form action={action} className="flex flex-col gap-5">
      {initial?.id && <input type="hidden" name="id" value={initial.id} />}
      <section className="card grid gap-4 p-5 sm:grid-cols-2">
        <h2 className="text-base font-bold sm:col-span-2">{t("ot.trip")}</h2>
        <label className="field sm:col-span-2">{t("ot.name")}<input name="name" className="input" defaultValue={initial?.name} required maxLength={80} placeholder={t("ot.namePh")} />{err("name")}</label>
        <label className="field">{t("ot.place")}<input name="place" className="input" defaultValue={initial?.place} required placeholder="Labuan Bajo, NTT" />{err("place")}</label>
        <label className="field">{t("ot.category")}
          <select name="category" className="input" defaultValue={initial?.category ?? "island"}>{CATEGORIES.map((c) => <option key={c} value={c}>{t(`cat.${c as "island"}`)}</option>)}</select>
        </label>
        <label className="field">{t("ot.duration")}<input name="durationLabel" className="input uppercase" defaultValue={initial?.durationLabel} required placeholder="3D2N" />{err("durationLabel")}</label>
        <label className="field">{t("ot.price")}
          <span className="flex items-center gap-2"><span className="font-bold tracking-normal text-ink normal-case">Rp</span>
            <input name="pricePerPax" inputMode="numeric" className="input num" value={price} onChange={(e) => setPrice(e.target.value ? num(e.target.value).toLocaleString("id-ID") : "")} required /></span>{err("pricePerPax")}
        </label>
        <label className="field sm:col-span-2">{t("ot.meeting")}<input name="meetingPoint" className="input" defaultValue={initial?.meetingPoint} required placeholder="Komodo Airport (LBJ), 09.00 WITA" />{err("meetingPoint")}</label>
        <label className="field sm:col-span-2">{t("ot.itinerary")}<textarea name="itinerary" className="input min-h-28 py-2.5" defaultValue={initial?.itinerary.join("\n")} required />{err("itinerary")}</label>
        <label className="field sm:col-span-2">{t("ot.included")}<input name="inclusions" className="input" defaultValue={initial?.inclusions} required placeholder={t("ot.includedPh")} />{err("inclusions")}</label>
        <label className="flex items-center gap-2 font-semibold sm:col-span-2"><input type="checkbox" name="active" defaultChecked={initial?.active ?? true} className="size-[18px] accent-red" /> {t("ot.active")}</label>
      </section>

      <section className="card flex flex-col gap-4 p-5">
        <div>
          <h2 className="text-base font-bold">{t("ot.fees")}</h2>
          <p className="note">{t("ot.feesIntro")}</p>
        </div>
        <div className="flex flex-col gap-2">
          <div className="hidden grid-cols-[1fr_1fr_1.3fr_auto] gap-2 text-xs font-bold tracking-[.04em] text-muted uppercase sm:grid"><span>{t("ot.colDays")}</span><span>{t("ot.colFee")}</span><span>{t("ot.colMin")}</span><span className="w-20" /></div>
          {tiers.map((tier, i) => (
            <div key={i} className="grid grid-cols-2 gap-2 rounded-xl border border-line p-2 sm:grid-cols-[1fr_1fr_1.3fr_auto] sm:border-0 sm:p-0">
              <input name="tier.days" aria-label={t("ot.tierDays", { n: i + 1 })} inputMode="numeric" className="input num" value={tier.days} onChange={(e) => setTier(i, "days", e.target.value)} placeholder="30" required />
              <span className="flex items-center gap-1.5"><input name="tier.fee" aria-label={t("ot.tierFee", { n: i + 1 })} inputMode="numeric" className="input num" value={tier.fee} onChange={(e) => setTier(i, "fee", e.target.value)} placeholder="10" required /><b>%</b></span>
              <span className="flex items-center gap-1.5"><b>Rp</b><input name="tier.minFee" aria-label={t("ot.tierMin", { n: i + 1 })} inputMode="numeric" className="input num" value={tier.minFee} onChange={(e) => setTier(i, "minFee", e.target.value)} placeholder="0" /></span>
              <button type="button" className="btn btn-line btn-sm w-20" onClick={() => setTiers(tiers.filter((_, j) => j !== i))} disabled={tiers.length === 1}>{t("common.remove")}</button>
            </div>
          ))}
          <div><button type="button" className="btn btn-line btn-sm" onClick={() => setTiers([...tiers, { days: "", fee: "", minFee: "" }])}>{t("ot.addTier")}</button></div>
          {err("tiers")}
          {tierErrors.length > 0 && <p role="alert" className="text-[13px] font-semibold text-red-d">{t(tierErrors[0].code, tierErrors[0].params)}</p>}
        </div>
        {p > 0 && parsedTiers.length > 0 && tierErrors.length === 0 && (
          <div className="rounded-xl bg-ground p-4">
            <b className="block">{t("ot.example", { amount: rp(p) })}</b>
            <ul className="num mt-1.5 flex flex-col gap-1">
              {previewDays.map((d) => {
                const q = quoteCancellation(p, p, parsedTiers, dep, addDays(dep, -d));
                return <li key={d} className="flex flex-wrap justify-between gap-2"><span>{d === 0 ? t("ot.cancelDay") : t("ot.cancelDays", { days: d })}</span><span>{t("ot.feeRefund", { fee: rp(q.fee), refund: rp(q.refund) })}</span></li>;
              })}
            </ul>
          </div>
        )}
        <label className="field">{t("ot.terms")}
          <textarea name="terms" className="input min-h-36 py-2.5" defaultValue={initial?.terms ?? t("ot.starterTerms")} required />{err("terms")}
        </label>
      </section>

      <section className="card flex flex-col gap-3 p-5">
        <h2 className="text-base font-bold">{t("ot.deps")}</h2>
        {deps.map((d, i) => (
          <div key={i} className="grid grid-cols-2 gap-2 sm:grid-cols-[1fr_1fr_1.3fr_auto]">
            <input type="date" name="dep.date" aria-label={t("ot.depDate", { n: i + 1 })} className="input" min={toIsoDate(today)} value={d.date} onChange={(e) => setDeps(deps.map((x, j) => (j === i ? { ...x, date: e.target.value } : x)))} required />
            <input name="dep.seats" aria-label={t("ot.depSeats", { n: i + 1 })} inputMode="numeric" className="input num" value={d.seatsLeft} onChange={(e) => setDeps(deps.map((x, j) => (j === i ? { ...x, seatsLeft: num(e.target.value) } : x)))} />
            <select name="dep.status" aria-label={t("ot.depStatus", { n: i + 1 })} className="input" value={d.status} onChange={(e) => setDeps(deps.map((x, j) => (j === i ? { ...x, status: e.target.value } : x)))}>
              {STATUSES.map((v) => <option key={v} value={v}>{t(`dep.${v}`)}</option>)}
            </select>
            <button type="button" className="btn btn-line btn-sm w-20" onClick={() => setDeps(deps.filter((_, j) => j !== i))}>{t("common.remove")}</button>
          </div>
        ))}
        {deps.length > 0 && <p className="note">{t("ot.depCols")}</p>}
        <div><button type="button" className="btn btn-line btn-sm" onClick={() => setDeps([...deps, { date: toIsoDate(addDays(today, 30)), seatsLeft: 12, status: "OPEN" }])}>{t("ot.addDep")}</button></div>
      </section>

      {state.error && <p role="alert" className="rounded-lg bg-red-t px-3 py-2 text-[13px] font-semibold text-red-d">{state.error}</p>}
      <div className="flex gap-2.5">
        <button className="btn btn-red" disabled={pending || tierErrors.length > 0}>{pending ? t("common.saving") : initial?.id ? t("ot.saveChanges") : t("ot.create")}</button>
        <Link href="/portal/open-trips" className="btn btn-line">{t("common.cancel")}</Link>
      </div>
    </form>
  );
}
