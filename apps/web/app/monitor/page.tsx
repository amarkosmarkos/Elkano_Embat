import { getCompanies, getCompanyDetail, getOverview } from "@/lib/data";
import type { AlertCard, CompanySummary, Severity } from "@/lib/types";
import { fmtEurShort, fmtInt, fmtMonthLong } from "@/lib/format";
import { Card, CompanyLink, Delta, Kpi, PageHeader, ScorePill, SeverityBadge, TrendTag } from "@/components/ui";

type Row = { c: CompanySummary; severity: Severity; why: string; cards: AlertCard[] };

/** Severidad derivada de companies.json: alerta activa y rojo → alta; alerta activa → media; sólo empeora → baja. */
function severityOf(c: CompanySummary): Severity | null {
  if (c.alert === 1 && c.tier === "rojo") return "alta";
  if (c.alert === 1) return "media";
  if (c.trend === "empeora" && c.tier !== "verde") return "baja";
  return null;
}

export default function MonitorPage() {
  const o = getOverview();
  const rows: Row[] = [];
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
  const groups: { sev: Severity; title: string; hint: string }[] = [
    { sev: "alta", title: "Severidad alta", hint: "alarma activa y score en rojo: llamar hoy" },
    { sev: "media", title: "Severidad media", hint: "alarma activa: revisar esta semana" },
    { sev: "baja", title: "Severidad baja", hint: "empieza a torcerse: vigilar" },
  ];
  const nCards = rows.reduce((a, r) => a + r.cards.length, 0);

  return (
    <>
      <PageHeader
        step={5}
        title="Monitor"
        subtitle={`Todo lo que el sistema levantaría en ${fmtMonthLong(o.month_last)}, ordenado por urgencia. Cada fila enlaza a la ficha de la empresa.`}
      />
      <div className="grid grid-cols-4 gap-3">
        <Kpi label="Severidad alta" value={fmtInt(rows.filter((r) => r.severity === "alta").length)} accent="text-bad" hint="alarma + rojo" />
        <Kpi label="Severidad media" value={fmtInt(rows.filter((r) => r.severity === "media").length)} accent="text-warn" hint="alarma activa" />
        <Kpi label="Severidad baja" value={fmtInt(rows.filter((r) => r.severity === "baja").length)} hint="empeorando sin alarma" />
        <Kpi label="Avisos concretos" value={fmtInt(nCards)} hint="cuotas, proveedores, cobros, caja…" />
      </div>

      <div className="mt-4 space-y-4">
        {groups.map((g) => {
          const rs = rows.filter((r) => r.severity === g.sev);
          return (
            <Card key={g.sev} kicker={g.hint} title={`${g.title} · ${fmtInt(rs.length)}`} right={<SeverityBadge severity={g.sev} />}>
              {rs.length === 0 ? (
                <p className="text-[13px] text-ink-2">Ninguna empresa en este nivel.</p>
              ) : (
                <table className="tbl w-full">
                  <thead>
                    <tr>
                      <th>Empresa</th>
                      <th className="text-right">Score</th>
                      <th className="text-right">Δ 3 m</th>
                      <th>Tendencia</th>
                      <th>Motivo</th>
                      <th>Avisos del monitor</th>
                      <th className="text-right">Caja</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rs.map(({ c, why, cards }) => (
                      <tr key={c.id}>
                        <td><CompanyLink id={c.id} className="font-semibold" /><div className="text-[11px] text-ink-3">{c.group_id ?? "sin grupo"}</div></td>
                        <td className="text-right"><ScorePill score={c.score} tier={c.tier} /></td>
                        <td className="text-right"><Delta value={c.delta3} suffix="" /></td>
                        <td><TrendTag trend={c.trend} /></td>
                        <td className="wrap text-ink-2 max-w-[220px]">{why}<div className="text-[11px] text-ink-3 truncate" title={c.explanation}>{c.explanation}</div></td>
                        <td className="wrap">
                          {cards.length === 0 ? (
                            <span className="text-ink-3">—</span>
                          ) : (
                            <ul className="space-y-0.5">
                              {cards.map((a, i) => (
                                <li key={i} className="flex items-center gap-2">
                                  <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${a.severity === "alta" ? "bg-bad" : a.severity === "media" ? "bg-warn" : "bg-navy"}`} />
                                  <span className="text-[12px]">{a.title}</span>
                                </li>
                              ))}
                            </ul>
                          )}
                        </td>
                        <td className={`text-right num ${c.cash < 0 ? "text-bad" : ""}`}>{fmtEurShort(c.cash)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </Card>
          );
        })}
      </div>

      <p className="mt-4 text-[12px] text-ink-3">
        Nota: la lista se construye a partir de <code>companies.json</code> (alarma activa o tendencia a peor en el último mes) y se enriquece con los avisos de la ficha sólo para esas empresas. No recorre las {fmtInt(o.n_companies)} fichas completas.
      </p>
    </>
  );
}
