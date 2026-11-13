import Image from "next/image";
import { auth, signOut } from "@/auth";
import { portalUser, inboxCount } from "@/server/portal";
import { GRADE_LABEL, initials } from "@/lib/format";
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
  const approver = me.role === "MANAGER" || me.role === "FINANCE_ADMIN";
  const pending = approver ? await inboxCount(me.id) : 0;

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-20 border-b border-line bg-white">
        <div className="flex min-h-16 flex-wrap items-center gap-4 px-5 py-2">
          <div className="flex items-center gap-2.5">
            <Image src="/logo.png" alt="kitawisata" width={128} height={26} priority />
            <span className="border-l border-line2 pl-2.5 text-xs font-extrabold tracking-[.06em] uppercase">Business</span>
          </div>
          <div className="min-w-0">
            <b className="block truncate">{ops ? "kitawisata back office" : me.company?.name}</b>
          </div>
          <form className="ml-auto" action={async () => { "use server"; await signOut({ redirectTo: "/login" }); }}>
            <button className="btn btn-line btn-sm">Sign out</button>
          </form>
        </div>
      </header>
      <div className="md:grid md:grid-cols-[232px_1fr]">
        <aside className="border-b border-line bg-white p-3 md:min-h-[calc(100vh-64px)] md:border-r md:border-b-0">
          <div className="mb-3 flex items-center gap-3 border-b border-line px-2 pt-2 pb-4">
            <span className={`grid size-10 shrink-0 place-items-center rounded-full text-sm font-bold ${ops ? "bg-ink text-white" : "bg-red-t text-red-d"}`}>{initials(me.name ?? "?")}</span>
            <div className="min-w-0">
              <b className="block truncate">{me.name}</b>
              <span className="note">{ops ? "Operations" : <>{me.title}{me.grade ? ` · ${GRADE_LABEL[me.grade]}` : ""}</>}</span>
            </div>
          </div>
          <nav className="flex flex-col gap-1" aria-label="Portal">
            {ops ? <NavLink href="/portal/open-trips" label="Open Trips" /> : <>
            {approver && <NavLink href="/portal/approvals" label="Approvals" count={pending} />}
            <NavLink href="/portal/trips" label="My travel" exact />
            <NavLink href="/portal/trips/new" label="New SPPD request" exact />
            {me.role === "FINANCE_ADMIN" && (
              <>
                <span className="mt-3 px-3 text-[11px] font-extrabold tracking-[.08em] text-muted uppercase">Settings</span>
                <NavLink href="/portal/settings/approvals" label="Approval rules" />
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
