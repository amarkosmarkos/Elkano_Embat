"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMarketplace } from "@/lib/products/marketplace/store";
import { monitorSnapshot } from "@/lib/products/marketplace/monitor";
import { ACTION_META, applyActions, recommend, revalue, type ActionKind, type Recommendation } from "@/lib/products/marketplace/actions";
import { riskLabel } from "@/lib/products/marketplace/portfolio";
import { Card } from "@/components/ui/Card";
import { Pill } from "@/components/ui/Pill";
import { Btn, Pager, Skeleton } from "./ui";
import { scoreColor } from "@/lib/score/colors";
import { fmtDelta, fmtMoney, monthLabel, monthLabelLong } from "@/lib/format";

const PER_PAGE = 5;

/** Una recomendación por posición que se movió, y un botón para ejecutarla sobre la cartera. */
export default function ActionCenter() {
  const { network, result: base, executed, execute, undoActions, monitorMonth, effective: result } = useMarketplace();
  const router = useRouter();
  const [page, setPage] = useState(0);
  const months = network?.months ?? [];
  const curMonth = monitorMonth && months.includes(monitorMonth) ? monitorMonth : base?.config.asOf ?? null;
  const snapshot = useMemo(() => (network && base && curMonth ? monitorSnapshot(network, base, curMonth) : null), [network, base, curMonth]);
  const recs = useMemo(() => (snapshot && network ? recommend(snapshot, network) : []), [snapshot, network]);
  const actionable = useMemo(() => recs.filter((r) => r.kind !== "monitor"), [recs]);
  const doneIds = useMemo(() => new Set(executed.filter((e) => e.month === curMonth).map((e) => e.id)), [executed, curMonth]);
  const before = useMemo(() => (base && snapshot ? revalue(base, snapshot) : null), [base, snapshot]);
  const after = useMemo(() => (result && snapshot ? revalue(result, snapshot) : null), [result, snapshot]);
  const allAfter = useMemo(() => (base && snapshot ? revalue(applyActions(base, actionable.map((r) => ({ id: r.id, kind: r.kind, multiplier: r.multiplier, month: curMonth ?? "", scoreThen: r.timeline.scoreNow }))), snapshot) : null), [base, snapshot, actionable, curMonth]);
  useEffect(() => { setPage((p) => Math.min(p, Math.max(0, Math.ceil(actionable.length / PER_PAGE) - 1))); }, [actionable.length]);

  if (!network) return <Skeleton className="h-[520px]" />;
  if (!base || !result || !snapshot || !before || !after || !curMonth) return <Card><div className="flex flex-col items-center py-14 text-center"><div className="text-[20px] font-semibold text-ink">No hay cartera sobre la que actuar.</div><Btn className="mt-4" onClick={() => router.push("/productos/marketplace/receptores")}>Construir una</Btn></div></Card>;

  const pending = actionable.filter((r) => !doneIds.has(r.id));
  const freed = Math.max(0, before.allocated - after.allocated);
  const pageItems = actionable.slice(page * PER_PAGE, (page + 1) * PER_PAGE);
  const run = (r: Recommendation) => execute({ id: r.id, kind: r.kind, multiplier: r.multiplier, month: curMonth, scoreThen: r.timeline.scoreNow });

  return (
    <div className="flex flex-col gap-4">
      <div className="card flex flex-wrap items-center gap-4 px-6 py-4">
        <Link href="/productos/marketplace/monitor" className="text-[13px] text-ink-mute hover:text-ink">← Monitor</Link>
        <div className="h-5 w-px bg-line-soft" />
        <div className="min-w-0 flex-1"><div className="text-[12px] text-ink-mute">Acciones · {monthLabelLong(curMonth)}</div><div className="text-[18px] font-semibold text-ink">{actionable.length === 0 ? "Nada que hacer: seguir monitorizando." : pending.length === 0 ? "Todas las recomendaciones ejecutadas." : <>{pending.length} {pending.length > 1 ? "recomendaciones" : "recomendación"} <span className="text-ink-mute">esperando tu orden.</span></>}</div></div>
        <div className="flex items-center gap-2"><Btn variant="outline" size="sm" onClick={undoActions} disabled={executed.length === 0}>Deshacer todo</Btn><Btn size="sm" onClick={() => pending.forEach(run)} disabled={pending.length === 0}>Ejecutar todo{pending.length > 0 ? ` (${pending.length})` : ""}</Btn></div>
      </div>
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.35fr_1fr]">
        <Card title="Lo que recomienda el comportamiento del score" right={actionable.length > PER_PAGE ? <Pager page={page} pageSize={PER_PAGE} total={actionable.length} onChange={setPage} /> : undefined}>
          <div className="flex flex-col gap-2">
            {pageItems.map((r) => <RecRow key={r.id} r={r} done={doneIds.has(r.id)} onRun={() => run(r)} />)}
            {actionable.length === 0 && <p className="py-8 text-center text-[13px] text-ink-mute">Todas las posiciones están dentro de su rango normal.</p>}
          </div>
        </Card>
        <Card title="Efecto sobre la cartera" sub={executed.length === 0 ? "Nada ejecutado todavía" : `${executed.length} ${executed.length > 1 ? "acciones ejecutadas" : "acción ejecutada"}`}>
          <p className="text-[12px] text-ink-mute">Ejecutar cambia la cartera de verdad: reducir, pausar y revisar devuelven capital a la reserva; aumentar crece la posición hasta el tope. «Deshacer todo» la restaura.</p>
          <div className="mt-3 divide-y divide-line-soft border-y border-line-soft">
            <Row label="Score de la cartera" before={before.avgScore} after={after.avgScore} all={allAfter?.avgScore} fmt={(v) => v.toFixed(1)} good="up" />
            <Row label="Estrés esperado" before={before.expectedStress * 100} after={after.expectedStress * 100} all={allAfter ? allAfter.expectedStress * 100 : undefined} fmt={(v) => `${v.toFixed(1)} %`} good="down" />
            <Row label="Capital desplegado" before={before.allocated} after={after.allocated} all={allAfter?.allocated} fmt={(v) => fmtMoney(v)} good="none" />
            <Row label="Reserva" before={before.reserve} after={after.reserve} all={allAfter?.reserve} fmt={(v) => fmtMoney(v)} good="none" />
            <Row label="Posiciones efectivas" before={before.effectiveN} after={after.effectiveN} all={allAfter?.effectiveN} fmt={(v) => v.toFixed(1)} good="up" />
            <Row label="Perfil de riesgo" before={before.avgScore} after={after.avgScore} all={allAfter?.avgScore} fmt={(v) => riskLabel(v).label} good="up" />
          </div>
          <div className="mt-1 flex justify-end gap-3 text-[11px] text-ink-mute"><span>ahora → ejecutado</span><span>· si se ejecuta todo</span></div>
          {freed > 0 && <div className="mt-3 rounded-lg border border-line bg-panel-2 px-3 py-2 text-[13px]"><span className="num font-medium text-ink">{fmtMoney(freed)}</span> <span className="text-ink-mute">de vuelta en reserva.</span></div>}
          <div className="mt-4 text-[13px] text-ink-mute">Registro</div>
          <div className="mt-1 space-y-1">
            {executed.length === 0 && <div className="text-[12px] text-ink-mute">Las órdenes que ejecutes aparecen aquí.</div>}
            {executed.slice().reverse().slice(0, 9).map((e, i) => { const p = base.positions.find((x) => x.id === e.id); const tone = ACTION_META[e.kind].tone; return <div key={`${e.id}-${e.month}-${i}`} className="flex items-center gap-2 text-[12.5px]"><span className={`w-16 shrink-0 font-medium ${tone === "good" ? "text-good" : tone === "warn" ? "text-warn" : "text-bad"}`}>{ACTION_META[e.kind].verb}</span><span className="truncate text-ink-dim">{p?.name ?? e.id}</span><span className="num ml-auto shrink-0 text-[11px] text-ink-mute">{monthLabel(e.month)} · {e.multiplier < 1 ? `−${Math.round((1 - e.multiplier) * 100)} %` : `+${Math.round((e.multiplier - 1) * 100)} %`}</span></div>; })}
          </div>
          <div className="mt-4 flex justify-end gap-2"><Btn variant="outline" size="sm" onClick={() => router.push("/productos/marketplace/receptores")}>Cartera →</Btn><Btn variant="outline" size="sm" onClick={() => router.push("/productos/marketplace/monitor")}>Seguir monitorizando →</Btn></div>
        </Card>
      </div>
    </div>
  );
}

