import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, Coins, Compass, RotateCcw, Telescope } from "lucide-react";
import { useNetwork } from "@/hooks/useNetwork";
import { useAssessments } from "@/hooks/useAssessments";
import { useEffectiveResult } from "@/hooks/useEffectiveResult";
import { useApp } from "@/store/app";
import { buildPortfolio, riskLabel, RISK_PRESETS, OVERLAP_PENALTY, type PortfolioResult, type RiskTolerance } from "@/lib/portfolio";
import { Treemap } from "@/components/charts/Treemap";
import { Histogram } from "@/components/charts/Histogram";
import { Sparkline } from "@/components/charts/Sparkline";
import { BubbleMap } from "@/components/charts/BubbleMap";
import { BorrowerCard } from "@/components/BorrowerCard";
import { AutoSize } from "@/components/ui/AutoSize";
import { ScoreRing } from "@/components/ui/ScoreRing";
import { AnimatedNumber } from "@/components/ui/AnimatedNumber";
import { Badge, Button, Eyebrow, PanelHead, Segmented, Skeleton, Slider, Stat } from "@/components/ui/primitives";
import { InfoTip } from "@/components/ui/InfoTip";
import { fmtDelta, fmtMoney, fmtMonth } from "@/lib/format";
import { scoreColor } from "@/lib/colors";
import { historyLength, TIER_LABEL, type Tier } from "@/lib/derived";

type Phase = "idle" | "screening" | "ranking" | "allocating" | "done";
type View = "candidates" | "portfolio";
type Tab = "map" | "distribution" | "crew";

