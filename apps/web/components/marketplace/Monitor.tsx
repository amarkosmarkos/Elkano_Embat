"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMarketplace, type Deal } from "@/lib/products/marketplace/store";
import { componentsAt } from "@/lib/products/marketplace/portfolio";
import { monitorSnapshot, portfolioTrajectory, type PositionStatus, type PositionTimeline } from "@/lib/products/marketplace/monitor";
import { ACTION_META, applyActions, recommend, revalue, type ActionKind, type Recommendation } from "@/lib/products/marketplace/actions";
import { price } from "@/lib/products/marketplace/pricing";
import { Card, Empty } from "@/components/ui/Card";
import { Pill } from "@/components/ui/Pill";
import { Sparkline } from "@/components/ui/Sparkline";
import { LineChart } from "@/components/charts/LineChart";
import { ComponentBars } from "./ComponentBars";
import { Btn, Pager, Seg, Skeleton, Stat } from "./ui";
import { scoreColor, DIM_COLOR } from "@/lib/score/colors";
import { DIM_LABEL } from "@/lib/score/meta";
import { fmtDelta, fmtMoney, monthLabel, monthLabelLong } from "@/lib/format";

const STATUS: Record<PositionStatus, { label: string; tone: "bad" | "good" | "warn" | "neutral" }> = { deteriorating: { label: "Deteriorando", tone: "bad" }, improving: { label: "Mejorando", tone: "good" }, watch: { label: "Vigilar", tone: "warn" }, stable: { label: "Estable", tone: "neutral" } };
const PER_PAGE = 4;
const rank = (s: PositionStatus) => (s === "deteriorating" ? 0 : s === "watch" ? 1 : s === "improving" ? 2 : 3);
const pct = (v: number, d = 2) => `${(v * 100).toFixed(d).replace(".", ",")} %`;
const ICON: Record<ActionKind, string> = { pause: "⏸", reduce: "↓", review: "⌕", monitor: "–", increase: "↑" };

/**
 * Paso 5 · monitor de una operación cerrada: reproduce los scores reales mes a mes, recalcula PD, pérdida
 * esperada y rendimiento neto con cada mes, y propone acciones (reducir, pausar, revisar, aumentar,
 * adelantar cobro) que cambian la operación de verdad.
 */
