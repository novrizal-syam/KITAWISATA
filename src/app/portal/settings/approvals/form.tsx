"use client";

import { useActionState, useState } from "react";
import { saveApprovalRules, type SettingsState } from "../actions";
import { planApprovalChain, type ApprovalMode, type ApprovalRules, type Grade } from "@/domain/approval";
import { rp } from "@/lib/format";

type Person = { id: string; name: string; grade: Grade | null; managerId: string | null; isFinanceAdmin: boolean };

const MODES: { value: ApprovalMode; title: string; body: string }[] = [
  { value: "DIRECT_SUPERIOR", title: "Direct superior only", body: "The employee's own manager approves. Fastest." },
  { value: "FULL_CHAIN", title: "Every superior up to the Director", body: "Each manager up the reporting line approves in turn, ending with the Director." },
  { value: "FULL_CHAIN_ABOVE_AMOUNT", title: "Direct superior, and up to the Director above an amount", body: "Small trips need only the direct superior; larger ones go all the way up." },
];

const digits = (s: string) => Number(s.replace(/[^\d]/g, "")) || 0;
const fmtInput = (n: number) => n.toLocaleString("id-ID");

export function ApprovalRulesForm({ current, people, exampleId }: { current: ApprovalRules; people: Person[]; exampleId: string | null }) {
  const [state, action, pending] = useActionState<SettingsState, FormData>(saveApprovalRules, {});
  const [mode, setMode] = useState<ApprovalMode>(current.approvalMode);
  const [fullOver, setFullOver] = useState(fmtInput(current.fullChainOver));
  const [finOver, setFinOver] = useState(fmtInput(current.financeReviewOver));
  const rules: ApprovalRules = { approvalMode: mode, fullChainOver: digits(fullOver), financeReviewOver: digits(finOver) };
  const org = new Map(people.map((p) => [p.id, p]));
  const example = exampleId ? org.get(exampleId) : null;
  const chainFor = (budget: number) => {
    try { return planApprovalChain(example!.id, org, budget, rules).map((s) => `${org.get(s.approverId)!.name}${s.kind === "FINANCE" ? " (Finance)" : ""}`).join(" → "); }
    catch { return "No approver available"; }
  };
  const samples = [3_000_000, rules.fullChainOver + 1_000_000, rules.financeReviewOver + 2_000_000]
    .filter((v, i, a) => a.indexOf(v) === i).sort((a, b) => a - b);
  const err = (k: string) => state.fieldErrors?.[k] && <span className="text-[13px] font-semibold tracking-normal text-red-d normal-case">{state.fieldErrors[k]}</span>;

  return (
    <form action={action} className="flex flex-col gap-5">
      <fieldset className="card flex flex-col gap-3 p-5">
        <legend className="sr-only">Who approves</legend>
        <h2 className="text-base font-bold">Who approves</h2>
        {MODES.map((m) => (
          <label key={m.value} className={`flex cursor-pointer gap-3 rounded-xl border p-4 ${mode === m.value ? "border-red bg-red-t" : "border-line"}`}>
            <input type="radio" name="approvalMode" value={m.value} checked={mode === m.value} onChange={() => setMode(m.value)} className="mt-1 size-[18px] accent-red" />
            <span><b className="block">{m.title}</b><span className="note">{m.body}</span></span>
          </label>
        ))}
        {mode === "FULL_CHAIN_ABOVE_AMOUNT" ? (
          <label className="field max-w-xs">Go up to the Director when the budget is above
            <span className="flex items-center gap-2"><span className="font-bold tracking-normal text-ink normal-case">Rp</span>
              <input name="fullChainOver" inputMode="numeric" className="input num" value={fullOver} onChange={(e) => setFullOver(fmtInput(digits(e.target.value)))} /></span>
            {err("fullChainOver")}
          </label>
        ) : <input type="hidden" name="fullChainOver" value={fullOver} />}
      </fieldset>

      <section className="card flex flex-col gap-3 p-5">
        <h2 className="text-base font-bold">Finance budget check</h2>
        <p className="note">Finance also checks any request with a budget above this amount, after the managers. A Director&apos;s own trips always go to Finance.</p>
        <label className="field max-w-xs">Finance checks requests above
          <span className="flex items-center gap-2"><span className="font-bold tracking-normal text-ink normal-case">Rp</span>
            <input name="financeReviewOver" inputMode="numeric" className="input num" value={finOver} onChange={(e) => setFinOver(fmtInput(digits(e.target.value)))} /></span>
          {err("financeReviewOver")}
        </label>
      </section>

      {example && (
        <section className="card p-5" aria-live="polite">
          <h2 className="mb-2 text-base font-bold">What this means for {example.name}</h2>
          <ul className="num flex flex-col gap-1.5">
            {samples.map((b) => <li key={b} className="flex flex-wrap justify-between gap-2"><span className="text-muted">Trip of {rp(b)}</span><b>{chainFor(b)}</b></li>)}
          </ul>
        </section>
      )}

      {state.error && <p role="alert" className="rounded-lg bg-red-t px-3 py-2 text-[13px] font-semibold text-red-d">{state.error}</p>}
      {state.saved && <p role="status" className="rounded-xl bg-green-t px-4 py-3 font-semibold text-green-d">Saved. New requests follow these rules.</p>}
      <div><button className="btn btn-red" disabled={pending}>{pending ? "Saving…" : "Save approval rules"}</button></div>
    </form>
  );
}
