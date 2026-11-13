"use client";

import { useActionState, useState } from "react";
import { saveApprovalRules, type SettingsState } from "../actions";
import { planApprovalChain, type ApprovalMode, type ApprovalRules, type Grade } from "@/domain/approval";
import { rp } from "@/lib/format";
import { useI18n } from "@/i18n/client";

type Person = { id: string; name: string; grade: Grade | null; managerId: string | null; isFinanceAdmin: boolean };

const MODES: ApprovalMode[] = ["DIRECT_SUPERIOR", "FULL_CHAIN", "FULL_CHAIN_ABOVE_AMOUNT"];

const digits = (s: string) => Number(s.replace(/[^\d]/g, "")) || 0;
const fmtInput = (n: number) => n.toLocaleString("id-ID");

export function ApprovalRulesForm({ current, people, exampleId }: { current: ApprovalRules; people: Person[]; exampleId: string | null }) {
  const { t } = useI18n();
  const [state, action, pending] = useActionState<SettingsState, FormData>(saveApprovalRules, {});
  const [mode, setMode] = useState<ApprovalMode>(current.approvalMode);
  const [fullOver, setFullOver] = useState(fmtInput(current.fullChainOver));
  const [finOver, setFinOver] = useState(fmtInput(current.financeReviewOver));
  const rules: ApprovalRules = { approvalMode: mode, fullChainOver: digits(fullOver), financeReviewOver: digits(finOver) };
  const org = new Map(people.map((p) => [p.id, p]));
  const example = exampleId ? org.get(exampleId) : null;
  const chainFor = (budget: number) => {
    try { return planApprovalChain(example!.id, org, budget, rules).map((s) => `${org.get(s.approverId)!.name}${s.kind === "FINANCE" ? t("rules.financeTag") : ""}`).join(" → "); }
    catch { return t("rules.noApprover"); }
  };
  const samples = [3_000_000, rules.fullChainOver + 1_000_000, rules.financeReviewOver + 2_000_000]
    .filter((v, i, a) => a.indexOf(v) === i).sort((a, b) => a - b);
  const err = (k: string) => state.fieldErrors?.[k] && <span className="text-[13px] font-semibold tracking-normal text-red-d normal-case">{state.fieldErrors[k]}</span>;

  return (
    <form action={action} className="flex flex-col gap-5">
      <fieldset className="card flex flex-col gap-3 p-5">
        <legend className="sr-only">{t("rules.who")}</legend>
        <h2 className="text-base font-bold">{t("rules.who")}</h2>
        {MODES.map((m) => (
          <label key={m} className={`flex cursor-pointer gap-3 rounded-xl border p-4 ${mode === m ? "border-red bg-red-t" : "border-line"}`}>
            <input type="radio" name="approvalMode" value={m} checked={mode === m} onChange={() => setMode(m)} className="mt-1 size-[18px] accent-red" />
            <span><b className="block">{t(`rules.${m}`)}</b><span className="note">{t(`rules.${m}.body`)}</span></span>
          </label>
        ))}
        {mode === "FULL_CHAIN_ABOVE_AMOUNT" ? (
          <label className="field max-w-xs">{t("rules.fullOver")}
            <span className="flex items-center gap-2"><span className="font-bold tracking-normal text-ink normal-case">Rp</span>
              <input name="fullChainOver" inputMode="numeric" className="input num" value={fullOver} onChange={(e) => setFullOver(fmtInput(digits(e.target.value)))} /></span>
            {err("fullChainOver")}
          </label>
        ) : <input type="hidden" name="fullChainOver" value={fullOver} />}
      </fieldset>

      <section className="card flex flex-col gap-3 p-5">
        <h2 className="text-base font-bold">{t("rules.finance")}</h2>
        <p className="note">{t("rules.financeBody")}</p>
        <label className="field max-w-xs">{t("rules.financeOver")}
          <span className="flex items-center gap-2"><span className="font-bold tracking-normal text-ink normal-case">Rp</span>
            <input name="financeReviewOver" inputMode="numeric" className="input num" value={finOver} onChange={(e) => setFinOver(fmtInput(digits(e.target.value)))} /></span>
          {err("financeReviewOver")}
        </label>
      </section>

      {example && (
        <section className="card p-5" aria-live="polite">
          <h2 className="mb-2 text-base font-bold">{t("rules.example", { name: example.name })}</h2>
          <ul className="num flex flex-col gap-1.5">
            {samples.map((b) => <li key={b} className="flex flex-wrap justify-between gap-2"><span className="text-muted">{t("rules.tripOf", { amount: rp(b) })}</span><b>{chainFor(b)}</b></li>)}
          </ul>
        </section>
      )}

      {state.error && <p role="alert" className="rounded-lg bg-red-t px-3 py-2 text-[13px] font-semibold text-red-d">{state.error}</p>}
      {state.saved && <p role="status" className="rounded-xl bg-green-t px-4 py-3 font-semibold text-green-d">{t("rules.saved")}</p>}
      <div><button className="btn btn-red" disabled={pending}>{pending ? t("common.saving") : t("rules.save")}</button></div>
    </form>
  );
}
