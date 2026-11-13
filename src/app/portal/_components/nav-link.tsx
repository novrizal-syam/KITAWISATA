"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function NavLink({ href, label, count, exact }: { href: string; label: string; count?: number; exact?: boolean }) {
  const path = usePathname();
  const active = exact ? path === href : path === href || path.startsWith(href + "/");
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={`flex min-h-10 items-center justify-between rounded-[10px] px-3 font-semibold ${active ? "bg-red-t text-red-d" : "text-ink hover:bg-ground"}`}
    >
      {label}
      {count ? <span className="num rounded-full bg-red px-2 text-xs font-bold text-white">{count}</span> : null}
    </Link>
  );
}
