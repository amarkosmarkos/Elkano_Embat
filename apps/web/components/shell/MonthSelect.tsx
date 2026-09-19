"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { monthLabelLong } from "@/lib/format";
import { MONTH_COOKIE } from "@/lib/data/monthCookie";

/** Mes global de la plataforma: se guarda en cookie y se refresca el árbol de servidor. */
export default function MonthSelect({ months, month }: { months: string[]; month: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const idx = months.indexOf(month);
  const set = (m: string) => {
    document.cookie = `${MONTH_COOKIE}=${m}; path=/; max-age=31536000; samesite=lax`;
    start(() => router.refresh());
  };
  const btn = "flex h-9 w-9 items-center justify-center rounded-lg border border-line bg-white/[0.045] text-ink transition-colors hover:bg-panel-2 disabled:opacity-30";
  return (
    <div className={`flex items-center gap-2 ${pending ? "opacity-60" : ""}`}>
      <span className="mr-1 hidden text-[14px] text-ink-mute md:inline">Mes</span>
      <button type="button" className={btn} onClick={() => set(months[idx - 1])} disabled={idx <= 0} aria-label="Mes anterior">
        <svg viewBox="0 0 16 16" width={14} height={14} fill="none"><path d="M10 3L5 8l5 5" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" /></svg>
      </button>
      <div className="relative">
        <select
          value={month}
          onChange={(e) => set(e.target.value)}
          className="h-9 appearance-none rounded-lg border border-line bg-white/[0.045] px-3 pr-9 text-[14px] font-medium text-ink outline-none focus:ring-2 focus:ring-white/20"
          aria-label="Mes de observación"
        >
          {months.map((m) => (
            <option key={m} value={m}>
              {monthLabelLong(m)}
            </option>
          ))}
        </select>
        <svg viewBox="0 0 16 16" width={12} height={12} fill="none" className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-ink-mute">
          <path d="M3 6l5 5 5-5" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
      <button type="button" className={btn} onClick={() => set(months[idx + 1])} disabled={idx >= months.length - 1} aria-label="Mes siguiente">
        <svg viewBox="0 0 16 16" width={14} height={14} fill="none"><path d="M6 3l5 5-5 5" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" /></svg>
      </button>
    </div>
  );
}
