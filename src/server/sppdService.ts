import "server-only";
import { z } from "zod";
import { db } from "@/lib/db";
import { estimateBudget } from "@/domain/estimate";
import { ApprovalRoutingError, currentStep, planApprovalChain, type OrgPerson } from "@/domain/approval";
import { sppdNumber } from "@/domain/sppdNumber";
import { daysBetween, parseDate, todayInJakarta, tripDays } from "@/domain/dates";

export class SppdError extends Error {}

const MAX_TRIP_DAYS = 30;

export const submitInput = z.object({
  dest: z.string().min(1, "Choose a destination"),
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Choose a start date"),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Choose an end date"),
  purpose: z.string().trim().min(5, "Describe the purpose (at least 5 characters)").max(300),
  needs: z.array(z.enum(["FLIGHT", "TRAIN", "HOTEL", "CAR"])).min(1, "Choose at least one item to book"),
});
export type SubmitInput = z.infer<typeof submitInput>;

/** Create an SPPD for `userId` and route it for approval. Budget and chain are always computed here. */
export async function submitSppd(userId: string, input: SubmitInput, today = todayInJakarta()) {
  const user = await db.user.findUnique({ where: { id: userId }, include: { company: true } });
  if (!user?.company || !user.grade) throw new SppdError("Your account is not set up for business travel. Ask Finance.");
  const policy = await db.travelPolicy.findUnique({ where: { companyId_grade: { companyId: user.company.id, grade: user.grade } } });
  if (!policy) throw new SppdError(`No travel policy for grade ${user.grade}. Ask Finance.`);
  const city = await db.city.findUnique({ where: { code: input.dest } });
  if (!city) throw new SppdError("Unknown destination");

  const start = parseDate(input.from), end = parseDate(input.to);
  if (daysBetween(today, start) < 0) throw new SppdError("The trip can't start in the past");
  if (daysBetween(start, end) < 0) throw new SppdError("The trip ends before it starts");
  if (tripDays(start, end) > MAX_TRIP_DAYS) throw new SppdError(`Trips are limited to ${MAX_TRIP_DAYS} days`);
  if (input.needs.includes("FLIGHT") && !city.flightFare) throw new SppdError(`There are no flights to ${city.name}`);
  if (input.needs.includes("TRAIN") && !city.trainFare) throw new SppdError(`There are no trains to ${city.name}`);

  const { total } = estimateBudget(policy, city, start, end, input.needs);
  const people = await db.user.findMany({
    where: { companyId: user.company.id },
    select: { id: true, grade: true, managerId: true, role: true },
  });
  const org = new Map<string, OrgPerson>(people.map((p) => [p.id, { id: p.id, grade: p.grade, managerId: p.managerId, isFinanceAdmin: p.role === "FINANCE_ADMIN" }]));
  let chain;
  try {
    chain = planApprovalChain(user.id, org, total, user.company.financeReviewOver);
  } catch (e) {
    if (e instanceof ApprovalRoutingError) throw new SppdError("No approver is set up for you. Ask Finance to check your reporting line.");
    throw e;
  }

  return db.sppd.create({
    data: {
      companyId: user.company.id, employeeId: user.id, destCode: city.code, startDate: start, endDate: end,
      purpose: input.purpose, needs: input.needs, status: "PENDING_APPROVAL", budget: total, submittedAt: new Date(),
      steps: { create: chain.map((c) => ({ order: c.order, kind: c.kind, approverId: c.approverId })) },
    },
  });
}

/**
 * Record `userId`'s decision on an approval step. Only the step's approver can decide, only when it is
 * the request's current step. The final approval issues the SPPD number.
 */
export async function decideStep(userId: string, stepId: string, decision: "APPROVED" | "REJECTED", note?: string, today = todayInJakarta()) {
  return db.$transaction(async (tx) => {
    const step = await tx.approvalStep.findUnique({
      where: { id: stepId },
      include: { sppd: { include: { steps: true, company: true, employee: { select: { name: true } } } } },
    });
    if (!step || step.approverId !== userId) throw new SppdError("This request isn't waiting for you");
    if (step.sppd.status !== "PENDING_APPROVAL" || currentStep(step.sppd.steps)?.id !== step.id) {
      throw new SppdError("This request has already moved on");
    }
    if (decision === "REJECTED" && !note?.trim()) throw new SppdError(`Tell ${step.sppd.employee.name} why it's rejected`);

    // Guard against a double submit racing us: only a still-pending step is updated.
    const updated = await tx.approvalStep.updateMany({
      where: { id: step.id, decision: "PENDING" },
      data: { decision, decidedAt: new Date(), note: note?.trim() || null },
    });
    if (updated.count !== 1) throw new SppdError("This request has already moved on");

    if (decision === "REJECTED") {
      await tx.sppd.update({ where: { id: step.sppdId }, data: { status: "REJECTED" } });
      return { status: "REJECTED" as const, number: null };
    }
    const remaining = step.sppd.steps.filter((s) => s.id !== step.id && s.decision === "PENDING");
    if (remaining.length) return { status: "PENDING_APPROVAL" as const, number: null };

    const company = await tx.company.update({ where: { id: step.sppd.companyId }, data: { sppdSeq: { increment: 1 } } });
    const number = sppdNumber(company.sppdSeq, company.code, today);
    await tx.sppd.update({ where: { id: step.sppdId }, data: { status: "APPROVED", number } });
    return { status: "APPROVED" as const, number };
  });
}
