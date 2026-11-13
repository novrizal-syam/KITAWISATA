import Link from "next/link";

export default function Forbidden() {
  return (
    <main className="mx-auto mt-24 max-w-sm px-4">
      <h1 className="text-2xl font-semibold">Akses ditolak</h1>
      <p className="mt-2 text-neutral-600">Akun ini tidak terdaftar di Portal Bisnis perusahaan.</p>
      <Link href="/" className="mt-6 inline-block underline">Kembali ke beranda</Link>
    </main>
  );
}
