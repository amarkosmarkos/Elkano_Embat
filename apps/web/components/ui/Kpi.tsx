import type { Tone } from "@/lib/score/colors";

const TEXT: Record<Tone, string> = { neutral: "text-ink", good: "text-good", warn: "text-warn", bad: "text-bad", accent: "text-ink" };

export type KpiIcon = "gauge" | "clock" | "trend-up" | "trend-down" | "alert";

const ICON_STYLE: Record<KpiIcon, string> = {
  gauge: "bg-violet-400/15 text-violet-400",
  clock: "bg-neg/15 text-neg",
  "trend-up": "bg-good/15 text-good",
  "trend-down": "bg-neg/15 text-neg",
  alert: "bg-bad/15 text-bad",
};

const ICON_PATH: Record<KpiIcon, React.ReactNode> = {
  gauge: (
    <>
      <path d="M4 13a8 8 0 1 1 16 0" />
      <path d="M12 13l3.2-3.2" />
    </>
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="8" />
      <path d="M12 8v4.5l3 1.8" />
    </>
  ),
  "trend-up": (
    <>
      <path d="M4 16l5.2-5.2 3.2 3.2L19.5 7" />
      <path d="M14.5 7h5v5" />
    </>
  ),
  "trend-down": (
    <>
      <path d="M4 8l5.2 5.2 3.2-3.2L19.5 17" />
      <path d="M14.5 17h5v-5" />
    </>
  ),
  alert: (
    <>
      <path d="M12 3.5l9 15.5H3z" />
      <path d="M12 10v3.5" />
      <path d="M12 16.5h.01" />
    </>
  ),
};

function KpiIconBadge({ icon }: { icon: KpiIcon }) {
  return (
    <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${ICON_STYLE[icon]}`}>
      <svg viewBox="0 0 24 24" width={15} height={15} fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        {ICON_PATH[icon]}
      </svg>
    </span>
  );
}

/** Tarjeta de cifra al estilo shadcn: etiqueta 14px muted, cifra 24px/600, delta en badge. */
export function Kpi({ label, value, sub, tone = "neutral", delta, big, icon }: { label: string; value: React.ReactNode; sub?: React.ReactNode; tone?: Tone; delta?: number | null; big?: boolean; icon?: KpiIcon }) {
  return (
    <div className="card px-6 py-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2 text-[14px] text-ink-mute">
          {icon && <KpiIconBadge icon={icon} />}
          {label}
        </div>
        {delta != null && (
          <span className={`num inline-flex items-center rounded-lg border px-1.5 py-0.5 text-[12px] font-medium ${delta >= 0 ? "border-good/30 text-good" : "border-bad/30 text-bad"}`}>
            {delta >= 0 ? "↗ +" : "↘ −"}
            {Math.abs(delta).toFixed(1)}
          </span>
        )}
      </div>
      <div className={`num mt-2 ${big ? "text-[30px]" : "text-[24px]"} font-semibold leading-none tracking-tight ${TEXT[tone]}`}>{value}</div>
      {sub != null && <div className="mt-2 text-[13px] text-ink-mute">{sub}</div>}
    </div>
  );
}
