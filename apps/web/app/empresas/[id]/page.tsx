import { getStore } from "@/lib/data/store";
import { currentMonth } from "@/lib/data/month";
import { getBundle } from "@/lib/data/company";
import { notFound } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { ScoreHistory } from "@/components/charts/ScoreHistory";
import { Waterfall } from "@/components/charts/Waterfall";
import { Radar } from "@/components/charts/Radar";
import { LineChart } from "@/components/charts/LineChart";
import { DIMENSIONS, type Dimension } from "@/lib/score/types";
import { DIM_LABEL, METRICS } from "@/lib/score/meta";
import { DIM_COLOR } from "@/lib/score/colors";
import { componentPercentiles, componentRanks, componentsAt, mainDriver, describeComponent } from "@/lib/score/derived";
import { fmtMetric, monthLabel } from "@/lib/format";
import { Sparkline } from "@/components/ui/Sparkline";
import { Delta } from "@/components/ui/Pill";

const KEY: (keyof typeof METRICS)[] = ["colchon", "runway", "dias_negativo", "retraso_pago", "dso", "pct_cobro_vencido", "pct_dispuesto", "coste_financiero"];

export default async function ResumenPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const store = await getStore();
  const { idx, month } = await currentMonth(store.months);
  const b = await getBundle(id, idx);
  if (!b) notFound();
  const { c, d, events, mi } = b;
  const months = store.months;
  const evByMonth = new Map(events.map((e) => [e.month, e.event]));
  const evAligned = months.map((m) => (evByMonth.has(m) ? (evByMonth.get(m) === 1 ? 1 : 0) : null)) as (0 | 1 | null)[];
  const now = componentsAt(c, idx);
  const prev = idx > 0 ? componentsAt(c, idx - 1) : null;
  const deltas = {} as Record<Dimension, number | null>;
  for (const dim of DIMENSIONS) deltas[dim] = prev && now[dim] != null && prev[dim] != null ? (now[dim] as number) - (prev[dim] as number) : null;
  const ranks = componentRanks(store.companies, idx);
  const axes = componentPercentiles(now, ranks);
  const driver = mainDriver(now);
  const v2 = months.map((m) => { const i = d.months.indexOf(m); return i >= 0 ? d.scoreV2[i] : null; });
  const compSeries = DIMENSIONS.map((dim) => ({ id: dim, label: DIM_LABEL[dim], color: DIM_COLOR[dim], values: c.components[dim] }));

  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1.6fr_1fr]">
        <Card title="Historia del score" sub="v3 (línea) y v2 fórmula transparente (punteada) · sombreado = mes en el 20 % peor · marcas rojas = evento de impago (D1–D4) ese mes">
          <ScoreHistory months={months} scores={c.scores} raw={undefined} alerts={c.alerts} events={evAligned} marker={idx} compare={v2} compareLabel="v2 (punteada)" />
        </Card>
        <Card title="Las cinco dimensiones" sub="eje = percentil de la contribución en la red este mes · cifra = puntos que suma o resta">
          <div className="flex justify-center"><Radar axes={axes} contributions={now} score={c.scores[idx]} size={330} /></div>
          {driver && <p className="mt-1 text-center text-[12.5px] text-ink-dim">El porqué: <span className="text-ink">{describeComponent(driver.dim, driver.value)}</span></p>}
        </Card>
      </div>
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1fr_1.6fr]">
        <Card title={`Por qué cambia · ${idx > 0 ? monthLabel(months[idx - 1]) : ""} → ${monthLabel(month)}`} sub="cascada de la variación de cada contribución; el resto es el suavizado 0,7·hoy + 0,3·ayer">
          {prev && c.scores[idx] != null && c.scores[idx - 1] != null ? <Waterfall from={c.scores[idx - 1] as number} to={c.scores[idx] as number} deltas={deltas} /> : <p className="text-[12.5px] text-ink-mute">Sin mes anterior con score.</p>}
        </Card>
        <Card title="Contribuciones en el tiempo" sub="puntos que cada dimensión suma (+) o resta (−) al score, mes a mes">
          <LineChart months={months} series={compSeries} height={230} marker={idx} refLines={[{ v: 0, color: "rgba(255,255,255,0.35)" }]} fmt={(v) => `${v > 0 ? "+" : ""}${v}`} />
        </Card>
      </div>
      <Card title="Métricas clave este mes" sub="las que más predicen (Gini univariante) · valor, cambio a 3 meses y serie de 24 meses">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {KEY.map((k) => {
            const s = d.metrics[k];
            const v = mi >= 0 ? s[mi] : null;
            const p3 = mi - 3 >= 0 ? s[mi - 3] : null;
            const m = METRICS[k];
            return (
              <div key={k} className="rounded-xl bg-panel-2 p-3.5">
                <div className="flex items-start justify-between gap-2"><div className="text-[11px] text-ink-mute">{m.short}<span className="num ml-1 text-[9.5px] text-accent">{m.code}</span></div><span className="text-[9.5px] text-ink-mute">{m.higherIsBetter ? "más = mejor" : "menos = mejor"}</span></div>
                <div className="mt-1 flex items-end justify-between gap-2">
                  <div className="num font-semibold text-[20px] text-ink">{fmtMetric(k, v)}</div>
                  <div className="text-[11px]"><Delta v={v != null && p3 != null ? v - p3 : null} digits={m.unit === "pct" ? 2 : 1} /></div>
                </div>
                <div className="mt-2"><Sparkline values={s} width={200} height={26} color={m.higherIsBetter ? "#10b981" : "#f59e0b"} marker={mi >= 0 ? mi : undefined} /></div>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}
