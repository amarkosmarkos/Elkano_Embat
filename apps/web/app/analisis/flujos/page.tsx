import { getStore } from "@/lib/data/store";
import { eda } from "@/lib/data/eda";
import { Card } from "@/components/ui/Card";
import { Kpi } from "@/components/ui/Kpi";
import { LineChart } from "@/components/charts/LineChart";
import { BarChart, BarList } from "@/components/charts/BarChart";
import { fmtMoney, formatCount, fmtPct } from "@/lib/format";

const DOW = ["lun", "mar", "mié", "jue", "vie", "sáb", "dom"];

export default async function FlujosPage() {
  const store = await getStore();
  const e = eda(store.eda);
  const m = e.transactions.monthly.filter((x) => x.k < "2026-09");
  const months = m.map((x) => x.k);
  const cat = e.transactions.category.filter((c) => c.k !== "-").sort((a, b) => b.vol - a.vol).slice(0, 14);
  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4 xl:grid-cols-6">
        <Kpi label="Movimientos" value={formatCount(e.meta.rows.transactions)} sub="2,56 M en 24 meses" />
        <Kpi label="Sin categoría" value={fmtPct(e.transactions.category.find((c) => c.k === "-")!.n / e.meta.rows.transactions)} tone="warn" sub="category = «-»" />
        <Kpi label="Importes redondos" value={fmtPct(e.transactions.round_amounts)} sub="múltiplos de 100" />
        <Kpi label="Con tipo de cambio" value={fmtPct(e.transactions.fx_share)} sub="≠ moneda de la empresa" />
        <Kpi label="Contraparte informada" value={fmtPct(e.transactions.cp_coverage.either)} sub={`id ${Math.round(e.transactions.cp_coverage.id * 100)} % · texto ${Math.round(e.transactions.cp_coverage.desc * 100)} %`} />
        <Kpi label="Descripciones distintas" value={formatCount(e.transactions.desc_distinct)} sub="70 % con placeholders" />
      </div>
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        <Card title="Entradas y salidas, mes a mes" sub="volumen agregado de la red · sin outliers ≥ 100 M">
          <LineChart months={months} series={[{ id: "in", label: "Entradas", color: "#10b981", values: m.map((x) => x.inflow), area: true }, { id: "out", label: "Salidas", color: "#ef4444", values: m.map((x) => x.outflow) }]} yMin={0} fmt={(v) => fmtMoney(v)} />
        </Card>
        <Card title="Neto mensual y empresas activas" sub="entradas − salidas · nº de empresas con movimientos">
          <BarChart categories={months.map((x) => x.slice(2).replace("-", "/"))} labelEvery={3} series={[{ id: "net", label: "Neto", color: "#3b82f6", values: m.map((x) => x.net) }]} fmt={(v) => fmtMoney(v)} yMin={Math.min(0, ...m.map((x) => x.net))} height={200} />
          <div className="num mt-1 text-[11px] text-ink-mute">empresas activas: {m[0].companies} → {m[m.length - 1].companies}</div>
        </Card>
      </div>
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1.4fr_1fr_1fr]">
        <Card title="Categorías por volumen" sub="las 14 mayores (sin «-») · barra = volumen · texto = % que son entradas">
          <BarList items={cat.map((c) => ({ label: c.k, value: c.vol, sub: `${Math.round(c.in_share * 100)} % entradas · mediana ${fmtMoney(c.med)}`, color: c.in_share > 0.5 ? "#10b981" : "#ef4444" }))} fmt={(v) => fmtMoney(v)} />
        </Card>
        <Card title="Día de la semana" sub="nº de movimientos">
          <BarChart categories={DOW} series={[{ id: "n", label: "n", color: "#e5e5e5", values: e.transactions.weekday.map((w) => w.n) }]} height={200} fmt={(v) => formatCount(v)} />
        </Card>
        <Card title="Día del mes" sub="salidas por día: nóminas, impuestos y cuotas dibujan los picos">
          <BarChart categories={e.transactions.dom.map((d) => String(d.k))} labelEvery={5} series={[{ id: "out", label: "salidas", color: "#ef4444", values: e.transactions.dom.map((d) => d.outflow) }]} height={200} fmt={(v) => fmtMoney(v)} />
        </Card>
      </div>
      <Card title="Movimientos sin categoría, mes a mes" sub="el 25 % sin categoría condiciona D2, D4 y varias métricas (A3, C1, C4, D3)">
        <LineChart months={e.transactions.uncategorized_monthly.filter((x) => x.k < "2026-09").map((x) => x.k)} series={[{ id: "u", label: "% sin categoría", color: "#f59e0b", values: e.transactions.uncategorized_monthly.filter((x) => x.k < "2026-09").map((x) => x.share * 100), area: true }]} yMin={0} fmt={(v) => `${v} %`} height={160} legend={false} />
      </Card>
    </div>
  );
}
