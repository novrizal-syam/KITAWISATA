import { redirect } from "next/navigation";
import { auth, signOut } from "@/auth";

// Placeholder business-portal home. Role dashboards arrive in later phases.
export default async function PortalPage() {
  const session = await auth();
  if (!session) redirect("/login?callbackUrl=/portal");
  return (
    <main className="mx-auto mt-16 max-w-2xl px-4">
      <h1 className="text-2xl font-semibold">Portal Bisnis</h1>
      <p className="mt-2">Masuk sebagai {session.user.name ?? session.user.phone} — peran: {session.user.role}</p>
      <form action={async () => { "use server"; await signOut({ redirectTo: "/login" }); }}>
        <button className="mt-4 rounded border px-3 py-2">Keluar</button>
      </form>
    </main>
  );
}
