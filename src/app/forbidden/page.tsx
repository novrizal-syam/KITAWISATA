import Link from "next/link";

export default function Forbidden() {
  return (
    <main className="mx-auto mt-24 max-w-sm px-4">
      <h1 className="text-2xl font-semibold">No access</h1>
      <p className="mt-2 text-neutral-600">This account isn&apos;t registered with a company business portal.</p>
      <Link href="/" className="mt-6 inline-block underline">Back to home</Link>
    </main>
  );
}
