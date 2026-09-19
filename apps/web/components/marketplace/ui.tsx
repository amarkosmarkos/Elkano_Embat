"use client";

import { Pill } from "@/components/ui/Pill";
import type { Trend } from "@/lib/score/derived";
import { TREND_LABEL } from "@/lib/score/derived";

export function Btn({ children, variant = "primary", size = "md", className = "", ...rest }: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "outline" | "ghost"; size?: "sm" | "md" | "lg" }) {
  const v = { primary: "bg-ink text-panel hover:bg-ink/90", outline: "border border-line bg-white/[0.045] text-ink hover:bg-panel-2", ghost: "text-ink-dim hover:bg-panel-2 hover:text-ink" }[variant];
  const s = { sm: "h-8 px-3 text-[13px]", md: "h-9 px-4 text-[14px]", lg: "h-10 px-5 text-[14px]" }[size];
  return <button {...rest} className={`inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${v} ${s} ${className}`}>{children}</button>;
}

export function Seg<T extends string>({ value, options, onChange, className = "" }: { value: T; options: { value: T; label: React.ReactNode }[]; onChange: (v: T) => void; className?: string }) {
  return (
    <div className={`inline-flex rounded-[10px] bg-panel-2/50 p-1 ${className}`}>
      {options.map((o) => (
        <button key={o.value} type="button" onClick={() => onChange(o.value)} className={`flex-1 whitespace-nowrap rounded-lg border px-3 py-1.5 text-[13px] font-medium transition-colors ${value === o.value ? "border-line bg-white/[0.045] text-ink" : "border-transparent text-ink-mute hover:text-ink"}`}>{o.label}</button>
      ))}
    </div>
  );
}

export function Slider({ label, value, min, max, step, onChange, format }: { label: string; value: number; min: number; max: number; step: number; onChange: (v: number) => void; format?: (v: number) => string }) {
  return (
    <label className="block">
      <div className="mb-1.5 flex items-baseline justify-between text-[13px]"><span className="text-ink-mute">{label}</span><span className="num font-medium text-ink">{format ? format(value) : value}</span></div>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} className="scrub w-full" style={{ ["--p" as string]: `${((value - min) / (max - min)) * 100}%` }} />
    </label>
  );
}

export function Stat({ label, value, hint, tone, big }: { label: string; value: React.ReactNode; hint?: React.ReactNode; tone?: "good" | "bad" | "warn"; big?: boolean }) {
  const t = tone === "good" ? "text-good" : tone === "bad" ? "text-bad" : tone === "warn" ? "text-warn" : "text-ink";
  return (
    <div className="flex min-w-0 flex-col gap-0.5">
      <div className="text-[13px] text-ink-mute">{label}</div>
      <div className={`num font-semibold leading-none tracking-tight ${big ? "text-[30px]" : "text-[22px]"} ${t}`}>{value}</div>
      {hint && <div className="truncate text-[12px] text-ink-mute">{hint}</div>}
    </div>
  );
}

export function TrendPill({ trend, delta }: { trend: Trend; delta?: number | null }) {
  return <Pill tone={trend === "improving" ? "good" : trend === "deteriorating" ? "bad" : "neutral"}>{trend === "improving" ? "↗" : trend === "deteriorating" ? "↘" : "→"} {TREND_LABEL[trend]}{delta != null && <span className="num opacity-80">{delta > 0 ? "+" : ""}{delta.toFixed(1)}</span>}</Pill>;
}

export function Pager({ page, pageSize, total, onChange }: { page: number; pageSize: number; total: number; onChange: (p: number) => void }) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const from = total === 0 ? 0 : page * pageSize + 1, to = Math.min(total, (page + 1) * pageSize);
  const b = "flex h-8 w-8 items-center justify-center rounded-lg border border-line text-ink-dim hover:bg-panel-2 disabled:opacity-30";
  return (
    <div className="flex items-center gap-2 text-[12px] text-ink-mute">
      <button type="button" className={b} onClick={() => onChange(Math.max(0, page - 1))} disabled={page <= 0}>‹</button>
      <span className="num">{from}–{to} de {total}</span>
      <button type="button" className={b} onClick={() => onChange(Math.min(pages - 1, page + 1))} disabled={page >= pages - 1}>›</button>
    </div>
  );
}

export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-lg bg-panel-2 ${className}`} />;
}