export default function Monitor({ dealId, initialTab }: { dealId: string | null; initialTab: "seguimiento" | "acciones" }) {
  const { network, deals, activeDealId, setActiveDeal, setDealMonth, executeOnDeal, undoDeal, effectiveOf, byId } = useMarketplace();
  const router = useRouter();
  const deal: Deal | null = useMemo(() => deals.find((d) => d.id === (dealId ?? activeDealId)) ?? deals[0] ?? null, [deals, dealId, activeDealId]);
  useEffect(() => { if (deal && deal.id !== activeDealId) setActiveDeal(deal.id); }, [deal, activeDealId, setActiveDeal]);
  const [tab, setTab] = useState<"seguimiento" | "acciones">(initialTab);
  const [playing, setPlaying] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [page, setPage] = useState(0);

  const months = network?.months ?? [];
  const cal = network?.calibration ?? [];
  const base = deal?.result ?? null;
  const effective = useMemo(() => (deal ? effectiveOf(deal) : null), [deal, effectiveOf]);
  const startIdx = base ? months.indexOf(base.config.asOf) : -1;
  const curMonth = deal?.monitorMonth && months.includes(deal.monitorMonth) ? deal.monitorMonth : base?.config.asOf ?? null;
  const curIdx = curMonth ? months.indexOf(curMonth) : -1;
  const lastIdx = months.length - 1;
  useEffect(() => { if (!playing || !deal) return; if (curIdx >= lastIdx) { setPlaying(false); return; } const t = setTimeout(() => setDealMonth(deal.id, months[curIdx + 1]), 1200); return () => clearTimeout(t); }, [playing, curIdx, lastIdx, months, deal, setDealMonth]);

  const snapshot = useMemo(() => (network && effective && curMonth ? monitorSnapshot(network, effective, curMonth) : null), [network, effective, curMonth]);
  const baseSnapshot = useMemo(() => (network && base && curMonth ? monitorSnapshot(network, base, curMonth) : null), [network, base, curMonth]);
  const trajectory = useMemo(() => (network && effective ? portfolioTrajectory(network, effective) : []), [network, effective]);
  // economía recalculada con los scores del mes del monitor (misma cartera, PD y pérdida esperada de hoy)
  const now = useMemo(() => (effective && snapshot ? revalue(effective, snapshot, cal) : null), [effective, snapshot, cal]);
  const nowBefore = useMemo(() => (base && baseSnapshot ? revalue(base, baseSnapshot, cal) : null), [base, baseSnapshot, cal]);
  const meaningful = useMemo(() => (snapshot ? snapshot.positions.filter((t) => t.meaningful).sort((a, b) => rank(a.status) - rank(b.status) || a.delta - b.delta) : []), [snapshot]);
  const recs = useMemo(() => (baseSnapshot && network ? recommend(baseSnapshot, network) : []), [baseSnapshot, network]);
  const actionable = useMemo(() => recs.filter((r) => r.kind !== "monitor"), [recs]);
  const doneIds = useMemo(() => new Set((deal?.executed ?? []).filter((e) => e.month === curMonth).map((e) => e.id)), [deal, curMonth]);
  const allAfter = useMemo(() => (base && baseSnapshot && curMonth ? revalue(applyActions(base, actionable.map((r) => ({ id: r.id, kind: r.kind, multiplier: r.multiplier, month: curMonth, scoreThen: r.timeline.scoreNow })), cal), baseSnapshot, cal) : null), [base, baseSnapshot, actionable, curMonth, cal]);
  useEffect(() => { setPage((p) => Math.min(p, Math.max(0, Math.ceil(meaningful.length / PER_PAGE) - 1))); }, [meaningful.length]);

  if (!network) return <Skeleton className="h-[520px]" />;
  if (!deal || !base || !effective || !snapshot || !curMonth || !now || !nowBefore) {
    return <Card><div className="flex flex-col items-center py-14 text-center"><div className="text-[18px] font-semibold text-ink">No hay operaciones cerradas que monitorizar.</div><p className="mt-2 max-w-md text-[14px] text-ink-mute">Cierra una operación en el paso 4 y aquí verás cómo evolucionan su riesgo y su beneficio mes a mes, con acciones cuando algo se mueve.</p><Btn className="mt-5" onClick={() => router.push("/productos/marketplace")}>Ir al paso 1</Btn></div></Card>;
  }

  const elapsed = curIdx - startIdx;
  const e0 = base.economics, eNow = now.economics;
  const stable = snapshot.positions.filter((t) => !t.meaningful);
  const trajMonths = trajectory.map((t) => t.month);
  const trajSeries = trajectory.map((t, i) => (i <= elapsed ? t.avg : null));
  const pageItems = meaningful.slice(page * PER_PAGE, (page + 1) * PER_PAGE);
  const exp = expanded ? snapshot.positions.find((t) => t.position.id === expanded) ?? null : null;
  const comps = (id: string, m: string) => componentsAt(byId.get(id)!, months.indexOf(m));
  const pending = actionable.filter((r) => !doneIds.has(r.id));
  const run = (r: Recommendation) => executeOnDeal(deal.id, { id: r.id, kind: r.kind, multiplier: r.multiplier, month: curMonth, scoreThen: r.timeline.scoreNow });
  const freed = Math.max(0, base.allocated - effective.allocated);

  return (
    <div className="flex flex-col gap-4">
      <div className="card flex flex-wrap items-center gap-5 px-6 py-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-[12px] text-ink-mute">
            <span>Operación</span>
            {deals.length > 1 && <select value={deal.id} onChange={(e) => router.push(`/productos/marketplace/monitor?deal=${e.target.value}`)} className="rounded-lg border border-line bg-panel px-2 py-0.5 text-[12px] text-ink">{deals.map((d) => <option key={d.id} value={d.id}>{d.lenderName} → {d.result.positions.length} · {monthLabel(d.result.config.asOf)}</option>)}</select>}
            <Link href="/productos/marketplace/operaciones" className="hover:text-ink">todas →</Link>
          </div>
          <div className="text-[18px] font-semibold text-ink">{deal.lenderName} → {base.positions.length} receptoras · {fmtMoney(e0.amount)} · {base.config.term} m</div>
          <div className="text-[13px] text-ink-mute">{elapsed === 0 ? `Día uno: cerrada en ${monthLabelLong(base.config.asOf).toLowerCase()}.` : `${monthLabelLong(curMonth)} · ${elapsed} mes${elapsed > 1 ? "es" : ""} después del cierre.`}</div>
        </div>
        <div className="flex min-w-[260px] flex-1 flex-wrap gap-1">{months.slice(startIdx).map((m, i) => <button key={m} type="button" onClick={() => { setPlaying(false); setDealMonth(deal.id, m); }} className={`num rounded-lg border px-2 py-0.5 text-[11px] transition-colors ${i === elapsed ? "border-ink bg-ink text-panel" : i < elapsed ? "border-line bg-panel-2 text-ink-dim" : "border-line-soft text-ink-mute hover:text-ink"}`}>{monthLabel(m)}</button>)}</div>
        <div className="flex shrink-0 items-center gap-1.5">
          <Btn variant="outline" size="sm" onClick={() => setDealMonth(deal.id, months[startIdx])} disabled={curIdx <= startIdx}>⏮</Btn>
          <Btn size="sm" onClick={() => setPlaying((p) => !p)} disabled={curIdx >= lastIdx && !playing}>{playing ? "Pausar" : curIdx >= lastIdx ? "Fin de los datos" : "Avanzar el tiempo"}</Btn>
          <Btn variant="outline" size="sm" onClick={() => setDealMonth(deal.id, months[Math.min(lastIdx, curIdx + 1)])} disabled={curIdx >= lastIdx}>⏭</Btn>
        </div>
      </div>

      <div className="card px-6 py-4">
        <div className="mb-3 flex items-center justify-between"><div className="text-[15px] font-semibold text-ink">Riesgo y beneficio recalculados a {monthLabelLong(curMonth).toLowerCase()}</div><div className="text-[12px] text-ink-mute">al cierre → hoy · con los scores reales del mes{deal.executed.length > 0 ? ` · ${deal.executed.length} acción${deal.executed.length > 1 ? "es" : ""} aplicada${deal.executed.length > 1 ? "s" : ""}` : ""}</div></div>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-6">
          <Delta label="Score de la cartera" a={e0.amount > 0 ? base.avgScore : 0} b={snapshot.avgNow} fmt={(v) => v.toFixed(1)} good="up" />
          <Delta label="PD media" a={e0.avgPd} b={eNow.avgPd} fmt={(v) => pct(v, 1)} good="down" />
          <Delta label="Pérdida esperada" a={e0.expectedLoss} b={eNow.expectedLoss} fmt={(v) => fmtMoney(v)} good="down" />
          <Delta label="Rendimiento neto" a={e0.netYield} b={eNow.netYield} fmt={(v) => pct(v)} good="up" />
          <Delta label="Beneficio neto" a={e0.lenderNet} b={eNow.lenderNet} fmt={(v) => fmtMoney(v)} good="up" />
          <Delta label="Capital expuesto" a={e0.amount} b={eNow.amount} fmt={(v) => fmtMoney(v)} good="none" />
        </div>
      </div>

      <Seg value={tab} onChange={setTab} options={[{ value: "seguimiento", label: "Seguimiento" }, { value: "acciones", label: <span>Acciones{pending.length > 0 && <span className="num ml-1.5 rounded-full bg-bad/20 px-1.5 text-[11px] text-bad">{pending.length}</span>}</span> }]} />

      {tab === "seguimiento" && (
        <>
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-[360px_minmax(0,1fr)]">
            <Card>
              <div className="grid grid-cols-2 gap-4">
                <div><div className="text-[13px] text-ink-mute">Score de la cartera</div><div className="flex items-baseline gap-2"><span className="num text-[34px] font-semibold leading-none" style={{ color: scoreColor(snapshot.avgNow) }}>{snapshot.avgNow.toFixed(1)}</span><span className={`num text-[14px] font-medium ${snapshot.weightedDelta >= 0 ? "text-good" : "text-bad"}`}>{fmtDelta(snapshot.weightedDelta)}</span></div><div className="text-[12px] text-ink-mute">era {snapshot.avgAtAllocation.toFixed(1)} al cierre</div></div>
                <Stat label="Estrés esperado" value={pct(snapshot.expectedStressNow, 1)} hint={`era ${pct(effective.expectedStress, 1)}`} tone={snapshot.expectedStressNow > effective.expectedStress + 0.02 ? "bad" : undefined} />
              </div>
              <div className="mt-5 grid grid-cols-4 gap-2">{[["Caen", snapshot.nDeteriorating, "text-bad"], ["Vigilar", snapshot.nWatch, "text-warn"], ["Suben", snapshot.nImproving, "text-good"], ["Alertas", snapshot.nAlerts, "text-bad"]].map(([l, n, c]) => <div key={l as string} className="rounded-lg bg-panel-2 px-3 py-2"><div className={`num text-[20px] font-semibold leading-none ${(n as number) > 0 ? c : "text-ink-mute"}`}>{n as number}</div><div className="mt-1 text-[11px] text-ink-mute">{l as string}</div></div>)}</div>
            </Card>
            <Card title="Trayectoria de la cartera" sub="score medio ponderado, reproducido con los scores mensuales reales" right={snapshot.exposureDeteriorating > 0 ? <span className="text-[12px] text-bad"><span className="num font-medium">{pct(snapshot.exposureDeteriorating, 0)}</span> del capital está en nombres que se deterioran</span> : undefined}>
              <LineChart months={trajMonths} series={[{ id: "avg", label: "Score medio", color: "#e5e5e5", values: trajSeries, area: true }]} yMin={Math.max(0, Math.min(...trajectory.map((t) => t.avg)) - 12)} yMax={100} height={170} legend={false} marker={elapsed} />
            </Card>
          </div>
          <Card title={meaningful.length === 0 ? "Nada material todavía" : `${meaningful.length} ${meaningful.length > 1 ? "posiciones" : "posición"} con movimiento material`} sub="qué se movió, por qué dimensión y desde cuándo · pincha para el detalle" right={<div className="flex items-center gap-2">{meaningful.length > PER_PAGE && <Pager page={page} pageSize={PER_PAGE} total={meaningful.length} onChange={setPage} />}{pending.length > 0 && <Btn size="sm" onClick={() => setTab("acciones")}>{pending.length} acciones →</Btn>}</div>}>
            {meaningful.length === 0 ? <p className="py-6 text-center text-[13px] text-ink-mute">Los scores se mueven dentro de su rango normal. Avanza el tiempo.</p> : <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">{pageItems.map((t) => <ChangeCard key={t.position.id} t={t} cal={cal} term={base.config.term} onOpen={() => setExpanded(t.position.id)} />)}</div>}
            {stable.length > 0 && <div className="mt-4 flex items-center gap-3 border-t border-line-soft pt-3"><span className="shrink-0 text-[12px] text-ink-mute">En rango</span><div className="flex min-w-0 flex-1 flex-wrap gap-1.5">{stable.map((t) => <button type="button" key={t.position.id} onClick={() => setExpanded(t.position.id)} className="flex items-center gap-2 rounded-lg border border-line-soft px-2 py-1 text-[12px] hover:bg-panel-2"><span className="max-w-[140px] truncate text-ink-dim">{t.position.name}</span><span className="num font-medium" style={{ color: scoreColor(t.scoreNow) }}>{t.scoreNow.toFixed(0)}</span><span className={`num text-[11px] ${t.delta >= 0 ? "text-good" : "text-bad"}`}>{fmtDelta(t.delta)}</span></button>)}</div></div>}
          </Card>
        </>
      )}

      {tab === "acciones" && (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.35fr_1fr]">
          <Card title={actionable.length === 0 ? "Nada que hacer: seguir monitorizando." : pending.length === 0 ? "Todas las recomendaciones ejecutadas." : `${pending.length} ${pending.length > 1 ? "recomendaciones" : "recomendación"} esperando tu orden`} sub="cada una responde a un cambio real en el score, la PD o las alarmas de la receptora" right={<div className="flex gap-2"><Btn variant="outline" size="sm" onClick={() => undoDeal(deal.id)} disabled={deal.executed.length === 0}>Deshacer todo</Btn><Btn size="sm" onClick={() => pending.forEach(run)} disabled={pending.length === 0}>Ejecutar todo{pending.length > 0 ? ` (${pending.length})` : ""}</Btn></div>}>
            <div className="flex flex-col gap-2">
              {actionable.map((r) => <RecRow key={r.id} r={r} done={doneIds.has(r.id)} onRun={() => run(r)} cal={cal} term={base.config.term} />)}
              {actionable.length === 0 && <Empty>Todas las posiciones están dentro de su rango normal en {monthLabelLong(curMonth).toLowerCase()}.</Empty>}
            </div>
          </Card>
          <Card title="Efecto sobre la operación" sub="ahora → con lo ejecutado · y si se ejecutara todo">
            <p className="text-[12px] text-ink-mute">Reducir, pausar y revisar devuelven capital a la tesorería del prestamista; aumentar crece la posición hasta el tope. Riesgo y beneficio se recalculan con los scores de este mes.</p>
            <div className="mt-3 divide-y divide-line-soft border-y border-line-soft">
              <Row label="Score de la cartera" before={nowBefore.avgScore} after={now.avgScore} all={allAfter?.avgScore} fmt={(v) => v.toFixed(1)} good="up" />
              <Row label="PD media" before={nowBefore.economics.avgPd} after={now.economics.avgPd} all={allAfter?.economics.avgPd} fmt={(v) => pct(v, 1)} good="down" />
              <Row label="Pérdida esperada" before={nowBefore.economics.expectedLoss} after={now.economics.expectedLoss} all={allAfter?.economics.expectedLoss} fmt={(v) => fmtMoney(v)} good="down" />
              <Row label="Rendimiento neto" before={nowBefore.economics.netYield} after={now.economics.netYield} all={allAfter?.economics.netYield} fmt={(v) => pct(v)} good="up" />
              <Row label="Beneficio neto" before={nowBefore.economics.lenderNet} after={now.economics.lenderNet} all={allAfter?.economics.lenderNet} fmt={(v) => fmtMoney(v)} good="up" />
              <Row label="Capital expuesto" before={nowBefore.allocated} after={now.allocated} all={allAfter?.allocated} fmt={(v) => fmtMoney(v)} good="none" />
              <Row label="Comisión Embat" before={nowBefore.economics.embatFee} after={now.economics.embatFee} all={allAfter?.economics.embatFee} fmt={(v) => fmtMoney(v)} good="none" />
            </div>
            {freed > 0 && <div className="mt-3 rounded-lg border border-line bg-panel-2 px-3 py-2 text-[13px]"><span className="num font-medium text-ink">{fmtMoney(freed)}</span> <span className="text-ink-mute">de vuelta en la tesorería de {deal.lenderName}.</span></div>}
            <div className="mt-4 text-[13px] text-ink-mute">Registro</div>
            <div className="mt-1 space-y-1">
              {deal.executed.length === 0 && <div className="text-[12px] text-ink-mute">Las órdenes que ejecutes aparecen aquí.</div>}
              {deal.executed.slice().reverse().map((e, i) => { const p = base.positions.find((x) => x.id === e.id); const tone = ACTION_META[e.kind].tone; return <div key={`${e.id}-${e.month}-${i}`} className="flex items-center gap-2 text-[12.5px]"><span className={`w-16 shrink-0 font-medium ${tone === "good" ? "text-good" : tone === "warn" ? "text-warn" : "text-bad"}`}>{ACTION_META[e.kind].verb}</span><span className="truncate text-ink-dim">{p?.name ?? e.id}</span><span className="num ml-auto shrink-0 text-[11px] text-ink-mute">{monthLabel(e.month)} · {e.multiplier < 1 ? `−${Math.round((1 - e.multiplier) * 100)} %` : `+${Math.round((e.multiplier - 1) * 100)} %`}</span></div>; })}
            </div>
          </Card>
        </div>
      )}

      {exp && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/60" onClick={() => setExpanded(null)}>
          <div className="card flex h-full w-[560px] max-w-full flex-col overflow-y-auto rounded-none p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between gap-4">
              <div><Pill tone={STATUS[exp.status].tone}>{STATUS[exp.status].label}</Pill><div className="mt-2 text-[20px] font-semibold text-ink">{exp.position.name}</div><div className="num text-[12px] text-ink-mute">{exp.position.id} · {fmtMoney(exp.position.amount)} · {(exp.position.weight * 100).toFixed(1)} % del capital</div></div>
              <div className="flex items-start gap-3"><div className="text-right"><div className="flex items-baseline gap-2"><span className="num text-[16px] text-ink-mute line-through">{exp.scoreAtAllocation.toFixed(0)}</span><span className="num text-[32px] font-semibold" style={{ color: scoreColor(exp.scoreNow) }}>{exp.scoreNow.toFixed(0)}</span></div><div className={`num text-[12px] ${exp.delta >= 0 ? "text-good" : "text-bad"}`}>{fmtDelta(exp.delta)} desde el cierre</div></div><button type="button" onClick={() => setExpanded(null)} className="flex h-8 w-8 items-center justify-center rounded-lg border border-line text-ink-mute hover:text-ink">✕</button></div>
            </div>
            <PriceDelta amount={exp.position.amount} before={exp.scoreAtAllocation} after={exp.scoreNow} term={base.config.term} cal={cal} />
            <div className="mt-5"><div className="text-[13px] text-ink-mute">Dimensiones · {monthLabel(base.config.asOf)} → {monthLabel(curMonth)} · punteado = al cierre, sólido = ahora</div><div className="mt-3"><ComponentBars components={comps(exp.position.id, curMonth)} compare={comps(exp.position.id, base.config.asOf)} /></div></div>
            <div className="mt-5"><div className="text-[13px] text-ink-mute">Mes a mes</div><div className="mt-2 space-y-1">{exp.windowMonths.map((m, i) => { const v = exp.window[i], prev = i > 0 ? exp.window[i - 1] : null; const d = v != null && prev != null ? v - prev : null; return <div key={m} className="flex items-center gap-3 text-[12.5px]"><span className="num w-14 text-ink-mute">{monthLabel(m)}</span><div className="h-2 flex-1 overflow-hidden rounded-full bg-panel-2"><div className="h-full rounded-full" style={{ width: `${v ?? 0}%`, background: scoreColor(v) }} /></div><span className="num w-8 text-right font-medium text-ink">{v?.toFixed(0) ?? "—"}</span><span className={`num w-12 text-right ${d == null ? "text-ink-mute" : d >= 0 ? "text-good" : "text-bad"}`}>{d == null ? "" : fmtDelta(d)}</span></div>; })}</div></div>
            <div className="mt-auto flex items-center justify-between border-t border-line-soft pt-4 text-[13px] text-ink-mute"><span>{exp.persistent ? "Movimiento persistente." : exp.delta <= -8 ? "Movimiento reciente: podría ser un mes puntual." : ""}</span><Link href={`/empresas/${exp.position.id}`} className="text-ink hover:underline">Ficha completa →</Link></div>
          </div>
        </div>
      )}
    </div>
  );
}

