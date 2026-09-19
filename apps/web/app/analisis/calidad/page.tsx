import { getStore } from "@/lib/data/store";
import { eda } from "@/lib/data/eda";
import { Card } from "@/components/ui/Card";
import { BarList } from "@/components/charts/BarChart";
import { companyName, formatCount, fmtMoney } from "@/lib/format";

const LABELS: Record<string, { l: string; fix: string; bad?: boolean }> = {
  tx_category_dash: { l: "Movimientos sin categoría", fix: "→ uncategorized; el 25 % condiciona D2/D4", bad: true },
  tx_exact_dups: { l: "Duplicados exactos", fix: "70 % con placeholders: se marcan, no se borran" },
  tx_before_product_created: { l: "Movimientos antes de crear el producto", fix: "fecha de alta ≠ primer movimiento importado" },
  tx_status_null: { l: "Movimientos sin status", fix: "→ booked + flag" },
  tx_desc_tests: { l: "Descripción «Test/Prueba»", fix: "inválidos en gold", bad: true },
  tx_orphan_product: { l: "Producto desconocido", fix: "fila conservada, product_family NULL" },
  tx_zero_amount: { l: "Importe cero", fix: "inválidos" },
  inv_cp_null: { l: "Facturas sin contraparte", fix: "sin E1–E4 para esas facturas" },
  inv_concept_null: { l: "Facturas sin concepto", fix: "" },
  inv_zero_amount: { l: "Facturas de importe cero", fix: "inválidas" },
  bp_currency_vs_company: { l: "Producto en divisa ≠ empresa", fix: "conversión por exchange_rate observado" },
  dp_currency_vs_company: { l: "Deuda en divisa ≠ empresa", fix: "" },
  bp_created_after_snapshot: { l: "Productos creados tras el corte", fix: "" },
};

export default async function CalidadPage() {
  const store = await getStore();
  const e = eda(store.eda);
  const q = Object.entries(e.quality).filter(([k]) => LABELS[k]).sort((a, b) => b[1] - a[1]);
  const dr = e.invoices.dates_out_of_range;
  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-5">
        {q.slice(0, 10).map(([k, v]) => <div key={k} className={`card wood-edge px-5 py-4 ${LABELS[k].bad ? "" : ""}`}><div className="eyebrow">{LABELS[k].l}</div><div className={`num font-semibold mt-2 text-[24px] ${LABELS[k].bad ? "text-warn" : "text-ink"}`}>{formatCount(v)}</div><div className="mt-1 text-[11px] text-ink-mute">{LABELS[k].fix}</div></div>)}
      </div>
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
        <Card title="Fechas fuera de rango en facturas" sub="vencimientos en el año 7025, fecha valor en 2099…">
          <BarList items={Object.entries(dr).map(([k, v]) => ({ label: k.replace(/_/g, " "), value: v }))} fmt={(v) => formatCount(v)} color="#f59e0b" />
        </Card>
        <Card title="Outliers de importe" sub="movimientos ≥ 100 M excluidos de todo agregado (500 tx, 159 facturas)">
          <div className="divide-y divide-line-soft">{e.transactions.outliers_top.slice(0, 8).map((o, i) => <div key={i} className="flex items-center justify-between py-1.5 text-[12px]"><span className="num text-ink-dim">{companyName(store.byId.get(o.company_id))} · {o.date}</span><span className="num text-bad">{fmtMoney(o.amount)}</span></div>)}</div>
        </Card>
        <Card title="Placeholders en descripciones" sub="la anonimización colapsa transacciones distintas">
          <BarList items={e.transactions.placeholders.slice(0, 8).map((p) => ({ label: String(p.k), value: p.n }))} fmt={(v) => formatCount(v)} color="#a855f7" />
        </Card>
      </div>
      <Card title="Saldos disparatados" sub="|balance| ≥ 1.000 M → inválido">
        <div className="divide-y divide-line-soft">{e.balances.outliers.map((o) => <div key={o.product_id} className="flex items-center justify-between py-1.5 text-[12px]"><span className="num text-ink-dim">{companyName(store.byId.get(o.company_id))} · {o.product_id} · {o.type}</span><span className="num text-bad">{fmtMoney(o.balance)}</span></div>)}</div>
      </Card>
    </div>
  );
}
