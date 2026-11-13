import { estimateBudget } from "@/domain/estimate";
import { requireRole } from "@/lib/authz";
import { db } from "@/lib/db";
import { CAR_LABEL, FLIGHT_LABEL, GRADE_LABEL, LINE_LABEL, fmtDate, fmtDay, initials, rp } from "@/lib/format";
import { approvalsInbox, decidedByMe } from "@/server/portal";
import { SppdRow } from "../_components/sppd-bits";
import { DecideForm } from "./decide-form";

const DONE = {
  approved: (who: string, n?: string) => `Approved. ${n} issued; ${who} can now plan the trip.`,
  forwarded: (who: string) => `Approved. ${who}'s request has gone to the next approver.`,
  rejected: (who: string) => `Rejected. ${who} can see your note.`,
};

export default async function Approvals({ searchParams }: { searchParams: Promise<{ done?: string; who?: string; number?: string }> }) {
  const { done, who, number } = await searchParams;
  const banner = done && done in DONE ? DONE[done as keyof typeof DONE](who || "The employee", number) : null;
  const session = await requireRole(["MANAGER", "FINANCE_ADMIN"], "/portal/approvals");
  const [inbox, decided] = await Promise.all([approvalsInbox(session.user.id), decidedByMe(session.user.id)]);
  const policies = await db.travelPolicy.findMany({ where: { companyId: inbox[0]?.sppd.companyId ?? "" } });

  return (
    <div className="flex flex-col gap-5">
      <div>
        <p className="eyebrow">Approvals</p>
        <h1 className="text-[28px] font-bold">{inbox.length ? `${inbox.length} request${inbox.length > 1 ? "s" : ""} waiting` : "Nothing waiting for you"}</h1>
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
                  <div className="note">{s.employee.title}{s.employee.grade ? ` · ${GRADE_LABEL[s.employee.grade]}` : ""}{s.employee.costCentre ? ` · ${s.employee.costCentre}` : ""}</div>
                </div>
              </div>
              <span className="badge bg-amber-t text-amber">{kind === "FINANCE" ? "Finance check · " : ""}Submitted {s.submittedAt ? fmtDay(s.submittedAt) : ""}</span>
            </div>
            <div className="grid gap-5 md:grid-cols-2">
              <div>
                <div className="note">Trip</div>
                <b>Jakarta to {s.dest.name}</b>
                <div>{fmtDate(s.startDate)} to {fmtDate(s.endDate)}</div>
                <p className="mt-1.5 text-muted">{s.purpose}</p>
                {prior.length > 0 && <p className="note mt-2">Already approved by {prior.map((p) => p.approver.name).join(", ")}.</p>}
              </div>
              <dl className="num flex flex-col gap-1.5">
                {Object.entries(lines).map(([k, v]) => (
                  <div key={k} className="flex justify-between"><dt>{LINE_LABEL[k as keyof typeof LINE_LABEL]}</dt><dd>{rp(v!)}</dd></div>
                ))}
                <div className="mt-1 flex justify-between border-t border-line pt-2 font-bold"><dt>Requested budget</dt><dd>{rp(s.budget)}</dd></div>
              </dl>
            </div>
            {policy && <p className="note">Limits applied: hotel {rp(policy.hotelNightCap)} per night, {FLIGHT_LABEL[policy.flightClass]} flights, up to {CAR_LABEL[policy.carClass]}.</p>}
            <DecideForm stepId={stepId} employeeName={s.employee.name ?? ""} />
          </article>
        );
      })}

      {decided.length > 0 && (
        <section className="flex flex-col gap-2.5">
          <h2 className="text-lg font-bold">Recently decided</h2>
          {decided.map((st) => <SppdRow key={st.id} s={st.sppd} showEmployee />)}
        </section>
      )}
    </div>
  );
}
