// Approval routing (docs/decisions.md §2): the requester's superior approves, then that person's
// superior, and so on up to and including the Director. Nobody approves their own request.
// Requests above the company's threshold, and requests from someone with no superior, also get a
// Finance budget check.

export type Grade = "STAFF" | "SUPERVISOR" | "MANAGER" | "DIRECTOR";

export interface OrgPerson {
  id: string;
  grade: Grade | null;
  managerId: string | null;
  isFinanceAdmin: boolean;
}

export interface PlannedStep {
  order: number;
  kind: "SUPERIOR" | "FINANCE";
  approverId: string;
}

export class ApprovalRoutingError extends Error {}

export function planApprovalChain(
  requesterId: string,
  people: ReadonlyMap<string, OrgPerson>,
  budget: number,
  financeReviewOver: number,
): PlannedStep[] {
  const requester = people.get(requesterId);
  if (!requester) throw new ApprovalRoutingError(`Unknown requester ${requesterId}`);

  const steps: PlannedStep[] = [];
  const seen = new Set([requesterId]);
  let current = requester;
  while (current.managerId && current.grade !== "DIRECTOR") {
    const boss = people.get(current.managerId);
    if (!boss) throw new ApprovalRoutingError(`Unknown manager ${current.managerId}`);
    if (seen.has(boss.id)) throw new ApprovalRoutingError(`Reporting line loops at ${boss.id}`);
    seen.add(boss.id);
    steps.push({ order: steps.length + 1, kind: "SUPERIOR", approverId: boss.id });
    current = boss;
  }

  if (steps.length === 0 || budget > financeReviewOver) {
    // Finance check by a finance admin other than the requester. If the requester is the only
    // finance admin and the chain already reached the Director, the Director's approval stands.
    const finance = [...people.values()].find((p) => p.isFinanceAdmin && p.id !== requesterId);
    if (finance && !steps.some((s) => s.approverId === finance.id)) {
      steps.push({ order: steps.length + 1, kind: "FINANCE", approverId: finance.id });
    } else if (steps.length === 0) {
      throw new ApprovalRoutingError("No one is eligible to approve this request");
    }
  }
  return steps;
}

export type StepDecision = "PENDING" | "APPROVED" | "REJECTED";

/** The step waiting for a decision, or null when the chain is finished or rejected. */
export function currentStep<T extends { order: number; decision: StepDecision }>(steps: readonly T[]): T | null {
  const sorted = [...steps].sort((a, b) => a.order - b.order);
  if (sorted.some((s) => s.decision === "REJECTED")) return null;
  return sorted.find((s) => s.decision === "PENDING") ?? null;
}
