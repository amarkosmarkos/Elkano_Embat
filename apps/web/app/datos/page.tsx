import { PortfolioScrubber } from "@/components/datos/PortfolioScrubber";
import { companyScoreSeries, portfolioKpisByMonth, regimeBreakdown } from "@/lib/queries";

/**
 * Página de "visión de datos" — de momento lo mínimo para que se vea algo real (Postgres, no inventado).
 * TODO(dataviz): mapa de calor empresa×mes, Sankey de categorías de transacciones, comparativa de
 * dimensiones por sector. `lib/queries.ts` ya tiene regimeBreakdown() y companyScoreSeries(); añade
 * las queries que hagan falta ahí al lado.
 * Componentes reutilizables en components/charts/ (ScoreLine.tsx es SVG puro, sin librería — mismo patrón).
 */
export default async function DatosPage() {
  const { months: portfolioMonths, defaultMonth } = await portfolioKpisByMonth();
  const lastMonth = portfolioMonths.at(-1)?.month;
  const [regimes, series] = await Promise.all([
    lastMonth ? regimeBreakdown(lastMonth) : Promise.resolve([]),
    companyScoreSeries(portfolioMonths.map((m) => m.month)),
  ]);

  return (
    <main className="mx-auto max-w-6xl px-4 py-14">
      <div className="mb-3 text-[13px] font-semibold uppercase tracking-wide text-ink-mute">Visión de datos</div>
      <h1 className="max-w-2xl text-4xl font-bold tracking-tight text-ink">Lo que dicen 1.282 empresas juntas</h1>
      <p className="mt-4 max-w-2xl text-ink-dim">
        Base mínima conectada a Postgres — de aquí sale el resto del análisis exploratorio y las gráficas en
        movimiento.
      </p>

      <div className="mt-10">
        <PortfolioScrubber monthsData={portfolioMonths} defaultMonth={defaultMonth} series={series} />
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
