import { LoginForm } from "./login-form";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ callbackUrl?: string }> }) {
  const { callbackUrl } = await searchParams;
  return (
    <main className="mx-auto mt-24 w-full max-w-sm px-4">
      <h1 className="mb-6 text-2xl font-semibold">Masuk ke KITA WISATA</h1>
      <LoginForm callbackUrl={callbackUrl} />
    </main>
  );
}
