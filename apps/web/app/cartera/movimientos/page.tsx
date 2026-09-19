import { getStore } from "@/lib/data/store";
import { currentMonth } from "@/lib/data/month";
import { rowsAt, type Row } from "@/lib/data/portfolio";
import { Card, Empty } from "@/components/ui/Card";
import { Kpi } from "@/components/ui/Kpi";
import { Pill, Delta } from "@/components/ui/Pill";
import { Sparkline } from "@/components/ui/Sparkline";
import { CompanyLink } from "@/components/ui/CompanyLink";
import { ValueHistogram } from "@/components/charts/Histogram";
import { DIM_LABEL } from "@/lib/score/meta";
import { TREND_LABEL, type Trend } from "@/lib/score/derived";
import { monthLabel, formatCount } from "@/lib/format";
import { scoreColor } from "@/lib/score/colors";

const TREND_TONE: Record<Trend, "good" | "neutral" | "bad"> = { improving: "good", stable: "neutral", deteriorating: "bad" };

export default async function MovimientosPage() {
  const store = await getStore();
  const { idx, month } = await currentMonth(store.months);
  if (idx === 0) return <Empty>Elige un mes con anterior para ver movimientos.</Empty>;
  const rows = rowsAt(store, idx);
  const prev = new Map(rowsAt(store, idx - 1).map((r) => [r.id, r]));
  const withPrev = rows.filter((r) => r.d1 != null);
  const up = [...withPrev].sort((a, b) => (b.d1 as number) - (a.d1 as number)).slice(0, 10);
  const down = [...withPrev].sort((a, b) => (a.d1 as number) - (b.d1 as number)).slice(0, 10);
  const regime = rows.filter((r) => { const p = prev.get(r.id); return p && p.trend !== r.trend; });
  const toWorse = regime.filter((r) => r.trend === "deteriorating");
  const toBetter = regime.filter((r) => r.trend === "improving");
  const enter = rows.filter((r) => r.alert && prev.get(r.id) && !prev.get(r.id)!.alert);
  const exit = rows.filter((r) => !r.alert && prev.get(r.id)?.alert);
  const deltas = withPrev.map((r) => r.d1 as number);
  const sparkOf = (r: Row) => store.byId.get(r.id)!.scores.slice(Math.max(0, idx - 7), idx + 1);

  const Table = ({ items, tone }: { items: Row[]; tone: "good" | "bad" }) => (
    <div className="flex flex-col divide-y divide-line-soft">
      {items.map((r) => (
        <div key={r.id} className="grid grid-cols-[minmax(0,1fr)_96px_56px_60px_60px] items-center gap-3 py-2 text-[12.5px]">
          <div className="min-w-0">
            <CompanyLink id={r.id} name={r.name} />
            <div className="mt-0.5 text-[10.5px] text-ink-mute">{r.driver ? `${DIM_LABEL[r.driver.dim]} ${r.driver.value >= 0 ? "+" : "−"}${Math.abs(r.driver.value).toFixed(1)}` : ""}</div>
          </div>
          <Sparkline values={sparkOf(r)} width={96} height={26} color={scoreColor(r.score)} min={0} max={100} />
          <div className="num text-right text-ink">{r.score.toFixed(0)}</div>
          <div className="text-right"><Delta v={r.d1} /></div>
          <div className="text-right"><Delta v={r.d3} /></div>
        </div>
      ))}
      {items.length === 0 && <div className="py-3 text-[12px] text-ink-mute">Nada que enseñar.</div>}
    </div>
  );
  const Head = () => (
    <div className="grid grid-cols-[minmax(0,1fr)_96px_56px_60px_60px] gap-3 border-b border-line-soft pb-2 text-[12px] font-medium text-ink-mute">
      <span>Empresa · motivo</span><span>8 meses</span><span className="text-right">Score</span><span className="text-right">Δ 1m</span><span className="text-right">Δ 3m</span>
    </div>
  );

  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
        <Kpi icon="trend-up" label="Suben" value={formatCount(withPrev.filter((r) => (r.d1 as number) > 0.5).length)} tone="good" sub={`vs ${monthLabel(store.months[idx - 1])}`} />
        <Kpi icon="trend-down" label="Bajan" value={formatCount(withPrev.filter((r) => (r.d1 as number) < -0.5).length)} tone="bad" sub={`vs ${monthLabel(store.months[idx - 1])}`} />
        <Kpi icon="trend-down" label="Pasan a deterioro" value={formatCount(toWorse.length)} tone="bad" sub="cambio de régimen" />
        <Kpi icon="trend-up" label="Pasan a mejora" value={formatCount(toBetter.length)} tone="good" sub="cambio de régimen" />
        <Kpi icon="enter" label="Entran en el 20 % peor" value={formatCount(enter.length)} tone="warn" />
        <Kpi icon="exit" label="Salen del 20 % peor" value={formatCount(exit.length)} tone="good" />
      </div>
      <Card title={`Distribución del cambio mensual · ${monthLabel(month)}`} sub="Δ score de cada empresa respecto al mes anterior. Lo normal es ±3; las colas son lo que importa.">
        <ValueHistogram values={deltas} bins={40} height={130} color="#e5e5e5" fmt={(v) => `${v >= 0 ? "+" : ""}${v.toFixed(0)}`} lo={-25} hi={25} />
      </Card>
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <Card title="Más suben" sub="las 10 mayores subidas del mes"><Head /><Table items={up} tone="good" /></Card>
        <Card title="Más caen" sub="las 10 mayores caídas del mes"><Head /><Table items={down} tone="bad" /></Card>
      </div>
      <Card title={`Cambios de régimen · ${formatCount(regime.length)}`} sub="Régimen = media de los 3 últimos meses frente a los 3 anteriores (±3 pts) o tres meses seguidos en la misma dirección.">
        {regime.length === 0 ? <Empty>Sin cambios de régimen este mes.</Empty> : (
          <div className="grid grid-cols-1 gap-x-8 gap-y-1 md:grid-cols-2 xl:grid-cols-3">
            {regime.sort((a, b) => (a.trend === "deteriorating" ? -1 : 1) - (b.trend === "deteriorating" ? -1 : 1)).slice(0, 60).map((r) => {
              const p = prev.get(r.id)!;
              return (
                <div key={r.id} className="flex items-center justify-between gap-3 border-b border-line-soft py-2 text-[12.5px]">
                  <CompanyLink id={r.id} name={r.name} />
                  <span className="flex shrink-0 items-center gap-1.5">
                    <Pill tone={TREND_TONE[p.trend]}>{TREND_LABEL[p.trend]}</Pill><span className="text-ink-mute">→</span><Pill tone={TREND_TONE[r.trend]}>{TREND_LABEL[r.trend]}</Pill>
                    <span className="num ml-1 w-8 text-right text-ink">{r.score.toFixed(0)}</span>
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}
