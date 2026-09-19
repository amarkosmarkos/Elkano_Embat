import { notFound } from "next/navigation";
import { getStore } from "@/lib/data/store";
import { currentMonth } from "@/lib/data/month";
import { getBundle } from "@/lib/data/company";
import { Card } from "@/components/ui/Card";
import { Kpi } from "@/components/ui/Kpi";
import { LineChart } from "@/components/charts/LineChart";
import { BarChart } from "@/components/charts/BarChart";
import { METRICS } from "@/lib/score/meta";
import { fmtMetric, fmtMoney, monthLabel, monthLabelLong } from "@/lib/format";

/** Caja: saldo real reconstruido (cash_position.csv) + las métricas de liquidez, plazos y deuda del parquet. Nada inventado. */
export default async function CajaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const store = await getStore();
  const { idx, month } = await currentMonth(store.months);
  const b = await getBundle(id, idx);
  if (!b) notFound();
  const { d, mi } = b;
  const cashMonths = store.cashMonths;
  const cash = cashMonths.map((m) => store.cash.get(`${id}|${m}`) ?? null);
  const cashNow = store.cash.get(`${id}|${month}`) ?? null;
  const cashPrev = idx > 0 ? store.cash.get(`${id}|${store.months[idx - 1]}`) ?? null : null;
  const delta = cash.map((v, i) => (v != null && i > 0 && cash[i - 1] != null ? v - (cash[i - 1] as number) : null));
  const m = (k: keyof typeof METRICS) => (mi >= 0 ? d.metrics[k][mi] : null);
  const series = (k: keyof typeof METRICS) => d.metrics[k];
  const cur = b.c.currency ?? "EUR";
  const floor12 = cash.slice(Math.max(0, cashMonths.indexOf(month) - 11), cashMonths.indexOf(month) + 1).filter((v): v is number => v != null);
  return (
    <div className="flex flex-col gap-5">
      <p className="text-[14px] text-ink-mute">Saldo de cuentas corrientes a fin de mes reconstruido hacia atrás desde <span className="num">balances.csv</span> y <span className="num">transactions.csv</span> (mismo método que el pipeline), y las métricas de liquidez, plazos y deuda del vector de 105. Todo trazable a los CSV del reto.</p>
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
        <Kpi label="Caja a fin de mes" value={fmtMoney(cashNow, cur)} tone={(cashNow ?? 0) < 0 ? "bad" : "neutral"} sub={monthLabelLong(month)} delta={cashNow != null && cashPrev != null ? (cashNow - cashPrev) / 1000 : null} />
        <Kpi label="Suelo de 12 meses" value={floor12.length ? fmtMoney(Math.min(...floor12), cur) : "—"} sub={`mínimo de ${floor12.length} meses`} />
        <Kpi label="Colchón" value={fmtMetric("colchon", m("colchon"))} tone={(m("colchon") ?? 1) < 0.5 ? "warn" : "neutral"} sub="saldo mínimo / salidas" />
        <Kpi label="Runway" value={fmtMetric("runway", m("runway"))} tone={(m("runway") ?? 24) < 6 ? "warn" : "neutral"} sub="meses al ritmo actual" />
        <Kpi label="Días en negativo" value={fmtMetric("dias_negativo", m("dias_negativo"))} tone={(m("dias_negativo") ?? 0) > 0 ? "bad" : "good"} />
        <Kpi label="DSO · retraso pago" value={`${fmtMetric("dso", m("dso"))} · ${fmtMetric("retraso_pago", m("retraso_pago"))}`} sub="cobro · pago a proveedores" />
      </div>
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        <Card title="Posición de caja" sub={`saldo real a fin de mes · ${cur}`}>
          <LineChart months={cashMonths} series={[{ id: "cash", label: "Caja", color: "#e5e5e5", values: cash, area: true }]} marker={cashMonths.indexOf(month)} fmt={(v) => fmtMoney(v, cur)} legend={false} refLines={[{ v: 0, color: "rgba(239,68,68,0.6)" }]} />
        </Card>
        <Card title="Variación mensual de caja" sub="fin de mes menos fin del mes anterior">
          <BarChart categories={cashMonths.map(monthLabel)} labelEvery={3} series={[{ id: "d", label: "Δ caja", color: "#3b82f6", values: delta }]} fmt={(v) => fmtMoney(v, cur)} yMin={Math.min(0, ...delta.filter((v): v is number => v != null))} />
        </Card>
        <Card title="Colchón y runway" sub="B1 saldo mínimo / salidas · B2 meses de vida (tope 24)">
          <LineChart months={d.metricMonths} series={[{ id: "colchon", label: "Colchón (×)", color: "#3b82f6", values: series("colchon") }, { id: "runway", label: "Runway (m)", color: "#10b981", values: series("runway") }]} marker={mi} yMin={0} />
        </Card>
        <Card title="Plazos de cobro y pago" sub="A4 DSO · A1 retraso a proveedores (días)">
          <LineChart months={d.metricMonths} series={[{ id: "dso", label: "DSO", color: "#ef4444", values: series("dso") }, { id: "ret", label: "Retraso pago", color: "#f59e0b", values: series("retraso_pago") }]} marker={mi} fmt={(v) => `${v} d`} />
        </Card>
        <Card title="Deuda" sub="D1 % dispuesto de líneas · D3 coste financiero sobre salidas">
          <LineChart months={d.metricMonths} series={[{ id: "disp", label: "% dispuesto", color: "#f87171", values: series("pct_dispuesto").map((v) => (v == null ? null : v * 100)) }, { id: "coste", label: "Coste financ. (%)", color: "#a855f7", values: series("coste_financiero").map((v) => (v == null ? null : v * 100)) }]} marker={mi} yMin={0} fmt={(v) => `${v} %`} />
        </Card>
        <Card title="Caja neta operativa" sub="C1 entradas − salidas sin financiación, normalizado por salidas medias">
          <BarChart categories={d.metricMonths.map(monthLabel)} labelEvery={3} series={[{ id: "neto", label: "Neto", color: "#10b981", values: series("neto_operativo") }]} fmt={(v) => v.toFixed(2)} yMin={Math.min(0, ...series("neto_operativo").filter((v): v is number => v != null))} />
        </Card>
      </div>
    </div>
  );
}
