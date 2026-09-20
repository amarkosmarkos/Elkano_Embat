import { fmtMonth } from "@/lib/format";

export type Series = { key: string; label: string; values: (number | null)[]; color: string; dashed?: boolean };

type Props = {
  months: string[];
  series: Series[];
  width?: number;
  height?: number;
  /** Índices de meses marcados (p. ej. alertas) → punto rojo */
  markIdx?: number[];
  /** Índices de meses sombreados (p. ej. eventos) */
  shadeIdx?: number[];
  /** Índices con cure → punto verde */
  cureIdx?: number[];
  /** Bandas horizontales de fondo (score: verde/ámbar/rojo) */
  bands?: { from: number; to: number; color: string }[];
  yMin?: number;
  yMax?: number;
  format?: (v: number) => string;
  /** Línea horizontal de referencia (p. ej. 0) */
  zero?: boolean;
  legend?: boolean;
};

/** Gráfico de líneas mensual, SVG puro. Una sola escala Y (varias series sólo si comparten unidad). */
export function LineChart({
  months, series, width = 560, height = 200, markIdx = [], shadeIdx = [], cureIdx = [], bands = [],
  yMin, yMax, format = (v) => String(Math.round(v)), zero = false, legend = true,
}: Props) {
  const padL = 46, padR = 12, padT = 12, padB = 24;
  const w = width - padL - padR, h = height - padT - padB;
  const n = months.length;
  const all = series.flatMap((s) => s.values.filter((v): v is number => v != null));
  let lo = yMin ?? Math.min(...all), hi = yMax ?? Math.max(...all);
  if (zero) { lo = Math.min(lo, 0); hi = Math.max(hi, 0); }
  if (hi === lo) { hi = lo + 1; }
  const span = hi - lo;
  if (yMin == null) lo -= span * 0.05;
  if (yMax == null) hi += span * 0.05;
  const x = (i: number) => padL + (n <= 1 ? w / 2 : (i / (n - 1)) * w);
  const y = (v: number) => padT + h - ((v - lo) / (hi - lo)) * h;
  const ticks = 4;
  const tickVals = Array.from({ length: ticks + 1 }, (_, i) => lo + ((hi - lo) * i) / ticks);
  const maxLabels = Math.max(2, Math.floor(w / 52));
  const labelEvery = Math.max(1, Math.ceil(n / maxLabels));
  const labelIdx = new Set<number>();
  for (let i = 0; i < n; i += labelEvery) labelIdx.add(i);
  // el último mes siempre, y si el anterior queda demasiado cerca se quita
  const lastLabeled = Math.floor((n - 1) / labelEvery) * labelEvery;
  const pxPerMonth = n > 1 ? w / (n - 1) : w;
  if ((n - 1 - lastLabeled) * pxPerMonth < 48 && lastLabeled !== n - 1) labelIdx.delete(lastLabeled);
  labelIdx.add(n - 1);
  const half = n > 1 ? w / (n - 1) / 2 : w / 2;

  const path = (vals: (number | null)[]) => {
    let d = "", pen = false;
    vals.forEach((v, i) => {
      if (v == null) { pen = false; return; }
      d += `${pen ? "L" : "M"}${x(i).toFixed(1)},${y(v).toFixed(1)} `;
      pen = true;
    });
    return d;
  };

  return (
    <div>
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="block" role="img">
        {bands.map((b, i) => (
          <rect key={i} x={padL} y={y(Math.min(b.to, hi))} width={w} height={Math.max(0, y(Math.max(b.from, lo)) - y(Math.min(b.to, hi)))} fill={b.color} />
        ))}
        {shadeIdx.map((i) => (
          <rect key={`s${i}`} x={x(i) - half} y={padT} width={half * 2} height={h} fill="#b91c1c" opacity={0.12}>
            <title>{`Evento: ${fmtMonth(months[i])}`}</title>
          </rect>
        ))}
        {tickVals.map((t, i) => (
          <g key={i}>
            <line x1={padL} x2={width - padR} y1={y(t)} y2={y(t)} stroke="#e2e8f0" strokeWidth={1} />
            <text x={padL - 6} y={y(t) + 3} fontSize={10} fill="#94a3b8" textAnchor="end">{format(t)}</text>
          </g>
        ))}
        {zero && lo < 0 && <line x1={padL} x2={width - padR} y1={y(0)} y2={y(0)} stroke="#94a3b8" strokeWidth={1} />}
        {months.map((m, i) =>
          labelIdx.has(i) ? (
            <text key={m} x={x(i)} y={height - 6} fontSize={10} fill="#475569" textAnchor={i === 0 ? "start" : i === n - 1 ? "end" : "middle"}>{fmtMonth(m)}</text>
          ) : null,
        )}
        {series.map((s) => (
          <path key={s.key} d={path(s.values)} fill="none" stroke={s.color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" strokeDasharray={s.dashed ? "4 3" : undefined} />
        ))}
        {/* puntos de hover con tooltip nativo */}
        {series[0] && months.map((m, i) => {
          const v = series[0].values[i];
          if (v == null) return null;
          return (
            <circle key={`h${i}`} cx={x(i)} cy={y(v)} r={7} fill="transparent">
              <title>{`${fmtMonth(m)}, ${series.map((s) => `${s.label}: ${s.values[i] == null ? "-" : format(s.values[i] as number)}`).join(", ")}`}</title>
            </circle>
          );
        })}
        {markIdx.map((i) => {
          const v = series[0]?.values[i];
          if (v == null) return null;
          return (
            <g key={`m${i}`}>
              <circle cx={x(i)} cy={y(v)} r={5} fill="#b91c1c" stroke="#fff" strokeWidth={2}>
                <title>{`Alerta: ${fmtMonth(months[i])}`}</title>
              </circle>
            </g>
          );
        })}
        {cureIdx.map((i) => {
          const v = series[0]?.values[i];
          if (v == null) return null;
          return <circle key={`c${i}`} cx={x(i)} cy={y(v)} r={5} fill="#15803d" stroke="#fff" strokeWidth={2}><title>{`Cura: ${fmtMonth(months[i])}`}</title></circle>;
        })}
      </svg>
      {legend && (series.length > 1 || markIdx.length > 0 || shadeIdx.length > 0) && (
        <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 text-[11px] text-ink-2">
          {series.map((s) => (
            <span key={s.key} className="inline-flex items-center gap-1.5">
              <span className="inline-block w-4 h-0.5" style={{ background: s.color, borderTop: s.dashed ? `2px dashed ${s.color}` : undefined }} />
              {s.label}
            </span>
          ))}
          {markIdx.length > 0 && <span className="inline-flex items-center gap-1.5"><span className="inline-block w-2.5 h-2.5 rounded-full bg-bad" />Mes en alerta</span>}
          {cureIdx.length > 0 && <span className="inline-flex items-center gap-1.5"><span className="inline-block w-2.5 h-2.5 rounded-full bg-ok" />Cura</span>}
          {shadeIdx.length > 0 && <span className="inline-flex items-center gap-1.5"><span className="inline-block w-3 h-3 bg-bad/15 border border-bad/30" />Mes con evento (impago / descubierto)</span>}
        </div>
      )}
    </div>
  );
}
