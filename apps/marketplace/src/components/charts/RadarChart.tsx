import { motion } from "framer-motion";
import { DIM_COLOR, scoreColor } from "@/lib/colors";
import { DIM_SHORT, fmtDelta } from "@/lib/format";
import type { Dimension } from "@/lib/types";
import { AnimatedNumber } from "@/components/ui/AnimatedNumber";

interface Props {
  /** axis values 0–100 (percentile of each dimension contribution across the network) */
  axes: Record<Dimension, number | null>;
  /** raw contributions (points) shown next to each axis label */
  contributions: Record<Dimension, number | null>;
  score: number;
  width?: number;
  height?: number;
  compare?: Record<Dimension, number | null>;
  compareLabel?: string;
}

/** Axis order around the pentagon: the longest label sits at the top where there is horizontal room. */
const ORDER: Dimension[] = ["concentracion", "pago", "liquidez", "caja", "deuda"];

/** Spider chart of the five score dimensions with the health score in the centre. */
export function RadarChart({ axes, contributions, score, width = 376, height = 330, compare, compareLabel }: Props) {
  const cx = width / 2, cy = height / 2 + 4;
  const R = Math.min(width / 2 - 92, height / 2 - 34);
  const innerR = Math.min(46, R * 0.45);
  const n = ORDER.length;
  const angle = (i: number) => -Math.PI / 2 + (i * 2 * Math.PI) / n;
  const pt = (i: number, v: number) => {
    const r = innerR + ((R - innerR) * Math.max(0, Math.min(100, v))) / 100;
    return [cx + Math.cos(angle(i)) * r, cy + Math.sin(angle(i)) * r] as const;
  };
  const poly = (vals: Record<Dimension, number | null>) => ORDER.map((d, i) => pt(i, vals[d] ?? 0)).map((p) => p.join(",")).join(" ");
  const color = scoreColor(score);
  const rings = [25, 50, 75, 100];
  return (
    <div className="relative" style={{ width, height }}>
      <svg width={width} height={height} className="select-none">
        <defs>
          <radialGradient id="radarFill"><stop offset="0%" stopColor={color} stopOpacity={0.05} /><stop offset="100%" stopColor={color} stopOpacity={0.35} /></radialGradient>
        </defs>
        {rings.map((r) => (
          <polygon key={r} points={ORDER.map((_, i) => pt(i, r).join(",")).join(" ")} fill={r === 100 ? "rgba(60,38,14,0.03)" : "none"} stroke="rgba(60,38,14,0.28)" strokeWidth={r === 100 ? 1 : 0.7} strokeDasharray={r === 100 ? undefined : "2 4"} />
        ))}
        {ORDER.map((d, i) => {
          const [x2, y2] = pt(i, 100);
          const [x0, y0] = pt(i, 0);
          return <line key={d} x1={x0} y1={y0} x2={x2} y2={y2} stroke="rgba(60,38,14,0.35)" strokeWidth={0.8} />;
        })}
        {rings.map((r) => { const [x, y] = pt(0, r); return <text key={r} x={x + 5} y={y + 3} fontSize={8} fontFamily="var(--font-caps)" fill="rgba(60,38,14,0.5)">{r}</text>; })}
        {compare && (
          <polygon points={poly(compare)} fill="none" stroke="#6d5233" strokeWidth={1.5} strokeDasharray="4 3" opacity={0.8} />
        )}
        <motion.polygon points={poly(axes)} fill="url(#radarFill)" stroke={color} strokeWidth={2.2} strokeLinejoin="round"
          initial={{ opacity: 0, scale: 0.6 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }} style={{ transformOrigin: `${cx}px ${cy}px` }} />
        {ORDER.map((d, i) => {
          const v = axes[d];
          if (v == null) return null;
          const [x, y] = pt(i, v);
          return <circle key={d} cx={x} cy={y} r={4.5} fill={DIM_COLOR[d]} stroke="#ecd9b0" strokeWidth={1.5} />;
        })}
        {/* centre medallion */}
        <circle cx={cx} cy={cy} r={innerR - 4} fill="#f2e3c0" stroke="#b8891c" strokeWidth={1.5} />
        <circle cx={cx} cy={cy} r={innerR - 9} fill="none" stroke="#b8891c" strokeWidth={0.6} strokeDasharray="1 3" />
        {/* axis labels */}
        {ORDER.map((d, i) => {
          const [x, y] = pt(i, 100);
          const a = angle(i);
          const top = Math.abs(Math.cos(a)) < 0.2;
          const right = Math.cos(a) > 0;
          const lx = top ? x : x + (right ? 8 : -8);
          const ly = top ? y - 22 : y + (Math.sin(a) > 0 ? 8 : -4);
          const anchor = top ? "middle" : right ? "start" : "end";
          const v = axes[d], c = contributions[d];
          return (
            <g key={d}>
              <text x={lx} y={ly} textAnchor={anchor} fontSize={10} fontFamily="var(--font-caps)" fontWeight={700} fill={DIM_COLOR[d]} letterSpacing={0.6}>{DIM_SHORT[d].toUpperCase()}</text>
              <text x={lx} y={ly + 12} textAnchor={anchor} fontSize={9.5} fontFamily="var(--font-caps)" fill="#3f2a14">
                {v == null ? "no data" : `p${v} · ${fmtDelta(c, 1)} pts`}
              </text>
            </g>
          );
        })}
      </svg>
      <div className="pointer-events-none absolute flex flex-col items-center justify-center" style={{ left: cx - innerR, top: cy - innerR, width: innerR * 2, height: innerR * 2 }}>
        <span className="tnum font-caps font-bold leading-none" style={{ fontSize: innerR * 0.8, color }}><AnimatedNumber value={score} /></span>
        <span className="font-caps mt-0.5 text-[7px] uppercase tracking-[0.2em] text-muted">health</span>
      </div>
      {compare && compareLabel && <div className="absolute bottom-1 left-1 flex items-center gap-1.5 text-[10px] italic text-muted"><span className="inline-block h-0 w-4 border-t border-dashed border-[#6d5233]" />{compareLabel}</div>}
    </div>
  );
}
