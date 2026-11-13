import "server-only";
import { z } from "zod";
import { db } from "@/lib/db";
import { AppError } from "@/lib/errors";

export class SettingsError extends AppError {}

const rupiah = z.preprocess(
  (v) => (typeof v === "string" ? Number(v.replace(/[^\d]/g, "")) : v),
  z.number({ message: "v.amount" }).int("v.amount").min(0, "v.amount").max(1_000_000_000, "v.amountMax"),
);

export const approvalRulesInput = z.object({
  approvalMode: z.enum(["DIRECT_SUPERIOR", "FULL_CHAIN", "FULL_CHAIN_ABOVE_AMOUNT"], { message: "v.invalid" }),
  fullChainOver: rupiah,
  financeReviewOver: rupiah,
});

/** Finance admins change their own company's approval rules. Applies to requests submitted afterwards. */
export async function updateApprovalRules(userId: string, input: z.infer<typeof approvalRulesInput>) {
  const user = await db.user.findUnique({ where: { id: userId } });
  if (!user?.companyId || user.role !== "FINANCE_ADMIN") throw new SettingsError("err.financeOnly");
  return db.company.update({
    where: { id: user.companyId },
    data: { ...input, approvalRulesUpdatedAt: new Date(), approvalRulesUpdatedBy: user.name ?? user.phone },
  });
}
