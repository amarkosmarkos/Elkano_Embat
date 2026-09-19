"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV, type NavItem } from "./nav";

const ICON: Record<string, string> = {
  "/cartera": "M3 17l5-6 4 3 5-8 4 4",
  "/empresas": "M3 21h18 M5 21V5a1 1 0 0 1 1-1h7a1 1 0 0 1 1 1v16 M14 9h4a1 1 0 0 1 1 1v11 M8 8h2 M8 12h2 M8 16h2 M17 13h.01 M17 17h.01",
  "/grupos": "M12 3l8 4.5v9L12 21l-8-4.5v-9L12 3z M12 12l8-4.5 M12 12v9 M12 12L4 7.5",
  "/analisis": "M4 19h16 M7 15V9 M12 15V5 M17 15v-4",
  "/productos": "M3 7l9-4 9 4-9 4-9-4z M3 7v10l9 4 9-4V7 M12 11v10",
};

const GROUPS: { label: string; items: NavItem[] }[] = [
  { label: "Seguimiento", items: NAV.filter((n) => ["/cartera", "/empresas", "/grupos"].includes(n.href)) },
  { label: "Datos", items: NAV.filter((n) => n.href === "/analisis") },
  { label: "Productos", items: NAV.filter((n) => n.href === "/productos") },
];

export default function Sidebar() {
  const pathname = usePathname() ?? "/";
  return (
    <aside className="sticky top-0 hidden h-screen w-[256px] shrink-0 flex-col border-r border-line-soft bg-panel lg:flex">
      <div className="px-3 pb-2 pt-3">
        <Link href="/cartera/mapa" className="flex items-center gap-2.5 rounded-lg px-2 py-2 hover:bg-panel-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-ink text-[13px] font-bold text-panel">X</span>
          <span className="leading-tight">
            <span className="block text-[14px] font-semibold text-ink">Elkano X-Ray</span>
            <span className="block text-[12px] text-ink-mute">Embat · salud financiera</span>
          </span>
        </Link>
      </div>
      <nav className="flex flex-1 flex-col gap-4 overflow-y-auto px-3 py-2">
        {GROUPS.map((g) => (
          <div key={g.label}>
            <div className="px-2 pb-1.5 text-[12px] font-medium text-ink/70">{g.label}</div>
            <div className="flex flex-col gap-0.5">
              {g.items.map((item) => {
                const active = pathname === item.href || pathname.startsWith(item.href + "/");
                const target = item.children ? item.children[0].href : item.href;
                return (
                  <div key={item.href}>
                    <Link
                      href={target}
                      className={`flex h-8 items-center gap-2 rounded-lg px-2 text-[14px] transition-colors ${active ? "bg-panel-2 font-medium text-ink" : "text-ink hover:bg-panel-2"}`}
                    >
                      <svg viewBox="0 0 24 24" width={16} height={16} fill="none" aria-hidden="true" className="shrink-0 text-ink">
                        <path d={ICON[item.href]} stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                      {item.label}
                    </Link>
                    {active && item.children && (
                      <div className="ml-4 mt-0.5 flex flex-col gap-0.5 border-l border-line-soft pl-3">
                        {item.children.map((c) => {
                          const on = pathname === c.href || (c.href !== item.href && pathname.startsWith(c.href + "/"));
                          return (
                            <Link key={c.href} href={c.href} className={`flex h-7 items-center rounded-lg px-2 text-[13px] transition-colors ${on ? "bg-panel-2 text-ink" : "text-ink-mute hover:bg-panel-2 hover:text-ink"}`}>
                              {c.label}
                            </Link>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </nav>
      <div className="border-t border-line-soft px-3 py-3">
        <div className="flex items-center gap-2.5 rounded-lg px-2 py-1.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-panel-2 text-[12px] font-semibold text-ink">v3</span>
          <span className="leading-tight">
            <span className="block text-[13px] font-medium text-ink">Score v3 · GBM</span>
            <span className="block text-[12px] text-ink-mute">105 métricas · HackSpain 2026</span>
          </span>
        </div>
      </div>
    </aside>
  );
}
