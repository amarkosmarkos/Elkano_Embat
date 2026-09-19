import { getStore } from "@/lib/data/store";
import { Card } from "@/components/ui/Card";
import { Kpi } from "@/components/ui/Kpi";
import { Pill } from "@/components/ui/Pill";
import { BarChart } from "@/components/charts/BarChart";

export default async function ValidacionPage() {
  const store = await getStore();
  const r = store.reports.v3;
  const fmt = (v: number | boolean | string) => (typeof v === "number" ? v.toFixed(3) : String(v));
  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4 xl:grid-cols-8">
        <Kpi label="Gini h1" value={r.gini.h1.toFixed(2)} tone="accent" />
        <Kpi label="Gini h3" value={r.gini.h3.toFixed(2)} tone="accent" />
        <Kpi label="Gini h6" value={r.gini.h6.toFixed(2)} tone={r.gini.h6 >= 0.4 ? "good" : "warn"} sub="mínimo 0,40" />
        <Kpi label="KS h6" value={r.ks.h6.toFixed(2)} tone={r.ks.h6 >= 0.3 ? "good" : "warn"} sub="mínimo 0,30" />
        <Kpi label="Caída OOS" value={r.oos.drop_vs_in_sample.toFixed(3)} tone="good" sub="< 0,05 bueno" />
        <Kpi label="PSI 12 m" value={Math.max(...Object.values(r.psi)).toFixed(3)} tone="good" sub="< 0,10 estable" />
        <Kpi label="Autocorr." value={r.autocorr_lag1.toFixed(2)} tone="good" sub="0,80–0,95" />
        <Kpi label="Tasa de evento" value={`${(r.event_rate * 100).toFixed(1)} %`} sub={`${r.n_rows.toLocaleString("es-ES")} pares`} />
      </div>
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1.2fr_1fr]">
        <Card title="Criterios de aceptación" sub="docs/validacion_salud.md §4 · lo que falla, falla a la vista">
          <div className="flex flex-col divide-y divide-line-soft">
            {r.acceptance.map((a) => (
              <div key={a.metric} className="grid grid-cols-[minmax(0,1fr)_80px_80px_80px_70px] items-center gap-3 py-2.5 text-[12.5px]">
                <span className="text-ink">{a.metric}</span>
                <span className="num text-right text-ink">{fmt(a.value)}</span>
                <span className="num text-right text-ink-mute">{fmt(a.min)}</span>
                <span className="num text-right text-ink-mute">{fmt(a.good)}</span>
                <span className="text-right"><Pill tone={a.status === "bueno" ? "good" : "bad"}>{a.status}</Pill></span>
              </div>
            ))}
          </div>
          <div className="mt-2 grid grid-cols-[minmax(0,1fr)_80px_80px_80px_70px] gap-3 text-[12px] font-medium text-ink-mute"><span /><span className="text-right">valor</span><span className="text-right">mínimo</span><span className="text-right">bueno</span><span /></div>
        </Card>
        <div className="flex flex-col gap-5">
          <Card title="Fuera de muestra · Gini h6 por fold" sub="5 folds cortados por grupo: la empresa se puntúa con un modelo que nunca la vio">
            <BarChart categories={r.oos.gini_h6_by_fold.map((_, i) => `fold ${i}`)} series={[{ id: "oos", label: "Gini h6", color: "#3b82f6", values: r.oos.gini_h6_by_fold }]} yMax={0.6} fmt={(v) => v.toFixed(1)} height={170} />
            <p className="mt-2 text-[11.5px] text-ink-mute">media {r.oos.mean.toFixed(3)} · in-sample {r.gini.h6.toFixed(3)} · caída {r.oos.drop_vs_in_sample.toFixed(3)}</p>
          </Card>
          <Card title="Fuera de tiempo" sub="entrenado hasta 2026-02, probado en 2026-03… (con h3, porque h6 necesita 6 meses de futuro)">
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="rounded-xl bg-panel-2 p-3"><div className="eyebrow">Gini h3 train</div><div className="num font-semibold mt-1 text-[20px] text-ink">{r.oot_h3.gini_h3_train.toFixed(3)}</div></div>
              <div className="rounded-xl bg-panel-2 p-3"><div className="eyebrow">Gini h3 test</div><div className="num font-semibold mt-1 text-[20px] text-ink">{r.oot_h3.gini_h3_test.toFixed(3)}</div></div>
              <div className="rounded-xl bg-panel-2 p-3"><div className="eyebrow">Caída</div><div className="num font-semibold mt-1 text-[20px] text-good">{r.oot_h3.drop.toFixed(3)}</div></div>
            </div>
          </Card>
        </div>
      </div>
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
        <Card title="Lead time" sub="cuántos meses antes del primer evento el score ya estaba en el 20 % peor">
          <div className="num font-semibold text-[34px] text-warn">{r.lead_time_months.median.toFixed(0)} <span className="text-[14px] text-ink-mute">meses (mediana)</span></div>
          <p className="mt-2 text-[12px] text-ink-dim">p75 = {r.lead_time_months.p75} · {Math.round(r.lead_time_months.share_warned_2m_before * 100)} % de los {r.lead_time_months.n_companies_with_event} casos avisados con ≥ 2 meses. Punto débil medido: avisa a la vez que el evento. La siguiente iteración es un <span className="num">events_v2</span> más exigente, no otro score.</p>
        </Card>
        <Card title="La alerta (20 % peor del mes)" sub="precisión y recall a 3 meses">
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-xl bg-panel-2 p-3"><div className="eyebrow">Precisión</div><div className="num font-semibold mt-1 text-[24px] text-ink">{(r.alerts.precision_h3 * 100).toFixed(0)} %</div></div>
            <div className="rounded-xl bg-panel-2 p-3"><div className="eyebrow">Recall</div><div className="num font-semibold mt-1 text-[24px] text-ink">{(r.alerts.recall_h3 * 100).toFixed(0)} %</div></div>
          </div>
          <p className="mt-2 text-[12px] text-ink-dim">De cada 3 alertas, 2 tienen evento en ≤ 3 meses. Correlación entre filiales del mismo grupo: {r.group_corr.corr.toFixed(2)} ({r.group_corr.pairs.toLocaleString("es-ES")} pares).</p>
        </Card>
        <Card title="Estabilidad" sub="PSI entre meses separados 12 meses y autocorrelación">
          <div className="flex flex-col gap-1.5 text-[12px]">
            {Object.entries(r.psi).map(([k, v]) => <div key={k} className="flex justify-between"><span className="num text-ink-dim">{k.replace("_vs_", " vs ")}</span><span className="num text-ink">{v.toFixed(3)}</span></div>)}
            <div className="mt-1 flex justify-between border-t border-line-soft pt-1.5"><span className="text-ink-dim">autocorrelación lag 1</span><span className="num text-ink">{r.autocorr_lag1.toFixed(3)}</span></div>
            <div className="flex justify-between"><span className="text-ink-dim">Gini de cura (h6)</span><span className="num text-warn">{r.gini_cure_h6.toFixed(3)}</span></div>
          </div>
        </Card>
      </div>
    </div>
  );
}
