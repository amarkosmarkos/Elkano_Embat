import { PortfolioScrubber } from "@/components/datos/PortfolioScrubber";
import { companyScoreSeries, portfolioKpisByMonth } from "@/lib/queries";

/**
 * Página de "visión de datos" — de momento lo mínimo para que se vea algo real (Postgres, no inventado).
 * TODO(dataviz): mapa de calor empresa×mes, Sankey de categorías de transacciones, comparativa de
 * dimensiones por sector. `lib/queries.ts` ya tiene regimeBreakdown() y companyScoreSeries(); añade
 * las queries que hagan falta ahí al lado.
 * Componentes reutilizables en components/charts/ (ScoreLine.tsx es SVG puro, sin librería — mismo patrón).
 */
export default async function DatosPage() {
  const { months: portfolioMonths, defaultMonth } = await portfolioKpisByMonth();
  const series = await companyScoreSeries(portfolioMonths.map((m) => m.month));

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
    </main>
  );
}
