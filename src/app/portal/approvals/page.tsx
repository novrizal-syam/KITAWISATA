import { estimateBudget } from "@/domain/estimate";
import { requireRole } from "@/lib/authz";
import { db } from "@/lib/db";
import { fmtDate, fmtDay, initials, rp } from "@/lib/format";
import { getT } from "@/i18n/server";
import { approvalsInbox, decidedByMe } from "@/server/portal";
import { SppdRow } from "../_components/sppd-bits";
import { DecideForm } from "./decide-form";

const DONE = { approved: "appr.doneApproved", forwarded: "appr.doneForwarded", rejected: "appr.doneRejected" } as const;

export default async function Approvals({ searchParams }: { searchParams: Promise<{ done?: string; who?: string; number?: string }> }) {
  const { done, who, number } = await searchParams;
  const { t, locale } = await getT();
  const banner = done && done in DONE ? t(DONE[done as keyof typeof DONE], { who: who || t("appr.theEmployee"), number: number ?? "" }) : null;
  const session = await requireRole(["MANAGER", "FINANCE_ADMIN"], "/portal/approvals");
  const [inbox, decided] = await Promise.all([approvalsInbox(session.user.id), decidedByMe(session.user.id)]);
  const policies = await db.travelPolicy.findMany({ where: { companyId: inbox[0]?.sppd.companyId ?? "" } });

  return (
    <div className="flex flex-col gap-5">
      <div>
        <p className="eyebrow">{t("appr.eyebrow")}</p>
        <h1 className="text-[28px] font-bold">{inbox.length === 1 ? t("appr.waitingOne") : inbox.length ? t("appr.waitingMany", { n: inbox.length }) : t("appr.nothing")}</h1>
      </div>

      {banner && <p role="status" className="rounded-xl bg-green-t px-4 py-3 font-semibold text-green-d">{banner}</p>}

      {inbox.map(({ id: stepId, kind, sppd: s }) => {
        const policy = policies.find((p) => p.grade === s.employee.grade);
        const lines = policy ? estimateBudget(policy, s.dest, s.startDate, s.endDate, s.needs).lines : {};
        const prior = s.steps.filter((st) => st.decision === "APPROVED");
        return (
          <article key={stepId} className="card flex flex-col gap-4 p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="grid size-10 place-items-center rounded-full bg-red-t text-sm font-bold text-red-d">{initials(s.employee.name ?? "?")}</span>
                <div>
                  <b className="text-base">{s.employee.name}</b>
                  <div className="note">{s.employee.title}{s.employee.grade ? ` · ${t(`grade.${s.employee.grade}`)}` : ""}{s.employee.costCentre ? ` · ${s.employee.costCentre}` : ""}</div>
                </div>
              </div>
              <span className="badge bg-amber-t text-amber">{kind === "FINANCE" ? t("appr.financeCheck") : ""}{t("appr.submitted", { date: s.submittedAt ? fmtDay(s.submittedAt, locale) : "" })}</span>
            </div>
            <div className="grid gap-5 md:grid-cols-2">
              <div>
                <div className="note">{t("appr.trip")}</div>
                <b>{t("row.toCity", { city: s.dest.name })}</b>
                <div>{fmtDate(s.startDate, locale)} – {fmtDate(s.endDate, locale)}</div>
                <p className="mt-1.5 text-muted">{s.purpose}</p>
                {prior.length > 0 && <p className="note mt-2">{t("appr.already", { names: prior.map((p) => p.approver.name).join(", ") })}</p>}
              </div>
              <dl className="num flex flex-col gap-1.5">
                {Object.entries(lines).map(([k, v]) => (
                  <div key={k} className="flex justify-between"><dt>{t(`need.${k as "FLIGHT"}`)}</dt><dd>{rp(v!)}</dd></div>
                ))}
                <div className="mt-1 flex justify-between border-t border-line pt-2 font-bold"><dt>{t("new.requested")}</dt><dd>{rp(s.budget)}</dd></div>
              </dl>
            </div>
            {policy && <p className="note">{t("appr.limits", { hotel: rp(policy.hotelNightCap), flight: t(`class.${policy.flightClass}`), car: t(`car.${policy.carClass}`) })}</p>}
            <DecideForm stepId={stepId} employeeName={s.employee.name ?? ""} />
          </article>
        );
      })}

      {decided.length > 0 && (
        <section className="flex flex-col gap-2.5">
          <h2 className="text-lg font-bold">{t("appr.recent")}</h2>
          {decided.map((st) => <SppdRow key={st.id} s={st.sppd} showEmployee t={t} locale={locale} />)}
        </section>
      )}
    </div>
  );
}
