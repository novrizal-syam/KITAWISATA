"use client";

import { useActionState, useMemo, useState } from "react";
import { submitSppdAction, type FormState } from "../../actions";
import { estimateBudget, type Need, type PolicyLimits } from "@/domain/estimate";
import { parseDate } from "@/domain/dates";
import { needsFullChain, type ApprovalRules } from "@/domain/approval";
import { LINE_LABEL, NEED_LABEL, rp } from "@/lib/format";

type City = { code: string; name: string; flightFare: number | null; trainFare: number | null };

export function NewSppdForm({ policy, cities, today, directChain, fullChain, rules }: {
  policy: PolicyLimits; cities: City[]; today: string; directChain: string[]; fullChain: string[]; rules: ApprovalRules;
}) {
  const [state, action, pending] = useActionState<FormState, FormData>(submitSppdAction, {});
  const [dest, setDest] = useState(cities[0]?.code ?? "");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [needs, setNeeds] = useState<Need[]>(["FLIGHT", "HOTEL"]);
  const city = cities.find((c) => c.code === dest);
  const available = (n: Need) => !city || (n === "FLIGHT" ? !!city.flightFare : n === "TRAIN" ? !!city.trainFare : true);
  const chosen = needs.filter(available);

  const est = useMemo(() => {
    if (!city || !from || !to || to < from) return null;
    return estimateBudget(policy, city, parseDate(from), parseDate(to), chosen);
  }, [policy, city, from, to, chosen]);
  const err = (k: string) => state.fieldErrors?.[k] && <span className="text-[13px] font-semibold tracking-normal text-red-d normal-case">{state.fieldErrors[k]}</span>;

  return (
    <form action={action} className="grid gap-5 lg:grid-cols-[1fr_320px]">
      <div className="card flex flex-col gap-4 p-5">
        <label className="field">Destination (from Jakarta)
          <select name="dest" className="input" value={dest} onChange={(e) => setDest(e.target.value)}>
            {cities.map((c) => <option key={c.code} value={c.code}>{c.name}</option>)}
          </select>{err("dest")}
        </label>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="field">Leave on<input type="date" name="from" className="input" min={today} value={from} onChange={(e) => { setFrom(e.target.value); if (!to || to < e.target.value) setTo(e.target.value); }} required />{err("from")}</label>
          <label className="field">Return on<input type="date" name="to" className="input" min={from || today} value={to} onChange={(e) => setTo(e.target.value)} required />{err("to")}</label>
        </div>
        <label className="field">Purpose<textarea name="purpose" className="input min-h-20 py-2.5" maxLength={300} required placeholder="e.g. Distributor onboarding and product training" />{err("purpose")}</label>
        <fieldset className="field">
          <legend className="mb-1.5">What do you need booked?</legend>
          <div className="flex flex-wrap gap-2">
            {(["FLIGHT", "TRAIN", "HOTEL", "CAR"] as Need[]).map((n) => (
              <label key={n} className={`flex min-h-11 items-center gap-2 rounded-[11px] border border-line2 bg-white px-3.5 text-[14.5px] font-semibold tracking-normal text-ink normal-case ${available(n) ? "cursor-pointer" : "cursor-not-allowed opacity-45"}`}>
                <input type="checkbox" name="needs" value={n} className="size-[18px] accent-red" disabled={!available(n)}
                  checked={available(n) && needs.includes(n)} onChange={(e) => setNeeds(e.target.checked ? [...needs, n] : needs.filter((x) => x !== n))} />
                {NEED_LABEL[n]}{!available(n) && <span className="note">(none to {city?.name})</span>}
              </label>
            ))}
          </div>{err("needs")}
        </fieldset>
      </div>

      <aside className="card flex h-fit flex-col gap-3 p-5">
        <h2 className="text-base font-bold">Budget estimate</h2>
        {est ? (
          <>
            <p className="note">{est.days} day{est.days > 1 ? "s" : ""}, {est.nights} night{est.nights === 1 ? "" : "s"}, at your grade&apos;s limits</p>
            <dl className="num flex flex-col gap-1.5">
              {Object.entries(est.lines).map(([k, v]) => (
                <div key={k} className="flex justify-between"><dt>{LINE_LABEL[k as keyof typeof LINE_LABEL]}</dt><dd>{rp(v!)}</dd></div>
              ))}
              <div className="mt-1 flex justify-between border-t border-line pt-2 font-bold"><dt>Requested budget</dt><dd>{rp(est.total)}</dd></div>
            </dl>
          </>
        ) : <p className="note">Pick your dates to see the budget.</p>}
        <p className="note">
          Approval: {(needsFullChain(rules, est?.total ?? 0) ? fullChain : directChain).join(" → ") || "Finance"}
          {est && est.total > rules.financeReviewOver ? ", then a Finance budget check (above " + rp(rules.financeReviewOver) + ")" : ""}.
          {rules.approvalMode === "FULL_CHAIN_ABOVE_AMOUNT" && ` Trips above ${rp(rules.fullChainOver)} go up to the Director.`}
        </p>
        {state.error && <p role="alert" className="rounded-lg bg-red-t px-3 py-2 text-[13px] font-semibold text-red-d">{state.error}</p>}
        <button className="btn btn-red" disabled={pending}>{pending ? "Submitting…" : "Submit for approval"}</button>
      </aside>
    </form>
  );
}
