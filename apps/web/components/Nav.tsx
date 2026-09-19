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
  return (
    <header className="sticky top-0 z-40 border-b border-line-soft bg-ground/85 backdrop-blur-sm">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
        <Link href="/" className="flex items-baseline gap-2 font-display text-lg font-extrabold tracking-wide">
          ELKANO <span className="text-accent">X-RAY</span>
        </Link>
        <nav className="flex gap-5 font-mono text-xs text-ink-dim">
          {LINKS.map((l) => {
            const active = l.href === "/" ? pathname === "/" : pathname.startsWith(l.href);
            return (
              <Link key={l.href} href={l.href} className={active ? "text-accent" : "hover:text-ink"}>
                {l.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
