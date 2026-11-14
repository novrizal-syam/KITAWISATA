"use client";

import { useActionForm } from "@/lib/use-action-form";
import { useState } from "react";
import { bookTripAction, type SiteFormState } from "../../actions";
import { useI18n } from "@/i18n/client";
import { parseDate } from "@/domain/dates";
import { fmtDate, rp } from "@/lib/format";

export function BookForm({ departureId, pax, total, contactName, contactPhone, split, terms }: {
  departureId: string; pax: number; total: number; contactName: string; contactPhone: string;
  split: { percent: number; due: string; amount: number }[] | null; terms: React.ReactNode;
}) {
  const { t, locale } = useI18n();
  const [state, onSubmit, pending] = useActionForm<SiteFormState>(bookTripAction, {});
  const [plan, setPlan] = useState<"SPLIT" | "FULL">(split ? "SPLIT" : "FULL");
  const err = (k: string) => state.fieldErrors?.[k] && <span className="text-[13px] font-semibold tracking-normal text-red-d normal-case">{state.fieldErrors[k]}</span>;
  const payToday = plan === "SPLIT" && split ? split[0].amount : total;
  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <input type="hidden" name="departureId" value={departureId} /><input type="hidden" name="pax" value={pax} />
      <section className="card grid gap-4 p-5 sm:grid-cols-2">
        <h2 className="text-lg font-bold sm:col-span-2">{t("book.who")}</h2>
        <label className="field">{t("book.contactName")}<input name="contactName" className="input" defaultValue={contactName} required autoComplete="name" />{err("contactName")}</label>
        <label className="field">{t("book.contactPhone")}<input name="contactPhone" type="tel" className="input" defaultValue={contactPhone} required autoComplete="tel" />{err("contactPhone")}</label>
        {Array.from({ length: pax }, (_, i) => (
          <label key={i} className="field sm:col-span-2">{t("book.traveller", { n: i + 1 })}
            <input name="travellerName" className="input" required defaultValue={i === 0 ? contactName : ""} placeholder={t("book.travellerPh")} />
          </label>
        ))}
        {err("travellerNames")}
      </section>
      <fieldset className="card flex flex-col gap-3 p-5">
        <legend className="sr-only">{t("book.how")}</legend>
        <h2 className="text-lg font-bold">{t("book.how")}</h2>
        <label className={`flex gap-3 rounded-xl border p-4 ${plan === "SPLIT" ? "border-red bg-red-t" : "border-line"} ${split ? "cursor-pointer" : "opacity-45"}`}>
          <input type="radio" name="plan" value="SPLIT" disabled={!split} checked={plan === "SPLIT"} onChange={() => setPlan("SPLIT")} className="mt-1 size-[18px] accent-red" />
          <span className="flex-1">
            <b className="block">{t("book.split")}</b>
            {split ? (
              <ul className="num mt-1.5 flex flex-col gap-0.5 text-[13.5px]">
                {split.map((s, i) => <li key={i} className="flex justify-between gap-3"><span className={i === 0 ? "font-semibold text-green-d" : "text-muted"}>{i === 0 ? t("book.todayLocks") : t("book.dueOn", { date: fmtDate(parseDate(s.due), locale), pct: s.percent })}</span><span>{rp(s.amount)}</span></li>)}
              </ul>
            ) : <span className="note">{t("book.splitUnavailable")}</span>}
          </span>
        </label>
        <label className={`flex cursor-pointer gap-3 rounded-xl border p-4 ${plan === "FULL" ? "border-red bg-red-t" : "border-line"}`}>
          <input type="radio" name="plan" value="FULL" checked={plan === "FULL"} onChange={() => setPlan("FULL")} className="mt-1 size-[18px] accent-red" />
          <span className="flex flex-1 justify-between gap-3"><b>{t("book.full")}</b><b className="num">{rp(total)}</b></span>
        </label>
      </fieldset>
      <section className="card flex flex-col gap-3 p-5">
        <h2 className="text-lg font-bold">{t("fees.title")}</h2>
        <p className="note">{t("book.feesFor", { total: rp(total) })}</p>
        {terms}
        <label className="flex items-start gap-2.5 rounded-xl bg-ground p-3 font-semibold">
          <input type="checkbox" name="acceptTerms" required className="mt-0.5 size-[18px] accent-red" />
          <span>{t("book.accept")}</span>
        </label>
        {err("acceptTerms")}
      </section>
      {state.error && <p role="alert" className="rounded-lg bg-red-t px-3 py-2 text-[13px] font-semibold text-red-d">{state.error}</p>}
      <div className="card flex flex-wrap items-center justify-between gap-3 p-5">
        <div><span className="note">{t("book.payToday")}</span><b className="num block text-2xl text-red">{rp(payToday)}</b></div>
        <button className="btn btn-red" disabled={pending}>{pending ? t("book.holding") : t("book.hold")}</button>
      </div>
    </form>
  );
}
