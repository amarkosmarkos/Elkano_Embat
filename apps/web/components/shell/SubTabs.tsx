"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/** Pestañas segmentadas al estilo shadcn: lista con fondo muted/50, activa con fondo claro y borde. */
export default function SubTabs({ tabs, exact }: { tabs: { href: string; label: string }[]; exact?: boolean }) {
  const pathname = usePathname() ?? "";
  return (
    <div className="inline-flex flex-wrap items-center gap-1 rounded-[10px] bg-panel-2/50 p-1">
      {tabs.map((t, i) => {
        const on = exact || i === 0 ? pathname === t.href || (i > 0 && pathname.startsWith(t.href)) : pathname.startsWith(t.href);
        return (
          <Link
            key={t.href}
            href={t.href}
            className={`rounded-lg px-4 py-1.5 text-[14px] font-medium transition-colors ${on ? "border border-line bg-white/[0.045] text-ink" : "border border-transparent text-ink-mute hover:text-ink"}`}
          >
            {t.label}
          </Link>
        );
      })}
    </div>
  );
}
