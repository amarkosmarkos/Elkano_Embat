import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, Compass, RotateCcw } from "lucide-react";
import { useNetwork } from "@/hooks/useNetwork";
import { useApp } from "@/store/app";
import { buildPortfolio, riskLabel, RISK_PRESETS, type PortfolioResult, type RiskTolerance } from "@/lib/portfolio";
import { Treemap } from "@/components/charts/Treemap";
import { Histogram } from "@/components/charts/Histogram";
import { Sparkline } from "@/components/charts/Sparkline";
import { AutoSize } from "@/components/ui/AutoSize";
import { ScoreRing } from "@/components/ui/ScoreRing";
import { AnimatedNumber } from "@/components/ui/AnimatedNumber";
import { Button, Eyebrow, PanelHead, Segmented, Skeleton, Slider, Stat } from "@/components/ui/primitives";
import { fmtDelta, fmtMoney, fmtMonth } from "@/lib/format";
import { scoreColor } from "@/lib/colors";
import { historyLength, TIER_LABEL, type Tier } from "@/lib/derived";

type Phase = "idle" | "screening" | "ranking" | "allocating" | "done";
type Tab = "map" | "distribution" | "crew";

export function Portfolio() {
  const { data } = useNetwork();
  const config = useApp((s) => s.config);
  const setConfig = useApp((s) => s.setConfig);
  const result = useApp((s) => s.result);
  const setResult = useApp((s) => s.setResult);
  const nav = useNavigate();
  const [phase, setPhase] = useState<Phase>(result ? "done" : "idle");
  const [selected, setSelected] = useState<string | null>(null);
  const [preview, setPreview] = useState<PortfolioResult | null>(null);
  const [tab, setTab] = useState<Tab>("map");

  const months = data?.meta.months ?? [];
  const asOfOptions = useMemo(() => months.filter((_, i) => i >= 6), [months]);
  const asOfIdx = months.indexOf(config.asOf);

  const universe = useMemo(() => {
    if (!data || asOfIdx < 0) return null;
    let scored = 0, aboveMin = 0, clean = 0;
    for (const c of data.companies) {
      const s = c.scores[asOfIdx];
      if (s == null) continue;
      scored++;
      if (s >= config.minScore) aboveMin++;
      if (s >= config.minScore && c.alerts[asOfIdx] === 0 && (c.stress[asOfIdx] ?? 0) <= RISK_PRESETS[config.risk].maxStress && historyLength(c.scores, asOfIdx) >= 6) clean++;
    }
    return { scored, aboveMin, clean };
  }, [data, asOfIdx, config.minScore, config.risk]);

  function build() {
    if (!data) return;
    setPreview(buildPortfolio(data, config));
    setSelected(null);
    setTab("map");
    setPhase("screening");
  }
  useEffect(() => {
    if (phase === "screening") { const t = setTimeout(() => setPhase("ranking"), 700); return () => clearTimeout(t); }
    if (phase === "ranking") { const t = setTimeout(() => setPhase("allocating"), 700); return () => clearTimeout(t); }
    if (phase === "allocating") { const t = setTimeout(() => { if (preview) setResult(preview); setPhase("done"); }, 600); return () => clearTimeout(t); }
  }, [phase, preview, setResult]);

  const shown = phase === "done" ? result : null;
  const risk = shown ? riskLabel(shown.avgScore) : null;
  const byId = useMemo(() => new Map(data?.companies.map((c) => [c.id, c]) ?? []), [data]);

  return (
    <div className="grid h-full min-h-0 grid-cols-[320px_1fr] gap-4">
      {/* config */}
      <aside className="card flex min-h-0 min-w-0 flex-col p-4">
        <Eyebrow>Portfolio builder</Eyebrow>
        <h1 className="mt-1 font-display text-[24px] leading-[1.05]">Long-term value leads to <span className="text-accent">greater treasures</span>.</h1>
        <p className="mt-1 hidden text-[11.5px] italic leading-snug text-muted [@media(min-height:800px)]:block">Deterministic construction from the score dataset. Uses only scores known at the allocation month — no look-ahead.</p>
        <div className="mt-3 space-y-3">
          <Slider label="Capital available" value={config.capital} min={5_000_000} max={100_000_000} step={1_000_000} onChange={(v) => setConfig({ capital: v })} format={(v) => fmtMoney(v)} />
          <div>
            <Eyebrow className="mb-1">Risk tolerance</Eyebrow>
            <Segmented value={config.risk} onChange={(v: RiskTolerance) => setConfig({ risk: v })} size="sm" className="w-full" options={(Object.keys(RISK_PRESETS) as RiskTolerance[]).map((k) => ({ value: k, label: RISK_PRESETS[k].label }))} />
            <div className="mt-1 hidden text-[10.5px] italic text-muted [@media(min-height:800px)]:block">{RISK_PRESETS[config.risk].blurb}</div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Slider label="Max exposure" value={config.maxExposure} min={0.04} max={0.25} step={0.01} onChange={(v) => setConfig({ maxExposure: v })} format={(v) => `${Math.round(v * 100)}%`} />
            <Slider label="Min score" value={config.minScore} min={55} max={88} step={1} onChange={(v) => setConfig({ minScore: v })} />
            <Slider label="Positions" value={config.targetPositions} min={8} max={40} step={1} onChange={(v) => setConfig({ targetPositions: v })} />
            <Slider label="Max / group" value={config.maxPerGroup} min={1} max={3} step={1} onChange={(v) => setConfig({ maxPerGroup: v })} />
          </div>
          <div>
            <Eyebrow className="mb-1">Allocation month</Eyebrow>
            <div className="flex flex-wrap gap-1">
              {asOfOptions.map((m) => (
                <button key={m} onClick={() => setConfig({ asOf: m })} className={`font-caps rounded-[3px] border px-1.5 py-0.5 text-[10.5px] font-bold tracking-wide transition ${config.asOf === m ? "border-ink bg-ink text-parch" : "border-line-strong text-fg-2 hover:bg-surface-2"}`}>{fmtMonth(m)}</button>
              ))}
            </div>
            <div className="mt-1 hidden text-[10px] italic leading-snug text-faint [@media(min-height:800px)]:block">Earlier month = more real history to replay in Monitor ({months.length - 1 - asOfIdx} months after {fmtMonth(config.asOf)}).</div>
          </div>
          {universe && (
            <div className="inset px-3 py-2 text-[12px] text-fg-2">
              <div className="flex justify-between"><span>Scored in {fmtMonth(config.asOf)}</span><span className="tnum font-caps font-bold text-fg">{universe.scored}</span></div>
              <div className="flex justify-between"><span>Score ≥ {config.minScore}</span><span className="tnum font-caps font-bold text-fg">{universe.aboveMin}</span></div>
              <div className="flex justify-between"><span>No alert · stress ok · 6+ months</span><span className="tnum font-caps font-bold text-fg">{universe.clean}</span></div>
            </div>
          )}
        </div>
        <div className="mt-auto flex gap-2 pt-3">
          <Button size="lg" className="min-w-0 flex-1" onClick={build} disabled={!data || (phase !== "idle" && phase !== "done")}>
            <Compass size={15} />{result ? "Rebuild" : "Build portfolio"}
          </Button>
          {result && phase === "done" && (
            <button onClick={() => { setResult(null); setPhase("idle"); }} title="Clear portfolio" className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[4px] border border-line-strong text-muted hover:text-fg"><RotateCcw size={14} /></button>
          )}
        </div>
      </aside>

      {/* result */}
      <section className="flex min-h-0 min-w-0 flex-col">
        <AnimatePresence mode="wait">
          {!data ? (
            <Skeleton key="sk" className="h-full" />
          ) : phase === "idle" || !shown ? (
            phase === "idle" ? <EmptyState key="empty" /> : <Building key="building" phase={phase} universe={universe} preview={preview} />
          ) : (
            <motion.div key="result" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }} className="flex min-h-0 flex-1 flex-col gap-3">
              {/* headline */}
              <div className="card flex shrink-0 items-center gap-5 px-5 py-3">
                <ScoreRing score={shown.avgScore} size={96} stroke={8} label="Chest" />
                <div className="grid flex-1 grid-cols-4 gap-4">
                  <Stat label="Allocated" value={fmtMoney(shown.allocated)} hint={shown.reserve > 0 ? `${fmtMoney(shown.reserve)} in reserve` : `${shown.positions.length} positions`} />
                  <Stat label="Expected stress" value={`${(shown.expectedStress * 100).toFixed(1)}%`} hint="weighted 100 − score" tone={risk?.tone} />
                  <Stat label="Effective positions" value={shown.effectiveN.toFixed(1)} hint={`HHI ${shown.hhi.toFixed(3)} · top ${(shown.topWeight * 100).toFixed(0)}%`} />
                  <Stat label="Risk profile" value={risk?.label ?? "—"} tone={risk?.tone} hint={`${shown.groups} business groups`} />
                </div>
                <div className="flex flex-col items-end gap-2">
                  <Segmented value={tab} onChange={setTab} size="sm" options={[{ value: "map", label: "Treasure map" }, { value: "distribution", label: "Distribution" }, { value: "crew", label: "Crew" }]} />
                  <Button size="sm" onClick={() => nav("/monitor")}>Monitor <ArrowRight size={13} /></Button>
                </div>
              </div>

              {tab === "map" && (
                <div className="card flex min-h-0 flex-1 flex-col p-4">
                  <PanelHead eyebrow="Allocation" title={`${shown.positions.length} companies · as of ${fmtMonth(shown.config.asOf, "long")}`} right={<div className="text-[10px] italic text-muted">Tile area = capital · ink = score at allocation · click to inspect</div>} />
                  <div className="mt-2 min-h-0 flex-1"><AutoSize>{(w, h) => <Treemap width={w} height={h} items={shown.positions.map((p) => ({ id: p.id, name: p.name, value: p.amount, score: p.score, sub: `${(p.weight * 100).toFixed(1)}%`, dimmed: selected != null && selected !== p.id, mark: p.rank === 1 }))} onSelect={(id) => setSelected(selected === id ? null : id)} selected={selected} />}</AutoSize></div>
                  {selected && (() => { const p = shown.positions.find((x) => x.id === selected)!; return (
                    <div className="mt-2 flex shrink-0 items-center gap-4 border-t border-line pt-2 text-[12px]">
                      <span className="font-display text-base">{p.name}</span>
                      <span className="font-mono text-faint">{p.id}</span>
                      <span>rank <span className="tnum font-caps font-bold">#{p.rank}</span></span>
                      <span>score <span className="tnum font-caps font-bold" style={{ color: scoreColor(p.score) }}>{p.score.toFixed(0)}</span></span>
                      <span>momentum <span className="tnum font-caps font-bold">{fmtDelta(p.momentum)}</span></span>
                      <span>weight <span className="tnum font-caps font-bold">{(p.weight * 100).toFixed(1)}%</span> · {fmtMoney(p.amount)}</span>
                      <Link to={`/company/${p.id}`} className="font-caps ml-auto text-[10px] font-semibold uppercase tracking-[0.14em] text-accent hover:underline">Open profile →</Link>
                    </div>
                  ); })()}
                </div>
              )}

              {tab === "distribution" && (
                <div className="grid min-h-0 flex-1 grid-cols-2 gap-3">
                  <div className="card flex min-h-0 flex-col p-4">
                    <PanelHead eyebrow="Score distribution" title="Capital by score bucket at allocation" />
                    <div className="mt-4 flex-1"><AutoSize>{(_w, h) => <Histogram bins={shown.histogram.map((b) => ({ from: b.from, to: b.to, value: b.weight }))} height={Math.max(60, h - 70)} valueLabel={(v) => `${(v * 100).toFixed(0)}% of capital`} marker={shown.avgScore} markerLabel={`avg ${shown.avgScore.toFixed(0)}`} />}</AutoSize></div>
                    <div className="mt-3 flex h-2.5 w-full shrink-0 overflow-hidden rounded-sm">
                      {(["prime", "healthy", "watch", "risk"] as Tier[]).map((t) => shown.tiers[t] > 0 && <div key={t} style={{ width: `${shown.tiers[t] * 100}%`, background: scoreColor(t === "prime" ? 88 : t === "healthy" ? 74 : t === "watch" ? 55 : 30) }} />)}
                    </div>
                    <div className="mt-1.5 flex shrink-0 flex-wrap gap-4 text-[11px] text-muted">
                      {(["prime", "healthy", "watch", "risk"] as Tier[]).map((t) => shown.tiers[t] > 0 && <span key={t} className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full" style={{ background: scoreColor(t === "prime" ? 88 : t === "healthy" ? 74 : t === "watch" ? 55 : 30) }} />{TIER_LABEL[t]} <span className="tnum font-caps font-bold text-fg">{(shown.tiers[t] * 100).toFixed(0)}%</span></span>)}
                    </div>
                  </div>
                  <div className="card flex min-h-0 flex-col p-4">
                    <PanelHead eyebrow="Concentration & diversification" title="How the chest is spread" />
                    <div className="mt-4 grid grid-cols-2 gap-5">
                      <Stat big label="Largest position" value={`${(shown.topWeight * 100).toFixed(1)}%`} hint={`cap ${Math.round(shown.config.maxExposure * 100)}%`} />
                      <Stat big label="Effective N" value={shown.effectiveN.toFixed(1)} hint={`of ${shown.positions.length} names`} />
                      <Stat big label="Score range" value={`${shown.minScore.toFixed(0)}–${shown.maxScore.toFixed(0)}`} hint={`floor ${shown.config.minScore}`} />
                      <Stat big label="Universe" value={`${shown.eligible}`} hint={`eligible of ${shown.universe} scored`} />
                    </div>
                    <div className="mt-auto border-t border-line pt-3 text-[11px] italic leading-relaxed text-muted">Ranking = {Math.round(RISK_PRESETS[shown.config.risk].wScore * 100)}% score · {Math.round(RISK_PRESETS[shown.config.risk].wMomentum * 100)}% momentum · {Math.round(RISK_PRESETS[shown.config.risk].wStability * 100)}% stability. Weights ∝ rank^{RISK_PRESETS[shown.config.risk].gamma}, capped at {Math.round(shown.config.maxExposure * 100)}% and max {shown.config.maxPerGroup} per group. Expected stress = Σ w·(100 − score): the score is literally 100 − P(stress event in 3–6 months).</div>
                  </div>
                </div>
              )}

              {tab === "crew" && (
                <div className="card flex min-h-0 flex-1 flex-col p-4">
                  <PanelHead eyebrow="Positions" title="Ranked selection" right={<div className="text-[10px] italic text-muted">hover to highlight · click to open</div>} />
                  <div className="mt-2 grid min-h-0 flex-1 grid-flow-col gap-x-5" style={{ gridTemplateRows: `repeat(${Math.ceil(shown.positions.length / 2)}, minmax(0, 1fr))`, gridTemplateColumns: "minmax(0,1fr) minmax(0,1fr)" }}>
                    {shown.positions.map((p, i) => {
                      const c = byId.get(p.id);
                      return (
                        <motion.div key={p.id} initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.02 }}
                          onMouseEnter={() => setSelected(p.id)} onMouseLeave={() => setSelected(null)}
                          className={`grid min-h-0 grid-cols-[20px_1fr_58px_60px_64px_72px] items-center gap-2 border-b border-line px-1 text-[12px] ${selected === p.id ? "bg-surface-2" : ""}`}>
                          <div className="font-caps text-[10px] text-faint">{String(p.rank).padStart(2, "0")}</div>
                          <Link to={`/company/${p.id}`} className="min-w-0"><div className="truncate font-display text-[14px] leading-tight hover:text-accent">{p.name}</div><div className="font-mono text-[9px] leading-tight text-faint">{p.id}{p.group ? ` · ${p.group}` : ""}</div></Link>
                          <div>{c && <Sparkline values={c.scores.slice(0, asOfIdx + 1)} width={56} height={18} color={scoreColor(p.score)} animate={false} />}</div>
                          <div className="text-right"><span className="tnum font-caps text-[14px] font-bold" style={{ color: scoreColor(p.score) }}>{p.score.toFixed(0)}</span><span className="tnum ml-1 text-[10px]" style={{ color: (p.momentum ?? 0) >= 0 ? "#2d6a4f" : "#8b1e2d" }}>{fmtDelta(p.momentum)}</span></div>
                          <div><div className="h-1.5 w-full overflow-hidden rounded-full bg-line"><motion.div className="h-full rounded-full bg-[#b8891c]" initial={{ width: 0 }} animate={{ width: `${(p.weight / shown.topWeight) * 100}%` }} transition={{ duration: 0.8, delay: i * 0.02 }} /></div><div className="tnum font-caps text-[9px] text-muted">{(p.weight * 100).toFixed(1)}%</div></div>
                          <div className="tnum font-caps text-right text-[12px] font-bold">{fmtMoney(p.amount)}</div>
                        </motion.div>
                      );
                    })}
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </section>
    </div>
  );
}

function EmptyState() {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="card flex h-full flex-col items-center justify-center p-10 text-center">
      <div className="mb-5 grid h-32 w-32 grid-cols-4 gap-1.5">
        {Array.from({ length: 16 }).map((_, i) => (
          <motion.div key={i} className="rounded-[2px]" style={{ background: scoreColor(60 + ((i * 7) % 40)), opacity: 0.35 }} animate={{ opacity: [0.2, 0.7, 0.2] }} transition={{ duration: 2.4, repeat: Infinity, delay: i * 0.12 }} />
        ))}
      </div>
      <h2 className="font-display text-3xl">Set your constraints, then build.</h2>
      <p className="mx-auto mt-2 max-w-md text-[13px] italic text-muted">The allocator screens every scored company at the allocation month, ranks by score, momentum and stability, and spreads capital under your exposure and group limits.</p>
      <div className="font-caps mt-6 flex gap-6 text-[10px] uppercase tracking-[0.24em] text-faint"><span>Compounding</span><span>·</span><span>Discipline</span><span>·</span><span>Patience</span></div>
    </motion.div>
  );
}

function Building({ phase, universe, preview }: { phase: Phase; universe: { scored: number; aboveMin: number; clean: number } | null; preview: PortfolioResult | null }) {
  const steps: { key: Phase; label: string; value: number | null }[] = [
    { key: "screening", label: "Screening scored companies", value: universe?.scored ?? null },
    { key: "ranking", label: "Ranking eligible names", value: preview?.eligible ?? null },
    { key: "allocating", label: "Allocating under constraints", value: preview?.positions.length ?? null },
  ];
  const order: Phase[] = ["screening", "ranking", "allocating", "done"];
  const cur = order.indexOf(phase);
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, scale: 0.98 }} className="card flex h-full flex-col items-center justify-center p-10">
      <div className="relative mb-8 h-24 w-24">
        <motion.div className="absolute inset-0 rounded-full border-2 border-[#b8891c]/40" animate={{ scale: [1, 1.6], opacity: [0.6, 0] }} transition={{ duration: 1.4, repeat: Infinity }} />
        <motion.div className="absolute inset-0 rounded-full border-2 border-[#b8891c]/40" animate={{ scale: [1, 1.6], opacity: [0.6, 0] }} transition={{ duration: 1.4, repeat: Infinity, delay: 0.5 }} />
        <motion.div className="absolute inset-0 flex items-center justify-center" animate={{ rotate: 360 }} transition={{ duration: 6, repeat: Infinity, ease: "linear" }}><Compass size={64} className="text-[#8a6512]" strokeWidth={1.2} /></motion.div>
      </div>
      <div className="w-full max-w-sm space-y-2">
        {steps.map((s, i) => {
          const state = i < cur ? "done" : i === cur ? "active" : "todo";
          return (
            <div key={s.key} className={`flex items-center justify-between rounded-[4px] border px-4 py-2.5 text-[13px] transition-all ${state === "active" ? "border-accent bg-accent/10" : state === "done" ? "border-line bg-surface-2" : "border-line opacity-40"}`}>
              <span>{s.label}</span>
              <span className="tnum font-caps font-bold">{state !== "todo" && s.value != null ? <AnimatedNumber value={s.value} duration={0.6} /> : "…"}</span>
            </div>
          );
        })}
      </div>
    </motion.div>
  );
}
