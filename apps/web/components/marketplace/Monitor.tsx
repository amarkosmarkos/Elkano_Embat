"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMarketplace } from "@/lib/products/marketplace/store";
import { buildPortfolio, componentsAt, DEFAULT_CONFIG } from "@/lib/products/marketplace/portfolio";
import { monitorSnapshot, portfolioTrajectory, type PositionStatus, type PositionTimeline } from "@/lib/products/marketplace/monitor";
import { Card } from "@/components/ui/Card";
import { Pill } from "@/components/ui/Pill";
import { Sparkline } from "@/components/ui/Sparkline";
import { LineChart } from "@/components/charts/LineChart";
import { ComponentBars } from "./ComponentBars";
import { Btn, Pager, Skeleton, Stat } from "./ui";
import { scoreColor, DIM_COLOR } from "@/lib/score/colors";
import { DIM_LABEL } from "@/lib/score/meta";
import { fmtDelta, monthLabel, monthLabelLong } from "@/lib/format";

const STATUS: Record<PositionStatus, { label: string; tone: "bad" | "good" | "warn" | "neutral" }> = { deteriorating: { label: "Deteriorando", tone: "bad" }, improving: { label: "Mejorando", tone: "good" }, watch: { label: "Vigilar", tone: "warn" }, stable: { label: "Estable", tone: "neutral" } };
const PER_PAGE = 4;
const rank = (s: PositionStatus) => (s === "deteriorating" ? 0 : s === "watch" ? 1 : s === "improving" ? 2 : 3);

