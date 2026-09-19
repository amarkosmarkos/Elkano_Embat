import { DIMENSIONS, type Dimension } from "@/lib/score/types";
import { DIM_LABEL } from "@/lib/score/meta";
import { scoreColor } from "@/lib/score/colors";

const ORDER: Dimension[] = ["concentracion", "pago", "liquidez", "caja", "deuda"];

/** Araña de las 5 dimensiones (eje = percentil de la contribución en la red) con el score en el centro. */
export function Radar({ axes, contributions, score, size = 300, compare, compareLabel }: { axes: Record<Dimension, number | null>; contributions: Record<Dimension, number | null>; score: number | null; size?: number; compare?: Record<Dimension, number | null>; compareLabel?: string }) {
  const cx = size / 2, cy = size / 2 + 6;
  const R = size / 2 - 58;
  const inner = Math.min(38, R * 0.4);
  const n = ORDER.length;
  const ang = (i: number) => -Math.PI / 2 + (i * 2 * Math.PI) / n;
  const pt = (i: number, v: number) => {
    const r = inner + ((R - inner) * Math.max(0, Math.min(100, v))) / 100;
    return [cx + Math.cos(ang(i)) * r, cy + Math.sin(ang(i)) * r] as const;
  };
  const poly = (vals: Record<Dimension, number | null>) => ORDER.map((d, i) => pt(i, vals[d] ?? 0).join(",")).join(" ");
  const color = scoreColor(score);
  return (
    <svg width={size} height={size} className="overflow-visible">
      {[25, 50, 75, 100].map((r) => (
        <polygon key={r} points={ORDER.map((_, i) => pt(i, r).join(",")).join(" ")} fill="none" stroke="rgba(255,255,255,0.12)" />
      ))}
      {ORDER.map((_, i) => { const [x, y] = pt(i, 100); return <line key={i} x1={cx} y1={cy} x2={x} y2={y} stroke="rgba(255,255,255,0.10)" />; })}
      {compare && <polygon points={poly(compare)} fill="rgba(255,255,255,0.08)" stroke="rgba(255,255,255,0.45)" strokeDasharray="4 4" />}
      <polygon points={poly(axes)} fill={color} fillOpacity={0.18} stroke={color} strokeWidth={2} strokeLinejoin="round" />
      {ORDER.map((d, i) => { const [x, y] = pt(i, axes[d] ?? 0); return <circle key={d} cx={x} cy={y} r={3.5} fill={color} stroke="#171717" strokeWidth={2} />; })}
      <circle cx={cx} cy={cy} r={inner - 6} fill="#171717" stroke="rgba(255,255,255,0.25)" />
      <text x={cx} y={cy + 8} textAnchor="middle" fontFamily="var(--font-body)" fontSize={26} fontWeight={500} fill="#fafafa">{score == null ? "—" : Math.round(score)}</text>
      {ORDER.map((d, i) => {
        const [x, y] = pt(i, 122);
        const v = contributions[d];
        const anchor = Math.abs(Math.cos(ang(i))) < 0.2 ? "middle" : Math.cos(ang(i)) > 0 ? "start" : "end";
        return (
          <g key={d}>
            <text x={x} y={y - 2} textAnchor={anchor} fontFamily="var(--font-body)" fontSize={11} fontWeight={600} fill="#d4d4d4">{DIM_LABEL[d]}</text>
            <text x={x} y={y + 12} textAnchor={anchor} fontFamily="var(--font-body)" fontSize={10.5} fill={v == null ? "#a1a1a1" : v >= 0 ? "#10b981" : "#ef4444"}>{v == null ? "n/d" : `${v >= 0 ? "+" : "−"}${Math.abs(v).toFixed(1)} pts`}</text>
          </g>
        );
      })}
      {compareLabel && <text x={size - 4} y={size - 4} textAnchor="end" fontFamily="var(--font-body)" fontSize={10} fill="#a1a1a1">{compareLabel}</text>}
    </svg>
  );
}
