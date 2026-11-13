import { redirect } from "next/navigation";
import { PORTAL_ROLES, requireRole } from "@/lib/authz";

export default async function PortalHome() {
  const session = await requireRole(PORTAL_ROLES, "/portal");
  redirect(session.user.role === "MANAGER" || session.user.role === "FINANCE_ADMIN" ? "/portal/approvals" : "/portal/trips");
}
