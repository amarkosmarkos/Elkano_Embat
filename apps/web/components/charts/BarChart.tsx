import { GridY, niceTicks, scale, TXT } from "./axes";

/** Barras verticales por categoría (una o varias series agrupadas). */
export function BarChart({
  categories, series, height = 220, width = 760, fmt, yMin = 0, yMax, labelEvery = 1, stacked,
}: {
  categories: string[]; series: { id: string; label: string; color: string; values: (number | null)[] }[];
  height?: number; width?: number; fmt?: (v: number) => string; yMin?: number; yMax?: number; labelEvery?: number; stacked?: boolean;
}) {
  const padL = 44, padR = 10, padT = 12, padB = 26;
  const totals = categories.map((_, i) => (stacked ? series.reduce((s, sr) => s + (sr.values[i] ?? 0), 0) : Math.max(...series.map((sr) => sr.values[i] ?? 0))));
  const hi = yMax ?? Math.max(...totals, 1);
  const lo = Math.min(yMin, ...series.flatMap((s) => s.values.filter((v): v is number => v != null)));
  const y = scale(lo, hi, height - padB, padT);
  const ticks = niceTicks(lo, hi, 4);
  const n = categories.length;
  const bw = (width - padL - padR) / n;
  const inner = bw * 0.72;
  const k = stacked ? 1 : series.length;
  const w = inner / k;
  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full overflow-visible">
      <GridY ticks={ticks} y={y} x0={padL} x1={width - padR} fmt={fmt} />
      {categories.map((c, i) => {
        let acc = 0;
        return (
          <g key={c}>
            {series.map((s, j) => {
              const v = s.values[i];
              if (v == null) return null;
              const x0 = padL + i * bw + (bw - inner) / 2 + (stacked ? 0 : j * w);
              const base = stacked ? acc : 0;
              const top = stacked ? acc + v : v;
              if (stacked) acc += v;
              const y0 = y(Math.max(base, top)), y1 = y(Math.min(base, top));
              return <rect key={s.id} x={x0} y={y0} width={Math.max(1, w - 1)} height={Math.max(0.5, y1 - y0)} rx={2} fill={s.color} opacity={0.92} />;
            })}
            {i % labelEvery === 0 && <text x={padL + i * bw + bw / 2} y={height - 8} textAnchor="middle" {...TXT}>{c}</text>}
          </g>
        );
      })}
    </svg>
  );
}

/** Lista de barras horizontales con etiqueta y valor: la forma más legible para rankings. */
export function BarList({ items, fmt, max, color = "var(--color-accent-2)", height = 22 }: { items: { label: React.ReactNode; value: number; color?: string; href?: string; sub?: string }[]; fmt?: (v: number) => string; max?: number; color?: string; height?: number }) {
  const m = max ?? Math.max(...items.map((i) => Math.abs(i.value)), 1e-9);
  return (
    <div className="flex flex-col gap-2">
      {items.map((it, i) => (
        <div key={i} className="grid grid-cols-[minmax(0,1.1fr)_minmax(0,2fr)_auto] items-center gap-3 text-[12.5px]">
          <div className="truncate text-ink-dim">{it.label}{it.sub && <span className="ml-1.5 text-[10.5px] text-ink-mute">{it.sub}</span>}</div>
          <div className="h-[6px] overflow-hidden rounded-lg bg-panel-hi" style={{ height: Math.max(4, height * 0.28) }}>
            <div className="h-full rounded-lg" style={{ width: `${(100 * Math.abs(it.value)) / m}%`, background: it.color ?? color, transition: "width 500ms cubic-bezier(.2,.7,.2,1)" }} />
          </div>
          <div className="num w-16 text-right text-ink">{fmt ? fmt(it.value) : it.value}</div>
        </div>
      ))}
    </div>
  );
}
