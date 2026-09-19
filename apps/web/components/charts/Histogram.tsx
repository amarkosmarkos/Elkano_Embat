import { fmtInt } from "@/lib/format";

/** Histograma de scores (10 cubos de 10 pts) con color de semáforo por tramo. */
export function Histogram({ data, width = 360, height = 170 }: { data: { bucket: string; n: number }[]; width?: number; height?: number }) {
  const padL = 34, padR = 8, padT = 14, padB = 26;
  const w = width - padL - padR, h = height - padT - padB;
  const max = Math.max(1, ...data.map((d) => d.n));
  const bw = w / data.length;
  const gap = 2;
  const ticks = [0, 0.5, 1].map((t) => Math.round(max * t));
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="block" role="img" aria-label="Distribución de scores">
      {ticks.map((t) => {
        const y = padT + h - (t / max) * h;
        return (
          <g key={t}>
            <line x1={padL} x2={width - padR} y1={y} y2={y} stroke="#e2e8f0" strokeWidth={1} />
            <text x={padL - 6} y={y + 3} fontSize={10} fill="#94a3b8" textAnchor="end">{fmtInt(t)}</text>
          </g>
        );
      })}
      {data.map((d, i) => {
        const lo = parseInt(d.bucket.split("-")[0], 10);
        const color = lo >= 70 ? "#15803d" : lo >= 40 ? "#b45309" : "#b91c1c";
        const bh = (d.n / max) * h;
        const x = padL + i * bw + gap / 2;
        const y = padT + h - bh;
        return (
          <g key={d.bucket}>
            <title>{`${d.bucket}: ${fmtInt(d.n)} empresas`}</title>
            <rect x={x} y={y} width={bw - gap} height={bh} fill={color} rx={3} opacity={0.9} />
            {bh > 0 && bh < 4 && <rect x={x} y={padT + h - 1} width={bw - gap} height={1} fill={color} />}
            <text x={x + (bw - gap) / 2} y={height - padB + 12} fontSize={10} fill="#475569" textAnchor="middle">{lo}</text>
            {d.n > 0 && <text x={x + (bw - gap) / 2} y={y - 3} fontSize={10} fill="#475569" textAnchor="middle">{fmtInt(d.n)}</text>}
          </g>
        );
      })}
      <text x={width - padR} y={height - padB + 24} fontSize={10} fill="#94a3b8" textAnchor="end">score (0–100)</text>
      <line x1={padL} x2={width - padR} y1={padT + h} y2={padT + h} stroke="#cbd5e1" strokeWidth={1} />
    </svg>
  );
}
