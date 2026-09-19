"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMarketplace } from "@/lib/products/marketplace/store";
import { buildPortfolio, riskLabel, RISK_PRESETS, OVERLAP_PENALTY, type PortfolioResult, type RiskTolerance } from "@/lib/products/marketplace/portfolio";
import { isRelated } from "@/lib/products/marketplace/assess";
import { historyLength, TIER_LABEL, type Tier } from "@/lib/score/derived";
import { Card } from "@/components/ui/Card";
import { Pill } from "@/components/ui/Pill";
import { ScoreRing } from "@/components/ui/ScoreRing";
import { Sparkline } from "@/components/ui/Sparkline";
import { BubbleMap } from "./BubbleMap";
import { Treemap } from "./Treemap";
import { Bins } from "./Bins";
import { Btn, Seg, Skeleton, Slider, Stat, TrendPill } from "./ui";
import { scoreColor } from "@/lib/score/colors";
import { fmtDelta, fmtMoney, monthLabel, monthLabelLong } from "@/lib/format";

type Phase = "idle" | "screening" | "ranking" | "allocating" | "done";
type View = "candidates" | "portfolio";
type Tab = "map" | "distribution" | "crew";

/** Receptores: el universo de candidatos para el prestamista elegido, y la cartera construida para él. */
export default function Borrowers() {
  const { network, assessed, config, setConfig, lenderId, setLender, result: baseResult, setResult, executed, effective: result, byId } = useMarketplace();
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>("idle");
  const [view, setView] = useState<View>("candidates");
  const [tab, setTab] = useState<Tab>("map");
  const [selected, setSelected] = useState<string | null>(null);
  const [preview, setPreview] = useState<PortfolioResult | null>(null);
  useEffect(() => { if (baseResult && phase === "idle") { setPhase("done"); setView("portfolio"); } }, [baseResult, phase]);

  const months = network?.months ?? [];
  const asOfOptions = useMemo(() => months.filter((_, i) => i >= 6), [months]);
  const asOfIdx = months.indexOf(config.asOf);
  const lender = useMemo(() => assessed.find((a) => a.c.id === lenderId) ?? null, [assessed, lenderId]);
  const topLenders = useMemo(() => assessed.filter((a) => a.provider.qualified).sort((x, y) => y.provider.capacity - x.provider.capacity).slice(0, 5), [assessed]);
  const candidates = useMemo(() => assessed.filter((a) => a.receiver.eligible && a.receiver.need >= 25 && !isRelated(lender?.c ?? null, a.c)).sort((x, y) => y.receiver.fit - x.receiver.fit || y.c.latest.score - x.c.latest.score), [assessed, lender]);
  const excludedRelated = useMemo(() => (lender ? assessed.filter((a) => isRelated(lender.c, a.c)).length : 0), [assessed, lender]);
  const inChest = useMemo(() => new Set(result?.positions.map((p) => p.id) ?? []), [result]);
  const bubbles = useMemo(() => { const cand = new Set(candidates.map((a) => a.c.id)); return assessed.map((a) => ({ id: a.c.id, name: a.c.name, score: a.c.latest.score, momentum: a.momentum ?? 0, size: a.receiver.fit, qualified: cand.has(a.c.id), alert: a.c.latest.alert === 1, dimmed: !cand.has(a.c.id) && !inChest.has(a.c.id) })); }, [assessed, candidates, inChest]);
  const universe = useMemo(() => {
    if (!network || asOfIdx < 0) return null;
    let scored = 0, aboveMin = 0, clean = 0;
    for (const c of network.companies) {
      const s = c.scores[asOfIdx];
      if (s == null) continue;
      scored++;
      if (isRelated(lender?.c ?? null, c)) continue;
      if (s >= config.minScore) aboveMin++;
      if (s >= config.minScore && c.alerts[asOfIdx] === 0 && (c.stress[asOfIdx] ?? 0) <= RISK_PRESETS[config.risk].maxStress && historyLength(c.scores, asOfIdx) >= 6) clean++;
    }
    return { scored, aboveMin, clean };
  }, [network, asOfIdx, config.minScore, config.risk, lender]);

  function build() {
    if (!network) return;
    setPreview(buildPortfolio(network, { ...config, lenderId }));
    setSelected(null); setTab("map"); setView("portfolio"); setPhase("screening");
  }
  useEffect(() => {
    if (phase === "screening") { const t = setTimeout(() => setPhase("ranking"), 600); return () => clearTimeout(t); }
    if (phase === "ranking") { const t = setTimeout(() => setPhase("allocating"), 600); return () => clearTimeout(t); }
    if (phase === "allocating") { const t = setTimeout(() => { if (preview) setResult(preview); setPhase("done"); }, 500); return () => clearTimeout(t); }
  }, [phase, preview, setResult]);

  const shown = phase === "done" ? result : null;
  const risk = shown ? riskLabel(shown.avgScore) : null;
  const builtForOtherLender = baseResult != null && baseResult.config.lenderId !== lenderId;

  return (
    <div className="grid grid-cols-1 gap-5 xl:grid-cols-[340px_minmax(0,1fr)]">
      <aside className="flex flex-col gap-4">
        {lender ? (
          <div className="card p-4 ring-1 ring-ink/40">
            <div className="flex items-center justify-between text-[12px] text-ink-mute"><span>Presta como</span><Link href="/productos/marketplace" className="hover:text-ink">cambiar</Link></div>
            <div className="mt-1 flex items-center justify-between gap-2"><Link href={`/empresas/${lender.c.id}`} className="truncate text-[16px] font-semibold text-ink hover:underline">{lender.c.name}</Link><span className="num text-[24px] font-semibold" style={{ color: scoreColor(lender.c.latest.score) }}>{lender.c.latest.score.toFixed(0)}</span></div>
            <div className="mt-1 text-[12px] text-ink-mute">Capacidad {lender.provider.capacity} · {excludedRelated - 1 > 0 ? `${excludedRelated - 1} de su grupo excluidas` : "sin grupo que excluir"} · perfiles parecidos penalizados hasta {Math.round(OVERLAP_PENALTY * 100)} %</div>
          </div>
        ) : (
          <Card title="¿Quién presta?" sub="La cartera se construye para un prestamista: sin exposición a su grupo y menos a perfiles de riesgo parecidos.">
            <div className="flex flex-wrap gap-1.5">{topLenders.map((a) => <button key={a.c.id} type="button" onClick={() => setLender(a.c.id)} className="rounded-lg border border-line px-2.5 py-1 text-[12px] text-ink hover:bg-panel-2">{a.c.name} <span className="num text-ink-mute">{a.c.latest.score.toFixed(0)}</span></button>)}</div>
          </Card>
        )}
        <Card title="Configuración de la cartera">
          <div className="space-y-4">
            <Slider label="Capital disponible" value={config.capital} min={5_000_000} max={100_000_000} step={1_000_000} onChange={(v) => setConfig({ capital: v })} format={(v) => fmtMoney(v)} />
            <div><div className="mb-1.5 text-[13px] text-ink-mute">Tolerancia al riesgo</div><Seg className="w-full" value={config.risk} onChange={(v: RiskTolerance) => setConfig({ risk: v })} options={(Object.keys(RISK_PRESETS) as RiskTolerance[]).map((k) => ({ value: k, label: RISK_PRESETS[k].label }))} /><p className="mt-1.5 text-[12px] text-ink-mute">{RISK_PRESETS[config.risk].blurb}</p></div>
            <div className="grid grid-cols-2 gap-4">
              <Slider label="Exposición máx." value={config.maxExposure} min={0.04} max={0.25} step={0.01} onChange={(v) => setConfig({ maxExposure: v })} format={(v) => `${Math.round(v * 100)} %`} />
              <Slider label="Score mínimo" value={config.minScore} min={55} max={88} step={1} onChange={(v) => setConfig({ minScore: v })} />
              <Slider label="Posiciones" value={config.targetPositions} min={8} max={40} step={1} onChange={(v) => setConfig({ targetPositions: v })} />
              <Slider label="Máx. por grupo" value={config.maxPerGroup} min={1} max={3} step={1} onChange={(v) => setConfig({ maxPerGroup: v })} />
            </div>
            <div><div className="mb-1.5 text-[13px] text-ink-mute">Mes de asignación</div><div className="flex flex-wrap gap-1">{asOfOptions.map((m) => <button key={m} type="button" onClick={() => setConfig({ asOf: m })} className={`num rounded-lg border px-2 py-0.5 text-[11px] transition-colors ${config.asOf === m ? "border-ink bg-ink text-panel" : "border-line text-ink-dim hover:bg-panel-2"}`}>{monthLabel(m)}</button>)}</div></div>
            {universe && (
              <div className="rounded-lg bg-panel-2 px-3 py-2 text-[12px] text-ink-dim">
                <div className="flex justify-between"><span>Con score en {monthLabel(config.asOf)}</span><span className="num text-ink">{universe.scored}</span></div>
                <div className="flex justify-between"><span>Score ≥ {config.minScore}{lender ? ", no relacionadas" : ""}</span><span className="num text-ink">{universe.aboveMin}</span></div>
                <div className="flex justify-between"><span>Sin alerta · estrés ok · 6+ meses</span><span className="num text-ink">{universe.clean}</span></div>
              </div>
            )}
            <div className="flex gap-2">
              <Btn size="lg" className="flex-1" onClick={build} disabled={!network || (phase !== "idle" && phase !== "done")}>{baseResult ? "Reconstruir cartera" : "Construir cartera"}</Btn>
              {baseResult && phase === "done" && <Btn variant="outline" size="lg" onClick={() => { setResult(null); setPhase("idle"); setView("candidates"); }} title="Vaciar cartera">↺</Btn>}
            </div>
          </div>
        </Card>
      </aside>

      <section className="flex min-w-0 flex-col gap-4">
        {!network ? <Skeleton className="h-[520px]" /> : phase === "screening" || phase === "ranking" || phase === "allocating" ? (
          <Building phase={phase} universe={universe} preview={preview} />
        ) : view === "candidates" || !shown ? (
          <Card
            title={lender ? `Candidatos a financiación para ${lender.c.name}` : "Candidatos a financiación"}
            sub={`${candidates.length} empresas sanas con necesidad visible de capital${excludedRelated - 1 > 0 ? ` · ${excludedRelated - 1} del grupo del prestamista excluidas` : ""} · umbral 60 · necesidad ≥ 25 · área = encaje (√necesidad × salud)`}
            right={<div className="flex items-center gap-2">{builtForOtherLender && <Pill tone="warn">Cartera construida para otro prestamista</Pill>}{shown && <Seg value={view} onChange={setView} options={[{ value: "candidates", label: "Candidatos" }, { value: "portfolio", label: "Cartera" }]} />}</div>}
          >
            <BubbleMap data={bubbles} onSelect={(id) => router.push(`/empresas/${id}`)} sizeLabel="Encaje" xThreshold={60} thresholdLabel="SUELO DE FINANCIACIÓN 60" height={380} />
            <div className="mt-4 text-[13px] text-ink-mute">Mejor encaje · sanas y con necesidad de capital</div>
            <div className="mt-2 grid grid-cols-1 gap-3 md:grid-cols-2 2xl:grid-cols-4">
              {candidates.slice(0, 4).map((a) => (
                <Link key={a.c.id} href={`/empresas/${a.c.id}`} className={`card flex flex-col p-4 transition-colors hover:bg-panel-2 ${inChest.has(a.c.id) ? "ring-1 ring-ink/50" : ""}`}>
                  <div className="flex items-start justify-between gap-2"><div className="min-w-0"><div className="truncate text-[14px] font-semibold text-ink">{a.c.name}</div><div className="num text-[11px] text-ink-mute">{a.c.id}</div></div><div className="text-right"><div className="num text-[24px] font-semibold leading-none" style={{ color: scoreColor(a.c.latest.score) }}>{a.c.latest.score.toFixed(0)}</div>{a.momentum != null && <div className={`num text-[11px] ${a.momentum >= 0 ? "text-good" : "text-bad"}`}>{fmtDelta(a.momentum)} / 3m</div>}</div></div>
                  <div className="mt-2 flex items-center justify-between"><TrendPill trend={a.trend} /><Sparkline values={a.c.scores} width={60} height={22} color={scoreColor(a.c.latest.score)} min={0} max={100} /></div>
                  <ul className="mt-2 space-y-0.5 text-[12px] text-ink-dim">{a.receiver.needSignals.slice(0, 2).map((r) => <li key={r} className="truncate">· {r}</li>)}</ul>
                  <div className="mt-auto flex items-center justify-between border-t border-line-soft pt-2 text-[12px] text-ink-mute"><span className="flex flex-1 items-center gap-2">Encaje<span className="h-1.5 flex-1 overflow-hidden rounded-full bg-panel-2"><span className="block h-full rounded-full bg-accent-2" style={{ width: `${a.receiver.fit}%` }} /></span><span className="num text-ink">{a.receiver.fit}</span></span>{inChest.has(a.c.id) && <Pill tone="accent" className="ml-2">En cartera</Pill>}</div>
                </Link>
              ))}
            </div>
          </Card>
        ) : (
          <>
            <div className="card flex flex-col gap-4 px-6 py-4">
              <div className="flex flex-wrap items-center gap-6">
              <ScoreRing score={shown.avgScore} size={88} stroke={7} label="cartera" />
              <div className="grid min-w-0 flex-1 grid-cols-2 gap-4 md:grid-cols-4">
                <Stat label="Asignado" value={fmtMoney(shown.allocated)} hint={shown.reserve > 0 ? `${fmtMoney(shown.reserve)} en reserva` : `${shown.positions.length} posiciones`} />
                <Stat label="Estrés esperado" value={`${(shown.expectedStress * 100).toFixed(1)} %`} hint="ponderado 100 − score" tone={risk?.tone} />
                <Stat label="Posiciones efectivas" value={shown.effectiveN.toFixed(1)} hint={`HHI ${shown.hhi.toFixed(3)} · mayor ${(shown.topWeight * 100).toFixed(0)} %`} />
                <Stat label="Solapamiento" value={shown.avgOverlap == null ? "—" : shown.avgOverlap.toFixed(2)} hint={shown.avgOverlap == null ? "sin prestamista" : shown.avgOverlap < 0.3 ? "bien diversificada" : shown.avgOverlap < 0.6 ? "moderado" : "perfiles parecidos"} tone={shown.avgOverlap == null ? undefined : shown.avgOverlap < 0.3 ? "good" : shown.avgOverlap < 0.6 ? "warn" : "bad"} />
              </div>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line-soft pt-4">
                <div className="flex flex-wrap items-center gap-2"><Seg value={view} onChange={setView} options={[{ value: "candidates", label: "Candidatos" }, { value: "portfolio", label: "Cartera" }]} /><Seg value={tab} onChange={setTab} options={[{ value: "map", label: "Mapa" }, { value: "distribution", label: "Distribución" }, { value: "crew", label: "Posiciones" }]} /></div>
                <div className="flex items-center gap-2">{executed.length > 0 && <Pill tone="warn">{executed.length} {executed.length > 1 ? "acciones ejecutadas" : "acción ejecutada"}</Pill>}<Btn size="sm" onClick={() => router.push("/productos/marketplace/monitor")}>Monitor →</Btn></div>
              </div>
            </div>
            {tab === "map" && (
              <Card title={`Asignación · ${shown.positions.length} receptores`} sub={`a ${monthLabelLong(shown.config.asOf).toLowerCase()}${lender ? ` · presta ${lender.c.name}` : ""} · área = capital · color = score en la asignación · pincha para resaltar`}>
                <Treemap items={shown.positions.map((p) => ({ id: p.id, name: p.name, value: p.amount, score: p.score, sub: `${(p.weight * 100).toFixed(1)} %${p.overlap != null ? ` · solap. ${p.overlap.toFixed(2)}` : ""}`, dimmed: selected != null && selected !== p.id }))} onSelect={(id) => setSelected((s) => (s === id ? null : id))} selected={selected} />
                {selected && <div className="mt-2 text-[13px] text-ink-mute"><Link href={`/empresas/${selected}`} className="text-ink hover:underline">Abrir la ficha de {byId.get(selected)?.name ?? selected} →</Link></div>}
              </Card>
            )}
            {tab === "distribution" && (
              <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                <Card title="Distribución del score" sub="capital por tramo de score en la asignación">
                  <Bins bins={shown.histogram.map((b) => ({ from: b.from, to: b.to, value: b.weight }))} height={160} fmt={(v) => `${(v * 100).toFixed(0)} % del capital`} marker={shown.avgScore} markerLabel={`media ${shown.avgScore.toFixed(0)}`} />
                  <div className="mt-4 flex h-2.5 w-full overflow-hidden rounded-full">{(["prime", "healthy", "watch", "risk"] as Tier[]).map((t) => shown.tiers[t] > 0 && <div key={t} style={{ width: `${shown.tiers[t] * 100}%`, background: scoreColor(t === "prime" ? 88 : t === "healthy" ? 74 : t === "watch" ? 55 : 30) }} />)}</div>
                  <div className="mt-2 flex flex-wrap gap-4 text-[12px] text-ink-mute">{(["prime", "healthy", "watch", "risk"] as Tier[]).map((t) => shown.tiers[t] > 0 && <span key={t} className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full" style={{ background: scoreColor(t === "prime" ? 88 : t === "healthy" ? 74 : t === "watch" ? 55 : 30) }} />{TIER_LABEL[t]} <span className="num text-ink">{(shown.tiers[t] * 100).toFixed(0)} %</span></span>)}</div>
                </Card>
                <Card title="Concentración y diversificación" sub="cómo se reparte la cartera">
                  <div className="grid grid-cols-2 gap-5">
                    <Stat big label="Mayor posición" value={`${(shown.topWeight * 100).toFixed(1)} %`} hint={`tope ${Math.round(shown.config.maxExposure * 100)} %`} />
                    <Stat big label="N efectivo" value={shown.effectiveN.toFixed(1)} hint={`de ${shown.positions.length} nombres`} />
                    <Stat big label="Rango de score" value={`${shown.minScore.toFixed(0)}–${shown.maxScore.toFixed(0)}`} hint={`suelo ${shown.config.minScore}`} />
                    <Stat big label="Relacionadas excluidas" value={`${shown.excludedRelated}`} hint={lender ? `${lender.c.name} y su grupo` : "sin prestamista"} />
                  </div>
                  <p className="mt-5 border-t border-line-soft pt-4 text-[12px] leading-relaxed text-ink-mute">Ranking = {Math.round(RISK_PRESETS[shown.config.risk].wScore * 100)} % score · {Math.round(RISK_PRESETS[shown.config.risk].wMomentum * 100)} % momentum · {Math.round(RISK_PRESETS[shown.config.risk].wStability * 100)} % estabilidad, × (1 − {OVERLAP_PENALTY} × solapamiento con el perfil del prestamista). Pesos ∝ rango^{RISK_PRESETS[shown.config.risk].gamma}, tope {Math.round(shown.config.maxExposure * 100)} % y máximo {shown.config.maxPerGroup} por grupo. El dataset no tiene sector: el solapamiento es la similitud coseno de las cinco contribuciones; el grupo del prestamista se excluye entero.</p>
                </Card>
              </div>
            )}
            {tab === "crew" && (
              <Card title="Posiciones" sub="selección ordenada por rango · pincha un nombre para abrir su ficha">
                <div className="grid grid-cols-[32px_minmax(0,1fr)_72px_80px_90px_100px] gap-3 border-b border-line-soft pb-2 text-[12px] font-medium text-ink-mute"><span>#</span><span>Empresa</span><span>Historia</span><span className="text-right">Score</span><span>Peso</span><span className="text-right">Importe</span></div>
                <div className="divide-y divide-line-soft">
                  {shown.positions.map((p) => { const c = byId.get(p.id); return (
                    <Link key={p.id} href={`/empresas/${p.id}`} className="grid grid-cols-[32px_minmax(0,1fr)_72px_80px_90px_100px] items-center gap-3 py-2 text-[13px] hover:bg-panel-2">
                      <span className="num text-ink-mute">{String(p.rank).padStart(2, "0")}</span>
                      <span className="min-w-0"><span className="block truncate text-ink">{p.name}</span><span className="num block text-[11px] text-ink-mute">{p.id}{p.overlap != null ? ` · solap. ${p.overlap.toFixed(2)}` : ""}</span></span>
                      <span>{c && <Sparkline values={c.scores.slice(0, asOfIdx + 1)} width={64} height={20} color={scoreColor(p.score)} min={0} max={100} />}</span>
                      <span className="text-right"><span className="num font-medium" style={{ color: scoreColor(p.score) }}>{p.score.toFixed(0)}</span><span className={`num ml-1 text-[11px] ${(p.momentum ?? 0) >= 0 ? "text-good" : "text-bad"}`}>{fmtDelta(p.momentum)}</span></span>
                      <span><span className="block h-1.5 w-full overflow-hidden rounded-full bg-panel-2"><span className="block h-full rounded-full bg-ink" style={{ width: `${(p.weight / shown.topWeight) * 100}%` }} /></span><span className="num text-[11px] text-ink-mute">{(p.weight * 100).toFixed(1)} %</span></span>
                      <span className="num text-right font-medium text-ink">{fmtMoney(p.amount)}</span>
                    </Link>
                  ); })}
                </div>
              </Card>
            )}
          </>
        )}
      </section>
    </div>
  );
}

function Building({ phase, universe, preview }: { phase: Phase; universe: { scored: number; aboveMin: number; clean: number } | null; preview: PortfolioResult | null }) {
  const steps: { key: Phase; label: string; value: number | null }[] = [
    { key: "screening", label: "Cribando empresas con score (prestamista y su grupo excluidos)", value: universe?.scored ?? null },
    { key: "ranking", label: "Ordenando elegibles, penalizando perfiles parecidos", value: preview?.eligible ?? null },
    { key: "allocating", label: "Asignando bajo restricciones", value: preview?.positions.length ?? null },
  ];
  const cur = (["screening", "ranking", "allocating", "done"] as Phase[]).indexOf(phase);
  return (
    <div className="card flex min-h-[420px] flex-col items-center justify-center p-10">
      <div className="mb-8 h-14 w-14 animate-spin rounded-full border-2 border-line border-t-ink" />
      <div className="w-full max-w-md space-y-2">
        {steps.map((s, i) => { const st = i < cur ? "done" : i === cur ? "active" : "todo"; return (
          <div key={s.key} className={`flex items-center justify-between rounded-lg border px-4 py-2.5 text-[13px] transition-all ${st === "active" ? "border-ink/60 bg-panel-2" : st === "done" ? "border-line-soft bg-panel-2/50" : "border-line-soft opacity-40"}`}><span className="text-ink-dim">{s.label}</span><span className="num text-ink">{st !== "todo" && s.value != null ? s.value : "…"}</span></div>
        ); })}
      </div>
    </div>
  );
}
