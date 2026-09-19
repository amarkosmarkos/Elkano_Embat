"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useOps } from "@/lib/ops";

export function Nav({ companyId, groupId, monthLast }: { companyId: string; groupId: string; monthLast: string }) {
  const path = usePathname() ?? "/";
  const { ops } = useOps();
  const items: { href: string; label: string; n: number; active: boolean; badge?: number }[] = [
    { href: "/intro/", label: "Barco", n: 0, active: path.startsWith("/intro") },
    { href: "/", label: "Datos", n: 1, active: path === "/" },
    { href: "/score/", label: "Score", n: 2, active: path.startsWith("/score") },
    { href: `/empresa/${companyId}/`, label: "Empresa", n: 3, active: path.startsWith("/empresa") },
    { href: `/grupo/${groupId}/`, label: "Grupo", n: 4, active: path.startsWith("/grupo") },
    { href: "/monitor/", label: "Monitor", n: 5, active: path.startsWith("/monitor") },
    { href: "/operaciones/", label: "Operaciones", n: 6, active: path.startsWith("/operaciones"), badge: ops.length },
  ];
  return (
    <header className="bg-navy text-white">
      <div className="mx-auto max-w-[1240px] px-6 h-14 flex items-center justify-between gap-6">
        <Link href="/" className="flex items-baseline gap-3 shrink-0">
          <span className="text-lg font-bold tracking-tight">Elkano</span>
          <span className="text-[12px] text-white/70">Un score que lee el rastro del dinero</span>
        </Link>
        <nav className="flex items-center gap-1">
          {items.map((it) => (
            <Link
              key={it.href}
              href={it.href}
              className={`px-3 py-1.5 rounded text-[13px] font-medium inline-flex items-center gap-2 transition-colors ${
                it.active ? "bg-white text-navy" : "text-white/80 hover:bg-white/10 hover:text-white"
              }`}
            >
              <span className={`inline-flex items-center justify-center w-4 h-4 rounded-full text-[10px] font-bold ${it.active ? "bg-navy text-white" : "bg-white/20"}`}>
                {it.n}
              </span>
              {it.label}
              {(it.badge ?? 0) > 0 && (
                <span className={`inline-flex items-center justify-center min-w-4 h-4 px-1 rounded-full text-[10px] font-bold num bg-ok text-white`}>
                  {it.badge}
                </span>
              )}
            </Link>
          ))}
        </nav>
        <div className="text-[11px] text-white/60 shrink-0">
          Datos a <span className="text-white/90 font-medium">{monthLast}</span>, HackSpain 2026, Embat X Ray
        </div>
      </div>
    </header>
  );
}
