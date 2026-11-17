"use client";

import { useActionState } from "react";
import { useActionForm } from "@/lib/use-action-form";
import { assignAction, deleteConnectionAction, saveConnectionAction, testConnectionAction, type SupState } from "./actions";
import { useI18n } from "@/i18n/client";

type Kind = "FLIGHT" | "TRAIN" | "STAY";
type Conn = { id: string; name: string; baseUrl: string; kinds: Kind[]; canIssue: boolean; apiKeyHint: string | null };
const KINDS: Kind[] = ["FLIGHT", "TRAIN", "STAY"];

const Status = ({ s }: { s: SupState }) => {
  const { t } = useI18n();
  return <>
    {s.error && <p role="alert" className="rounded-lg bg-red-t px-3 py-2 text-[13px] font-semibold text-red-d">{s.error}</p>}
    {s.saved && <p role="status" className="rounded-lg bg-green-t px-3 py-2 text-[13px] font-semibold text-green-d">{t("pay.saved")}</p>}
  </>;
};

export function AssignForm({ assignment, connections }: { assignment: Record<Kind, string | null>; connections: Conn[] }) {
  const { t } = useI18n();
  const [state, onSubmit, pending] = useActionForm<SupState>(assignAction, {});
  return (
    <form onSubmit={onSubmit} className="card flex flex-col gap-3 p-5">
      <h2 className="text-base font-bold">{t("sup.assign")}</h2>
      <p className="note">{t("sup.assignHelp")}</p>
      <div className="grid gap-3 sm:grid-cols-3">
        {KINDS.map((k) => (
          <label key={k} className="field">{t(`tk.kind.${k}`)}
            <select name={k} className="input" defaultValue={assignment[k] ?? "sample"}>
              <option value="sample">{t("sup.sample")}</option>
              {connections.filter((c) => c.kinds.includes(k)).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </label>
        ))}
      </div>
      <Status s={state} />
      <div><button className="btn btn-red" disabled={pending}>{t("sup.saveAssign")}</button></div>
    </form>
  );
}

export function ConnectionForm({ conn }: { conn?: Conn }) {
  const { t } = useI18n();
  const [state, onSubmit, pending] = useActionForm<SupState>(saveConnectionAction, {});
  const err = (k: string) => state.fieldErrors?.[k] && <span className="text-[13px] font-semibold tracking-normal text-red-d normal-case">{state.fieldErrors[k]}</span>;
  return (
    <form onSubmit={onSubmit} className="grid gap-3 sm:grid-cols-2" aria-label={conn ? conn.name : t("sup.add")}>
      {conn && <input type="hidden" name="id" value={conn.id} />}
      <label className="field">{t("sup.name")}<input name="name" className="input" defaultValue={conn?.name} required />{err("name")}</label>
      <label className="field">{t("sup.baseUrl")}<input name="baseUrl" className="input font-mono text-[13px]" defaultValue={conn?.baseUrl} placeholder="https://supplier.example.com/kitawisata/v1" required />{err("baseUrl")}</label>
      <label className="field">{t("sup.apiKey")}
        <input name="apiKey" type="password" autoComplete="off" className="input font-mono" placeholder={conn?.apiKeyHint ? t("pay.savedHint", { hint: conn.apiKeyHint }) : t("pay.notSet")} />
      </label>
      <fieldset className="field"><legend className="mb-1.5">{t("sup.kinds")}</legend>
        <div className="flex flex-wrap gap-3 tracking-normal text-ink normal-case">
          {KINDS.map((k) => <label key={k} className="flex items-center gap-1.5 text-[14px] font-semibold"><input type="checkbox" name="kinds" value={k} defaultChecked={conn?.kinds.includes(k)} className="size-4 accent-red" />{t(`tk.kind.${k}`)}</label>)}
        </div>{err("kinds")}
      </fieldset>
      <label className="flex items-center gap-2 text-[14px] font-semibold sm:col-span-2"><input type="checkbox" name="canIssue" defaultChecked={conn?.canIssue} className="size-4 accent-red" />{t("sup.canIssue")}</label>
      {conn?.apiKeyHint && <label className="flex items-center gap-2 text-[13px] sm:col-span-2"><input type="checkbox" name="clearKey" className="size-4 accent-red" />{t("pay.remove")}</label>}
      <div className="sm:col-span-2"><Status s={state} /></div>
      <div className="sm:col-span-2"><button className="btn btn-red btn-sm" disabled={pending}>{conn ? t("ot.saveChanges") : t("sup.addButton")}</button></div>
    </form>
  );
}

export function ConnectionTools({ id, name }: { id: string; name: string }) {
  const { t } = useI18n();
  const [test, runTest, testing] = useActionState<SupState, FormData>(testConnectionAction, {});
  const [del, runDel, deleting] = useActionState<SupState, FormData>(deleteConnectionAction, {});
  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-2">
        <form action={runTest}><input type="hidden" name="id" value={id} /><button className="btn btn-line btn-sm" disabled={testing}>{testing ? t("pay.testing") : t("pay.testButton")}</button></form>
        <form action={runDel} onSubmit={(e) => { if (!confirm(t("sup.confirmDelete", { name }))) e.preventDefault(); }}><input type="hidden" name="id" value={id} /><button className="btn btn-line btn-sm" disabled={deleting}>{t("common.remove")}</button></form>
      </div>
      {test.test && <p role="status" className={`rounded-lg px-3 py-2 text-[13px] font-semibold ${test.test.ok ? "bg-green-t text-green-d" : "bg-red-t text-red-d"}`}>{test.test.message}</p>}
      {del.error && <p role="alert" className="rounded-lg bg-red-t px-3 py-2 text-[13px] font-semibold text-red-d">{del.error}</p>}
    </div>
  );
}
