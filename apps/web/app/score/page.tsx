import { getCompanies, getOverview } from "@/lib/data";
import { fmtInt, fmtMonthLong } from "@/lib/format";
import { Histogram } from "@/components/charts/Histogram";
import { Card, PageHeader } from "@/components/ui";
import { ScoreTable } from "@/components/ScoreTable";

export default function ScorePage() {
  const o = getOverview();
  const companies = getCompanies();
  const k = o.counts;
  const total = Math.max(1, k.verde + k.ambar + k.rojo);
  const rows: { label: string; n: number; cls: string; dot: string }[] = [
    { label: "Verde (≥ 70)", n: k.verde, cls: "text-ok", dot: "bg-ok" },
    { label: "Ámbar (40–70)", n: k.ambar, cls: "text-warn", dot: "bg-warn" },
    { label: "Rojo (< 40)", n: k.rojo, cls: "text-bad", dot: "bg-bad" },
  ];
  return (
    <>
      <PageHeader
        step={2}
        title="El score"
        subtitle={`Un número de 0 a 100 por empresa: 100 menos la probabilidad de que le pase algo malo en los próximos meses. Calculado cada mes con 24 métricas y 8 alarmas; aquí, ${fmtMonthLong(o.month_last)}.`}
      />
      <div className="grid grid-cols-[360px_minmax(0,1fr)] gap-4 items-start">
        <div className="flex flex-col gap-4">
          <Card kicker="Distribución" title={`${fmtInt(o.n_companies)} empresas por tramo de score`}>
            <Histogram data={o.score_hist} width={328} height={170} />
          </Card>
          <Card kicker="Semáforo" title="Quién está dónde">
            <div className="flex h-2 rounded overflow-hidden mb-3">
              <div className="bg-ok" style={{ width: `${(k.verde / total) * 100}%` }} />
              <div className="bg-warn" style={{ width: `${(k.ambar / total) * 100}%` }} />
              <div className="bg-bad" style={{ width: `${(k.rojo / total) * 100}%` }} />
            </div>
            <ul className="text-[13px] divide-y divide-line">
              {rows.map((r) => (
                <li key={r.label} className="flex items-center justify-between py-1.5">
                  <span className="inline-flex items-center gap-2"><span className={`w-2 h-2 rounded-full ${r.dot}`} />{r.label}</span>
                  <span className={`num font-semibold ${r.cls}`}>{fmtInt(r.n)} <span className="text-ink-3 font-normal">({Math.round((r.n / total) * 100)} %)</span></span>
                </li>
              ))}
            </ul>
          </Card>
          <Card kicker="Movimiento" title="Últimos 3 meses">
            <ul className="text-[13px] divide-y divide-line">
              <li className="flex items-center justify-between py-1.5"><span className="text-ok">↗ Mejorando</span><span className="num font-semibold">{fmtInt(k.mejorando)}</span></li>
              <li className="flex items-center justify-between py-1.5"><span className="text-bad">↘ Empeorando</span><span className="num font-semibold">{fmtInt(k.empeorando)}</span></li>
              <li className="flex items-center justify-between py-1.5"><span className="text-bad font-medium">Con alerta activa</span><span className="num font-semibold text-bad">{fmtInt(k.alertas)}</span></li>
            </ul>
          </Card>
        </div>
        <ScoreTable companies={companies} />
      </div>
    </>
  );
}
