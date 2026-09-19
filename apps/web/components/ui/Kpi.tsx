import type { Tone } from "@/lib/score/colors";

const TEXT: Record<Tone, string> = { neutral: "text-ink", good: "text-good", warn: "text-warn", bad: "text-bad", accent: "text-ink" };

/** Tarjeta de cifra al estilo shadcn: etiqueta 14px muted, cifra 24px/600, delta en badge. */
export function Kpi({ label, value, sub, tone = "neutral", delta, big }: { label: string; value: React.ReactNode; sub?: React.ReactNode; tone?: Tone; delta?: number | null; big?: boolean }) {
  return (
    <div className="card px-6 py-5">
      <div className="flex items-start justify-between gap-3">
        <div className="text-[14px] text-ink-mute">{label}</div>
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
