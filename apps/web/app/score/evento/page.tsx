import { getStore } from "@/lib/data/store";
import { Card } from "@/components/ui/Card";
import { Kpi } from "@/components/ui/Kpi";
import { BarList } from "@/components/charts/BarChart";
import { LineChart } from "@/components/charts/LineChart";
import { EVENT_RULES } from "@/lib/score/meta";

export default async function EventoPage() {
  const store = await getStore();
  const l = store.labels;
  const months = [...new Set([...store.events.values()].flat().map((e) => e.month))].sort();
  const rate = (k: "event" | "D1" | "D2" | "D3" | "D4") => months.map((m) => { let n = 0, e = 0; for (const rows of store.events.values()) { const r = rows.find((x) => x.month === m); if (r) { n++; e += r[k]; } } return n ? (100 * e) / n : null; });
  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Kpi label="Tasa de evento" value={`${(l.event_rate * 100).toFixed(1)} %`} tone="accent" sub="de los pares empresa-mes · rango esperado 5–20 %" />
        <Kpi label="Empresas alguna vez en evento" value={l.companies_ever_in_event} sub="de 1.286" />
        <Kpi label="Filas etiquetadas" value={l.rows.toLocaleString("es-ES")} sub="2024-09 → 2026-08" />
        <Kpi label="Curas" value={l.cure_rows} sub="≥ 2 meses en evento y ≥ 3 sin ninguno" />
      </div>
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1.2fr_1fr]">
        <Card title="Las cuatro reglas" sub="«Le fue mal» definido como comportamiento observable sobre lo que la empresa debe, igual que el default bancario (90 días). Nunca sobre lo que le deben: eso es una métrica.">
          <div className="flex flex-col divide-y divide-line-soft">
            {EVENT_RULES.map((r) => (
              <div key={r.id} className="grid grid-cols-[40px_minmax(0,1fr)_80px] items-start gap-3 py-3">
                <span className="num text-[13px] text-bad">{r.id}</span>
                <div><div className="text-[13px] text-ink">{r.label}</div><div className="num mt-1 text-[11.5px] text-ink-dim">{r.rule}</div><div className="mt-0.5 text-[11px] text-ink-mute">métrica gemela: {r.twin} · por eso el evento se mide en t+1…t+6, nunca en t</div></div>
                <span className="num text-right text-[14px] text-ink">{(l.rate_by_rule[r.id as "D1"] * 100).toFixed(1)} %</span>
              </div>
            ))}
          </div>
        </Card>
        <Card title="Umbrales" sub="analytics/config.py · medidos, no opinados">
          <BarList items={Object.entries(l.rate_by_rule).map(([k, v]) => ({ label: k, value: v * 100 }))} fmt={(v) => `${v.toFixed(1)} %`} color="#ef4444" />
          <div className="mt-4 flex flex-col gap-1 text-[11.5px]">
            {Object.entries(l.thresholds).map(([k, v]) => <div key={k} className="flex justify-between"><span className="num text-ink-mute">{k}</span><span className="num text-ink">{String(v)}</span></div>)}
          </div>
          <p className="mt-3 text-[11.5px] text-ink-mute">La versión literal daba 74 % de evento (saldo desde cero y D1 con facturas que el ERP nunca marca pagadas). Con saldo reconstruido y D1 ≥ 25 % de las salidas y &lt; 6 meses: 19,1 %.</p>
        </Card>
      </div>
      <Card title="Tasa de evento mes a mes" sub="% de empresas en evento cada mes, total y por regla">
        <LineChart months={months} series={[{ id: "ev", label: "Evento", color: "#ef4444", values: rate("event"), area: true }, { id: "d1", label: "D1", color: "#fbbf24", values: rate("D1") }, { id: "d2", label: "D2", color: "#a855f7", values: rate("D2") }, { id: "d3", label: "D3", color: "#3b82f6", values: rate("D3") }, { id: "d4", label: "D4", color: "#34d399", values: rate("D4") }]} yMin={0} fmt={(v) => `${v} %`} />
      </Card>
    </div>
  );
}
