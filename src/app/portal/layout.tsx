import Image from "next/image";
import { auth, signOut } from "@/auth";
import { portalUser, inboxCount } from "@/server/portal";
import { initials } from "@/lib/format";
import { getT } from "@/i18n/server";
import { LanguageSwitcher } from "@/i18n/switcher";
import { db } from "@/lib/db";
import { NavLink } from "./_components/nav-link";

// Chrome only. Every page still calls requireRole(): layouts and pages render in parallel in Next.js,
// so a check here would not protect the page (see src/lib/authz.ts).
export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session) return <>{children}</>;
  const ops = session.user.role === "OPS";
  const me = ops ? await db.user.findUnique({ where: { id: session.user.id }, include: { company: true } }) : await portalUser(session.user.id);
  if (!me) return <>{children}</>;
  const { t, locale } = await getT();
  const approver = me.role === "MANAGER" || me.role === "FINANCE_ADMIN";
  const pending = approver ? await inboxCount(me.id) : 0;

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-20 border-b border-line bg-white">
        <div className="flex min-h-16 flex-wrap items-center gap-4 px-5 py-2">
          <div className="flex items-center gap-2.5">
            <Image src="/logo.png" alt="kitawisata" width={128} height={26} priority />
            <span className="border-l border-line2 pl-2.5 text-xs font-extrabold tracking-[.06em] uppercase">{t("shell.business")}</span>
          </div>
          <div className="min-w-0">
            <b className="block truncate">{ops ? t("shell.backOffice") : me.company?.name}</b>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <LanguageSwitcher locale={locale} label={t("lang.label")} />
            <form action={async () => { "use server"; await signOut({ redirectTo: "/login" }); }}>
              <button className="btn btn-line btn-sm">{t("common.signOut")}</button>
            </form>
          </div>
        </div>
      </header>
      <div className="md:grid md:grid-cols-[232px_1fr]">
        <aside className="border-b border-line bg-white p-3 md:min-h-[calc(100vh-64px)] md:border-r md:border-b-0">
          <div className="mb-3 flex items-center gap-3 border-b border-line px-2 pt-2 pb-4">
            <span className={`grid size-10 shrink-0 place-items-center rounded-full text-sm font-bold ${ops ? "bg-ink text-white" : "bg-red-t text-red-d"}`}>{initials(me.name ?? "?")}</span>
            <div className="min-w-0">
              <b className="block truncate">{me.name}</b>
              <span className="note">{ops ? t("shell.operations") : <>{me.title}{me.grade ? ` · ${t(`grade.${me.grade}`)}` : ""}</>}</span>
            </div>
          </div>
          <nav className="flex flex-col gap-1" aria-label="Portal">
            {ops ? <>
              <NavLink href="/portal/open-trips" label={t("nav.openTrips")} />
              <NavLink href="/portal/billing" label={t("nav.billing")} exact />
              <NavLink href="/portal/billing/settings" label={t("nav.billingSettings")} />
            </> : <>
            {approver && <NavLink href="/portal/approvals" label={t("nav.approvals")} count={pending} />}
            <NavLink href="/portal/trips" label={t("nav.myTravel")} exact />
            <NavLink href="/portal/trips/new" label={t("nav.newRequest")} exact />
            {me.role === "FINANCE_ADMIN" && (
              <>
                <span className="mt-3 px-3 text-[11px] font-extrabold tracking-[.08em] text-muted uppercase">{t("nav.finance")}</span>
                <NavLink href="/portal/finance/report" label={t("nav.report")} />
                <NavLink href="/portal/finance/invoices" label={t("nav.invoices")} />
                <span className="mt-3 px-3 text-[11px] font-extrabold tracking-[.08em] text-muted uppercase">{t("nav.settings")}</span>
                <NavLink href="/portal/settings/approvals" label={t("nav.approvalRules")} />
              </>
            )}
            </>}
          </nav>
        </aside>
        <main className="min-w-0 p-4 md:p-7">{children}</main>
      </div>
    </div>
  );
}
