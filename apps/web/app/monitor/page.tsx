import { getCompanies, getCompanyDetail, getOverview } from "@/lib/data";
import type { CompanySummary, Severity } from "@/lib/types";
import { fmtInt, fmtMonthLong } from "@/lib/format";
import { PageHeader } from "@/components/ui";
import { MonitorList, type MonitorRow } from "@/components/MonitorList";

/** Severidad derivada de companies.json: alerta activa y rojo → alta; alerta activa → media; sólo empeora → baja. */
function severityOf(c: CompanySummary): Severity | null {
  if (c.alert === 1 && c.tier === "rojo") return "alta";
  if (c.alert === 1) return "media";
  if (c.trend === "empeora" && c.tier !== "verde") return "baja";
  return null;
}

export default function MonitorPage() {
  const o = getOverview();
  const rows: MonitorRow[] = [];
  for (const c of getCompanies()) {
    const sev = severityOf(c);
    if (!sev) continue;
    // Sólo abrimos la ficha de las candidatas (no de las 1.286): es barato y trae el texto de los avisos.
    const cards = getCompanyDetail(c.id)?.cards.alertas ?? [];
    const why =
      c.alert === 1
        ? `Alarma activa en ${fmtMonthLong(o.month_last)}${c.trend === "empeora" ? " y tendencia a peor" : ""}`
        : `Sin alarma todavía, pero ${c.tier === "ambar" ? "ámbar" : "rojo"} y cayendo`;
    rows.push({ c, severity: sev, why, cards });
  }
  const order: Record<Severity, number> = { alta: 0, media: 1, baja: 2 };
  rows.sort((a, b) => order[a.severity] - order[b.severity] || a.c.score - b.c.score);

  return (
    <>
      <PageHeader
        step={5}
        title="Monitor"
        subtitle={`Todo lo que el sistema levantaría en ${fmtMonthLong(o.month_last)}, ordenado por urgencia. Cada fila enlaza a la ficha de la empresa.`}
      />
      <MonitorList rows={rows} />

      <p className="mt-4 text-[12px] text-ink-3">
        Nota: la lista se construye a partir de <code>companies.json</code> (alarma activa o tendencia a peor en el último mes) y se enriquece con los avisos de la ficha sólo para esas empresas. No recorre las {fmtInt(o.n_companies)} fichas completas.
      </p>
    </>
  );
}
