import Link from "next/link";

// Placeholder consumer-site home. Screens are rebuilt from the prototype in later phases.
export default function Home() {
  return (
    <main className="mx-auto mt-24 max-w-2xl px-4">
      <h1 className="text-3xl font-semibold">KITA WISATA</h1>
      <p className="mt-2 text-neutral-600">Phase 1 scaffold.</p>
      <Link href="/portal" className="mt-6 inline-block underline">Portal Bisnis</Link>
    </main>
  );
}
