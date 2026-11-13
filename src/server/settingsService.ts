import "server-only";
import { z } from "zod";
import { db } from "@/lib/db";

export class SettingsError extends Error {}

const rupiah = z.preprocess(
  (v) => (typeof v === "string" ? Number(v.replace(/[^\d]/g, "")) : v),
  z.number({ message: "Enter an amount" }).int().min(0).max(1_000_000_000, "That amount is too large"),
);

export const approvalRulesInput = z.object({
  approvalMode: z.enum(["DIRECT_SUPERIOR", "FULL_CHAIN", "FULL_CHAIN_ABOVE_AMOUNT"]),
  fullChainOver: rupiah,
  financeReviewOver: rupiah,
});

/** Finance admins change their own company's approval rules. Applies to requests submitted afterwards. */
export async function updateApprovalRules(userId: string, input: z.infer<typeof approvalRulesInput>) {
  const user = await db.user.findUnique({ where: { id: userId } });
  if (!user?.companyId || user.role !== "FINANCE_ADMIN") throw new SettingsError("Only Finance can change approval rules");
  return db.company.update({
    where: { id: user.companyId },
    data: { ...input, approvalRulesUpdatedAt: new Date(), approvalRulesUpdatedBy: user.name ?? user.phone },
  });
}
