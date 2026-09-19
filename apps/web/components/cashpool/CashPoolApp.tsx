"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { buildSeries, DEFAULT_SETTINGS, summarize, type Decision, type Entity, type EntityBase, type PoolSettings, type Proposal, type SeriesRow, type Snapshot, type Trend } from "@/lib/cashpool";
import { eur, formatScore, monthLabel } from "@/lib/format";


type Group = { group_id: string; n: number; n_cur: number; curs: string };
type Screen = "decisiones" | "filiales" | "historial";
type DecisionEvent = { proposal: Proposal; decision: Decision | "pending"; at: string; settings: PoolSettings };
const SCREENS: { id: Screen; label: string }[] = [
  { id: "decisiones", label: "Decisiones" },
  { id: "filiales", label: "Filiales" },
  { id: "historial", label: "Historial e impacto" },
];
const TREND: Record<Trend, { label: string; color: string }> = {
  improving: { label: "Mejorando", color: "text-good bg-good-dim" },
  stable: { label: "Estable", color: "text-ink-dim bg-panel-2" },
  dip: { label: "Posible bache", color: "text-warn bg-warn-dim" },
  deteriorating: { label: "Deterioro", color: "text-bad bg-bad-dim" },
  unknown: { label: "Historia insuficiente", color: "text-ink-mute bg-panel-2" },
};
const money = (n: number, currency: string) => `${n.toLocaleString("es-ES", { maximumFractionDigits: 2 })} ${currency}`;
const scoreText = (n: number | null) => n === null ? "—" : formatScore(n);
const signed = (n: number) => `${n > 0 ? "+" : ""}${formatScore(n)}`;
const buttonClass = "rounded-lg border border-line px-3 py-2 text-xs font-medium transition hover:border-accent hover:text-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent";

