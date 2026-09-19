import { getStore } from "@/lib/data/store";
import { currentMonth } from "@/lib/data/month";
import { rowsAt } from "@/lib/data/portfolio";
import { Card } from "@/components/ui/Card";
import { LineChart } from "@/components/charts/LineChart";
import { BarList } from "@/components/charts/BarChart";
import { Donut } from "@/components/charts/Donut";
import { DIMENSIONS, type Dimension } from "@/lib/score/types";
import { DIM_LABEL, DIM_WEIGHT_V1 } from "@/lib/score/meta";
import { DIM_COLOR } from "@/lib/score/colors";
import { monthLabelLong } from "@/lib/format";

export default async function DimensionesPage() {
  const store = await getStore();
  const { idx, month } = await currentMonth(store.months);
  const rows = rowsAt(store, idx);
  const mean = (dim: Dimension) => store.months.map((_, i) => { const v = store.companies.map((c) => c.components[dim][i]).filter((x): x is number => x != null); return v.length ? v.reduce((s, x) => s + x, 0) / v.length : null; });
  const vals = (dim: Dimension) => rows.map((r) => r.components[dim]);
  const corr = (a: (number | null)[], b: (number | null)[]) => {
    const xs: number[] = [], ys: number[] = [];
    a.forEach((x, i) => { const y = b[i]; if (x != null && y != null) { xs.push(x); ys.push(y); } });
    if (xs.length < 10) return null;
    const mx = xs.reduce((s, v) => s + v, 0) / xs.length, my = ys.reduce((s, v) => s + v, 0) / ys.length;
    let sxy = 0, sxx = 0, syy = 0;
    xs.forEach((x, i) => { sxy += (x - mx) * (ys[i] - my); sxx += (x - mx) ** 2; syy += (ys[i] - my) ** 2; });
    return sxy / Math.sqrt(sxx * syy || 1);
  };
  const cv = Object.fromEntries(DIMENSIONS.map((d) => [d, vals(d)])) as Record<Dimension, (number | null)[]>;
  const driverCount = DIMENSIONS.map((d) => ({ label: DIM_LABEL[d], value: rows.filter((r) => r.driver?.dim === d).length, color: DIM_COLOR[d] }));
  const uni = store.reports.v3.univariate;
  return (
    <div className="flex flex-col gap-5">
      <Card title="Contribución media de cada dimensión, mes a mes" sub="puntos que suma o resta cada dimensión, en media de la red. Cero = neutra.">
        <LineChart months={store.months} series={DIMENSIONS.map((d) => ({ id: d, label: DIM_LABEL[d], color: DIM_COLOR[d], values: mean(d) }))} marker={idx} refLines={[{ v: 0, color: "rgba(255,255,255,0.35)" }]} fmt={(v) => `${v > 0 ? "+" : ""}${v}`} height={260} />
      </Card>
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
        <Card title="Qué dimensión manda" sub={`la mayor contribución en valor absoluto · ${monthLabelLong(month)}`}>
          <Donut parts={driverCount} center={rows.length} centerSub="empresas" />
        </Card>
        <Card title="Gini univariante por dimensión" sub="cuánto predice cada contribución sola (h6). Liquidez y pago mandan; concentración apenas aporta.">
          <BarList items={DIMENSIONS.map((d) => ({ label: DIM_LABEL[d], value: uni[`c_${d}`] ?? 0, color: DIM_COLOR[d], sub: `peso v1 ${Math.round(DIM_WEIGHT_V1[d] * 100)} %` }))} fmt={(v) => v.toFixed(3)} max={0.25} />
        </Card>
        <Card title="Correlación entre dimensiones" sub="sobre las contribuciones de este mes. Cerca de 0 = miden cosas distintas.">
          <div className="grid gap-1" style={{ gridTemplateColumns: `90px repeat(${DIMENSIONS.length}, 1fr)` }}>
            <div />
            {DIMENSIONS.map((d) => <div key={d} className="truncate text-center text-[10px] text-ink-mute">{DIM_LABEL[d].slice(0, 5)}</div>)}
            {DIMENSIONS.map((a) => (
              <>
                <div key={`${a}-l`} className="truncate text-[11px] text-ink-dim">{DIM_LABEL[a]}</div>
                {DIMENSIONS.map((b) => { const c = a === b ? 1 : corr(cv[a], cv[b]); const t = c == null ? 0 : c; return <div key={`${a}-${b}`} className="num flex h-9 items-center justify-center rounded-md text-[10.5px]" style={{ background: t >= 0 ? `rgba(16,185,129,${0.08 + Math.abs(t) * 0.7})` : `rgba(239,68,68,${0.08 + Math.abs(t) * 0.7})`, color: "#fafafa" }}>{c == null ? "—" : c.toFixed(2)}</div>; })}
              </>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
