"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { DEFAULT_SETTINGS, type PoolEconomics, type PoolSettings } from "@/lib/cashpool";
import type { PoolOpportunity } from "@/lib/products/pooling";
import { eur, fmtMoney, formatScore, monthLabel } from "@/lib/format";

export function PoolEconomicsHeader({ economics: e, settings, scope = "group" }: { economics: PoolEconomics; settings: PoolSettings; scope?: "group" | "all" }) {
  const metrics = [
    { label: "Necesidad de caja", value: e.needEur, tone: "text-pos", note: "Lo que falta hasta las reservas del escenario" },
    { label: "Capital movilizable", value: e.movableEur, tone: "text-ink", note: "Disponible tras reservas y límites; no todo puede asignarse" },
    { label: "Ahorro neto estimado", value: e.netSavingEur, tone: "text-good", note: `${settings.days} días · después de oportunidad y comisiones` },
  ];
  return (
    <section aria-label="Impacto económico del cash pooling" className="space-y-3">
      <div className="grid gap-px overflow-hidden rounded-2xl border border-line bg-line-soft lg:grid-cols-3">
        {metrics.map((metric) => <div key={metric.label} className="min-w-0 bg-panel p-5"><h3 className="text-xs font-medium uppercase tracking-wide text-ink-mute">{metric.label}</h3><p title={e.cashKnown ? eur(metric.value) : "Sin saldos válidos"} className={`mt-2 font-mono text-4xl font-semibold tracking-tight ${metric.tone}`}>{e.cashKnown ? fmtMoney(metric.value) : "—"}</p><p className="mt-2 text-xs text-ink-dim">{metric.note}</p></div>)}
      </div>
      <details className="text-xs text-ink-mute">
        <summary className="cursor-pointer">Cómo se calcula · {settings.days} días · financiación {settings.bankRate} % · depósito {settings.depositRate} %</summary>
        <div className="mt-3 space-y-2 leading-relaxed">
          <p>Necesidad = brecha hasta la reserva de cada filial, no deuda bancaria observada. El plan cubre {eur(e.proposedEur)} y deja {eur(e.uncoveredEur)} pendientes entre los saldos conocidos. Ahorro = {eur(e.bankInterestEur)} de interés externo evitado − {eur(e.opportunityCostEur)} de rentabilidad sacrificada − {eur(e.feeEur)} de comisiones.</p>
          <p>Reserva mínima: {eur(settings.reserveEur)} por filial, ampliable por caídas históricas de caja. Comisión: {eur(settings.transferFeeEur)} por transferencia. {scope === "all" ? "Totales de todos los grupos, también al buscar. Se suman planes independientes, sin prestar entre grupos." : "Solo propuestas no rechazadas. Aprobar no ejecuta transferencias."} Ahorro del grupo, no beneficio de Embat; antes de impuestos, costes legales y pérdidas de crédito.</p>
        </div>
      </details>
    </section>
  );
}

export default function CashPoolGroups({ groups, totals, month, months }: { groups: PoolOpportunity[]; totals: PoolEconomics; month: string; months: string[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [query, setQuery] = useState("");
  const visible = groups.filter((g) => g.group_id.toLowerCase().includes(query.trim().toLowerCase()));
  const field = "rounded-lg border border-line bg-panel px-3 py-2 text-xs text-ink";
  return (
    <main className="mx-auto max-w-7xl space-y-6 py-4" aria-busy={pending}>
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div><Link href="/productos" className="text-xs text-ink-mute hover:text-accent">← Productos</Link><h1 className="mt-4 text-3xl font-semibold tracking-tight">Cash pooling de grupos</h1><p className="mt-2 text-sm text-ink-dim">Elige un grupo y revisa cuánto puede cubrir con su propia caja antes de financiarse fuera.</p></div>
        <label className="flex items-center gap-2 text-xs text-ink-dim">Mes<select id="pooling-month" value={month} disabled={pending} onChange={(e) => startTransition(() => router.push(`/productos/cash-pooling?month=${encodeURIComponent(e.target.value)}`))} className={field}>{[...months].reverse().map((m) => <option key={m} value={m}>{monthLabel(m)}</option>)}</select></label>
      </header>
      <PoolEconomicsHeader economics={totals} settings={DEFAULT_SETTINGS} scope="all" />
      <p className="rounded-xl border border-warn/20 bg-warn-dim/50 px-4 py-3 text-xs leading-relaxed text-ink-dim"><strong>Simulación, no ejecución bancaria.</strong> {totals.cashKnown}/{totals.totalEntities} filiales con saldo válido. Importes orientativos en EUR; monedas de cuenta pendientes de validar.</p>
      <section aria-labelledby="pool-groups-title" className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-3"><div><h2 id="pool-groups-title" className="text-xl font-semibold">Elige un grupo</h2><p className="mt-1 text-xs text-ink-mute">{groups.length} grupos con varias filiales · ordenados por ahorro estimado</p></div><label className="flex min-w-0 flex-col gap-1 text-xs text-ink-dim">Buscar grupo<input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Ej. GROUP_0087" className={field} /></label></div>
        <p className="text-xs text-ink-mute" aria-live="polite">{pending ? "Actualizando mes…" : `${visible.length} grupos encontrados`}</p>
        <div className="relative overflow-x-auto rounded-xl border border-line bg-panel">
          <table className="w-full whitespace-nowrap text-left text-xs"><caption className="sr-only">Grupos, índice descriptivo, necesidad, capital movilizable y ahorro estimado a {DEFAULT_SETTINGS.days} días</caption>
            <thead className="border-b border-line bg-panel-2 text-ink-dim"><tr>{["Grupo", "Índice / 100", "Necesidad", "Movilizable", "Ahorro estimado", ""].map((label) => <th key={label} scope="col" className="px-4 py-3 font-medium">{label || <span className="sr-only">Acción</span>}</th>)}</tr></thead>
            <tbody className="divide-y divide-line-soft">{visible.map((g) => <tr key={g.group_id} className="hover:bg-panel-2/50">
              <th scope="row" className="px-4 py-4 font-normal"><span className="font-mono font-semibold">{g.group_id}</span><span className="mt-1 block text-[10px] text-ink-mute">{g.n} filiales · {g.economics.cashKnown}/{g.n} con saldo · {g.curs || "Divisa sin informar"}</span></th>
              <td className="px-4 py-4 font-mono">{g.score === null ? "—" : formatScore(g.score)}<span className="mt-1 block text-[10px] text-ink-mute">{g.scored}/{g.n} con score</span></td>
              {[g.economics.needEur, g.economics.movableEur, g.economics.netSavingEur].map((amount, i) => <td key={i} title={g.economics.cashKnown ? eur(amount) : "Sin saldos válidos"} className={`px-4 py-4 font-mono ${i === 2 ? "font-semibold text-good" : ""}`}>{g.economics.cashKnown ? fmtMoney(amount) : "—"}</td>)}
              <td className="px-4 py-4"><Link prefetch={false} href={`/productos/cash-pooling?group=${encodeURIComponent(g.group_id)}&month=${encodeURIComponent(month)}`} aria-label={`Analizar ${g.group_id}`} className="font-semibold text-accent hover:underline">Ver grupo →</Link></td>
            </tr>)}</tbody>
          </table>
        </div>
        {visible.length === 0 && <p className="py-6 text-center text-sm text-ink-dim">{groups.length ? "No hay grupos que coincidan con la búsqueda." : "No hay grupos con varias filiales."}</p>}
      </section>
    </main>
  );
}