function Delta({ label, a, b, fmt, good }: { label: string; a: number; b: number; fmt: (v: number) => string; good: "up" | "down" | "none" }) {
  const d = b - a;
  const cls = good === "none" || Math.abs(d) < 1e-9 ? "text-ink" : (good === "up" ? d > 0 : d < 0) ? "text-good" : "text-bad";
  return <div><div className="text-[12px] text-ink-mute">{label}</div><div className={`num text-[20px] font-semibold leading-tight ${cls}`}>{fmt(b)}</div><div className="num text-[11px] text-ink-mute">al cierre {fmt(a)}</div></div>;
}

function Row({ label, before, after, all, fmt, good }: { label: string; before: number; after: number; all?: number; fmt: (v: number) => string; good: "up" | "down" | "none" }) {
  const d = after - before;
  const cls = good === "none" || Math.abs(d) < 1e-9 ? "text-ink" : (good === "up" ? d > 0 : d < 0) ? "text-good" : "text-bad";
  return <div className="flex items-center justify-between py-2 text-[13px]"><span className="text-ink-mute">{label}</span><div className="flex items-center gap-2"><span className="num text-ink-mute">{fmt(before)}</span><span className="text-ink-mute">→</span><span className={`num font-medium ${cls}`}>{fmt(after)}</span>{all != null && <span className="num text-[11px] text-ink-mute">· {fmt(all)}</span>}</div></div>;
}

