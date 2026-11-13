import { redirect } from "next/navigation";
import { PORTAL_ROLES, requireRole } from "@/lib/authz";

export default async function PortalHome() {
  const session = await requireRole(PORTAL_ROLES, "/portal");
  const role = session.user.role;
  redirect(role === "OPS" ? "/portal/open-trips" : role === "MANAGER" || role === "FINANCE_ADMIN" ? "/portal/approvals" : "/portal/trips");
}
