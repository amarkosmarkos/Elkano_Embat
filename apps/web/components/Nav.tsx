"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS: { href: string; label: string }[] = [
  { href: "/", label: "Quiénes somos" },
  { href: "/datos", label: "Datos" },
  { href: "/score", label: "Score" },
  { href: "/productos", label: "Producto" },
  { href: "/empresas", label: "Empresas" },
];

export default function Nav() {
  const pathname = usePathname();
  if (pathname === "/productos/cash-pooling") return null;
  return (
    <header className="sticky top-0 z-40 border-b border-line-soft bg-white/75 backdrop-blur-xl">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3.5">
        <Link href="/" className="flex items-center gap-2 text-[15px] font-semibold tracking-tight text-ink">
          Elkano <span className="bg-[image:var(--brand-gradient)] bg-clip-text text-transparent">X-Ray</span>
        </Link>
        <nav className="flex gap-6 text-[13px] font-medium text-ink-dim">
          {LINKS.map((l) => {
            const active = l.href === "/" ? pathname === "/" : pathname.startsWith(l.href);
            return (
              <Link key={l.href} href={l.href} className={active ? "text-ink" : "transition-colors hover:text-ink"}>
                {l.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
