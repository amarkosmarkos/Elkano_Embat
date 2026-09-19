/** Utilidades SVG compartidas: escalas lineales sencillas y ejes discretos, sin librería. */
export const scale = (d0: number, d1: number, r0: number, r1: number) => {
  const span = d1 - d0 || 1;
  return (v: number) => r0 + ((v - d0) / span) * (r1 - r0);
};

export function niceTicks(min: number, max: number, n = 4): number[] {
  if (!(max > min)) return [min];
  const raw = (max - min) / n;
  const pow = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * pow).find((s) => s >= raw) ?? raw;
  const start = Math.ceil(min / step) * step;
  const out: number[] = [];
  for (let v = start; v <= max + 1e-9; v += step) out.push(Number(v.toFixed(10)));
  return out;
}

export const TXT = { fontFamily: "var(--font-body)", fontSize: 10, fill: "#a1a1a1" } as const;

export function GridY({ ticks, y, x0, x1, fmt }: { ticks: number[]; y: (v: number) => number; x0: number; x1: number; fmt?: (v: number) => string }) {
  return (
    <g>
      {ticks.map((t) => (
        <g key={t}>
          <line x1={x0} x2={x1} y1={y(t)} y2={y(t)} stroke="rgba(255,255,255,0.09)" strokeDasharray={t === 0 ? undefined : "2 5"} />
          <text x={x0 - 8} y={y(t) + 3.5} textAnchor="end" {...TXT}>
            {fmt ? fmt(t) : t}
          </text>
        </g>
      ))}
    </g>
  );
}

export function monthTicks(months: string[], every?: number): number[] {
  const n = months.length;
  const step = every ?? (n > 14 ? 3 : n > 8 ? 2 : 1);
  const out: number[] = [];
  for (let i = n - 1; i >= 0; i -= step) out.unshift(i);
  return out;
}
