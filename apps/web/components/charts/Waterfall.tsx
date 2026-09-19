import { DIMENSIONS, type Dimension } from "@/lib/score/types";
import { DIM_LABEL } from "@/lib/score/meta";
import { DIM_COLOR } from "@/lib/score/colors";
import { scale, TXT } from "./axes";

/**
 * Cascada del cambio de score: score del mes anterior → Δ de cada dimensión → score del mes.
 * Es la explicación del pipeline ("bajó 31 pts: liquidez") dibujada.
 */
export function Waterfall({ from, to, deltas, width = 520, height = 230 }: { from: number; to: number; deltas: Record<Dimension, number | null>; width?: number; height?: number }) {
  const padL = 36, padR = 12, padT = 16, padB = 34;
  const steps: { label: string; start: number; end: number; color: string; key: string }[] = [];
  let acc = from;
  for (const d of DIMENSIONS) {
    const v = deltas[d] ?? 0;
    steps.push({ label: DIM_LABEL[d], start: acc, end: acc + v, color: DIM_COLOR[d], key: d });
    acc += v;
  }
  const explained = acc;
  const resid = to - explained;
  const vals = [from, to, ...steps.flatMap((s) => [s.start, s.end])];
  const lo = Math.max(0, Math.min(...vals) - 6), hi = Math.min(100, Math.max(...vals) + 6);
  const y = scale(lo, hi, height - padB, padT);
  const cols = 2 + steps.length + (Math.abs(resid) > 0.5 ? 1 : 0);
  const cw = (width - padL - padR) / cols;
  const bw = cw * 0.6;
  const bar = (i: number, a: number, b: number, color: string, label: string, valueLabel: string) => {
    const x0 = padL + i * cw + (cw - bw) / 2;
    const top = y(Math.max(a, b)), bot = y(Math.min(a, b));
    return (
      <g key={label + i}>
        <rect x={x0} y={top} width={bw} height={Math.max(1.5, bot - top)} rx={3} fill={color} opacity={0.9} />
        <text x={x0 + bw / 2} y={top - 5} textAnchor="middle" {...TXT} fill="#fafafa">{valueLabel}</text>
        <text x={x0 + bw / 2} y={height - 8} textAnchor="middle" {...TXT}>{label}</text>
      </g>
    );
  };
  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full overflow-visible">
      <line x1={padL} x2={width - padR} y1={y(from)} y2={y(from)} stroke="rgba(255,255,255,0.15)" strokeDasharray="2 5" />
      {bar(0, lo, from, "rgba(255,255,255,0.35)", "Mes anterior", from.toFixed(1))}
      {steps.map((s, i) => bar(i + 1, s.start, s.end, s.end >= s.start ? s.color : s.color, s.label, `${s.end - s.start >= 0 ? "+" : "−"}${Math.abs(s.end - s.start).toFixed(1)}`))}
      {Math.abs(resid) > 0.5 && bar(steps.length + 1, explained, to, "rgba(255,255,255,0.25)", "Suavizado", `${resid >= 0 ? "+" : "−"}${Math.abs(resid).toFixed(1)}`)}
      {bar(cols - 1, lo, to, to >= from ? "#10b981" : "#ef4444", "Este mes", to.toFixed(1))}
    </svg>
  );
}
