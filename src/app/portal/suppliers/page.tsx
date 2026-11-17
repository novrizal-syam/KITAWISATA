import { requireRole } from "@/lib/authz";
import { getT } from "@/i18n/server";
import { tMaybe } from "@/i18n";
import { fmtDay } from "@/lib/format";
import { supplierOverview } from "@/server/supplierSettingsService";
import { AssignForm, ConnectionForm, ConnectionTools } from "./forms";

export default async function SupplierSettings() {
  await requireRole(["OPS"], "/portal/suppliers");
  const [{ t, locale }, { assignment, connections }] = await Promise.all([getT(), supplierOverview()]);
  const conns = connections.map((c) => ({ id: c.id, name: c.name, baseUrl: c.baseUrl, kinds: c.kinds, canIssue: c.canIssue, apiKeyHint: c.apiKeyHint }));
  return (
    <div className="flex max-w-4xl flex-col gap-5">
      <div><p className="eyebrow">{t("ot.eyebrow")}</p><h1 className="text-[28px] font-bold">{t("sup.title")}</h1><p className="mt-1 text-muted">{t("sup.intro")}</p></div>
      <AssignForm assignment={assignment} connections={conns} />
      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-bold">{t("sup.connections")}</h2>
        {connections.length === 0 && <p className="card p-5 text-muted">{t("sup.none")}</p>}
        {connections.map((c) => {
          const last = c.lastTestMessage ? (JSON.parse(c.lastTestMessage) as { key: string; params?: Record<string, string> }) : null;
          return (
            <article key={c.id} className="card flex flex-col gap-4 p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div><b className="text-[16px]">{c.name}</b><div className="note">{c.kinds.map((k) => t(`tk.kind.${k}`)).join(", ")}{c.canIssue ? ` · ${t("sup.issues")}` : ""}</div>
                  {c.lastTestAt && last && <div className="note">{t("pay.lastTest", { date: fmtDay(c.lastTestAt, locale), result: tMaybe(t, last.key, last.params) })}</div>}</div>
                <ConnectionTools id={c.id} name={c.name} />
              </div>
              <ConnectionForm conn={conns.find((x) => x.id === c.id)} />
            </article>
          );
        })}
      </section>
      <section className="card flex flex-col gap-3 p-5">
        <h2 className="text-base font-bold">{t("sup.add")}</h2>
        <p className="note">{t("sup.addHelp")}</p>
        <ConnectionForm />
      </section>
    </div>
  );
}
