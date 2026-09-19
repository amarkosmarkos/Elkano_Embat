import Link from "next/link";
import { getAllDetails, getStore } from "@/lib/data/store";
import { currentMonth } from "@/lib/data/month";
import { Card } from "@/components/ui/Card";
import { Kpi } from "@/components/ui/Kpi";
import { CompanyLink } from "@/components/ui/CompanyLink";
import { ValueHistogram } from "@/components/charts/Histogram";
import { LineChart } from "@/components/charts/LineChart";
import { DIMENSIONS, type MetricId } from "@/lib/score/types";
import { DIM_LABEL, METRICS, METRICS_BY_DIM } from "@/lib/score/meta";
import { DIM_COLOR } from "@/lib/score/colors";
import { fmtMetric, monthLabelLong } from "@/lib/format";

export default async function SenalPage({ searchParams }: { searchParams: Promise<{ m?: string }> }) {
  const { m } = await searchParams;
  const store = await getStore();
  const { month } = await currentMonth(store.months);
  const id: MetricId = m && m in METRICS ? (m as MetricId) : "colchon";
  const meta = METRICS[id];
  const g = store.reports.v3.univariate_metrics.gini[id];
  const details = await getAllDetails();
  const rows: { id: string; name: string; v: number }[] = [];
  const medians: (number | null)[] = [];
  const metricMonths = [...details.values()][0]?.metricMonths ?? [];
  const perMonth: number[][] = metricMonths.map(() => []);
  for (const [cid, d] of details) {
    const mi = d.metricMonths.indexOf(month);
    const v = mi >= 0 ? d.metrics[id][mi] : null;
    if (v != null) rows.push({ id: cid, name: store.byId.get(cid)?.name ?? cid, v });
    d.metrics[id].forEach((x, i) => { if (x != null && perMonth[i]) perMonth[i].push(x); });
  }
  for (const arr of perMonth) { if (arr.length < 10) { medians.push(null); continue; } const s = [...arr].sort((a, b) => a - b); medians.push(s[Math.floor(s.length / 2)]); }
  const values = rows.map((r) => r.v);
  const sorted = [...rows].sort((a, b) => (meta.higherIsBetter ? a.v - b.v : b.v - a.v));
  const worst = sorted.slice(0, 8), best = sorted.slice(-8).reverse();
  const med = values.length ? [...values].sort((a, b) => a - b)[Math.floor(values.length / 2)] : null;
  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap gap-1.5">
        {DIMENSIONS.map((dim) => METRICS_BY_DIM[dim].map((mid) => (
          <Link key={mid} href={`/analisis/senal?m=${mid}`} className={`rounded-lg border px-2.5 py-1 text-[11.5px] transition-colors ${mid === id ? "border-transparent text-panel" : "border-line-soft text-ink-dim hover:text-ink"}`} style={mid === id ? { background: DIM_COLOR[dim] } : undefined}>
            <span className="num mr-1 opacity-70">{METRICS[mid].code}</span>{METRICS[mid].short}
          </Link>
        )))}
      </div>
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1.5fr_1fr]">
        <Card title={<span><span className="num text-accent">{meta.code}</span> · {meta.label} · {DIM_LABEL[meta.dim]}</span>} sub={meta.desc}>
          <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-4">
            <Kpi label="Empresas con dato" value={rows.length} sub={monthLabelLong(month)} />
            <Kpi label="Mediana de la red" value={fmtMetric(id, med)} />
            <Kpi label="Gini h6" value={g ? Math.abs(g.gini).toFixed(2) : "—"} tone="accent" sub={g ? (g.gini > 0 ? "menor valor ⇒ evento" : "mayor valor ⇒ evento") : ""} />
            <Kpi label="Cobertura" value={g ? `${Math.round(g.coverage * 100)} %` : "—"} sub="de los pares empresa-mes" />
          </div>
          <div className="eyebrow mb-2">Distribución en la red este mes</div>
          <ValueHistogram values={values} fmt={(v) => fmtMetric(id, v)} color={DIM_COLOR[meta.dim]} marker={med} />
          <div className="mt-4 rounded-xl bg-ground p-3"><div className="eyebrow mb-1">Fórmula</div><code className="num block whitespace-pre-wrap text-[11.5px] leading-relaxed text-accent">{meta.formula}</code><div className="mt-1.5 text-[11px] text-ink-mute">Necesita: {meta.needs} · {meta.higherIsBetter ? "más = mejor" : "menos = mejor"}</div></div>
        </Card>
        <div className="flex flex-col gap-5">
          <Card title="Mediana de la red, mes a mes" sub="cómo se mueve la señal en el conjunto">
            <LineChart months={metricMonths} series={[{ id: "med", label: "mediana", color: DIM_COLOR[meta.dim], values: medians, area: true }]} height={170} legend={false} fmt={(v) => fmtMetric(id, v)} marker={metricMonths.indexOf(month)} />
          </Card>
          <div className="grid grid-cols-2 gap-5">
            <Card title="Peores 8"><div className="divide-y divide-line-soft">{worst.map((r) => <div key={r.id} className="flex items-center justify-between gap-2 py-1.5 text-[12px]"><CompanyLink id={r.id} name={r.name} /><span className="num shrink-0 text-bad">{fmtMetric(id, r.v)}</span></div>)}</div></Card>
            <Card title="Mejores 8"><div className="divide-y divide-line-soft">{best.map((r) => <div key={r.id} className="flex items-center justify-between gap-2 py-1.5 text-[12px]"><CompanyLink id={r.id} name={r.name} /><span className="num shrink-0 text-good">{fmtMetric(id, r.v)}</span></div>)}</div></Card>
          </div>
        </div>
      </div>
    </div>
  );
}