/** Monitor: reproduce la historia real del score de la cartera mes a mes desde la asignación. */
export default function Monitor() {
  const { network, effective: result, setResult, lenderId, monitorMonth, setMonitorMonth, byId } = useMarketplace();
  const router = useRouter();
  const [playing, setPlaying] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const months = network?.months ?? [];
  const startIdx = result ? months.indexOf(result.config.asOf) : -1;
  const curMonth = monitorMonth && months.includes(monitorMonth) ? monitorMonth : result?.config.asOf ?? null;
  const curIdx = curMonth ? months.indexOf(curMonth) : -1;
  const lastIdx = months.length - 1;
  useEffect(() => { if (!playing) return; if (curIdx >= lastIdx) { setPlaying(false); return; } const t = setTimeout(() => setMonitorMonth(months[curIdx + 1]), 1200); return () => clearTimeout(t); }, [playing, curIdx, lastIdx, months, setMonitorMonth]);
  const snapshot = useMemo(() => (network && result && curMonth ? monitorSnapshot(network, result, curMonth) : null), [network, result, curMonth]);
  const trajectory = useMemo(() => (network && result ? portfolioTrajectory(network, result) : []), [network, result]);
  const meaningful = useMemo(() => (snapshot ? snapshot.positions.filter((t) => t.meaningful).sort((a, b) => rank(a.status) - rank(b.status) || a.delta - b.delta) : []), [snapshot]);
  useEffect(() => { setPage((p) => Math.min(p, Math.max(0, Math.ceil(meaningful.length / PER_PAGE) - 1))); }, [meaningful.length]);

  if (!network) return <Skeleton className="h-[520px]" />;
  if (!result || !snapshot || !curMonth) {
    return (
      <Card>
        <div className="flex flex-col items-center py-14 text-center">
          <div className="text-[20px] font-semibold text-ink">Todavía no hay nada que vigilar.</div>
          <p className="mt-2 max-w-md text-[14px] text-ink-mute">Construye una cartera y después reproduce la historia real del score mes a mes: el monitor levanta la mano cuando una posición se mueve de verdad.</p>
          <div className="mt-6 flex gap-3"><Btn onClick={() => router.push("/productos/marketplace/receptores")}>Construir cartera</Btn><Btn variant="outline" onClick={() => setResult(buildPortfolio(network, { ...DEFAULT_CONFIG, lenderId }))}>Cargar cartera de demo</Btn></div>
        </div>
      </Card>
    );
  }
  const elapsed = curIdx - startIdx;
  const stable = snapshot.positions.filter((t) => !t.meaningful);
  const trajMonths = trajectory.map((t) => t.month);
  const trajSeries = trajectory.map((t, i) => (i <= elapsed ? t.avg : null));
  const nActionable = snapshot.nDeteriorating + snapshot.nImproving + snapshot.nWatch;
  const pageItems = meaningful.slice(page * PER_PAGE, (page + 1) * PER_PAGE);
  const exp = expanded ? snapshot.positions.find((t) => t.position.id === expanded) ?? null : null;
  const comps = (id: string, m: string) => componentsAt(byId.get(id)!, months.indexOf(m));
  const minY = Math.max(0, Math.min(...trajectory.map((t) => t.avg)) - 12);

  return (
    <div className="flex flex-col gap-4">
      <div className="card flex flex-wrap items-center gap-5 px-6 py-4">
        <div className="min-w-0">
          <div className="text-[12px] text-ink-mute">Seguimiento continuo</div>
          <div className="text-[18px] font-semibold text-ink">{elapsed === 0 ? <>Día uno. <span className="text-ink-mute">Cartera asignada en {monthLabelLong(result.config.asOf).toLowerCase()}.</span></> : <>{monthLabelLong(curMonth)}. <span className="text-ink-mute">{elapsed} mes{elapsed > 1 ? "es" : ""} después de la asignación.</span></>}</div>
        </div>
        <div className="flex min-w-[280px] flex-1 flex-wrap gap-1">
          {months.slice(startIdx).map((m, i) => <button key={m} type="button" onClick={() => { setPlaying(false); setMonitorMonth(m); }} className={`num rounded-lg border px-2 py-0.5 text-[11px] transition-colors ${i === elapsed ? "border-ink bg-ink text-panel" : i < elapsed ? "border-line bg-panel-2 text-ink-dim" : "border-line-soft text-ink-mute hover:text-ink"}`}>{monthLabel(m)}</button>)}
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          <Btn variant="outline" size="sm" onClick={() => setMonitorMonth(months[startIdx])} disabled={curIdx <= startIdx}>⏮</Btn>
          <Btn size="sm" onClick={() => setPlaying((p) => !p)} disabled={curIdx >= lastIdx && !playing}>{playing ? "Pausar" : curIdx >= lastIdx ? "Fin de los datos" : "Avanzar el tiempo"}</Btn>
          <Btn variant="outline" size="sm" onClick={() => setMonitorMonth(months[Math.min(lastIdx, curIdx + 1)])} disabled={curIdx >= lastIdx}>⏭</Btn>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[380px_minmax(0,1fr)]">
        <Card>
          <div className="grid grid-cols-2 gap-4">
            <div><div className="text-[13px] text-ink-mute">Score de la cartera</div><div className="flex items-baseline gap-2"><span className="num text-[36px] font-semibold leading-none" style={{ color: scoreColor(snapshot.avgNow) }}>{snapshot.avgNow.toFixed(1)}</span><span className={`num text-[14px] font-medium ${snapshot.weightedDelta >= 0 ? "text-good" : "text-bad"}`}>{fmtDelta(snapshot.weightedDelta)}</span></div><div className="text-[12px] text-ink-mute">era {snapshot.avgAtAllocation.toFixed(1)} en la asignación</div></div>
            <Stat label="Estrés esperado" value={`${(snapshot.expectedStressNow * 100).toFixed(1)} %`} hint={`era ${(result.expectedStress * 100).toFixed(1)} %`} tone={snapshot.expectedStressNow > result.expectedStress + 0.02 ? "bad" : undefined} />
          </div>
          <div className="mt-5 grid grid-cols-4 gap-2">
            {[["Caen", snapshot.nDeteriorating, "text-bad"], ["Vigilar", snapshot.nWatch, "text-warn"], ["Suben", snapshot.nImproving, "text-good"], ["Alertas", snapshot.nAlerts, "text-bad"]].map(([l, n, c]) => <div key={l as string} className="rounded-lg bg-panel-2 px-3 py-2"><div className={`num text-[20px] font-semibold leading-none ${(n as number) > 0 ? c : "text-ink-mute"}`}>{n as number}</div><div className="mt-1 text-[11px] text-ink-mute">{l as string}</div></div>)}
          </div>
        </Card>
        <Card title="Trayectoria de la cartera" sub="score medio ponderado, reproducido con los scores mensuales reales" right={snapshot.exposureDeteriorating > 0 ? <span className="text-[12px] text-bad"><span className="num font-medium">{(snapshot.exposureDeteriorating * 100).toFixed(0)} %</span> del capital está en nombres que se deterioran</span> : undefined}>
          <LineChart months={trajMonths} series={[{ id: "avg", label: "Score medio", color: "#e5e5e5", values: trajSeries, area: true }]} yMin={minY} yMax={100} height={170} legend={false} marker={elapsed} />
        </Card>
      </div>

      <Card title={meaningful.length === 0 ? "Nada material todavía" : `${meaningful.length} ${meaningful.length > 1 ? "posiciones" : "posición"} con movimiento material`} sub="Cambios significativos desde la asignación: qué se movió, por qué dimensión y desde cuándo." right={<div className="flex items-center gap-2">{meaningful.length > PER_PAGE && <Pager page={page} pageSize={PER_PAGE} total={meaningful.length} onChange={setPage} />}{nActionable > 0 && <Btn size="sm" onClick={() => router.push("/productos/marketplace/acciones")}>Acciones →</Btn>}</div>}>
        {meaningful.length === 0 ? <p className="py-6 text-center text-[13px] text-ink-mute">Los scores se mueven dentro de su rango normal. Avanza el tiempo para ver evolucionar la cartera.</p> : (
          <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">{pageItems.map((t) => <ChangeCard key={t.position.id} t={t} onOpen={() => setExpanded(t.position.id)} />)}</div>
        )}
        {stable.length > 0 && (
          <div className="mt-4 flex items-center gap-3 border-t border-line-soft pt-3"><span className="shrink-0 text-[12px] text-ink-mute">En rango</span><div className="flex min-w-0 flex-1 flex-wrap gap-1.5">{stable.map((t) => <Link key={t.position.id} href={`/empresas/${t.position.id}`} className="flex items-center gap-2 rounded-lg border border-line-soft px-2 py-1 text-[12px] hover:bg-panel-2"><span className="max-w-[140px] truncate text-ink-dim">{t.position.name}</span><span className="num font-medium" style={{ color: scoreColor(t.scoreNow) }}>{t.scoreNow.toFixed(0)}</span><span className={`num text-[11px] ${t.delta >= 0 ? "text-good" : "text-bad"}`}>{fmtDelta(t.delta)}</span></Link>)}</div></div>
        )}
      </Card>

      {exp && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/60" onClick={() => setExpanded(null)}>
          <div className="card flex h-full w-[560px] max-w-full flex-col overflow-y-auto rounded-none p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between gap-4">
              <div><Pill tone={STATUS[exp.status].tone}>{STATUS[exp.status].label}</Pill><div className="mt-2 text-[20px] font-semibold text-ink">{exp.position.name}</div><div className="num text-[12px] text-ink-mute">{exp.position.id} · {(exp.position.weight * 100).toFixed(1)} % del capital</div></div>
              <div className="flex items-start gap-3"><div className="text-right"><div className="flex items-baseline gap-2"><span className="num text-[16px] text-ink-mute line-through">{exp.scoreAtAllocation.toFixed(0)}</span><span className="num text-[32px] font-semibold" style={{ color: scoreColor(exp.scoreNow) }}>{exp.scoreNow.toFixed(0)}</span></div><div className={`num text-[12px] ${exp.delta >= 0 ? "text-good" : "text-bad"}`}>{fmtDelta(exp.delta)} desde la asignación</div></div><button type="button" onClick={() => setExpanded(null)} className="flex h-8 w-8 items-center justify-center rounded-lg border border-line text-ink-mute hover:text-ink">✕</button></div>
            </div>
            <div className="mt-5"><div className="text-[13px] text-ink-mute">Dimensiones · {monthLabel(result.config.asOf)} → {monthLabel(curMonth)} · punteado = en la asignación, sólido = ahora</div><div className="mt-3"><ComponentBars components={comps(exp.position.id, curMonth)} compare={comps(exp.position.id, result.config.asOf)} /></div></div>
            <div className="mt-5"><div className="text-[13px] text-ink-mute">Mes a mes</div><div className="mt-2 space-y-1">{exp.windowMonths.map((m, i) => { const v = exp.window[i], prev = i > 0 ? exp.window[i - 1] : null; const d = v != null && prev != null ? v - prev : null; return <div key={m} className="flex items-center gap-3 text-[12.5px]"><span className="num w-14 text-ink-mute">{monthLabel(m)}</span><div className="h-2 flex-1 overflow-hidden rounded-full bg-panel-2"><div className="h-full rounded-full" style={{ width: `${v ?? 0}%`, background: scoreColor(v) }} /></div><span className="num w-8 text-right font-medium text-ink">{v?.toFixed(0) ?? "—"}</span><span className={`num w-12 text-right ${d == null ? "text-ink-mute" : d >= 0 ? "text-good" : "text-bad"}`}>{d == null ? "" : fmtDelta(d)}</span></div>; })}</div></div>
            <div className="mt-auto flex items-center justify-between border-t border-line-soft pt-4 text-[13px] text-ink-mute"><span>{exp.persistent ? "Movimiento persistente, no un mes puntual." : exp.delta <= -8 ? "Movimiento reciente: aún podría ser un mes puntual." : ""}</span><Link href={`/empresas/${exp.position.id}`} className="text-ink hover:underline">Araña y todas las métricas →</Link></div>
          </div>
        </div>
      )}
    </div>
  );
}

