import { requireRole } from "@/lib/authz";
import { db } from "@/lib/db";
import { fmtDay } from "@/lib/format";
import { portalUser } from "@/server/portal";
import { ApprovalRulesForm } from "./form";

export default async function ApprovalRulesPage() {
  const session = await requireRole(["FINANCE_ADMIN"], "/portal/settings/approvals");
  const me = (await portalUser(session.user.id))!;
  const c = me.company;
  // Example requester for the preview: the first staff member with a manager below a manager.
  const people = await db.user.findMany({ where: { companyId: c.id }, select: { id: true, name: true, grade: true, managerId: true, role: true } });
  const example = people.find((p) => p.grade === "STAFF" && p.managerId && people.find((m) => m.id === p.managerId)?.grade !== "DIRECTOR") ?? people.find((p) => p.managerId);

  return (
    <div className="flex max-w-3xl flex-col gap-5">
      <div>
        <p className="eyebrow">Settings</p>
        <h1 className="text-[28px] font-bold">Approval rules</h1>
        <p className="mt-1 text-muted">Who has to approve a business trip before the employee can book it. Changes apply to requests submitted from now on; requests already waiting keep their approvers.</p>
      </div>
      <ApprovalRulesForm
        current={{ approvalMode: c.approvalMode, fullChainOver: c.fullChainOver, financeReviewOver: c.financeReviewOver }}
        people={people.map((p) => ({ id: p.id, name: p.name ?? "", grade: p.grade, managerId: p.managerId, isFinanceAdmin: p.role === "FINANCE_ADMIN" }))}
        exampleId={example?.id ?? null}
      />
      {c.approvalRulesUpdatedAt && <p className="note">Last changed {fmtDay(c.approvalRulesUpdatedAt)} by {c.approvalRulesUpdatedBy}.</p>}
    </div>
  );
}
