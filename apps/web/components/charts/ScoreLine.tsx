import { band } from "@/components/ScoreBadge";

const COLOR = { good: "#2f9e6e", warn: "#b8890f", bad: "#d6455a" } as const;

/**
 * Línea de score mes a mes, SVG puro (sin librería, sin cliente). Pensado como plantilla:
 * copia este patrón para cualquier otra serie temporal en /datos (mismo padding, mismas líneas
 * de referencia a 40/70, mismos ticks de mes).
 */
export default function ScoreLine({ series }: { series: { month: string; score: number }[] }) {
  if (series.length < 2) return <div className="text-sm text-ink-mute">Historia insuficiente para graficar.</div>;
  const W = 760,
    H = 220,
    padL = 34,
    padR = 16,
    padT = 18,
    padB = 26;
  const n = series.length;
  const x = (i: number) => padL + (i / (n - 1)) * (W - padL - padR);
  const y = (v: number) => padT + (1 - v / 100) * (H - padT - padB);
  const path = series.map((d, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(d.score).toFixed(1)}`).join(" ");
  const last = series[series.length - 1];
  const col = COLOR[band(last.score)];
  const ref = (v: number) => (
    <g key={v}>
      <line x1={padL} x2={W - padR} y1={y(v)} y2={y(v)} stroke="#22303f" strokeWidth={1} strokeDasharray="2 4" />
      <text x={padL - 8} y={y(v) + 3} fontFamily="var(--font-mono)" fontSize={9} fill="#5c7082" textAnchor="end">
        {v}
      </text>
    </g>
  );
  const ticks = [0, Math.round((n - 1) * 0.33), Math.round((n - 1) * 0.66), n - 1];
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Evolución mensual del score">
      {[100, 70, 40, 0].map(ref)}
      <path d={path} fill="none" stroke={col} strokeWidth={2.4} />
      <circle cx={x(n - 1)} cy={y(last.score)} r={4} fill={col} />
      {ticks.map((i) => (
        <text key={i} x={x(i)} y={H - 8} fontFamily="var(--font-mono)" fontSize={9.5} fill="#5c7082" textAnchor="middle">
          {series[i].month}
        </text>
      ))}
    </svg>
  );
}
