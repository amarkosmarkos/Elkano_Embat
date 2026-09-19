import { GridY, monthTicks, scale, TXT } from "./axes";
import { scoreColor, scoreScale } from "@/lib/score/colors";
import { monthLabel } from "@/lib/format";

/**
 * Historia del score de una empresa: línea con área, bandas del semáforo, meses con alerta (20 % peor)
 * sombreados, eventos de impago (D1–D4) marcados debajo, y marcador del mes observado.
 */
export function ScoreHistory({ months, scores, raw, alerts, events, marker, height = 240, width = 760, compare, compareLabel }: {
  months: string[]; scores: (number | null)[]; raw?: (number | null)[]; alerts?: (0 | 1 | null)[]; events?: (0 | 1 | null)[];
  marker?: number; height?: number; width?: number; compare?: (number | null)[]; compareLabel?: string;
}) {
  const padL = 36, padR = 14, padT = 12, padB = 30;
  const x = scale(0, Math.max(1, months.length - 1), padL, width - padR);
  const y = scale(0, 100, height - padB, padT);
  const path = (vals: (number | null)[]) => {
    let d = "", open = false;
    vals.forEach((v, i) => { if (v == null) { open = false; return; } d += `${open ? "L" : "M"}${x(i).toFixed(1)},${y(v).toFixed(1)} `; open = true; });
    return d;
  };
  const idxs = scores.map((v, i) => (v == null ? -1 : i)).filter((i) => i >= 0);
  const first = idxs[0] ?? 0, last = idxs[idxs.length - 1] ?? 0;
  const area = `${path(scores).replace(/M/g, "L").replace(/^L/, "M")} L${x(last)},${y(0)} L${x(first)},${y(0)} Z`;
  const lastScore = marker != null ? scores[marker] : scores[last];
  const col = scoreColor(lastScore);
  const bw = months.length > 1 ? x(1) - x(0) : 20;
  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full overflow-visible">
      <defs>
        <linearGradient id="sh-area" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor={col} stopOpacity={0.3} />
          <stop offset="1" stopColor={col} stopOpacity={0} />
        </linearGradient>
      </defs>
      <rect x={padL} y={y(100)} width={width - padL - padR} height={y(70) - y(100)} fill="rgba(16,185,129,0.045)" />
      <rect x={padL} y={y(70)} width={width - padL - padR} height={y(40) - y(70)} fill="rgba(245,158,11,0.04)" />
      <rect x={padL} y={y(40)} width={width - padL - padR} height={y(0) - y(40)} fill="rgba(239,68,68,0.05)" />
      {alerts?.map((a, i) => a === 1 ? <rect key={i} x={x(i) - bw / 2} y={padT} width={bw} height={height - padB - padT} fill="rgba(239,68,68,0.10)" /> : null)}
      <GridY ticks={[0, 40, 70, 100]} y={y} x0={padL} x1={width - padR} />
      {compare && <path d={path(compare)} fill="none" stroke="rgba(255,255,255,0.45)" strokeWidth={1.4} strokeDasharray="4 4" />}
      {raw && <path d={path(raw)} fill="none" stroke={col} strokeWidth={1} opacity={0.35} />}
      <path d={area} fill="url(#sh-area)" />
      <path d={path(scores)} fill="none" stroke={col} strokeWidth={2.4} strokeLinejoin="round" strokeLinecap="round" />
      {scores.map((v, i) => v == null ? null : <circle key={i} cx={x(i)} cy={y(v)} r={2.2} fill={scoreScale(v)} />)}
      {events?.map((e, i) => e === 1 ? <rect key={i} x={x(i) - 4} y={height - padB + 4} width={8} height={4} rx={1} fill="#ef4444" /> : null)}
      {marker != null && scores[marker] != null && (
        <g>
          <line x1={x(marker)} x2={x(marker)} y1={padT} y2={height - padB} stroke="rgba(255,255,255,0.5)" />
          <circle cx={x(marker)} cy={y(scores[marker] as number)} r={5} fill={col} stroke="#171717" strokeWidth={2.5} />
        </g>
      )}
      {monthTicks(months).map((i) => <text key={i} x={x(i)} y={height - 8} textAnchor="middle" {...TXT}>{monthLabel(months[i])}</text>)}
      {compareLabel && <text x={width - padR} y={padT + 10} textAnchor="end" {...TXT}>{compareLabel}</text>}
    </svg>
  );
}
