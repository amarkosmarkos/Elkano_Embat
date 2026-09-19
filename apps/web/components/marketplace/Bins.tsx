import { scoreScale } from "@/lib/score/colors";

/** Barras por tramo de score (0–100) con resaltado y marcador opcional. */
export function Bins({ bins, height = 60, highlight, marker, markerLabel, fmt }: { bins: { from: number; to: number; value: number }[]; height?: number; highlight?: (b: { from: number; to: number }) => boolean; marker?: number; markerLabel?: string; fmt?: (v: number) => string }) {
  const max = Math.max(1e-9, ...bins.map((b) => b.value));
  const lo = bins[0]?.from ?? 0, hi = bins[bins.length - 1]?.to ?? 100;
  return (
    <div className="relative">
      <div className="flex items-end gap-[3px]" style={{ height }}>
        {bins.map((b, i) => (
          <div key={i} className="group relative flex h-full flex-1 items-end">
            <div className="w-full rounded-t-[3px]" style={{ background: scoreScale((b.from + b.to) / 2), opacity: highlight ? (highlight(b) ? 0.95 : 0.3) : 0.9, height: `${Math.max(b.value > 0 ? 3 : 0, (b.value / max) * 100)}%`, transition: "height 500ms cubic-bezier(.2,.7,.2,1)" }} />
            <div className="pointer-events-none absolute -top-7 left-1/2 z-10 -translate-x-1/2 whitespace-nowrap rounded-md border border-line bg-panel-hi px-2 py-0.5 text-[11px] text-ink opacity-0 transition-opacity group-hover:opacity-100">{b.from}–{b.to}: <span className="num">{fmt ? fmt(b.value) : b.value}</span></div>
          </div>
        ))}
      </div>
      {marker != null && <div className="pointer-events-none absolute inset-y-0" style={{ left: `${((marker - lo) / (hi - lo)) * 100}%` }}><div className="h-full w-px bg-ink/70" />{markerLabel && <div className="absolute -top-1 left-1.5 whitespace-nowrap text-[11px] text-ink-mute">{markerLabel}</div>}</div>}
      <div className="num mt-1 flex justify-between text-[11px] text-ink-mute"><span>{lo}</span><span>{Math.round((lo + hi) / 2)}</span><span>{hi}</span></div>
    </div>
  );
}
