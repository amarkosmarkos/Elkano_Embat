import Link from "next/link";
import type { ReactNode } from "react";
import type { Severity, Tier, Trend } from "@/lib/types";
import {
  fmt1,
  fmtSigned,
  SEV_CLASS,
  SEV_LABEL,
  TIER_CLASS,
  TIER_LABEL,
  TREND_CLASS,
  TREND_ICON,
  TREND_LABEL,
} from "@/lib/format";

export function Card({
  title,
  kicker,
  children,
  className = "",
  right,
}: {
  title?: ReactNode;
  kicker?: string;
  children: ReactNode;
  className?: string;
  right?: ReactNode;
}) {
  return (
    <section className={`card p-4 ${className}`}>
      {(title || kicker) && (
        <header className="flex items-start justify-between gap-3 mb-3">
          <div>
            {kicker && <div className="kicker">{kicker}</div>}
            {title && <h2 className="text-[15px] font-semibold text-ink leading-tight">{title}</h2>}
          </div>
          {right}
        </header>
      )}
      {children}
    </section>
  );
}

export function ScorePill({ score, tier, size = "sm" }: { score: number; tier: Tier; size?: "sm" | "lg" }) {
  const cls = size === "lg" ? "text-base px-3 py-1" : "text-[12px] px-2 py-0.5";
  return (
    <span className={`inline-flex items-center gap-1 rounded-full font-semibold num ${cls} ${TIER_CLASS[tier]}`}>
      <span className="inline-block w-1.5 h-1.5 rounded-full bg-current" />
      {fmt1(score)}
    </span>
  );
}

export function TierBadge({ tier }: { tier: Tier }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-full text-[11px] font-semibold px-2 py-0.5 ${TIER_CLASS[tier]}`}>
      <span className="inline-block w-1.5 h-1.5 rounded-full bg-current" />
      {TIER_LABEL[tier]}
    </span>
  );
}

export function Delta({ value, suffix = " pts", size = "sm" }: { value: number; suffix?: string; size?: "sm" | "lg" }) {
  const cls = value > 0.5 ? "text-ok" : value < -0.5 ? "text-bad" : "text-ink-2";
  const arrow = value > 0.5 ? "▲" : value < -0.5 ? "▼" : "▬";
  return (
    <span className={`num font-medium ${cls} ${size === "lg" ? "text-lg" : ""}`}>
      <span className={size === "lg" ? "text-sm" : "text-[10px]"}>{arrow}</span> {fmtSigned(value)}
      {suffix}
    </span>
  );
}

export function TrendTag({ trend }: { trend: Trend }) {
  return (
    <span className={`inline-flex items-center gap-1 text-[12px] font-medium ${TREND_CLASS[trend]}`}>
      <span aria-hidden>{TREND_ICON[trend]}</span>
      {TREND_LABEL[trend]}
    </span>
  );
}

export function Bell({ on }: { on: boolean }) {
  return on ? (
    <span title="En alerta" className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-bad-bg text-bad text-[12px]">
      <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" aria-label="Alerta">
        <path d="M12 22a2.5 2.5 0 0 0 2.45-2h-4.9A2.5 2.5 0 0 0 12 22Zm7-6V11a7 7 0 0 0-5-6.7V3a2 2 0 1 0-4 0v1.3A7 7 0 0 0 5 11v5l-2 2v1h18v-1l-2-2Z" />
      </svg>
    </span>
  ) : (
    <span className="inline-block w-5 h-5 text-ink-3 text-center text-[11px]" aria-label="Sin alerta"></span>
  );
}

export function SeverityBadge({ severity }: { severity: Severity }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded border text-[11px] font-semibold px-1.5 py-0.5 ${SEV_CLASS[severity]}`}>
      {severity === "alta" ? "▲" : severity === "media" ? "■" : "●"} {SEV_LABEL[severity]}
    </span>
  );
}

export function Kpi({ label, value, hint, accent }: { label: string; value: ReactNode; hint?: string; accent?: string }) {
  return (
    <div className="card px-4 py-3">
      <div className="kicker">{label}</div>
      <div className={`text-2xl font-bold num leading-tight mt-0.5 ${accent ?? "text-navy"}`}>{value}</div>
      {hint && <div className="text-[12px] text-ink-2 mt-0.5">{hint}</div>}
    </div>
  );
}

export function CompanyLink({ id, className = "" }: { id: string; className?: string }) {
  return (
    <Link href={`/empresa/${id}/`} className={`font-mono text-[12px] text-navy hover:underline ${className}`}>
      {id}
    </Link>
  );
}

export function PageHeader({ step, title, subtitle, right }: { step: number; title: string; subtitle?: ReactNode; right?: ReactNode }) {
  return (
    <div className="flex items-end justify-between gap-4 mb-5">
      <div>
        <div className="kicker">Paso {step} de 6</div>
        <h1 className="text-2xl font-bold text-navy leading-tight">{title}</h1>
        {subtitle && <p className="text-[13px] text-ink-2 mt-1 max-w-3xl">{subtitle}</p>}
      </div>
      {right}
    </div>
  );
}
