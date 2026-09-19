import { getStore } from "@/lib/data/store";
import { currentMonth } from "@/lib/data/month";
import { pagos, type PagoReco } from "@/lib/products/tesoreria";
import { Card } from "@/components/ui/Card";
import { Kpi } from "@/components/ui/Kpi";
import { Pill } from "@/components/ui/Pill";
import { CompanyLink } from "@/components/ui/CompanyLink";
import { Donut } from "@/components/charts/Donut";
import { fmtMoney, formatCount, monthLabelLong } from "@/lib/format";

export default async function PagosPage() {
  const store = await getStore();
  const { idx, month } = await currentMonth(store.months);
  const all = store.companies.map((c) => pagos(store, c, idx)).filter((x): x is PagoReco => !!x);
  const by = (m: PagoReco["mode"]) => all.filter((p) => p.mode === m);
  const Table = ({ items }: { items: PagoReco[] }) => (
    <div className="divide-y divide-line-soft">
      {items.slice(0, 40).map((p) => (
        <div key={p.companyId} className="grid grid-cols-[minmax(0,1.3fr)_56px_70px_70px_100px_minmax(0,2fr)] items-center gap-3 py-2.5 text-[12.5px]">
          <CompanyLink id={p.companyId} name={p.name} />
          <span className="num text-right text-ink">{p.score.toFixed(0)}</span>
          <span className="num text-right text-ink-dim">{p.dpo == null ? "—" : `${Math.round(p.dpo)} d`}</span>
          <span className={`num text-right ${p.retraso != null && p.retraso > 0 ? "text-warn" : "text-ink-dim"}`}>{p.retraso == null ? "—" : `${Math.round(p.retraso)} d`}</span>
          <span className="num text-right text-ink-dim">{fmtMoney(p.cash)}</span>
          <span className="text-[12px] text-ink-dim">{p.reason}</span>
        </div>
      ))}
    </div>
  );
  const Head = () => <div className="grid grid-cols-[minmax(0,1.3fr)_56px_70px_70px_100px_minmax(0,2fr)] gap-3 border-b border-line-soft pb-2 text-[12px] font-medium text-ink-mute"><span>Empresa</span><span className="text-right">Score</span><span className="text-right">DPO</span><span className="text-right">Retraso</span><span className="text-right">Caja</span><span>Por qué</span></div>;
  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1fr_2fr]">
        <Card title="Recomendación de pagos" sub={monthLabelLong(month)}>
          <Donut parts={[{ label: "Adelantar y pedir descuento", value: by("adelantar").length, color: "#10b981" }, { label: "Al vencimiento", value: by("vencimiento").length, color: "#3b82f6" }, { label: "Último día, nunca después", value: by("ultimo_dia").length, color: "#f59e0b" }]} center={formatCount(all.length)} centerSub="empresas" />
        </Card>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <Kpi label="Adelantar" value={formatCount(by("adelantar").length)} tone="good" sub="score ≥ 70, runway ≥ 12 m, caja > 200 k€" />
          <Kpi label="Al vencimiento" value={formatCount(by("vencimiento").length)} sub="ni holgura ni tensión" />
          <Kpi label="Último día" value={formatCount(by("ultimo_dia").length)} tone="warn" sub="score < 55, cayendo o runway < 6 m" />
          <div className="card px-5 py-4 md:col-span-3 text-[12.5px] text-ink-dim">En el dataset del reto, 2.300 M€ al año se pagan 21 días antes de vencimiento sin pedir nada a cambio, y 115 empresas han empezado a estirar sus pagos en los últimos seis meses. Estirar el pago a proveedores es la primera señal de deterioro que ve un banco, y el propio score la penaliza (A1, A2, S6).</div>
        </div>
      </div>
      <Card title="Adelantar y pedir descuento por pronto pago" sub="sobra caja y la tendencia es buena"><Head /><Table items={by("adelantar").sort((a, b) => (b.cash ?? 0) - (a.cash ?? 0))} /></Card>
      <Card title="Pagar el último día de plazo, nunca después" sub="falta caja o el score cae"><Head /><Table items={by("ultimo_dia").sort((a, b) => a.score - b.score)} /></Card>
    </div>
  );
}
