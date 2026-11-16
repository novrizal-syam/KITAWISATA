"use client";

import { useActionForm } from "@/lib/use-action-form";
import { bookTicketAction, type TicketFormState } from "../../actions";
import { useI18n } from "@/i18n/client";
import { rp } from "@/lib/format";

export function TicketBookForm({ kindSlug, offerId, search, names, lead, contactName, contactPhone, total }: {
  kindSlug: string; offerId: string; search: Record<string, string>; names: number; lead: boolean; contactName: string; contactPhone: string; total: number;
}) {
  const { t } = useI18n();
  const [state, onSubmit, pending] = useActionForm<TicketFormState>(bookTicketAction, {});
  const err = (k: string) => state.fieldErrors?.[k] && <span className="text-[13px] font-semibold tracking-normal text-red-d normal-case">{state.fieldErrors[k]}</span>;
  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <input type="hidden" name="kindSlug" value={kindSlug} /><input type="hidden" name="offerId" value={offerId} />
      {Object.entries(search).map(([k, v]) => <input key={k} type="hidden" name={`s.${k}`} value={String(v ?? "")} />)}
      <section className="card grid gap-4 p-5 sm:grid-cols-2">
        <h2 className="text-lg font-bold sm:col-span-2">{t(lead ? "tk.whoStays" : "book.who")}</h2>
        <label className="field">{t("book.contactName")}<input name="contactName" className="input" defaultValue={contactName} required autoComplete="name" />{err("contactName")}</label>
        <label className="field">{t("book.contactPhone")}<input name="contactPhone" type="tel" className="input" defaultValue={contactPhone} required autoComplete="tel" />{err("contactPhone")}</label>
        {Array.from({ length: names }, (_, i) => (
          <label key={i} className="field sm:col-span-2">{lead ? t("tk.leadGuest") : t("tk.passenger", { n: i + 1 })}
            <input name="travellerName" className="input" required defaultValue={i === 0 ? contactName : ""} placeholder={t("book.travellerPh")} />
          </label>
        ))}
        {err("travellerNames")}
      </section>
      {state.error && <p role="alert" className="rounded-lg bg-red-t px-3 py-2 text-[13px] font-semibold text-red-d">{state.error}</p>}
      <div className="card flex flex-wrap items-center justify-between gap-3 p-5">
        <div><span className="note">{t("tk.payInFull")}</span><b className="num block text-2xl text-red">{rp(total)}</b></div>
        <button className="btn btn-red" disabled={pending}>{pending ? t("book.holding") : t("tk.book")}</button>
      </div>
    </form>
  );
}