/** Cómo cambia el precio de una posición al recalcularla con el score de hoy. */
function PriceDelta({ amount, before, after, term, cal }: { amount: number; before: number; after: number; term: 3 | 6 | 12; cal: import("@/lib/products/marketplace/pricing").CalibrationRow[] }) {
  const p0 = price(amount, before, term, cal), p1 = price(amount, after, term, cal);
  const cell = (l: string, a: number, b: number, fmt: (v: number) => string, good: "up" | "down") => { const d = b - a; const cls = Math.abs(d) < 1e-9 ? "text-ink" : (good === "up" ? d > 0 : d < 0) ? "text-good" : "text-bad"; return <div className="rounded-lg bg-panel-2 px-3 py-2"><div className="text-[11px] text-ink-mute">{l}</div><div className={`num text-[14px] font-medium ${cls}`}>{fmt(b)}</div><div className="num text-[10.5px] text-ink-mute">cierre {fmt(a)}</div></div>; };
  return <div className="mt-4 grid grid-cols-4 gap-2">{cell(`PD a ${term} m`, p0.pd, p1.pd, (v) => pct(v, 1), "down")}{cell("Pérdida esperada", p0.expectedLoss, p1.expectedLoss, (v) => fmtMoney(v), "down")}{cell("Tipo de mercado hoy", p0.rate, p1.rate, (v) => pct(v, 1), "down")}{cell("Neto esperado", p0.lenderNet, p1.lenderNet, (v) => fmtMoney(v), "up")}</div>;
}

