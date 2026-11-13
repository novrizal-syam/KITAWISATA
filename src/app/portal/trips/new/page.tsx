import { PORTAL_ROLES, requireRole } from "@/lib/authz";
import { cities, portalUser } from "@/server/portal";
import { planApprovalChain } from "@/domain/approval";
import { db } from "@/lib/db";
import { toIsoDate, todayInJakarta } from "@/domain/dates";
import { NewSppdForm } from "./form";

export default async function NewSppd() {
  const session = await requireRole(PORTAL_ROLES, "/portal/trips/new");
  const [me, list] = await Promise.all([portalUser(session.user.id), cities()]);
  if (!me?.policy || !me.grade) {
    return <p className="card p-5">Your account has no travel grade yet, so you can&apos;t request business travel. Ask Finance to set it up.</p>;
  }
  // Show who will approve. The real chain is recomputed on submit, with the final budget.
  const people = await db.user.findMany({ where: { companyId: me.company.id }, select: { id: true, name: true, grade: true, managerId: true, role: true } });
  const names = new Map(people.map((p) => [p.id, p.name ?? ""]));
  const org = new Map(people.map((p) => [p.id, { id: p.id, grade: p.grade, managerId: p.managerId, isFinanceAdmin: p.role === "FINANCE_ADMIN" }]));
  let approvers: string[] = [];
  try { approvers = planApprovalChain(me.id, org, 0, me.company.financeReviewOver).map((s) => names.get(s.approverId)!); } catch { /* shown on submit */ }

  return (
    <div className="flex max-w-4xl flex-col gap-5">
      <div><p className="eyebrow">New SPPD request</p><h1 className="text-[28px] font-bold">Where are you going?</h1></div>
      <NewSppdForm
        policy={me.policy}
        cities={list.map((c) => ({ code: c.code, name: c.name, flightFare: c.flightFare, trainFare: c.trainFare }))}
        today={toIsoDate(todayInJakarta())}
        approvers={approvers}
        financeOver={me.company.financeReviewOver}
      />
    </div>
  );
}
