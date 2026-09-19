import Link from "next/link";
import { notFound } from "next/navigation";
import { getStore } from "@/lib/data/store";
import { currentMonth } from "@/lib/data/month";
import { rowsAt } from "@/lib/data/portfolio";
import { groupSnapshot } from "@/lib/products/pooling";
import PageHeader from "@/components/shell/PageHeader";
import { Card } from "@/components/ui/Card";
import { Kpi } from "@/components/ui/Kpi";
import { Pill } from "@/components/ui/Pill";
import { CompanyLink } from "@/components/ui/CompanyLink";
import { LineChart } from "@/components/charts/LineChart";
import { TREND_LABEL, TIER_LABEL } from "@/lib/score/derived";
import { DIM_LABEL } from "@/lib/score/meta";
import { eur, fmtMoney, monthLabelLong } from "@/lib/format";

const PALETTE = ["#e5e5e5", "#3b82f6", "#10b981", "#ef4444", "#a855f7", "#f59e0b", "#34d399", "#f87171", "#3b82f6", "#fbbf24"];

export default async function GrupoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const store = await getStore();
  const { idx, month } = await currentMonth(store.months);
  const ids = store.groups.get(id);
  if (!ids) notFound();
  const rows = new Map(rowsAt(store, idx).map((r) => [r.id, r]));
  const members = ids.map((i) => store.byId.get(i)).filter((c): c is NonNullable<typeof c> => !!c);
  const scored = members.filter((c) => rows.has(c.id)).sort((a, b) => rows.get(b.id)!.score - rows.get(a.id)!.score);
  const snap = groupSnapshot(store, id, month);
  const ent = new Map(snap?.entities.map((e) => [e.companyId, e]));
  const mean = scored.length ? scored.reduce((s, c) => s + rows.get(c.id)!.score, 0) / scored.length : null;
  return (
    <>
      <PageHeader eyebrow={`Grupo · ${monthLabelLong(month)}`} title={id} lead={`${ids.length} filiales, ${scored.length} con score este mes.`} aside={<Link href={`/productos/cash-pooling?group=${id}`} className="rounded-lg bg-ink px-5 py-2 text-[13px] font-semibold text-panel">Abrir cash pooling →</Link>} />
      <div className="mb-5 grid grid-cols-2 gap-4 md:grid-cols-4">
        <Kpi label="Score medio" value={mean == null ? "—" : mean.toFixed(0)} sub="filiales con score" />
        <Kpi label="En el 20 % peor" value={scored.filter((c) => rows.get(c.id)!.alert).length} tone="warn" />
        <Kpi label="Sobra" value={snap ? fmtMoney(snap.totals.surplusEur) : "—"} tone="good" sub={snap ? `${snap.entities.filter((e) => e.role === "surplus").length} filiales con excedente` : "sin caja reconstruida"} />
        <Kpi label="Falta" value={snap ? fmtMoney(snap.totals.deficitEur) : "—"} tone="bad" sub={snap ? `${snap.entities.filter((e) => e.role === "deficit").length} filiales en déficit` : ""} />
      </div>
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1.4fr_1fr]">
        <Card title="Filiales" sub="score, régimen, motivo, caja en EUR y papel en el grupo">
          <div className="divide-y divide-line-soft">
            {scored.map((c) => {
              const r = rows.get(c.id)!;
              const e = ent.get(c.id);
              return (
                <div key={c.id} className="grid grid-cols-[minmax(0,1.6fr)_56px_100px_120px_100px_80px] items-center gap-3 py-2.5 text-[12.5px]">
                  <CompanyLink id={c.id} name={c.name} />
                  <span className="num text-right text-[15px] text-ink">{r.score.toFixed(0)}</span>
                  <Pill tone={r.trend === "improving" ? "good" : r.trend === "deteriorating" ? "bad" : "neutral"}>{TREND_LABEL[r.trend]}</Pill>
                  <span className="text-[11.5px] text-ink-dim">{r.driver ? `${DIM_LABEL[r.driver.dim]} ${r.driver.value >= 0 ? "+" : "−"}${Math.abs(r.driver.value).toFixed(0)}` : ""}</span>
                  <span className="num text-[11.5px] text-ink-dim">{e ? fmtMoney(e.cashEur) : "—"}</span>
                  <span>{e && e.role !== "neutral" ? <Pill tone={e.role === "surplus" ? "good" : "bad"}>{e.role === "surplus" ? "sobra" : "falta"}</Pill> : <span className="text-[11px] text-ink-mute">{TIER_LABEL[r.tier]}</span>}</span>
                </div>
              );
            })}
            {members.filter((c) => !rows.has(c.id)).map((c) => <div key={c.id} className="py-2.5 text-[12.5px] text-ink-mute"><CompanyLink id={c.id} name={c.name} /> · sin score este mes</div>)}
          </div>
        </Card>
        <Card title="Propuestas de préstamo interno" sub={snap ? "la filial con excedente presta a la que necesita; el score de la que pide fija el tipo" : "sin datos"}>
          {!snap || snap.proposals.length === 0 ? <p className="text-[12.5px] text-ink-mute">Sin propuestas este mes: no coinciden una filial con excedente y otra en déficit.</p> : (
            <div className="flex flex-col gap-2">
              {snap.proposals.map((p) => (
                <div key={p.id} className="rounded-xl bg-panel-2 p-3.5">
                  <div className="flex items-center justify-between text-[12.5px]"><span className="num text-ink">{store.byId.get(p.fromId)?.name ?? p.fromId} → {store.byId.get(p.toId)?.name ?? p.toId}</span><Pill tone={p.requiresReview ? "warn" : "good"}>{p.requiresReview ? "revisar" : "disponible"}</Pill></div>
                  <div className="num font-semibold mt-1 text-[18px] text-ink">{eur(p.amountEur)}</div>
                  <div className="text-[11.5px] text-ink-dim">{p.days} días · interés de banco evitado {eur(Math.round(p.bankInterestEur))} · ahorro neto {eur(Math.round(p.netSavingEur))}</div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
      <Card className="mt-5" title="Scores de las filiales en el tiempo" sub="la correlación entre filiales del mismo grupo es baja (0,29 en la validación): cada una cuenta su propia historia">
        <LineChart months={store.months} series={scored.slice(0, 10).map((c, i) => ({ id: c.id, label: c.name, color: PALETTE[i % PALETTE.length], values: c.scores }))} marker={idx} yMin={0} yMax={100} height={260} />
      </Card>
    </>
  );
}