function Row({ label, before, after, all, fmt, good }: { label: string; before: number; after: number; all?: number; fmt: (v: number) => string; good: "up" | "down" | "none" }) {
  const d = after - before;
  const cls = good === "none" || Math.abs(d) < 1e-6 ? "text-ink" : (good === "up" ? d > 0 : d < 0) ? "text-good" : "text-bad";
  return (
    <div className="flex items-center justify-between py-2 text-[13px]"><span className="text-ink-mute">{label}</span><div className="flex items-center gap-2"><span className="num text-ink-mute">{fmt(before)}</span><span className="text-ink-mute">→</span><span className={`num font-medium ${cls}`}>{fmt(after)}</span>{all != null && <span className="num text-[11px] text-ink-mute">· {fmt(all)}</span>}</div></div>
  );
}

const ICON: Record<ActionKind, string> = { pause: "⏸", reduce: "↓", review: "⌕", monitor: "–", increase: "↑" };

function RecRow({ r, done, onRun }: { r: Recommendation; done: boolean; onRun: () => void }) {
  const meta = ACTION_META[r.kind];
  const t = r.timeline;
  return (
    <div className={`flex flex-col gap-3 rounded-lg border p-4 md:flex-row md:items-center ${done ? "border-line-soft opacity-60" : r.severity >= 3 ? "border-bad/40" : r.severity === 2 ? "border-warn/40" : "border-line-soft"}`}>
      <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-panel-2 text-[16px] ${meta.tone === "good" ? "text-good" : meta.tone === "warn" ? "text-warn" : meta.tone === "bad" ? "text-bad" : "text-ink-mute"}`}>{ICON[r.kind]}</div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2"><span className="text-[14px] font-semibold text-ink">{meta.label}</span><Pill>{meta.effect}</Pill></div>
        <Link href={`/empresas/${r.id}`} className="mt-0.5 block text-[13px] text-ink-dim hover:text-ink">{t.position.name} <span className="num text-ink-mute">{r.id} · {(t.position.weight * 100).toFixed(1)} %</span></Link>
        <ul className="mt-1.5 space-y-0.5 text-[12px] text-ink-mute">{r.reasons.slice(0, 3).map((x) => <li key={x}>· {x}</li>)}</ul>
      </div>
      <div className="flex shrink-0 items-center gap-4 md:flex-col md:items-end">
        <div className="text-right"><div className="flex items-baseline gap-1.5"><span className="num text-[12px] text-ink-mute line-through">{t.scoreAtAllocation.toFixed(0)}</span><span className="num text-[22px] font-semibold" style={{ color: scoreColor(t.scoreNow) }}>{t.scoreNow.toFixed(0)}</span></div><div className={`num text-[11px] ${t.delta >= 0 ? "text-good" : "text-bad"}`}>{fmtDelta(t.delta)}</div></div>
        {done ? <Pill tone="good">Ejecutada</Pill> : <Btn size="sm" onClick={onRun}>Ejecutar</Btn>}
      </div>
    </div>
  );
}