function ChangeCard({ t, cal, term, onOpen }: { t: PositionTimeline; cal: import("@/lib/products/marketplace/pricing").CalibrationRow[]; term: 3 | 6 | 12; onOpen: () => void }) {
  const meta = STATUS[t.status];
  const color = scoreColor(t.scoreNow);
  const p0 = price(t.position.amount, t.scoreAtAllocation, term, cal), p1 = price(t.position.amount, t.scoreNow, term, cal);
  return (
    <button type="button" onClick={onOpen} className={`flex flex-col rounded-lg border bg-panel-2/50 p-4 text-left transition-colors hover:bg-panel-2 ${t.status === "deteriorating" ? "border-bad/40" : t.status === "improving" ? "border-good/40" : "border-line-soft"}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0"><div className="flex flex-wrap gap-1.5"><Pill tone={meta.tone}>{meta.label}</Pill>{t.persistent && Math.abs(t.delta) >= 8 && <Pill>Persistente</Pill>}{!t.persistent && t.delta <= -8 && <Pill>Reciente</Pill>}{t.alertNow && <Pill tone="bad">Alerta</Pill>}</div><div className="mt-2 truncate text-[15px] font-semibold text-ink">{t.position.name}</div><div className="num text-[11px] text-ink-mute">{fmtMoney(t.position.amount)} · {(t.position.weight * 100).toFixed(1)} % del capital</div></div>
        <div className="shrink-0 text-right"><div className="flex items-baseline justify-end gap-1.5"><span className="num text-[14px] text-ink-mute line-through">{t.scoreAtAllocation.toFixed(0)}</span><span className="num text-[28px] font-semibold leading-none" style={{ color }}>{t.scoreNow.toFixed(0)}</span></div><div className={`num text-[11px] ${t.delta >= 0 ? "text-good" : "text-bad"}`}>{fmtDelta(t.delta)} desde el cierre</div></div>
      </div>
      <div className="mt-3 flex items-center gap-3">
        <Sparkline values={t.window} width={110} height={30} color={color} min={Math.max(0, Math.min(...t.window.filter((v): v is number => v != null)) - 8)} max={100} />
        <div className="min-w-0 flex-1 space-y-0.5 text-[12px] text-ink-mute">
          <div>PD <span className="num text-ink">{pct(p0.pd, 0)}</span> → <span className={`num ${p1.pd > p0.pd ? "text-bad" : "text-good"}`}>{pct(p1.pd, 0)}</span> · pérdida esperada <span className={`num ${p1.expectedLoss > p0.expectedLoss ? "text-bad" : "text-good"}`}>{fmtMoney(p1.expectedLoss)}</span></div>
          {t.driver && Math.abs(t.driver.delta) >= 2 && <div className="flex items-center gap-1.5 truncate"><span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: DIM_COLOR[t.driver.dim] }} /><span className="text-ink">{DIM_LABEL[t.driver.dim]}</span> {t.driver.delta < 0 ? "resta" : "suma"} <span className="num text-ink">{Math.abs(t.driver.delta).toFixed(1)} pts</span>{t.driverStreak >= 2 && t.driver.delta < 0 && <> · {t.driverStreak} periodos a peor</>}</div>}
          {t.onsetMonth && <div>Empezó en <span className="text-ink">{monthLabelLong(t.onsetMonth).toLowerCase()}</span>{t.declineStreak >= 2 && <> · {t.declineStreak} meses seguidos bajando</>}</div>}
          {t.stressNow > 0 && <div className="text-bad">{t.stressNow} alarma{t.stressNow > 1 ? "s" : ""} de estrés activa{t.stressNow > 1 ? "s" : ""}</div>}
        </div>
      </div>
    </button>
  );
}

function RecRow({ r, done, onRun, cal, term }: { r: Recommendation; done: boolean; onRun: () => void; cal: import("@/lib/products/marketplace/pricing").CalibrationRow[]; term: 3 | 6 | 12 }) {
  const meta = ACTION_META[r.kind];
  const t = r.timeline;
  const p0 = price(t.position.amount, t.scoreAtAllocation, term, cal), p1 = price(t.position.amount, t.scoreNow, term, cal);
  const collect = r.kind === "reduce" || r.kind === "pause";
  return (
    <div className={`flex flex-col gap-3 rounded-lg border p-4 md:flex-row md:items-center ${done ? "border-line-soft opacity-60" : r.severity >= 3 ? "border-bad/40" : r.severity === 2 ? "border-warn/40" : "border-line-soft"}`}>
      <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-panel-2 text-[16px] ${meta.tone === "good" ? "text-good" : meta.tone === "warn" ? "text-warn" : meta.tone === "bad" ? "text-bad" : "text-ink-mute"}`}>{ICON[r.kind]}</div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2"><span className="text-[14px] font-semibold text-ink">{meta.label}</span><Pill>{meta.effect}</Pill>{collect && <Pill tone="warn">adelantar cobro de {fmtMoney(t.position.amount * (1 - r.multiplier))}</Pill>}</div>
        <Link href={`/empresas/${r.id}`} className="mt-0.5 block text-[13px] text-ink-dim hover:text-ink">{t.position.name} <span className="num text-ink-mute">{r.id} · {fmtMoney(t.position.amount)}</span></Link>
        <ul className="mt-1.5 space-y-0.5 text-[12px] text-ink-mute">{r.reasons.slice(0, 3).map((x) => <li key={x}>· {x}</li>)}<li>· PD {pct(p0.pd, 0)} → <span className={p1.pd > p0.pd ? "text-bad" : "text-good"}>{pct(p1.pd, 0)}</span> · pérdida esperada {fmtMoney(p0.expectedLoss)} → <span className={p1.expectedLoss > p0.expectedLoss ? "text-bad" : "text-good"}>{fmtMoney(p1.expectedLoss)}</span></li></ul>
      </div>
      <div className="flex shrink-0 items-center gap-4 md:flex-col md:items-end">
        <div className="text-right"><div className="flex items-baseline gap-1.5"><span className="num text-[12px] text-ink-mute line-through">{t.scoreAtAllocation.toFixed(0)}</span><span className="num text-[22px] font-semibold" style={{ color: scoreColor(t.scoreNow) }}>{t.scoreNow.toFixed(0)}</span></div><div className={`num text-[11px] ${t.delta >= 0 ? "text-good" : "text-bad"}`}>{fmtDelta(t.delta)}</div></div>
        {done ? <Pill tone="good">Ejecutada</Pill> : <Btn size="sm" onClick={onRun}>Ejecutar</Btn>}
      </div>
    </div>
  );
}
