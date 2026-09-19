import { PortfolioScrubber } from "@/components/datos/PortfolioScrubber";
import { portfolioKpisByMonth, regimeBreakdown, scoreStats } from "@/lib/queries";

/**
 * Página de "visión de datos" — de momento lo mínimo para que se vea algo real (Postgres, no inventado).
 * TODO(dataviz): esto es la base, no el resultado — aquí van las gráficas animadas/movidas de verdad.
 * Ideas: distribución de score por mes (animada al cambiar de mes), mapa de calor empresa×mes,
 * Sankey de categorías de transacciones, comparativa de dimensiones por sector. `lib/queries.ts` ya
 * tiene scoreStats() y regimeBreakdown(); añade las queries que hagan falta ahí al lado.
 * Componentes reutilizables en components/charts/ (ScoreLine.tsx es SVG puro, sin librería — mismo patrón).
 */
export default async function DatosPage() {
  const stats = await scoreStats();
  const lastMonth = stats.at(-1)?.month;
  const regimes = lastMonth ? await regimeBreakdown(lastMonth) : [];
  const maxAvg = Math.max(...stats.map((s) => s.avg));
  const minAvg = Math.min(...stats.map((s) => s.avg));
  const { months: portfolioMonths, defaultMonth } = await portfolioKpisByMonth();

  return (
    <main className="mx-auto max-w-6xl px-4 py-14">
      <div className="mb-3 text-[13px] font-semibold uppercase tracking-wide text-ink-mute">Visión de datos</div>
      <h1 className="max-w-2xl text-4xl font-bold tracking-tight text-ink">Lo que dicen 1.282 empresas juntas</h1>
      <p className="mt-4 max-w-2xl text-ink-dim">
        Base mínima conectada a Postgres — de aquí sale el resto del análisis exploratorio y las gráficas en
        movimiento.
      </p>

      <div className="mt-10">
        <PortfolioScrubber monthsData={portfolioMonths} defaultMonth={defaultMonth} />
      </div>

      <div className="mt-6 rounded-2xl border border-line bg-panel p-6 shadow-sm">
        <div className="mb-4 text-[13px] font-semibold uppercase tracking-wide text-ink-mute">Score medio por mes (p20–p80)</div>
        <div className="flex h-40 items-end gap-1">
          {stats.map((s) => {
            const h = ((s.avg - minAvg) / (maxAvg - minAvg || 1)) * 100;
            return (
              <div key={s.month} className="group relative flex-1">
                <div className="rounded-t-md bg-accent/70 transition-colors group-hover:bg-accent" style={{ height: `${20 + h * 0.8}%` }} />
                <div className="pointer-events-none absolute -top-6 left-1/2 -translate-x-1/2 whitespace-nowrap font-mono text-[10px] text-ink-dim opacity-0 group-hover:opacity-100">
                  {s.month} · {s.avg.toFixed(0)}
                </div>
              </div>
            );
          })}
        </div>
        <div className="mt-3 flex justify-between font-mono text-[10px] text-ink-mute">
          <span>{stats[0]?.month}</span>
          <span>{lastMonth}</span>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-line bg-panel p-6 shadow-sm">
          <div className="mb-4 text-[13px] font-semibold uppercase tracking-wide text-ink-mute">Régimen · {lastMonth}</div>
          <div className="flex flex-col gap-2">
            {regimes.map((r) => (
              <div key={r.regime ?? "null"} className="flex items-center gap-3 text-sm">
                <span className="w-28 text-ink-dim">{r.regime ?? "sin clasificar"}</span>
                <div className="h-2 flex-1 rounded-full bg-panel-2">
                  <div
                    className="h-2 rounded-full bg-accent"
                    style={{ width: `${(r.n / Math.max(...regimes.map((x) => x.n))) * 100}%` }}
                  />
                </div>
                <span className="font-mono text-xs text-ink-mute">{r.n}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-col justify-center rounded-2xl border border-dashed border-line p-6 text-sm text-ink-mute">
          [placeholder] Aquí las gráficas animadas: distribución de score, evolución por sector, lo que salga del
          EDA. <code className="text-accent">lib/queries.ts</code> ya conecta a Postgres.
        </div>
      </div>
    </main>
  );
}
