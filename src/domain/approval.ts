// Approval routing (docs/decisions.md §2). Each company sets its rules on the Approval rules page:
// - DIRECT_SUPERIOR: the requester's direct superior only.
// - FULL_CHAIN: every superior up to and including the Director.
// - FULL_CHAIN_ABOVE_AMOUNT: the direct superior, and the whole chain when the budget is above fullChainOver.
// Nobody approves their own request. Requests above financeReviewOver, and requests from someone with
// no superior, also get a Finance budget check.

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

export type ApprovalMode = "DIRECT_SUPERIOR" | "FULL_CHAIN" | "FULL_CHAIN_ABOVE_AMOUNT";

export interface ApprovalRules {
  approvalMode: ApprovalMode;
  fullChainOver: number;
  financeReviewOver: number;
}

export const DEFAULT_RULES: ApprovalRules = { approvalMode: "FULL_CHAIN", fullChainOver: 5_000_000, financeReviewOver: 10_000_000 };

export class ApprovalRoutingError extends Error {}

/** Whether a budget goes up the whole reporting line under these rules. */
export function needsFullChain(rules: ApprovalRules, budget: number): boolean {
  return rules.approvalMode === "FULL_CHAIN" || (rules.approvalMode === "FULL_CHAIN_ABOVE_AMOUNT" && budget > rules.fullChainOver);
}

export function planApprovalChain(
  requesterId: string,
  people: ReadonlyMap<string, OrgPerson>,
  budget: number,
  rules: ApprovalRules,
): PlannedStep[] {
  const requester = people.get(requesterId);
  if (!requester) throw new ApprovalRoutingError(`Unknown requester ${requesterId}`);

  const steps: PlannedStep[] = [];
  const seen = new Set([requesterId]);
  const fullChain = needsFullChain(rules, budget);
  let current = requester;
  while (current.managerId && current.grade !== "DIRECTOR" && (fullChain || steps.length === 0)) {
    const boss = people.get(current.managerId);
    if (!boss) throw new ApprovalRoutingError(`Unknown manager ${current.managerId}`);
    if (seen.has(boss.id)) throw new ApprovalRoutingError(`Reporting line loops at ${boss.id}`);
    seen.add(boss.id);
    steps.push({ order: steps.length + 1, kind: "SUPERIOR", approverId: boss.id });
    current = boss;
  }

  if (steps.length === 0 || budget > rules.financeReviewOver) {
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
