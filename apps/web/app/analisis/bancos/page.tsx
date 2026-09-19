import { getStore } from "@/lib/data/store";
import { eda } from "@/lib/data/eda";
import { Card } from "@/components/ui/Card";
import { Kpi } from "@/components/ui/Kpi";
import { BarChart, BarList } from "@/components/charts/BarChart";
import { fmtMoney, formatCount, fmtPct } from "@/lib/format";

export default async function BancosPage() {
  const store = await getStore();
  const e = eda(store.eda);
  const bt = e.balances.by_type.filter((b) => b.family === "banking").sort((a, b) => b.total - a.total);
  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4 xl:grid-cols-5">
        <Kpi label="Productos bancarios" value={formatCount(e.meta.rows.banking_products)} sub={`${e.products.banking_bank_distinct} bancos distintos`} />
        <Kpi label="Saldo en cuenta corriente" value={fmtMoney(bt.find((b) => b.k === "checking")?.total ?? 0)} tone="accent" sub="al corte, checking" />
        <Kpi label="Concentración del saldo" value={fmtPct(e.balances.concentration[0])} sub="top 10 % de empresas" />
        <Kpi label="Cuentas en negativo" value={fmtPct(bt.find((b) => b.k === "checking")?.neg_share ?? 0)} tone="warn" sub="checking con saldo < 0" />
        <Kpi label="Comisiones (pitch)" value="283 M€" sub="diferencias ×7 entre bancos por el mismo servicio" />
      </div>
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
        <Card title="Bancos por nº de productos" sub="los 12 mayores">
          <BarList items={e.products.banking_bank_top.slice(0, 12).map((b) => ({ label: String(b.k), value: b.n }))} color="#e5e5e5" />
        </Card>
        <Card title="Tipos de producto bancario">
          <BarList items={e.products.banking_type.map((b) => ({ label: String(b.k), value: b.n }))} color="#3b82f6" />
        </Card>
        <Card title="Saldo por tipo de producto" sub="total, mediana y % en negativo">
          <div className="divide-y divide-line-soft">{bt.map((b) => <div key={b.k} className="grid grid-cols-[minmax(0,1fr)_50px_90px_80px_60px] items-center gap-2 py-2 text-[12px]"><span className="text-ink">{b.k}</span><span className="num text-right text-ink-mute">{b.n}</span><span className="num text-right text-ink">{fmtMoney(b.total)}</span><span className="num text-right text-ink-dim">{fmtMoney(b.med)}</span><span className={`num text-right ${b.neg_share > 0.05 ? "text-bad" : "text-ink-mute"}`}>{Math.round(b.neg_share * 100)} %</span></div>)}</div>
        </Card>
      </div>
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        <Card title="Distribución de saldos" sub="por producto, al corte · sin |saldo| ≥ 1.000 M">
          <BarChart categories={e.balances.hist.map((h) => String(h.k))} series={[{ id: "n", label: "productos", color: "#3b82f6", values: e.balances.hist.map((h) => h.n) }]} height={200} />
        </Card>
        <Card title="Saldo por divisa" sub="total en la divisa del producto">
          <BarList items={e.balances.currency_share.slice(0, 8).map((c) => ({ label: c.k, value: c.total, sub: `${c.n} productos` }))} fmt={(v) => fmtMoney(v)} color="#10b981" />
        </Card>
      </div>
    </div>
  );
}
