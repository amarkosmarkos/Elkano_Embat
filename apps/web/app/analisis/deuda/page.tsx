import { getStore } from "@/lib/data/store";
import { eda } from "@/lib/data/eda";
import { Card } from "@/components/ui/Card";
import { Kpi } from "@/components/ui/Kpi";
import { BarChart, BarList } from "@/components/charts/BarChart";
import { Donut } from "@/components/charts/Donut";
import { fmtMoney, formatCount } from "@/lib/format";

export default async function DeudaPage() {
  const store = await getStore();
  const e = eda(store.eda);
  const dt = e.products.debt_type.sort((a, b) => b.outstanding - a.outstanding);
  const granted = dt.reduce((s, d) => s + d.granted, 0), out = dt.reduce((s, d) => s + d.outstanding, 0);
  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4 xl:grid-cols-6">
        <Kpi label="Productos de deuda" value={formatCount(e.meta.rows.debt_products)} sub="378 empresas" />
        <Kpi label="Concedido" value={fmtMoney(granted)} />
        <Kpi label="Dispuesto" value={fmtMoney(out)} tone="accent" sub={`${Math.round((100 * out) / granted)} % del concedido`} />
        <Kpi label="Cuadros de amortización" value={e.meta.rows.debt_schedule_config} tone="warn" sub="solo 87 productos: D2 casi no se puede medir" />
        <Kpi label="Cuotas ya pasadas" value={e.debt_schedule.next_payment_past} sub="next_payment_date anterior al corte" />
        <Kpi label="Cuentas de liquidación huérfanas" value={e.debt_schedule.settlement_orphan} />
      </div>
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1.4fr_1fr_1fr]">
        <Card title="Por tipo de producto" sub="dispuesto, concedido y nº de empresas">
          <div className="grid grid-cols-[minmax(0,1fr)_60px_90px_110px_110px] gap-3 border-b border-line-soft pb-2 text-[12px] font-medium text-ink-mute"><span>Tipo</span><span className="text-right">n</span><span className="text-right">Empresas</span><span className="text-right">Concedido</span><span className="text-right">Dispuesto</span></div>
          <div className="divide-y divide-line-soft">{dt.map((d) => <div key={d.k} className="grid grid-cols-[minmax(0,1fr)_60px_90px_110px_110px] items-center gap-3 py-2 text-[12.5px]"><span className="text-ink">{d.k}</span><span className="num text-right text-ink-dim">{d.n}</span><span className="num text-right text-ink-dim">{d.companies}</span><span className="num text-right text-ink-dim">{fmtMoney(d.granted)}</span><span className="num text-right text-ink">{fmtMoney(d.outstanding)}</span></div>)}</div>
        </Card>
        <Card title="Utilización de líneas" sub="outstanding / granted por producto">
          <BarChart categories={e.products.debt_util_hist.map((h) => String(h.k))} series={[{ id: "n", label: "productos", color: "#f87171", values: e.products.debt_util_hist.map((h) => h.n) }]} height={200} />
        </Card>
        <Card title="Bancos con más deuda dispuesta">
          <BarList items={e.products.debt_bank_top.slice(0, 8).map((b) => ({ label: b.k, value: b.outstanding, sub: `${b.n} productos` }))} fmt={(v) => fmtMoney(v)} color="#f87171" />
        </Card>
      </div>
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
        <Card title="Tipo de interés (cuadros)" sub="87 cuadros · fijo vs variable">
          <Donut parts={e.debt_schedule.interest_type.map((t, i) => ({ label: String(t.k), value: t.n, color: ["#e5e5e5", "#3b82f6"][i] }))} center={87} centerSub="cuadros" />
        </Card>
        <Card title="Frecuencia de cuota">
          <BarList items={e.debt_schedule.frequency.map((f) => ({ label: String(f.k), value: f.n }))} />
        </Card>
        <Card title="Próximas cuotas por mes" sub="next_payment_date · los picos son donde saltan las alertas de cuotas">
          <BarChart categories={e.debt_schedule.next_payment.map((n) => String(n.k).slice(2))} labelEvery={4} series={[{ id: "n", label: "cuotas", color: "#f59e0b", values: e.debt_schedule.next_payment.map((n) => n.n) }]} height={180} />
        </Card>
      </div>
    </div>
  );
}
