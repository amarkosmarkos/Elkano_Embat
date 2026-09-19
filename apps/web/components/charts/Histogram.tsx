import { scoreScale } from "@/lib/score/colors";
import { TXT } from "./axes";

/** Histograma de score (0–100) con color continuo por tramo y marcador opcional. */
export function ScoreHistogram({ values, bins = 20, height = 150, width = 760, marker, markerLabel }: { values: number[]; bins?: number; height?: number; width?: number; marker?: number | null; markerLabel?: string }) {
  const counts = new Array(bins).fill(0) as number[];
  for (const v of values) counts[Math.min(bins - 1, Math.max(0, Math.floor((v / 100) * bins)))]++;
  const max = Math.max(...counts, 1);
  const padB = 20, padT = 8;
  const bw = width / bins;
  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full overflow-visible">
      {counts.map((c, i) => {
        const h = ((height - padB - padT) * c) / max;
        const mid = ((i + 0.5) / bins) * 100;
        return <rect key={i} x={i * bw + 1.5} y={height - padB - h} width={bw - 3} height={h} rx={3} fill={scoreScale(mid)} opacity={0.85} />;
      })}
      {[0, 40, 70, 100].map((v) => (
        <text key={v} x={(v / 100) * width} y={height - 5} textAnchor={v === 0 ? "start" : v === 100 ? "end" : "middle"} {...TXT}>{v}</text>
      ))}
      {marker != null && (
        <g>
          <line x1={(marker / 100) * width} x2={(marker / 100) * width} y1={0} y2={height - padB} stroke="#fafafa" strokeWidth={1.5} strokeDasharray="3 3" />
          <text x={(marker / 100) * width + 5} y={12} {...TXT} fill="#fafafa">{markerLabel ?? Math.round(marker)}</text>
        </g>
      )}
    </svg>
  );
}

/** Histograma genérico a partir de valores continuos. */
export function ValueHistogram({ values, bins = 24, height = 140, width = 760, color = "var(--color-accent-2)", fmt, marker, lo: lo0, hi: hi0 }: { values: number[]; bins?: number; height?: number; width?: number; color?: string; fmt?: (v: number) => string; marker?: number | null; lo?: number; hi?: number }) {
  if (values.length === 0) return <div className="text-[12px] text-ink-mute">Sin valores.</div>;
  const sorted = [...values].sort((a, b) => a - b);
  const q = (p: number) => sorted[Math.min(sorted.length - 1, Math.floor(p * (sorted.length - 1)))];
  const lo = lo0 ?? q(0.02), hi = hi0 ?? q(0.98);
  const span = hi - lo || 1;
  const counts = new Array(bins).fill(0) as number[];
  for (const v of values) counts[Math.min(bins - 1, Math.max(0, Math.floor(((v - lo) / span) * bins)))]++;
  const max = Math.max(...counts, 1);
  const padB = 20, padT = 8;
  const bw = width / bins;
  const f = fmt ?? ((v: number) => v.toFixed(1));
  const mx = marker == null ? null : Math.max(0, Math.min(width, ((marker - lo) / span) * width));
  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full overflow-visible">
      {counts.map((c, i) => {
        const h = ((height - padB - padT) * c) / max;
        return <rect key={i} x={i * bw + 1} y={height - padB - h} width={bw - 2} height={h} rx={2} fill={color} opacity={0.75} />;
      })}
      {[0, 0.25, 0.5, 0.75, 1].map((p) => (
        <text key={p} x={p * width} y={height - 5} textAnchor={p === 0 ? "start" : p === 1 ? "end" : "middle"} {...TXT}>{f(lo + p * span)}</text>
      ))}
      {mx != null && (
        <g>
          <line x1={mx} x2={mx} y1={0} y2={height - padB} stroke="#fafafa" strokeWidth={1.5} strokeDasharray="3 3" />
          <text x={mx + 5} y={12} {...TXT} fill="#fafafa">{f(marker as number)}</text>
        </g>
      )}
    </svg>
  );
}