function ChangeCard({ t, onOpen }: { t: PositionTimeline; onOpen: () => void }) {
  const meta = STATUS[t.status];
  const color = scoreColor(t.scoreNow);
  return (
    <button type="button" onClick={onOpen} className={`flex flex-col rounded-lg border bg-panel-2/50 p-4 text-left transition-colors hover:bg-panel-2 ${t.status === "deteriorating" ? "border-bad/40" : t.status === "improving" ? "border-good/40" : "border-line-soft"}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0"><div className="flex flex-wrap gap-1.5"><Pill tone={meta.tone}>{meta.label}</Pill>{t.persistent && Math.abs(t.delta) >= 8 && <Pill>Persistente</Pill>}{!t.persistent && t.delta <= -8 && <Pill>Reciente</Pill>}{t.alertNow && <Pill tone="bad">Alerta</Pill>}</div><div className="mt-2 truncate text-[15px] font-semibold text-ink">{t.position.name}</div><div className="num text-[11px] text-ink-mute">{t.position.id} · {(t.position.weight * 100).toFixed(1)} % del capital</div></div>
        <div className="shrink-0 text-right"><div className="flex items-baseline justify-end gap-1.5"><span className="num text-[14px] text-ink-mute line-through">{t.scoreAtAllocation.toFixed(0)}</span><span className="num text-[28px] font-semibold leading-none" style={{ color }}>{t.scoreNow.toFixed(0)}</span></div><div className={`num text-[11px] ${t.delta >= 0 ? "text-good" : "text-bad"}`}>{fmtDelta(t.delta)} desde la asignación</div></div>
      </div>
      <div className="mt-3 flex items-center gap-3">
        <Sparkline values={t.window} width={120} height={30} color={color} min={Math.max(0, Math.min(...t.window.filter((v): v is number => v != null)) - 8)} max={100} />
        <div className="min-w-0 flex-1 space-y-0.5 text-[12px] text-ink-mute">
          {t.driver && Math.abs(t.driver.delta) >= 2 && <div className="flex items-center gap-1.5 truncate"><span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: DIM_COLOR[t.driver.dim] }} /><span className="text-ink">{DIM_LABEL[t.driver.dim]}</span> {t.driver.delta < 0 ? "resta" : "suma"} <span className="num text-ink">{Math.abs(t.driver.delta).toFixed(1)} pts</span>{t.driverStreak >= 2 && t.driver.delta < 0 && <> · {t.driverStreak} periodos a peor</>}</div>}
          {t.onsetMonth && <div>Empezó en <span className="text-ink">{monthLabelLong(t.onsetMonth).toLowerCase()}</span>{t.declineStreak >= 2 && <> · {t.declineStreak} meses seguidos bajando</>}</div>}
          {t.riseStreak >= 2 && t.delta > 0 && <div>Sube <span className="text-ink">{t.riseStreak} meses seguidos</span></div>}
          {t.stressNow > 0 && <div className="text-bad">{t.stressNow} alarma{t.stressNow > 1 ? "s" : ""} de estrés activa{t.stressNow > 1 ? "s" : ""}</div>}
        </div>
      </div>
    </button>
  );
}