/** Borrowers: the candidate universe for the selected lender, and the chest built for it. */
export function Borrowers() {
  const { data } = useNetwork();
  const assessed = useAssessments(data);
  const config = useApp((s) => s.config);
  const setConfig = useApp((s) => s.setConfig);
  const lenderId = useApp((s) => s.lenderId);
  const setLender = useApp((s) => s.setLender);
  const baseResult = useApp((s) => s.result);
  const setResult = useApp((s) => s.setResult);
  const executed = useApp((s) => s.executed);
  const setOpenCompany = useApp((s) => s.setOpenCompany);
  const result = useEffectiveResult();
  const nav = useNavigate();
  const [phase, setPhase] = useState<Phase>(baseResult ? "done" : "idle");
  const [view, setView] = useState<View>("candidates");
  const [tab, setTab] = useState<Tab>("map");
  const [selected, setSelected] = useState<string | null>(null);
  const [preview, setPreview] = useState<PortfolioResult | null>(null);

  const months = data?.meta.months ?? [];
  const asOfOptions = useMemo(() => months.filter((_, i) => i >= 6), [months]);
  const asOfIdx = months.indexOf(config.asOf);
  const lender = useMemo(() => assessed.find((a) => a.c.id === lenderId) ?? null, [assessed, lenderId]);
  const topLenders = useMemo(() => assessed.filter((a) => a.provider.qualified).sort((x, y) => y.provider.capacity - x.provider.capacity).slice(0, 5), [assessed]);

  // candidates for THIS lender: never itself or its business group
  const candidates = useMemo(() => {
    const list = assessed.filter((a) => a.receiver.eligible && a.receiver.need >= 25 && !(lender && (a.c.id === lender.c.id || (lender.c.group != null && a.c.group === lender.c.group))));
    list.sort((x, y) => y.receiver.fit - x.receiver.fit || y.c.latest.score - x.c.latest.score);
    return list;
  }, [assessed, lender]);
  const excludedRelated = useMemo(() => (lender ? assessed.filter((a) => a.c.id === lender.c.id || (lender.c.group != null && a.c.group === lender.c.group)).length : 0), [assessed, lender]);
  const inChest = useMemo(() => new Set(result?.positions.map((p) => p.id) ?? []), [result]);
  const bubbles = useMemo(() => {
    const cand = new Set(candidates.map((a) => a.c.id));
    return assessed.map((a) => ({ id: a.c.id, name: a.c.name, score: a.c.latest.score, momentum: a.momentum ?? 0, size: a.receiver.fit, qualified: cand.has(a.c.id), alert: a.c.latest.alert === 1, dimmed: !cand.has(a.c.id) && !inChest.has(a.c.id) }));
  }, [assessed, candidates, inChest]);

  const universe = useMemo(() => {
    if (!data || asOfIdx < 0) return null;
    let scored = 0, aboveMin = 0, clean = 0;
    for (const c of data.companies) {
      const s = c.scores[asOfIdx];
      if (s == null) continue;
      scored++;
      if (lender && (c.id === lender.c.id || (lender.c.group != null && c.group === lender.c.group))) continue;
      if (s >= config.minScore) aboveMin++;
      if (s >= config.minScore && c.alerts[asOfIdx] === 0 && (c.stress[asOfIdx] ?? 0) <= RISK_PRESETS[config.risk].maxStress && historyLength(c.scores, asOfIdx) >= 6) clean++;
    }
    return { scored, aboveMin, clean };
  }, [data, asOfIdx, config.minScore, config.risk, lender]);

  function build() {
    if (!data) return;
    setPreview(buildPortfolio(data, { ...config, lenderId }));
    setSelected(null);
    setTab("map");
    setView("portfolio");
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
  const builtForOtherLender = baseResult != null && baseResult.config.lenderId !== lenderId;

  return (
    <div className="grid h-full min-h-0 grid-cols-[320px_1fr] gap-4">
      {/* lender + config */}
      <aside className="card flex min-h-0 min-w-0 flex-col p-4">
        <Eyebrow>Borrowers · treasure chest</Eyebrow>
        <h1 className="mt-1 font-display text-[22px] leading-[1.05]">Long-term value leads to <span className="text-accent">greater treasures</span>.</h1>

        {lender ? (
          <div className="inset mt-2 border-accent/60 p-2.5">
            <div className="flex items-center justify-between"><Eyebrow className="text-accent"><Coins size={10} className="mr-1 inline" />Lending as</Eyebrow><button onClick={() => nav("/")} className="font-caps text-[9px] uppercase tracking-[0.12em] text-muted hover:text-fg">change</button></div>
            <div className="mt-0.5 flex items-center justify-between gap-2">
              <button onClick={() => setOpenCompany(lender.c.id)} className="min-w-0 truncate font-display text-[19px] leading-tight hover:text-accent">{lender.c.name}</button>
              <span className="tnum font-caps text-2xl font-bold" style={{ color: scoreColor(lender.c.latest.score) }}>{lender.c.latest.score.toFixed(0)}</span>
            </div>
            <div className="mt-0.5 text-[10.5px] italic leading-snug text-muted">Capacity {lender.provider.capacity} · {excludedRelated - 1 > 0 ? `${excludedRelated - 1} compan${excludedRelated - 1 === 1 ? "y" : "ies"} of its group excluded` : "no group companies to exclude"} · look-alike profiles penalised up to {Math.round(OVERLAP_PENALTY * 100)}%</div>
          </div>
        ) : (
          <div className="inset mt-2 p-2.5">
            <Eyebrow className="text-accent">Who is lending?</Eyebrow>
            <div className="mt-1 text-[11.5px] italic leading-snug text-muted">Pick a lender — the chest is built for it: no exposure to its own group, less to look-alike risk profiles.</div>
            <div className="mt-1.5 flex flex-wrap gap-1">
              {topLenders.map((a) => <button key={a.c.id} onClick={() => setLender(a.c.id)} className="font-caps rounded-[3px] border border-line-strong px-1.5 py-0.5 text-[10px] font-bold hover:bg-surface-2">{a.c.name} <span className="text-faint">{a.c.latest.score.toFixed(0)}</span></button>)}
            </div>
          </div>
        )}

        <div className="mt-3 space-y-2.5">
          <Slider label="Capital available" value={config.capital} min={5_000_000} max={100_000_000} step={1_000_000} onChange={(v) => setConfig({ capital: v })} format={(v) => fmtMoney(v)} />
          <div>
            <Eyebrow className="mb-1">Risk tolerance</Eyebrow>
            <Segmented value={config.risk} onChange={(v: RiskTolerance) => setConfig({ risk: v })} size="sm" className="w-full" options={(Object.keys(RISK_PRESETS) as RiskTolerance[]).map((k) => ({ value: k, label: RISK_PRESETS[k].label }))} />
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
              {asOfOptions.map((m) => <button key={m} onClick={() => setConfig({ asOf: m })} className={`font-caps rounded-[3px] border px-1.5 py-0.5 text-[10px] font-bold tracking-wide transition ${config.asOf === m ? "border-ink bg-ink text-parch" : "border-line-strong text-fg-2 hover:bg-surface-2"}`}>{fmtMonth(m)}</button>)}
            </div>
          </div>
          {universe && (
            <div className="inset hidden px-3 py-1.5 text-[11.5px] text-fg-2 [@media(min-height:800px)]:block">
              <div className="flex justify-between"><span>Scored in {fmtMonth(config.asOf)}</span><span className="tnum font-caps font-bold text-fg">{universe.scored}</span></div>
              <div className="flex justify-between"><span>Score ≥ {config.minScore}{lender ? ", not related" : ""}</span><span className="tnum font-caps font-bold text-fg">{universe.aboveMin}</span></div>
              <div className="flex justify-between"><span>No alert · stress ok · 6+ months</span><span className="tnum font-caps font-bold text-fg">{universe.clean}</span></div>
            </div>
          )}
        </div>
        <div className="mt-auto flex gap-2 pt-3">
          <Button size="lg" className="min-w-0 flex-1" onClick={build} disabled={!data || (phase !== "idle" && phase !== "done")}>
            <Compass size={15} />{baseResult ? "Rebuild chest" : "Build chest"}
          </Button>
          {baseResult && phase === "done" && <button onClick={() => { setResult(null); setPhase("idle"); setView("candidates"); }} title="Clear portfolio" className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[4px] border border-line-strong text-muted hover:text-fg"><RotateCcw size={14} /></button>}
        </div>
      </aside>

      {/* right */}
      <section className="flex min-h-0 min-w-0 flex-col">
        <AnimatePresence mode="wait">
          {!data ? (
            <Skeleton key="sk" className="h-full" />
          ) : phase === "screening" || phase === "ranking" || phase === "allocating" ? (
            <Building key="building" phase={phase} universe={universe} preview={preview} />
          ) : view === "candidates" || !shown ? (
            <motion.div key="cands" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="card flex min-h-0 flex-1 flex-col p-4">
              <PanelHead eyebrow={lender ? `Financing candidates for ${lender.c.name}` : "Financing candidates"} title={`${candidates.length} healthy companies with visible capital needs${excludedRelated - 1 > 0 ? ` · ${excludedRelated - 1} of the lender's group excluded` : ""}`}
                right={<>
                  <InfoTip>
                    <div className="font-caps text-[10px] font-bold uppercase tracking-[0.12em] text-accent-2">Borrower threshold · dashed line at 60</div>
                    <p className="mt-1">A company is a <b>financing candidate</b> when it is healthy enough to finance <i>and</i> shows a need for capital:</p>
                    <ul className="mt-1 list-disc space-y-0.5 pl-4">
                      <li><b>Score ≥ 60</b> (the floor; 40–70 is the pipeline's amber band) and not in the bottom 20% this month.</li>
                      <li>At most one stress flag; pays suppliers ≤ 5 days late and ≤ 50% of payables late (when measurable).</li>
                      <li><b>Need ≥ 25</b>: runway &lt; 12 mo, operating cash burn, cushion &lt; 0.5×, lines &gt; 50% drawn, little undrawn credit, DSO &gt; 30 d or collections growing &gt; 20% YoY.</li>
                      {lender && <li>Never the lender itself or its business group.</li>}
                    </ul>
                    <p className="mt-1 text-muted">Bubble area = financing fit (√need × health). Rules in <span className="font-mono">src/lib/derived.ts</span>.</p>
                  </InfoTip>
                  {shown && <Segmented value={view} onChange={setView} size="sm" options={[{ value: "candidates", label: "Candidates" }, { value: "portfolio", label: "Chest" }]} />}
                  {builtForOtherLender && <Badge tone="warn">Chest built for another lender</Badge>}
                </>} />
              <div className="mt-2 min-h-0 flex-1"><AutoSize>{(w, h) => <BubbleMap data={bubbles} width={w} height={h} onSelect={(id) => setOpenCompany(id)} sizeLabel="Fit" xThreshold={60} thresholdLabel="FINANCING FLOOR 60" />}</AutoSize></div>
              <div className="mt-2 flex shrink-0 items-center justify-between"><Eyebrow>Best fit · healthy and in need of capital</Eyebrow><span className="text-[10px] italic text-muted">click a card for the spider chart and every metric</span></div>
              <div className="mt-1.5 grid shrink-0 grid-cols-4 gap-3">
                {candidates.slice(0, 4).map((a, i) => <BorrowerCard key={a.c.id} a={a} index={i} onOpen={() => setOpenCompany(a.c.id)} inPortfolio={inChest.has(a.c.id)} />)}
              </div>
            </motion.div>
          ) : (
            <motion.div key="result" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }} className="flex min-h-0 flex-1 flex-col gap-3">
              <div className="card flex shrink-0 items-center gap-5 px-5 py-3">
                <ScoreRing score={shown.avgScore} size={96} stroke={8} label="Chest" />
                <div className="grid flex-1 grid-cols-4 gap-4">
                  <Stat label="Allocated" value={fmtMoney(shown.allocated)} hint={shown.reserve > 0 ? `${fmtMoney(shown.reserve)} in reserve` : `${shown.positions.length} positions`} />
                  <Stat label="Expected stress" value={`${(shown.expectedStress * 100).toFixed(1)}%`} hint="weighted 100 − score" tone={risk?.tone} />
                  <Stat label="Effective positions" value={shown.effectiveN.toFixed(1)} hint={`HHI ${shown.hhi.toFixed(3)} · top ${(shown.topWeight * 100).toFixed(0)}%`} />
                  <Stat label="Overlap with lender" value={shown.avgOverlap == null ? "—" : shown.avgOverlap.toFixed(2)} hint={shown.avgOverlap == null ? "no lender" : shown.avgOverlap < 0.3 ? "well diversified" : shown.avgOverlap < 0.6 ? "moderate" : "look-alike risk"} tone={shown.avgOverlap == null ? undefined : shown.avgOverlap < 0.3 ? "positive" : shown.avgOverlap < 0.6 ? "warn" : "negative"} />
                </div>
                <div className="flex flex-col items-end gap-2">
                  <div className="flex items-center gap-2">
                    <Segmented value={view} onChange={setView} size="sm" options={[{ value: "candidates", label: "Candidates" }, { value: "portfolio", label: "Chest" }]} />
                    <Segmented value={tab} onChange={setTab} size="sm" options={[{ value: "map", label: "Treasure map" }, { value: "distribution", label: "Distribution" }, { value: "crew", label: "Crew" }]} />
                  </div>
                  <div className="flex items-center gap-2">
                    {executed.length > 0 && <Badge tone="warn">{executed.length} action{executed.length > 1 ? "s" : ""} executed</Badge>}
                    <Button size="sm" onClick={() => nav("/monitor")}><Telescope size={12} />Monitor <ArrowRight size={13} /></Button>
                  </div>
                </div>
              </div>

              {tab === "map" && (
                <div className="card flex min-h-0 flex-1 flex-col p-4">
                  <PanelHead eyebrow="Allocation" title={`${shown.positions.length} borrowers · as of ${fmtMonth(shown.config.asOf, "long")}${lender ? ` · lent by ${lender.c.name}` : ""}`} right={<div className="text-[10px] italic text-muted">Tile area = capital · ink = score at allocation · biggest tile = rank #1 · click a company for its spider chart and metrics</div>} />
                  <div className="mt-2 min-h-0 flex-1"><AutoSize>{(w, h) => <Treemap width={w} height={h} items={shown.positions.map((p) => ({ id: p.id, name: p.name, value: p.amount, score: p.score, sub: `${(p.weight * 100).toFixed(1)}%${p.overlap != null ? ` · overlap ${p.overlap.toFixed(2)}` : ""}`, dimmed: selected != null && selected !== p.id }))} onSelect={(id) => { setSelected(id); setOpenCompany(id); }} selected={selected} />}</AutoSize></div>
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
                      <Stat big label="Related excluded" value={`${shown.excludedRelated}`} hint={lender ? `${lender.c.name} and its group` : "no lender"} />
                    </div>
                    <div className="mt-auto border-t border-line pt-3 text-[11px] italic leading-relaxed text-muted">Ranking = {Math.round(RISK_PRESETS[shown.config.risk].wScore * 100)}% score · {Math.round(RISK_PRESETS[shown.config.risk].wMomentum * 100)}% momentum · {Math.round(RISK_PRESETS[shown.config.risk].wStability * 100)}% stability, × (1 − {OVERLAP_PENALTY} × overlap with the lender's risk profile). Weights ∝ rank^{RISK_PRESETS[shown.config.risk].gamma}, capped at {Math.round(shown.config.maxExposure * 100)}% and max {shown.config.maxPerGroup} per group. The dataset has no sector: overlap = cosine similarity of the five dimension contributions; the lender's own business group is excluded outright.</div>
                  </div>
                </div>
              )}

              {tab === "crew" && (
                <div className="card flex min-h-0 flex-1 flex-col p-4">
                  <PanelHead eyebrow="Positions" title="Ranked selection" right={<div className="text-[10px] italic text-muted">click a name for its metrics</div>} />
                  <div className="mt-2 grid min-h-0 flex-1 grid-flow-col gap-x-5" style={{ gridTemplateRows: `repeat(${Math.ceil(shown.positions.length / 2)}, minmax(0, 1fr))`, gridTemplateColumns: "minmax(0,1fr) minmax(0,1fr)" }}>
                    {shown.positions.map((p, i) => {
                      const c = byId.get(p.id);
                      return (
                        <motion.button key={p.id} onClick={() => setOpenCompany(p.id)} initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.02 }}
                          className="grid min-h-0 grid-cols-[20px_1fr_58px_60px_64px_72px] items-center gap-2 border-b border-line px-1 text-left text-[12px] hover:bg-surface-2">
                          <div className="font-caps text-[10px] text-faint">{String(p.rank).padStart(2, "0")}</div>
                          <div className="min-w-0"><div className="truncate font-display text-[14px] leading-tight">{p.name}</div><div className="font-mono text-[9px] leading-tight text-faint">{p.id}{p.overlap != null ? ` · overlap ${p.overlap.toFixed(2)}` : ""}</div></div>
                          <div>{c && <Sparkline values={c.scores.slice(0, asOfIdx + 1)} width={56} height={18} color={scoreColor(p.score)} animate={false} />}</div>
                          <div className="text-right"><span className="tnum font-caps text-[14px] font-bold" style={{ color: scoreColor(p.score) }}>{p.score.toFixed(0)}</span><span className="tnum ml-1 text-[10px]" style={{ color: (p.momentum ?? 0) >= 0 ? "#2d6a4f" : "#8b1e2d" }}>{fmtDelta(p.momentum)}</span></div>
                          <div><div className="h-1.5 w-full overflow-hidden rounded-full bg-line"><motion.div className="h-full rounded-full bg-[#b8891c]" initial={{ width: 0 }} animate={{ width: `${(p.weight / shown.topWeight) * 100}%` }} transition={{ duration: 0.8, delay: i * 0.02 }} /></div><div className="tnum font-caps text-[9px] text-muted">{(p.weight * 100).toFixed(1)}%</div></div>
                          <div className="tnum font-caps text-right text-[12px] font-bold">{fmtMoney(p.amount)}</div>
                        </motion.button>
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

function Building({ phase, universe, preview }: { phase: Phase; universe: { scored: number; aboveMin: number; clean: number } | null; preview: PortfolioResult | null }) {
  const steps: { key: Phase; label: string; value: number | null }[] = [
    { key: "screening", label: "Screening scored companies (lender & its group excluded)", value: universe?.scored ?? null },
    { key: "ranking", label: "Ranking eligible names, penalising look-alike profiles", value: preview?.eligible ?? null },
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
      <div className="w-full max-w-md space-y-2">
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
