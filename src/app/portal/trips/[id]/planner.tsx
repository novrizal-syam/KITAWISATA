"use client";

import { useActionState, useState } from "react";
import { bookAction, type FormState } from "../../actions";
import type { BookingOption } from "@/domain/booking";
import { checkBudget } from "@/domain/booking";
import type { Need } from "@/domain/estimate";
import { rp } from "@/lib/format";
import { useI18n } from "@/i18n/client";

export function Planner({ sppdId, open, options, budget, allowance, alreadyBooked }: {
  sppdId: string; open: Need[]; options: Partial<Record<Need, BookingOption[]>>;
  budget: number; allowance: number; alreadyBooked: number;
}) {
  const { t } = useI18n();
  const [state, action, pending] = useActionState<FormState, FormData>(bookAction, {});
  const [tab, setTab] = useState<Need>(open[0]);
  const [cart, setCart] = useState<Partial<Record<Need, BookingOption>>>({});
  const picked = Object.values(cart) as BookingOption[];
  const check = checkBudget(budget, allowance, alreadyBooked, picked.reduce((a, o) => a + o.price, 0));
  const pick = (o: BookingOption) => {
    const next = { ...cart, [o.need]: cart[o.need]?.id === o.id ? undefined : o };
    setCart(next);
    const nextTab = open.find((n) => !next[n]);
    if (!cart[o.need] && nextTab) setTab(nextTab);
  };

  return (
    <section className="card p-5">
      <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-base font-bold">{t("plan.title")}</h2>
        <span className="badge bg-blue-t text-blue">{t("plan.within")}</span>
      </div>
      <p className="note mb-4">{t("plan.intro")}</p>

      <div role="tablist" className="mb-3 flex gap-1 overflow-x-auto border-b border-line">
        {open.map((n) => (
          <button key={n} role="tab" type="button" aria-selected={tab === n} onClick={() => setTab(n)}
            className={`-mb-px border-b-[3px] px-3.5 py-2.5 font-semibold whitespace-nowrap ${tab === n ? "border-red text-red" : "border-transparent text-muted"}`}>
            {t(`need.${n}`)}{cart[n] ? " ✓" : ""}
          </button>
        ))}
      </div>

      <ul role="tabpanel" className="flex flex-col gap-2.5">
        {(options[tab] ?? []).map((o) => {
          const sel = cart[o.need]?.id === o.id;
          return (
            <li key={o.id} className={`flex flex-wrap items-center justify-between gap-3 rounded-xl border px-4 py-3 ${sel ? "border-green bg-green-t" : o.allowed ? "border-line" : "border-line bg-ground"}`}>
              <div className={o.allowed ? "" : "text-muted"}>
                <b>{o.name}</b>
                <div className="note">{o.detail}</div>
                {!o.allowed && <div className="text-[12.5px] font-semibold text-red-d">🔒 {o.lockReason}</div>}
              </div>
              <div className="flex items-center gap-3">
                <b className={`num ${o.allowed ? "" : "text-muted"}`}>{rp(o.price)}</b>
                <button type="button" className={`btn btn-sm ${sel ? "btn-green" : "btn-line"}`} disabled={!o.allowed} onClick={() => pick(o)}
                  aria-label={t(sel ? "plan.removeAria" : "plan.selectAria", { name: o.name })}>
                  {!o.allowed ? t("plan.locked") : sel ? t("plan.selected") : t("plan.select")}
                </button>
              </div>
            </li>
          );
        })}
        {!(options[tab] ?? []).length && <li className="note">{t("plan.nothing")}</li>}
      </ul>

      <form action={action} className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4">
        <input type="hidden" name="sppdId" value={sppdId} />
        {picked.map((o) => <input key={o.need} type="hidden" name="pick" value={`${o.id}|${o.need}`} />)}
        <div className="num">
          <div className="note">{t("plan.footer", { n: picked.length, total: open.length, allowance: rp(allowance) })}</div>
          <b className="text-lg">{rp(check.selected)}</b>{" "}
          <span className={`note ${check.ok ? "" : "font-semibold text-red-d"}`}>
            · {check.ok ? t("plan.left", { amount: rp(check.remaining) }) : t("plan.over", { amount: rp(-check.remaining) })}
          </span>
        </div>
        <button className="btn btn-red" disabled={pending || !picked.length || !check.ok}>
          {pending ? t("plan.booking") : picked.length === open.length ? t("plan.confirm") : t("plan.bookSome", { n: picked.length || "" }).replace("  ", " ")}
        </button>
        {state.error && <p role="alert" className="w-full rounded-lg bg-red-t px-3 py-2 text-[13px] font-semibold text-red-d">{state.error}</p>}
      </form>
    </section>
  );
}
