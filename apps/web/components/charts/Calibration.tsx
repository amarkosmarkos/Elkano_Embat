import { scale, TXT, GridY } from "./axes";

/** Calibración: % de evento observado por decil de score, a 1 / 3 / 6 meses. */
export function Calibration({ rows, width = 760, height = 260 }: { rows: { decile: number; score_min: number; score_max: number; event_h1: number; event_h3: number; event_h6: number; n: number }[]; width?: number; height?: number }) {
  const padL = 44, padR = 12, padT = 14, padB = 40;
  const n = rows.length;
  const cw = (width - padL - padR) / n;
  const y = scale(0, 1, height - padB, padT);
  const bw = cw * 0.22;
  const series = [
    { k: "event_h1" as const, color: "#3b82f6", label: "1 mes" },
    { k: "event_h3" as const, color: "#e5e5e5", label: "3 meses" },
    { k: "event_h6" as const, color: "#ef4444", label: "6 meses" },
  ];
  return (
    <div>
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full overflow-visible">
        <GridY ticks={[0, 0.25, 0.5, 0.75, 1]} y={y} x0={padL} x1={width - padR} fmt={(v) => `${Math.round(v * 100)} %`} />
        {rows.map((r, i) => (
          <g key={r.decile}>
            {series.map((s, j) => {
              const v = r[s.k];
              const x0 = padL + i * cw + cw / 2 - (bw * 3) / 2 + j * bw;
              return <rect key={s.k} x={x0} y={y(v)} width={bw - 1.5} height={y(0) - y(v)} rx={2} fill={s.color} opacity={0.9} />;
            })}
            <text x={padL + i * cw + cw / 2} y={height - 22} textAnchor="middle" {...TXT} fill="#d4d4d4">D{r.decile}</text>
            <text x={padL + i * cw + cw / 2} y={height - 8} textAnchor="middle" {...TXT}>{Math.round(r.score_min)}–{Math.round(r.score_max)}</text>
          </g>
        ))}
      </svg>
      <div className="mt-2 flex gap-4 text-[11px] text-ink-mute">
        {series.map((s) => <span key={s.k} className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm" style={{ background: s.color }} />{s.label}</span>)}
      </div>
    </div>
  );
}
