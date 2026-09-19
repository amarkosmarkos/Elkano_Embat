"use client";

import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Pill } from "@/components/ui/Pill";
import { useOps } from "@/lib/ops";
import type { ProviderAssessment, ReceiverAssessment } from "@/lib/score/derived";
import type { Cuota, Excedente, PagoReco } from "@/lib/products/tesoreria";
import type { Proposal } from "@/lib/cashpool";
import { eur, fmtMoney } from "@/lib/format";

type PoolInfo = { groupId: string; role: "surplus" | "deficit" | "neutral" | null; entity: { cashEur: number | null; spareEur: number; needEur: number } | null; proposals: (Proposal & { from: string; to: string })[]; totals: { surplusEur: number; deficitEur: number; nSurplus: number; nDeficit: number } };

/** Las tres decisiones de producto aplicadas a esta empresa. Aprobar escribe en Operaciones. */
export default function DecisionCards({ company, month, provider, receiver, pool, exc, cuo, pag }: { company: { id: string; name: string; score: number | null }; month: string; provider: ProviderAssessment; receiver: ReceiverAssessment; pool: PoolInfo | null; exc: Excedente | null; cuo: Cuota | null; pag: PagoReco | null }) {
  const { ops, add } = useOps();
  const done = (id: string) => ops.some((o) => o.id === id);
  const Btn = ({ id, label, onClick }: { id: string; label: string; onClick: () => void }) => (
    <button type="button" disabled={done(id)} onClick={onClick} className="rounded-lg bg-ink px-4 py-1.5 text-[12px] font-semibold text-panel  transition-transform hover:scale-[1.03] disabled:opacity-40 disabled:hover:scale-100">{done(id) ? "Ejecutado" : label}</button>
  );
  const List = ({ items, tone }: { items: string[]; tone: "good" | "bad" | "neutral" }) => (
    <ul className="mt-2 flex flex-col gap-1 text-[12px] text-ink-dim">{items.map((r) => <li key={r} className="flex gap-2"><span className={tone === "good" ? "text-good" : tone === "bad" ? "text-bad" : "text-ink-mute"}>{tone === "good" ? "✓" : tone === "bad" ? "✕" : "·"}</span>{r}</li>)}</ul>
  );

  return (
    <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
      <Card title="01 · Marketplace" sub="¿Puede prestar? ¿Es candidata a recibir?" right={<Link href={`/productos/marketplace?company=${company.id}`} className="text-[11.5px] text-accent hover:underline">Abrir en el marketplace →</Link>}>
        <div className="rounded-xl bg-panel-2 p-3.5">
          <div className="flex items-center justify-between"><span className="text-[13px] font-medium text-ink">Prestamista</span><Pill tone={provider.qualified ? "good" : "neutral"}>{provider.qualified ? `cualificada · capacidad ${provider.capacity}` : "no cualifica"}</Pill></div>
          {provider.blockers.length > 0 && <List items={provider.blockers} tone="bad" />}
          <List items={provider.reasons.slice(0, 4)} tone="good" />
        </div>
        <div className="mt-3 rounded-xl bg-panel-2 p-3.5">
          <div className="flex items-center justify-between"><span className="text-[13px] font-medium text-ink">Receptora de financiación</span><Pill tone={receiver.eligible ? (receiver.fit >= 50 ? "good" : "warn") : "neutral"}>{receiver.eligible ? `encaje ${receiver.fit} · necesidad ${receiver.need}` : "no elegible"}</Pill></div>
          {receiver.risks.length > 0 && <List items={receiver.risks} tone="bad" />}
          {receiver.needSignals.length > 0 && <List items={receiver.needSignals} tone="neutral" />}
          <List items={receiver.strengths.slice(0, 3)} tone="good" />
        </div>
      </Card>

      <Card title="02 · Cash pooling" sub={pool ? `grupo ${pool.groupId} · ${pool.totals.nSurplus} sobran · ${pool.totals.nDeficit} faltan` : "sin grupo: no aplica"} right={pool && <Link href={`/productos/cash-pooling?group=${pool.groupId}`} className="text-[11.5px] text-accent hover:underline">Abrir el grupo →</Link>}>
        {!pool ? <p className="text-[12.5px] text-ink-mute">La empresa no pertenece a ningún grupo del dataset.</p> : (
          <>
            <div className="rounded-xl bg-panel-2 p-3.5">
              <div className="flex items-center justify-between"><span className="text-[13px] font-medium text-ink">Rol este mes</span><Pill tone={pool.role === "surplus" ? "good" : pool.role === "deficit" ? "bad" : "neutral"}>{pool.role === "surplus" ? "aporta" : pool.role === "deficit" ? "recibe" : pool.role ? "neutral" : "sin caja en el mes"}</Pill></div>
              {pool.entity && <div className="mt-2 text-[12px] text-ink-dim">Caja {fmtMoney(pool.entity.cashEur)} · {pool.role === "surplus" ? `puede prestar hasta ${fmtMoney(pool.entity.spareEur)}` : pool.role === "deficit" ? `le faltan ${fmtMoney(pool.entity.needEur)} para estar cómoda` : "ni sobra ni falta"}</div>}
            </div>
            <div className="mt-3 flex flex-col gap-2">
              {pool.proposals.length === 0 && <p className="text-[12px] text-ink-mute">Sin propuestas que la impliquen este mes. Prestable en el grupo: {fmtMoney(pool.totals.surplusEur)}.</p>}
              {pool.proposals.map((p) => {
                const oid = `prestamo-${p.id}-${month}`;
                return (
                  <div key={p.id} className="rounded-xl border border-line-soft p-3.5">
                    <div className="flex items-center justify-between gap-3">
                      <div className="text-[12.5px] text-ink">{p.from} → {p.to}</div>
                      <Pill tone={p.urgency === "alta" ? "bad" : p.urgency === "media" ? "warn" : "neutral"}>{p.urgency}</Pill>
                    </div>
                    <div className="num font-semibold mt-1 text-[18px] text-ink">{eur(p.amountEur)}</div>
                    <div className="mt-0.5 text-[11.5px] text-ink-dim">tipo interno {p.internalRate} % vs banco {p.bankRate} % · ahorra {eur(p.savingEurYear)}/año{p.sameCurrency ? "" : ` · cruce FX ${eur(p.fxCostEur)}`}</div>
                    <div className="mt-2"><Btn id={oid} label="Aprobar préstamo interno" onClick={() => add({ id: oid, kind: "prestamo", groupId: pool.groupId, fromId: p.fromId, from: p.from, toId: p.toId, to: p.to, amount: p.amountEur, rate: p.internalRate, savingYear: p.savingEurYear })} /></div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </Card>

      <Card title="03 · Tesorería" sub="colocación de excedentes · alerta de cuotas · recomendación de pagos" right={<Link href="/productos/tesoreria" className="text-[11.5px] text-accent hover:underline">Ver el producto →</Link>}>
        <div className="rounded-xl bg-panel-2 p-3.5">
          <div className="flex items-center justify-between"><span className="text-[13px] font-medium text-ink">Colocación de excedentes</span>{exc ? <Pill tone="good">{exc.product} · {exc.months} m</Pill> : <Pill>no propone</Pill>}</div>
          {exc ? (
            <>
              <div className="num font-semibold mt-1 text-[22px] text-ink">{eur(exc.amount)}<span className="ml-2 text-[12px] text-ink-mute">de un suelo de {eur(exc.floor12)}</span></div>
              <div className="mt-1 text-[12px] text-ink-dim">{exc.reason} Rendimiento estimado al 2,5 %: <span className="text-ink">{eur(exc.yieldYear)}/año</span>.</div>
              <div className="mt-2"><Btn id={`colocacion-${exc.companyId}-${month}`} label="Aprobar colocación" onClick={() => add({ id: `colocacion-${exc.companyId}-${month}`, kind: "colocacion", companyId: exc.companyId, company: exc.name, amount: exc.amount, months: exc.months, rate: 2.5, yieldYear: exc.yieldYear, product: exc.product })} /></div>
            </>
          ) : <p className="mt-1 text-[12px] text-ink-mute">Sin suelo de caja de 12 meses por encima de 100 k€, o el score no aguanta inmovilizar.</p>}
        </div>
        <div className="mt-3 rounded-xl bg-panel-2 p-3.5">
          <div className="flex items-center justify-between"><span className="text-[13px] font-medium text-ink">Alerta de cuotas</span>{cuo ? <Pill tone={cuo.level === "alta" ? "bad" : cuo.level === "media" ? "warn" : "good"}>{cuo.level === "ok" ? "cubiertas" : `tensión ${cuo.level}`}</Pill> : <Pill>sin deuda</Pill>}</div>
          {cuo ? <div className="mt-1 text-[12px] text-ink-dim">Servicio de deuda {Math.round((cuo.debtService ?? 0) * 100)} % de las entradas · runway {cuo.runway == null ? "—" : `${cuo.runway.toFixed(0)} m`} · caja {fmtMoney(cuo.cash)}. <span className="text-ink">{cuo.advice}</span></div> : <p className="mt-1 text-[12px] text-ink-mute">No hay cuotas de deuda este mes en las señales.</p>}
        </div>
        <div className="mt-3 rounded-xl bg-panel-2 p-3.5">
          <div className="flex items-center justify-between"><span className="text-[13px] font-medium text-ink">Pagos a proveedores</span>{pag && <Pill tone={pag.mode === "adelantar" ? "good" : pag.mode === "ultimo_dia" ? "warn" : "neutral"}>{pag.mode === "adelantar" ? "adelantar y pedir descuento" : pag.mode === "ultimo_dia" ? "último día, nunca después" : "al vencimiento"}</Pill>}</div>
          {pag ? <div className="mt-1 text-[12px] text-ink-dim">{pag.reason} <span className="text-ink-mute">{pag.savingHint}</span>{pag.dpo != null && <span className="num ml-1 text-ink-mute">· DPO {Math.round(pag.dpo)} d</span>}</div> : <p className="mt-1 text-[12px] text-ink-mute">Sin señales de pago este mes.</p>}
        </div>
      </Card>
    </div>
  );
}
