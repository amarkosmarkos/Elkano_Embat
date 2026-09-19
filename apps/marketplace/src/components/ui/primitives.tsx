import type { ButtonHTMLAttributes, ReactNode } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cx } from "@/lib/format";

export function Badge({ children, tone = "neutral", className, dot }: { children: ReactNode; tone?: "neutral" | "positive" | "warn" | "negative" | "accent"; className?: string; dot?: boolean }) {
  const tones = {
    neutral: "text-muted",
    positive: "text-positive",
    warn: "text-warn",
    negative: "text-negative",
    accent: "text-accent",
  } as const;
  return (
    <span className={cx("stamp inline-flex items-center gap-1.5 whitespace-nowrap", tones[tone], className)}>
      {dot && <span className="h-1.5 w-1.5 rounded-full bg-current" />}
      {children}
    </span>
  );
}

export function Button({ children, variant = "primary", size = "md", className, ...rest }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "ghost" | "outline" | "danger"; size?: "sm" | "md" | "lg" }) {
  const v = {
    primary: "brass gold-text hover:brightness-125",
    ghost: "text-fg-2 hover:bg-surface-2",
    outline: "border border-line-strong text-fg hover:bg-surface-2",
    danger: "border border-negative/50 text-negative hover:bg-negative/10",
  }[variant];
  const s = { sm: "h-8 px-3 text-[11px]", md: "h-10 px-4 text-xs", lg: "h-12 px-6 text-sm" }[size];
  return (
    <button {...rest} className={cx("font-caps inline-flex items-center justify-center gap-2 rounded-[4px] font-semibold uppercase tracking-[0.14em] transition-all duration-300 disabled:cursor-not-allowed disabled:opacity-40 active:scale-[0.98]", v, s, className)}>
      {children}
    </button>
  );
}

export function Segmented<T extends string>({ value, options, onChange, className, size = "md" }: { value: T; options: { value: T; label: ReactNode }[]; onChange: (v: T) => void; className?: string; size?: "sm" | "md" }) {
  return (
    <div className={cx("brass inline-flex rounded-[5px] p-1", className)}>
      {options.map((o) => (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          className={cx(
            "font-caps flex-1 whitespace-nowrap rounded-[3px] font-semibold uppercase tracking-[0.1em] transition-all duration-300",
            size === "sm" ? "px-2.5 py-1 text-[10px]" : "px-3.5 py-1.5 text-[11px]",
            value === o.value ? "bg-[#c9a227] text-[#2a1b0e] shadow-[inset_0_1px_0_rgba(255,240,180,.6)]" : "text-[#d9c39a] hover:text-[#f3d97a]",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Slider({ label, value, min, max, step, onChange, format }: { label: string; value: number; min: number; max: number; step: number; onChange: (v: number) => void; format?: (v: number) => string }) {
  return (
    <label className="block">
      <div className="mb-1 flex items-baseline justify-between">
        <Eyebrow>{label}</Eyebrow>
        <span className="tnum font-caps text-xs font-bold">{format ? format(value) : value}</span>
      </div>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} />
    </label>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cx("skeleton", className)} />;
}

export function Eyebrow({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cx("font-caps text-[10px] font-semibold uppercase tracking-[0.2em] text-muted", className)}>{children}</div>;
}

export function Stat({ label, value, hint, tone, className, big }: { label: string; value: ReactNode; hint?: ReactNode; tone?: "positive" | "negative" | "warn" | "accent"; className?: string; big?: boolean }) {
  const toneCls = tone === "positive" ? "text-positive" : tone === "negative" ? "text-negative" : tone === "warn" ? "text-warn" : tone === "accent" ? "text-accent" : "";
  return (
    <div className={cx("flex min-w-0 flex-col gap-0.5", className)}>
      <Eyebrow>{label}</Eyebrow>
      <div className={cx("tnum font-caps font-bold leading-none tracking-tight", big ? "text-4xl" : "text-xl", toneCls)}>{value}</div>
      {hint && <div className="truncate text-[11px] italic text-muted">{hint}</div>}
    </div>
  );
}

export function Divider({ className }: { className?: string }) {
  return <div className={cx("ink-rule w-full", className)} />;
}

export function Rope({ className, vertical }: { className?: string; vertical?: boolean }) {
  return <div className={cx(vertical ? "rope-v" : "rope", className)} />;
}

/** Prev / next paging control: "1–6 of 141". */
export function Pager({ page, pageSize, total, onChange, className }: { page: number; pageSize: number; total: number; onChange: (p: number) => void; className?: string }) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const from = total === 0 ? 0 : page * pageSize + 1;
  const to = Math.min(total, (page + 1) * pageSize);
  return (
    <div className={cx("flex items-center gap-2", className)}>
      <button onClick={() => onChange(Math.max(0, page - 1))} disabled={page <= 0} className="flex h-7 w-7 items-center justify-center rounded-[4px] border border-line-strong text-fg-2 transition hover:bg-surface-2 disabled:opacity-30"><ChevronLeft size={14} /></button>
      <span className="tnum font-caps text-[10px] font-semibold tracking-[0.12em] text-muted">{from}–{to} of {total}</span>
      <button onClick={() => onChange(Math.min(pages - 1, page + 1))} disabled={page >= pages - 1} className="flex h-7 w-7 items-center justify-center rounded-[4px] border border-line-strong text-fg-2 transition hover:bg-surface-2 disabled:opacity-30"><ChevronRight size={14} /></button>
    </div>
  );
}

/** Panel header: title + right-side controls. */
export function PanelHead({ eyebrow, title, right, className }: { eyebrow?: ReactNode; title?: ReactNode; right?: ReactNode; className?: string }) {
  return (
    <div className={cx("flex shrink-0 items-end justify-between gap-3", className)}>
      <div className="min-w-0">
        {eyebrow && <Eyebrow>{eyebrow}</Eyebrow>}
        {title && <div className="truncate font-display text-xl leading-tight">{title}</div>}
      </div>
      {right && <div className="flex shrink-0 items-center gap-2">{right}</div>}
    </div>
  );
}
