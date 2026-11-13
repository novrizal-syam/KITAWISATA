import { redirect } from "next/navigation";
import { auth } from "@/auth";
import type { Role } from "@/generated/prisma/client";

export const PORTAL_ROLES: readonly Role[] = ["EMPLOYEE", "MANAGER", "FINANCE_ADMIN", "OPS"];

/**
 * Server-side guard: returns the session or redirects (to login, or to /forbidden for the wrong role).
 * Call it in every protected page, route handler and server action. A layout-only check is NOT enough:
 * Next.js renders layouts and pages in parallel, so a redirect in a layout does not stop the page running.
 */
export async function requireRole(allowed: readonly Role[], callbackUrl: string) {
  const session = await auth();
  if (!session) redirect(`/login?callbackUrl=${encodeURIComponent(callbackUrl)}`);
  if (!allowed.includes(session.user.role)) redirect("/forbidden");
  return session;
}