export default function CashPoolApp({ groupId, base, rows, groups }: { groupId: string; base: EntityBase[]; rows: SeriesRow[]; groups: Group[] }) {
  const router = useRouter();
  const [settings, setSettings] = useState<PoolSettings>(DEFAULT_SETTINGS);
  const snaps = useMemo(() => buildSeries(base, rows, settings), [base, rows, settings]);
  const [month, setMonth] = useState(() => [...new Set(rows.map((r) => r.month))].sort().at(-1) ?? "");
  const [screen, setScreen] = useState<Screen>("decisiones");
  const [events, setEvents] = useState<DecisionEvent[]>([]);
  const [selectedCompany, setSelectedCompany] = useState<string | null>(null);
  const decisions = useMemo(() => {
    const result: Record<string, Decision> = {};
    for (const event of events) {
      if (event.decision === "pending") delete result[event.proposal.id];
      else result[event.proposal.id] = event.decision;
    }
    return result;
  }, [events]);
  const cur = snaps.find((s) => s.month === month) ?? snaps.at(-1);

  if (!cur) return (
    <main className="mx-auto max-w-2xl px-6 py-20 text-center">
      <h1 className="text-2xl font-semibold">Todavía no hay datos para este grupo</h1>
      <p className="mt-3 text-sm text-ink-dim">Necesitamos saldos y una serie mensual de scores para construir un plan.</p>
      <Link href="/productos" className="mt-6 inline-block text-sm text-accent">Volver a productos</Link>
    </main>
  );

  const summary = summarize(cur, decisions);
  const byId = new Map(cur.entities.map((e) => [e.companyId, e]));
  const active = cur.proposals.filter((p) => decisions[p.id] !== "rejected");
  const selected = byId.get(selectedCompany ?? "") ?? cur.entities.find((e) => e.policy === "review") ?? cur.entities[0];
  const review = cur.entities.filter((e) => e.policy === "review");
  const covered = cur.totals.deficitEur > 0 ? Math.min(100, summary.proposedEur / cur.totals.deficitEur * 100) : 0;
  const availableCash = cur.entities.filter((e) => e.role !== "unknown").length;
  const remainingNeeds = cur.entities.map((e) => ({
    entity: e,
    amount: Math.max(0, e.needEur - active.filter((p) => p.toId === e.companyId).reduce((n, p) => n + p.amountEur, 0)),
  })).filter((r) => r.amount > 1).sort((a, b) => b.amount - a.amount);
  const inspect = (id: string) => { setSelectedCompany(id); setScreen("filiales"); };
  const decide = (proposal: Proposal, decision: Decision | "pending") => {
    setEvents((previous) => [...previous, { proposal, decision, at: new Date().toISOString(), settings: { ...settings } }]);
  };
  const afterPlan = (e: Entity) => e.cashEur === null ? null : e.cashEur + active.reduce((n, p) =>
    n + (p.toId === e.companyId ? p.amountEur : 0) - (p.fromId === e.companyId ? p.amountEur + p.feeEur : 0), 0);

  return (
    <main className="min-h-dvh bg-ground">
      <header className="border-b border-line-soft bg-panel">
        <div className="mx-auto max-w-7xl px-4 pt-6 sm:px-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3 text-xs">
              <Link href="/productos" className="text-ink-dim hover:text-accent">← Productos</Link>
              <span className="text-line">/</span>
              <span className="font-semibold">Cash pooling</span>
              <span className="rounded-full bg-accent/10 px-2.5 py-1 font-medium text-accent">Simulación</span>
            </div>
            <div className="flex flex-wrap gap-3">
              <label className="flex items-center gap-2 text-xs text-ink-dim">
                Grupo
                <select id="group-select" value={groupId} onChange={(e) => router.push(`/productos/cash-pooling?group=${encodeURIComponent(e.target.value)}`)} className="max-w-64 rounded-lg border border-line bg-panel px-3 py-2 text-ink">
                  {groups.map((g) => <option key={g.group_id} value={g.group_id}>{g.group_id} · {g.n} filiales</option>)}
                </select>
              </label>
              <label className="flex items-center gap-2 text-xs text-ink-dim">
                Mes
                <select id="month-select" value={cur.month} onChange={(e) => setMonth(e.target.value)} className="rounded-lg border border-line bg-panel px-3 py-2 text-ink">
                  {[...snaps].reverse().map((s) => <option key={s.month} value={s.month}>{monthLabel(s.month)}</option>)}
                </select>
              </label>
            </div>
          </div>
          <div className="pb-6 pt-8">
            <p className="text-xs font-medium uppercase tracking-widest text-accent">Tesorería de grupo</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">Tu liquidez, donde hace falta.</h1>
            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-ink-dim">Cubre necesidades de tus filiales con caja del grupo antes de financiarte fuera. Cada propuesta protege una reserva y explica cómo influye la trayectoria.</p>
          </div>
          <nav aria-label="Vistas de cash pooling" className="flex gap-6 overflow-x-auto">
            {SCREENS.map((s) => (
              <button key={s.id} onClick={() => setScreen(s.id)} aria-current={screen === s.id ? "page" : undefined} className={`flex shrink-0 items-center gap-2 border-b-2 pb-3 text-sm font-medium ${screen === s.id ? "border-accent text-accent" : "border-transparent text-ink-dim hover:text-ink"}`}>
                {s.label}
                {s.id === "decisiones" && summary.pending > 0 && <span className="rounded-full bg-accent/10 px-2 py-0.5 text-[10px]">{summary.pending}</span>}
              </button>
            ))}
          </nav>
        </div>
      </header>

      <div className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6">
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-warn/20 bg-warn-dim/60 px-4 py-3 text-xs leading-relaxed text-ink-dim">
          <span><strong className="text-ink">Demo, no ejecución bancaria.</strong> Saldos agregados pendientes de validar por moneda de cuenta; importes orientativos.</span>
          <span>{availableCash}/{base.length} filiales con saldo y score evaluables · {monthLabel(cur.month)}</span>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4" aria-live="polite" aria-atomic="true">
          <Kpi value={eur(cur.totals.surplusEur)} label="Liquidez movilizable" note="Tras reserva y límite del aportante" />
          <Kpi value={eur(summary.proposedEur)} label="Cobertura del plan" note={`${eur(summary.approvedEur)} aprobados en simulación`} />
          <Kpi value={eur(summary.uncoveredEur)} label="Necesidad sin cubrir" note="No desaparece al rechazar propuestas" tone={summary.uncoveredEur > 0 ? "text-warn" : "text-ink"} />
          <Kpi value={eur(summary.netSavingEur)} label={`Ahorro neto estimado · ${settings.days} días`} note="Plan no rechazado · equivalente en EUR" tone="text-good" />
        </div>

        <ScenarioSettings settings={settings} onApply={setSettings} />

        {screen === "decisiones" && (
          <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
            <section aria-labelledby="proposals-title" className="space-y-4">
              <div className="flex items-end justify-between gap-3">
                <div>
                  <h2 id="proposals-title" className="text-xl font-semibold tracking-tight">Tu plan de liquidez</h2>
                  <p className="mt-1 text-xs text-ink-dim">{summary.pending} pendientes · misma divisa · plazo de {settings.days} días</p>
                </div>
                <span className="text-xs text-ink-mute">{cur.proposals.length} propuestas</span>
              </div>
              {cur.proposals.map((p) => (
                <ProposalCard key={p.id} proposal={p} from={byId.get(p.fromId)!} to={byId.get(p.toId)!} decision={decisions[p.id]} donorAfter={afterPlan(byId.get(p.fromId)!)} receiverAfter={afterPlan(byId.get(p.toId)!)} onDecide={(d) => decide(p, d)} onInspect={inspect} />
              ))}
              {cur.proposals.length === 0 && (
                <div className="rounded-2xl border border-dashed border-line bg-panel px-6 py-10">
                  <h3 className="text-lg font-semibold">No hay transferencias recomendadas en este escenario</h3>
                  <p className="mt-2 text-sm leading-relaxed text-ink-dim">{cur.totals.deficitEur > 0
                    ? "Hay necesidad de caja, pero no una combinación que cumpla las reglas de riesgo, misma divisa, importe mínimo y ahorro positivo. Revisa las filiales y los supuestos; no forzamos una operación para completar el plan."
                    : "Los saldos evaluables cubren la reserva configurada. Si faltan datos, no podemos concluir que todas las filiales estén cubiertas."}</p>
                  <button onClick={() => setScreen("filiales")} className={`mt-5 ${buttonClass}`}>Revisar filiales</button>
                </div>
              )}
            </section>

            <aside className="space-y-4">
              <section className="rounded-2xl border border-line bg-panel p-5">
                <h2 className="text-sm font-semibold">Qué resuelve este plan</h2>
                <div className="mt-5 flex items-end justify-between">
                  <span className="font-mono text-3xl font-semibold">{Math.round(covered)} %</span>
                  <span className="text-xs text-ink-dim">de la necesidad evaluable</span>
                </div>
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-panel-2" role="progressbar" aria-label="Necesidad cubierta por el plan" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(covered)}><div className="h-full rounded-full bg-accent transition-all" style={{ width: `${covered}%` }} /></div>
                <p className="mt-3 text-xs leading-relaxed text-ink-dim">{eur(summary.proposedEur)} de {eur(cur.totals.deficitEur)}. Es una simulación de cobertura, no dinero transferido.</p>
              </section>
              <section className="rounded-2xl border border-line bg-panel p-5">
                <h2 className="text-sm font-semibold">Necesidades pendientes</h2>
                {remainingNeeds.length === 0 ? <p className="mt-3 text-xs text-ink-dim">Sin déficit residual entre las filiales con saldo conocido.</p> : (
                  <ul className="mt-2 divide-y divide-line-soft">
                    {remainingNeeds.map(({ entity: e, amount }) => <li key={e.companyId} className="py-3">
                      <button onClick={() => inspect(e.companyId)} className="flex w-full items-center justify-between gap-2 text-left text-xs hover:text-accent"><span className="font-medium">{e.companyId}</span><span className="font-mono text-warn">{eur(amount)}</span></button>
                      <p className="mt-1 text-[11px] text-ink-dim">{e.policy === "review" ? "Revisión necesaria" : "Cobertura limitada por política, liquidez compatible o coste"}</p>
                    </li>)}
                  </ul>
                )}
              </section>
              {review.length > 0 && <button onClick={() => setScreen("filiales")} className="w-full rounded-xl border border-warn/25 bg-warn-dim/50 p-4 text-left text-xs leading-relaxed"><strong className="text-warn">{review.length} filiales requieren revisión.</strong><br />Consulta su trayectoria, datos y motivo antes de asumir más exposición.</button>}
            </aside>
          </div>
        )}

        {screen === "filiales" && (
          <section className="space-y-5" aria-labelledby="entities-title">
            <div><h2 id="entities-title" className="text-xl font-semibold">La salud detrás de cada decisión</h2><p className="mt-1 text-xs text-ink-dim">Saldos y reservas en EUR equivalente, bajo el supuesto monetario de la demo. El score no es una probabilidad de devolución.</p></div>
            <div className="overflow-x-auto rounded-2xl border border-line bg-panel">
              <table className="w-full whitespace-nowrap text-left text-xs">
                <thead className="border-b border-line-soft bg-panel-2 text-ink-dim"><tr>{["Filial", "Caja", "Reserva", "Score / 100", "Trayectoria · 3 meses", "Decisión"].map((label) => <th key={label} scope="col" className="px-4 py-3 font-medium">{label}</th>)}</tr></thead>
                <tbody className="divide-y divide-line-soft">{cur.entities.map((e) => (
                  <tr key={e.companyId} className={selected?.companyId === e.companyId ? "bg-accent/5" : "hover:bg-panel-2/50"}>
                    <td className="px-4 py-4"><button onClick={() => setSelectedCompany(e.companyId)} aria-pressed={selected?.companyId === e.companyId} className="font-semibold text-accent hover:underline">{e.companyId}</button><div className="mt-1 text-[10px] text-ink-mute">{e.currency}{e.country ? ` · ${e.country}` : " · país sin informar"}</div></td>
                    <td className="px-4 py-4 font-mono">{e.cashEur === null ? "Sin dato válido" : eur(e.cashEur)}</td>
                    <td className="px-4 py-4 font-mono">{eur(e.reserveEur)}</td>
                    <td className="px-4 py-4 font-mono font-medium">{scoreText(e.score)}</td>
                    <td className="px-4 py-4"><TrendBadge entity={e} /></td>
                    <td className="px-4 py-4">{e.role === "unknown" ? "No evaluable" : e.policy === "review" ? "Revisar" : e.spareEur > 0 ? `Aporta hasta ${eur(e.spareEur)}` : e.receiveLimitEur > 0 ? `Recibe hasta ${eur(e.receiveLimitEur)}` : "Sin operación"}</td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
            {selected && <EntityDetail entity={selected} snaps={snaps.filter((s) => s.month <= cur.month)} after={afterPlan(selected)} />}
          </section>
        )}

        {screen === "historial" && (
          <section className="space-y-6" aria-labelledby="history-title">
            <div><h2 id="history-title" className="text-xl font-semibold">Impacto estimado, no ahorro realizado</h2><p className="mt-1 text-xs text-ink-dim">Escenario de {monthLabel(cur.month)} · {settings.days} días. No sumamos meses ni renovaciones hipotéticas como si fueran operaciones reales.</p></div>
            <div className="grid gap-5 md:grid-cols-2">
              <div className="rounded-2xl border border-line bg-panel p-6">
                <h3 className="text-sm font-semibold">Plan no rechazado · EUR equivalente</h3>
                <dl className="mt-5 space-y-4 text-sm">
                  <AmountRow label="Coste externo evitado (supuesto)" value={summary.bankInterestEur} />
                  <AmountRow label="Rentabilidad sacrificada por el aportante" value={-summary.opportunityCostEur} />
                  <AmountRow label="Comisiones de transferencia" value={-summary.feeEur} />
                  <div className="border-t border-line-soft pt-4 font-semibold text-good"><AmountRow label="Ahorro neto estimado del grupo" value={summary.netSavingEur} /></div>
                </dl>
                <p className="mt-5 text-xs leading-relaxed text-ink-dim">El interés entre filiales no es un coste externo del grupo consolidado. Estimación antes de impuestos, costes legales y pérdidas de crédito, no una oferta de financiación.</p>
              </div>
              <div className="rounded-2xl border border-line bg-panel p-6">
                <h3 className="text-sm font-semibold">Aprobado en este escenario</h3>
                <p className="mt-5 font-mono text-3xl font-semibold text-accent">{eur(summary.approvedEur)}</p>
                <p className="mt-2 text-sm text-ink-dim">Ahorro estimado asociado: <strong className="text-good">{eur(summary.approvedSavingEur)}</strong></p>
                <div className="mt-5 rounded-xl bg-panel-2 p-4 text-xs leading-relaxed text-ink-dim"><strong className="text-ink">0 transferencias ejecutadas.</strong> Aprobar guarda una decisión local de simulación. No cambia saldos bancarios, no crea un préstamo y no acredita elegibilidad legal.</div>
              </div>
            </div>
            <div className="overflow-hidden rounded-2xl border border-line bg-panel">
              <div className="border-b border-line-soft p-5"><h3 className="font-semibold">Registro de esta sesión</h3><p className="mt-1 text-xs text-ink-dim">Incluye cambios de decisión. Se conserva entre vistas y meses; se borra al recargar o cambiar de grupo. No es una auditoría bancaria.</p></div>
              {events.length === 0 ? <p className="p-8 text-center text-sm text-ink-dim">Aún no has aprobado ni rechazado propuestas.</p> : (
                <ol className="divide-y divide-line-soft">{events.map((event, index) => ({ event, index })).reverse().map(({ event, index }) => (
                  <li key={index} className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 text-xs">
                    <div><span className={`font-semibold ${event.decision === "approved" ? "text-good" : event.decision === "rejected" ? "text-bad" : "text-ink-dim"}`}>{event.decision === "approved" ? "Aprobada en simulación" : event.decision === "rejected" ? "Rechazada" : "Reabierta"}</span><p className="mt-1">{event.proposal.fromId} → {event.proposal.toId} · {money(event.proposal.amountLocal, event.proposal.currency)}</p><p className="mt-1 text-ink-mute">{monthLabel(event.proposal.month)} · {event.settings.days} días · financiación {event.settings.bankRate} % · depósito {event.settings.depositRate} % · comisión {eur(event.settings.transferFeeEur)} · reserva mínima {eur(event.settings.reserveEur)}</p></div>
                    <time dateTime={event.at} className="font-mono text-[10px] text-ink-mute">{new Date(event.at).toLocaleTimeString("es-ES")}</time>
                  </li>
                ))}</ol>
              )}
            </div>
          </section>
        )}
        <p className="pb-4 text-center text-[11px] leading-relaxed text-ink-mute">Datos sintéticos del reto X-Ray · políticas de demo, no límites de crédito validados · ninguna operación sale de esta pantalla.</p>
      </div>
    </main>
  );
}

function ProposalCard({ proposal: p, from, to, decision, donorAfter, receiverAfter, onDecide, onInspect }: {
  proposal: Proposal; from: Entity; to: Entity; decision?: Decision; donorAfter: number | null; receiverAfter: number | null;
  onDecide: (decision: Decision | "pending") => void; onInspect: (id: string) => void;
}) {
  return (
    <article className={`overflow-hidden rounded-2xl border bg-panel ${decision === "rejected" ? "border-line opacity-70" : decision === "approved" ? "border-good/40" : "border-line shadow-sm"}`}>
      <div className="p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2 text-sm font-semibold"><button onClick={() => onInspect(from.companyId)} className="hover:text-accent hover:underline">{from.companyId}</button><span className="text-ink-mute">→</span><button onClick={() => onInspect(to.companyId)} className="hover:text-accent hover:underline">{to.companyId}</button></div>
            <div className="mt-2 flex flex-wrap items-center gap-2"><span className="text-[11px] text-ink-dim">{p.currency} · {p.days} días · sin conversión FX</span>{p.requiresReview && <span className="rounded-full bg-warn-dim px-2 py-1 text-[10px] font-medium text-warn">Cobertura limitada</span>}</div>
          </div>
          <div className="text-right"><div className="font-mono text-xl font-semibold tracking-tight">{money(p.amountLocal, p.currency)}</div><div className="mt-1 text-xs font-medium text-good">{eur(p.netSavingEur)} de ahorro neto estimado</div></div>
        </div>
        <div className="mt-5 rounded-xl bg-panel-2 p-4">
          <div className="flex flex-wrap items-center gap-3 text-xs"><span className="font-medium">Receptora · score {scoreText(to.score)}</span><TrendBadge entity={to} /></div>
          <p className="mt-2 text-xs leading-relaxed text-ink-dim">{p.reason}</p>
        </div>
        <details className="mt-4 text-xs">
          <summary className="cursor-pointer font-medium text-accent">Ver reservas, cálculo y evidencia</summary>
          <div className="mt-4 space-y-4 leading-relaxed">
            <div className="grid gap-4 sm:grid-cols-2">
              <div><h4 className="font-semibold">Aportante · {from.companyId}</h4><p className="mt-1 text-ink-dim">Score {scoreText(from.score)} · {TREND[from.trend].label}. {from.reason}</p><p className="mt-2">Reserva: <strong>{eur(from.reserveEur)}</strong><br />Caja tras el plan activo: <strong>{donorAfter === null ? "—" : eur(donorAfter)}</strong></p></div>
              <div><h4 className="font-semibold">Receptora · {to.companyId}</h4><p className="mt-1 text-ink-dim">{to.explanation || "Sin explicación adicional del modelo para este mes."}</p><p className="mt-2">Reserva objetivo: <strong>{eur(to.reserveEur)}</strong><br />Caja tras el plan activo: <strong>{receiverAfter === null ? "—" : eur(receiverAfter)}</strong></p></div>
            </div>
            <dl className="space-y-2 rounded-lg border border-line-soft p-3"><AmountRow label={`Financiación externa evitada · ${p.days} días`} value={p.bankInterestEur} /><AmountRow label="Rentabilidad sacrificada" value={-p.opportunityCostEur} /><AmountRow label="Comisión pagada por el aportante" value={-p.feeEur} /><div className="font-semibold text-good"><AmountRow label="Ahorro neto del grupo" value={p.netSavingEur} /></div></dl>
            <p className="text-ink-mute">Equivalentes en EUR. Las cajas posteriores incluyen todas las propuestas no rechazadas de este mes, no solo esta operación. No se han validado restricciones legales, fiscales, contratos intercompany ni disponibilidad bancaria.</p>
          </div>
        </details>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line-soft bg-panel-2/50 px-5 py-3 sm:px-6">
        <span className="text-[11px] text-ink-dim">{decision === "approved" ? "Aprobada en simulación · no ejecutada" : decision === "rejected" ? "Excluida del plan; la necesidad sigue pendiente" : "Revisa los supuestos antes de aprobar"}</span>
        {decision ? <button onClick={() => onDecide("pending")} className={buttonClass}>Reabrir propuesta</button> : <div className="flex gap-2"><button onClick={() => onDecide("rejected")} className={buttonClass}>Rechazar</button><button onClick={() => onDecide("approved")} className="rounded-lg bg-accent px-4 py-2 text-xs font-semibold text-white transition hover:bg-accent/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent">Aprobar simulación</button></div>}
      </div>
    </article>
  );
}

function ScenarioSettings({ settings, onApply }: { settings: PoolSettings; onApply: (settings: PoolSettings) => void }) {
  return (
    <details className="rounded-xl border border-line bg-panel">
      <summary className="cursor-pointer px-4 py-3 text-xs font-medium">Supuestos del escenario <span className="ml-2 font-normal text-ink-dim">{settings.days} días · financiación {settings.bankRate} % · depósito {settings.depositRate} %</span></summary>
      <div className="space-y-4 border-t border-line-soft p-5">
        <form key={JSON.stringify(settings)} onSubmit={(e) => {
          e.preventDefault();
          const form = new FormData(e.currentTarget);
          onApply({ days: Number(form.get("days")), bankRate: Number(form.get("bankRate")), depositRate: Number(form.get("depositRate")), transferFeeEur: Number(form.get("transferFeeEur")), reserveEur: Number(form.get("reserveEur")) });
        }} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <label className="text-xs text-ink-dim">Plazo de la operación<select name="days" defaultValue={settings.days} className="mt-1.5 block w-full rounded-lg border border-line bg-panel px-3 py-2 text-ink">{[30, 60, 90].map((days) => <option key={days} value={days}>{days} días</option>)}</select></label>
          <NumberField name="bankRate" label="Financiación externa (% anual)" value={settings.bankRate} max={30} step={0.1} />
          <NumberField name="depositRate" label="Rentabilidad sacrificada (% anual)" value={settings.depositRate} max={30} step={0.1} />
          <NumberField name="transferFeeEur" label="Comisión por transferencia (EUR)" value={settings.transferFeeEur} max={10_000} step={1} />
          <NumberField name="reserveEur" label="Reserva mínima por filial (EUR equiv.)" value={settings.reserveEur} max={1_000_000} step={1000} />
          <div className="flex items-end"><button type="submit" className={`${buttonClass} w-full py-2.5`}>Recalcular escenario</button></div>
        </form>
        <div className="grid gap-4 text-xs leading-relaxed text-ink-dim lg:grid-cols-2">
          <p><strong className="text-ink">Reserva orientativa.</strong> El mayor entre el mínimo configurado y la peor caída mensual de caja observada en los últimos tres cambios mensuales, escalada al plazo. No es una previsión de pagos ni sustituye vencimientos, nóminas o impuestos.</p>
          <p><strong className="text-ink">Ahorro del grupo.</strong> Importe × (tipo externo − rentabilidad sacrificada) × días / 365 − comisión. Los tipos son hipótesis editables, no condiciones bancarias obtenidas del score. Mínimo por propuesta: 1.000 EUR equivalentes; importes redondeados hacia abajo en centenas de la divisa.</p>
          <p><strong className="text-ink">Monedas pendientes de conciliación.</strong> Se interpreta el saldo agregado como moneda de la filial y se usan tipos de cambio fijos de referencia para comparar en EUR. La moneda debe verificarse por cuenta antes de usar los importes fuera de la demo. No se proponen cruces de divisa.</p>
          <p><strong className="text-ink">Política de demo.</strong> Una caída de 6 puntos a tres meses exige revisión; una mejora de 6 permite cobertura gradual del 75 %. Un posible bache limita al 50 %. Los umbrales no son límites de crédito validados. Cambiar los supuestos genera propuestas distintas; las decisiones anteriores quedan en el registro.</p>
        </div>
      </div>
    </details>
  );
}

function NumberField({ name, label, value, max, step }: { name: string; label: string; value: number; max: number; step: number }) {
  return <label className="text-xs text-ink-dim">{label}<input required name={name} type="number" min={0} max={max} step={step} defaultValue={value} className="mt-1.5 block w-full rounded-lg border border-line bg-panel px-3 py-2 text-ink" /></label>;
}

function EntityDetail({ entity: e, snaps, after }: { entity: Entity; snaps: Snapshot[]; after: number | null }) {
  const history = snaps.slice(-12).map((s) => ({ month: s.month, entity: s.entities.find((row) => row.companyId === e.companyId) }));
  const x = (i: number) => 12 + i / Math.max(1, history.length - 1) * 456;
  const y = (score: number) => 100 - score * 0.85;
  const segments = history.slice(1).flatMap((point, i) => {
    const previous = history[i].entity?.score;
    const current = point.entity?.score;
    return previous != null && current != null ? [<line key={point.month} x1={x(i)} x2={x(i + 1)} y1={y(previous)} y2={y(current)} stroke="var(--color-accent)" strokeWidth={2} />] : [];
  });
  return (
    <div className="grid gap-6 rounded-2xl border border-line bg-panel p-6 md:grid-cols-2">
      <div><div className="flex flex-wrap items-center gap-3"><h3 className="text-lg font-semibold">{e.companyId}</h3><TrendBadge entity={e} /></div><p className="mt-4 text-sm leading-relaxed">{e.reason}</p><p className="mt-3 text-xs leading-relaxed text-ink-dim"><strong>Explicación del modelo:</strong> {e.explanation || "Sin explicación disponible para este mes."}</p><dl className="mt-5 space-y-2 text-xs"><AmountRow label="Reserva del escenario" value={e.reserveEur} /><AmountRow label="Mayor caída de caja mensual reciente" value={e.recentDrawdownEur} /><div className="flex justify-between gap-4"><dt>Caja si se aplicara el plan activo</dt><dd className="font-mono">{after === null ? "—" : eur(after)}</dd></div></dl></div>
      <div><div className="flex items-center justify-between text-xs"><span className="font-medium">Evolución del score · escala 0–100</span><span className="text-ink-dim">{e.delta3m === null ? "Sin comparación a 3 meses" : `${signed(e.delta3m)} puntos / 3 meses`}</span></div><svg viewBox="0 0 480 120" className="mt-4 w-full" role="img" aria-label={`Evolución del score de ${e.companyId}; score actual ${scoreText(e.score)}`}><line x1={12} x2={468} y1={100} y2={100} stroke="var(--color-line-soft)" /><line x1={12} x2={468} y1={15} y2={15} stroke="var(--color-line-soft)" />{segments}{history.map((point, i) => point.entity?.score == null ? null : <circle key={point.month} cx={x(i)} cy={y(point.entity.score)} r={3} fill="var(--color-accent)"><title>{monthLabel(point.month)}: {scoreText(point.entity.score)}</title></circle>)}</svg><div className="flex justify-between font-mono text-[10px] text-ink-mute"><span>{history[0] ? monthLabel(history[0].month) : ""}</span><span>{history.at(-1) ? monthLabel(history.at(-1)!.month) : ""}</span></div><p className="mt-4 text-xs leading-relaxed text-ink-dim">Solo historia disponible hasta el mes seleccionado. “Posible bache” es una regla de trayectoria, no una recuperación confirmada ni una promesa de anticipación.</p></div>
    </div>
  );
}

function TrendBadge({ entity: e }: { entity: Entity }) {
  const trend = TREND[e.trend];
  return <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-medium ${trend.color}`}>{trend.label}{e.delta3m !== null && <span className="font-mono">{signed(e.delta3m)}</span>}</span>;
}

function Kpi({ value, label, note, tone = "text-ink" }: { value: string; label: string; note: string; tone?: string }) {
  return <div className="rounded-2xl border border-line bg-panel p-5"><h2 className="text-xs font-medium text-ink-dim">{label}</h2><div className={`mt-3 font-mono text-2xl font-semibold tracking-tight ${tone}`}>{value}</div><p className="mt-2 text-[11px] text-ink-mute">{note}</p></div>;
}

function AmountRow({ label, value }: { label: string; value: number }) {
  return <div className="flex justify-between gap-4"><dt>{label}</dt><dd className="shrink-0 font-mono">{eur(value)}</dd></div>;
}
