import { getStore } from "@/lib/data/store";
import { eda } from "@/lib/data/eda";
import { Card } from "@/components/ui/Card";
import { Kpi } from "@/components/ui/Kpi";
import { LineChart } from "@/components/charts/LineChart";
import { BarChart, BarList } from "@/components/charts/BarChart";
import { fmtMoney, formatCount, fmtPct } from "@/lib/format";

export default async function FacturasPage() {
  const store = await getStore();
  const e = eda(store.eda);
  const m = e.invoices.monthly.filter((x) => x.k < "2026-09");
  const om = e.invoices.overdue_monthly.filter((x) => x.k < "2026-09");
  const paid = e.invoices.status.find((s) => s.k === "paid");
  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4 xl:grid-cols-6">
        <Kpi label="Facturas" value={formatCount(e.meta.rows.invoices)} sub="785 empresas con ERP" />
        <Kpi label="Pagadas" value={fmtPct((paid?.n ?? 0) / e.meta.rows.invoices)} sub="status = paid a fecha de extracción" />
        <Kpi label="Pagadas a tiempo" value={fmtPct(e.invoices.on_time_share)} tone="accent" sub="payment_date ≤ due_date" />
        <Kpi label="Pendiente vencido" value={fmtMoney(e.invoices.overdue_aging.filter((a) => a.k !== "no vencida aún").reduce((s, a) => s + a.pending, 0))} tone="bad" sub="a 2026-09-01" />
        <Kpi label="Cruce factura ↔ movimiento" value={fmtPct(e.cross.match_sign)} sub="confirma el signo (+ cobrar, − pagar)" />
        <Kpi label="Outliers" value={e.invoices.outliers_n} tone="warn" sub="|importe| ≥ 100 M excluidos" />
      </div>
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        <Card title="Emitido por mes" sub="por cobrar (+) frente a por pagar (−), en valor absoluto">
          <LineChart months={m.map((x) => x.k)} series={[{ id: "ar", label: "Por cobrar", color: "#10b981", values: m.map((x) => x.receivable), area: true }, { id: "ap", label: "Por pagar", color: "#ef4444", values: m.map((x) => x.payable) }]} yMin={0} fmt={(v) => fmtMoney(v)} />
        </Card>
        <Card title="% vencido y % pagado, mes a mes" sub="de las facturas emitidas cada mes">
          <LineChart months={om.map((x) => x.k)} series={[{ id: "ov", label: "% vencido", color: "#f59e0b", values: om.map((x) => x.overdue_share * 100) }, { id: "pd", label: "% pagado", color: "#3b82f6", values: om.map((x) => x.paid_share * 100) }]} yMin={0} yMax={100} fmt={(v) => `${v} %`} />
        </Card>
      </div>
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
        <Card title="Plazo de pago pactado" sub="due_date − issuance_date">
          <BarChart categories={e.invoices.terms.map((t) => String(t.k).replace(/ \(.*\)/, ""))} series={[{ id: "n", label: "n", color: "#3b82f6", values: e.invoices.terms.map((t) => t.n) }]} height={200} fmt={(v) => formatCount(v)} />
        </Card>
        <Card title="Retraso real de pago" sub="payment_date − due_date · negativo = antes de vencer">
          <BarChart categories={e.invoices.late_payment.map((t) => String(t.k).replace(/ \(.*\)/, ""))} series={[{ id: "n", label: "n", color: "#f59e0b", values: e.invoices.late_payment.map((t) => t.n) }]} height={200} fmt={(v) => formatCount(v)} />
        </Card>
        <Card title="Antigüedad del pendiente" sub="importe pendiente por tramo de vencimiento">
          <BarList items={e.invoices.overdue_aging.map((a) => ({ label: a.k, value: a.pending, color: a.k === "no vencida aún" ? "#10b981" : "#ef4444" }))} fmt={(v) => fmtMoney(v)} />
        </Card>
      </div>
    </div>
  );
}
