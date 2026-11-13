import "server-only";
import { db } from "@/lib/db";
import { currentStep } from "@/domain/approval";

/** The signed-in portal user with company, department and their grade's travel policy. */
export async function portalUser(userId: string) {
  const user = await db.user.findUnique({
    where: { id: userId },
    include: { company: true, department: true, manager: { select: { id: true, name: true } } },
  });
  if (!user?.company) return null;
  const policy = user.grade
    ? await db.travelPolicy.findUnique({ where: { companyId_grade: { companyId: user.company.id, grade: user.grade } } })
    : null;
  return { ...user, company: user.company, policy };
}

const sppdInclude = {
  dest: true,
  employee: { select: { id: true, name: true, title: true, grade: true, costCentre: true } },
  steps: { orderBy: { order: "asc" as const }, include: { approver: { select: { id: true, name: true, title: true } } } },
  bookings: true,
  exceptions: true,
};

export async function mySppds(userId: string) {
  return db.sppd.findMany({ where: { employeeId: userId }, include: sppdInclude, orderBy: { startDate: "desc" } });
}

/**
 * An SPPD the viewer may see: their own, one they are in the approval chain of, or any in their
 * company for finance admins. Returns null otherwise (callers show a 404).
 */
export async function sppdForViewer(id: string, viewer: { id: string; role: string; companyId: string | null }) {
  const s = await db.sppd.findUnique({ where: { id }, include: sppdInclude });
  if (!s) return null;
  const allowed =
    s.employeeId === viewer.id ||
    s.steps.some((st) => st.approverId === viewer.id) ||
    (viewer.role === "FINANCE_ADMIN" && s.companyId === viewer.companyId);
  return allowed ? s : null;
}

/** Requests whose current step is waiting on this user. */
export async function approvalsInbox(userId: string) {
  const steps = await db.approvalStep.findMany({
    where: { approverId: userId, decision: "PENDING", sppd: { status: "PENDING_APPROVAL" } },
    include: { sppd: { include: sppdInclude } },
    orderBy: { sppd: { submittedAt: "asc" } },
  });
  return steps.filter((st) => currentStep(st.sppd.steps)?.id === st.id);
}

export async function inboxCount(userId: string) {
  return (await approvalsInbox(userId)).length;
}

export async function decidedByMe(userId: string, take = 10) {
  const steps = await db.approvalStep.findMany({
    where: { approverId: userId, decision: { not: "PENDING" } },
    include: { sppd: { include: sppdInclude } },
    orderBy: { decidedAt: "desc" },
    take,
  });
  return steps;
}

export async function cities() {
  return db.city.findMany({ orderBy: { name: "asc" } });
}

export type SppdWithDetails = NonNullable<Awaited<ReturnType<typeof sppdForViewer>>>;
