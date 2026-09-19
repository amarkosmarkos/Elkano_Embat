import { getStore } from "@/lib/data/store";
import { eda } from "@/lib/data/eda";
import { Card } from "@/components/ui/Card";
import { Kpi } from "@/components/ui/Kpi";
import { BarChart, BarList } from "@/components/charts/BarChart";
import { Donut } from "@/components/charts/Donut";
import { LineChart } from "@/components/charts/LineChart";
import { formatCount } from "@/lib/format";

export default async function UniversoPage() {
  const store = await getStore();
  const e = eda(store.eda);
  const r = e.meta.rows;
  const hist = e.companies.group_size_hist;
  const onb = e.companies.onboarding_cum;
  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4 xl:grid-cols-8">
        {[["Grupos", r.groups], ["Empresas", r.companies], ["Productos bancarios", r.banking_products], ["Productos de deuda", r.debt_products], ["Cuadros de amortización", r.debt_schedule_config], ["Saldos", r.balances], ["Movimientos", r.transactions], ["Facturas", r.invoices]].map(([l, v]) => <Kpi key={l as string} label={l as string} value={formatCount(v as number)} />)}
      </div>
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
        <Card title="Cobertura de datos" sub="qué fuentes tiene conectadas cada empresa">
          <Donut parts={e.companies.coverage_combo.map((c, i) => ({ label: String(c.k), value: c.n, color: ["#e5e5e5", "#3b82f6", "#10b981", "#a1a1a1"][i % 4] }))} center={formatCount(r.companies)} centerSub="empresas" />
          <p className="mt-3 text-[11.5px] text-ink-mute">Solo transacciones ⇒ sin métricas de facturas (DSO, cobros vencidos, concentración). Se ve en la cobertura de cada métrica en el árbol del score.</p>
        </Card>
        <Card title="Tamaño de los grupos" sub="nº de empresas por grupo">
          <BarChart categories={hist.map((h) => String(h.n))} series={[{ id: "g", label: "grupos", color: "#3b82f6", values: hist.map((h) => h.groups) }]} height={200} />
        </Card>
        <Card title="Alta de empresas" sub="acumulado por mes de onboarding en Embat">
          <LineChart months={onb.map((o) => o.k)} series={[{ id: "cum", label: "empresas", color: "#e5e5e5", values: onb.map((o) => o.cum), area: true }]} height={200} legend={false} />
        </Card>
      </div>
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
        <Card title="Divisa de la empresa" sub={`${e.companies.multicurrency_groups} grupos con más de una divisa`}><BarList items={e.companies.currency.slice(0, 10).map((c) => ({ label: String(c.k), value: c.n }))} /></Card>
        <Card title="ERP" sub="vocabulario unificado empresa/grupo"><BarList items={e.companies.erp.slice(0, 10).map((c) => ({ label: String(c.k), value: c.n }))} color="#10b981" /></Card>
        <Card title="País" sub="solo 230 de 1.286 lo traen; el resto se sitúa por divisa"><BarList items={e.companies.country_norm.slice(0, 10).map((c) => ({ label: String(c.k), value: c.n }))} color="#a855f7" /></Card>
      </div>
    </div>
  );
}
