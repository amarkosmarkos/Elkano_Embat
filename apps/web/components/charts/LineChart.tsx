import { GridY, monthTicks, niceTicks, scale, TXT } from "./axes";
import { monthLabel } from "@/lib/format";

export interface Series { id: string; label: string; color: string; values: (number | null)[]; dashed?: boolean; area?: boolean }

/** Líneas multi-serie sobre un eje de meses, con área degradada opcional y bandas de referencia. */
export function LineChart({
  months, series, height = 240, width = 760, yMin, yMax, bands, refLines, fmt, marker, legend = true,
}: {
  months: string[]; series: Series[]; height?: number; width?: number; yMin?: number; yMax?: number;
  bands?: { from: number; to: number; color: string }[]; refLines?: { v: number; label?: string; color?: string }[];
  fmt?: (v: number) => string; marker?: number; legend?: boolean;
}) {
  const padL = 40, padR = 14, padT = 14, padB = 26;
  const all = series.flatMap((s) => s.values.filter((v): v is number => v != null));
  const lo = yMin ?? Math.min(...all, 0);
  const hi = yMax ?? Math.max(...all);
  const x = scale(0, Math.max(1, months.length - 1), padL, width - padR);
  const y = scale(lo, hi === lo ? lo + 1 : hi, height - padB, padT);
  const ticks = niceTicks(lo, hi, 4);
  const path = (vals: (number | null)[]) => {
    let d = "", open = false;
    vals.forEach((v, i) => { if (v == null) { open = false; return; } d += `${open ? "L" : "M"}${x(i).toFixed(1)},${y(v).toFixed(1)} `; open = true; });
    return d;
  };
  const area = (vals: (number | null)[]) => {
    const idx = vals.map((v, i) => (v == null ? -1 : i)).filter((i) => i >= 0);
    if (idx.length < 2) return "";
    const first = idx[0], last = idx[idx.length - 1];
    return `${path(vals).replace(/M/g, "L").replace(/^L/, "M")} L${x(last).toFixed(1)},${y(lo).toFixed(1)} L${x(first).toFixed(1)},${y(lo).toFixed(1)} Z`;
  };
  return (
    <div>
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full overflow-visible">
        <defs>
          {series.map((s) => (
            <linearGradient key={s.id} id={`g-${s.id}`} x1="0" x2="0" y1="0" y2="1">
              <stop offset="0" stopColor={s.color} stopOpacity={0.28} />
              <stop offset="1" stopColor={s.color} stopOpacity={0} />
            </linearGradient>
          ))}
        </defs>
        {bands?.map((b, i) => <rect key={i} x={padL} width={width - padL - padR} y={y(b.to)} height={Math.max(0, y(b.from) - y(b.to))} fill={b.color} />)}
        <GridY ticks={ticks} y={y} x0={padL} x1={width - padR} fmt={fmt} />
        {refLines?.map((r, i) => (
          <g key={i}>
            <line x1={padL} x2={width - padR} y1={y(r.v)} y2={y(r.v)} stroke={r.color ?? "rgba(255,255,255,0.5)"} strokeDasharray="4 4" />
            {r.label && <text x={width - padR} y={y(r.v) - 4} textAnchor="end" {...TXT} fill={r.color ?? "#e5e5e5"}>{r.label}</text>}
          </g>
        ))}
        {series.map((s) => (
          <g key={s.id}>
            {s.area && <path d={area(s.values)} fill={`url(#g-${s.id})`} />}
            <path d={path(s.values)} fill="none" stroke={s.color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" strokeDasharray={s.dashed ? "5 4" : undefined} />
            {marker != null && s.values[marker] != null && <circle cx={x(marker)} cy={y(s.values[marker] as number)} r={3.5} fill={s.color} stroke="#171717" strokeWidth={2} />}
          </g>
        ))}
        {marker != null && <line x1={x(marker)} x2={x(marker)} y1={padT} y2={height - padB} stroke="rgba(255,255,255,0.35)" />}
        {monthTicks(months).map((i) => (
          <text key={i} x={x(i)} y={height - 8} textAnchor="middle" {...TXT}>{monthLabel(months[i])}</text>
        ))}
      </svg>
      {legend && series.length > 1 && (
        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-ink-mute">
          {series.map((s) => (
            <span key={s.id} className="flex items-center gap-1.5"><span className="h-[3px] w-4 rounded-lg" style={{ background: s.color }} />{s.label}</span>
          ))}
        </div>
      )}
    </div>
  );
}
