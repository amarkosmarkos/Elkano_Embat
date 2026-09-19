import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, Pause, Play, SkipBack, SkipForward, Telescope, X } from "lucide-react";
import { useNetwork } from "@/hooks/useNetwork";
import { useApp } from "@/store/app";
import { useEffectiveResult } from "@/hooks/useEffectiveResult";
import { buildPortfolio, DEFAULT_CONFIG } from "@/lib/portfolio";
import { monitorSnapshot, portfolioTrajectory, type PositionStatus, type PositionTimeline } from "@/lib/monitor";
import { ScoreHistory } from "@/components/charts/ScoreHistory";
import { Sparkline } from "@/components/charts/Sparkline";
import { ComponentBars } from "@/components/charts/ComponentBars";
import { AutoSize } from "@/components/ui/AutoSize";
import { AnimatedNumber } from "@/components/ui/AnimatedNumber";
import { Badge, Button, Eyebrow, Pager, PanelHead, Skeleton, Stat } from "@/components/ui/primitives";
import { scoreColor, DIM_COLOR } from "@/lib/colors";
import { DIM_LABEL, fmtDelta, fmtMonth, cx } from "@/lib/format";
import type { Components } from "@/lib/types";
import { DIMENSIONS } from "@/lib/types";

const STATUS_META: Record<PositionStatus, { label: string; tone: "negative" | "positive" | "warn" | "neutral" }> = {
  deteriorating: { label: "Deteriorating", tone: "negative" },
  improving: { label: "Improving", tone: "positive" },
  watch: { label: "Watch", tone: "warn" },
  stable: { label: "Stable", tone: "neutral" },
};
const CHANGES_PER_PAGE = 4;

export function Monitor() {
  const { data } = useNetwork();
  const result = useEffectiveResult();
  const setResult = useApp((s) => s.setResult);
  const lenderId = useApp((s) => s.lenderId);
  const setOpenCompany = useApp((s) => s.setOpenCompany);
  const monitorMonth = useApp((s) => s.monitorMonth);
  const setMonitorMonth = useApp((s) => s.setMonitorMonth);
  const nav = useNavigate();
  const [playing, setPlaying] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [page, setPage] = useState(0);

  const months = data?.meta.months ?? [];
  const startIdx = result ? months.indexOf(result.config.asOf) : -1;
  const curMonth = monitorMonth && months.includes(monitorMonth) ? monitorMonth : result?.config.asOf ?? null;
  const curIdx = curMonth ? months.indexOf(curMonth) : -1;
  const lastIdx = months.length - 1;

  useEffect(() => {
    if (!playing) return;
    if (curIdx >= lastIdx) { setPlaying(false); return; }
    const t = setTimeout(() => setMonitorMonth(months[curIdx + 1]), 1300);
    return () => clearTimeout(t);
  }, [playing, curIdx, lastIdx, months, setMonitorMonth]);

  const snapshot = useMemo(() => (data && result && curMonth ? monitorSnapshot(data, result, curMonth) : null), [data, result, curMonth]);
  const trajectory = useMemo(() => (data && result ? portfolioTrajectory(data, result) : []), [data, result]);
  const byId = useMemo(() => new Map(data?.companies.map((c) => [c.id, c]) ?? []), [data]);
  const meaningful = useMemo(() => (snapshot ? snapshot.positions.filter((t) => t.meaningful).sort((a, b) => rank(a.status) - rank(b.status) || a.delta - b.delta) : []), [snapshot]);
  useEffect(() => { setPage((p) => Math.min(p, Math.max(0, Math.ceil(meaningful.length / CHANGES_PER_PAGE) - 1))); }, [meaningful.length]);

  if (!data) return <div className="grid h-full grid-rows-[56px_64px_1fr] gap-3"><Skeleton /><Skeleton /><Skeleton /></div>;
  if (!result || !snapshot || !curMonth) {
    return (
      <div className="card flex h-full flex-col items-center justify-center p-10 text-center">
        <Telescope size={44} className="mb-4 text-accent-2" strokeWidth={1.3} />
        <h1 className="font-display text-4xl">Nothing in the crow's nest yet.</h1>
        <p className="mx-auto mt-2 max-w-md text-[13px] italic text-muted">Build a portfolio first — then replay the real score history month by month and watch continuous underwriting flag what changes.</p>
        <div className="mt-6 flex gap-3">
          <Button onClick={() => nav("/borrowers")}>Build a chest</Button>
          <Button variant="outline" onClick={() => setResult(buildPortfolio(data, { ...DEFAULT_CONFIG, lenderId }))}>Load demo chest</Button>
        </div>
      </div>
    );
  }

  const elapsed = curIdx - startIdx;
  const stable = snapshot.positions.filter((t) => !t.meaningful);
  const trajPoints = trajectory.map((t, i) => ({ month: t.month, score: i <= elapsed ? t.avg : null }));
  const nActionable = snapshot.nDeteriorating + snapshot.nImproving + snapshot.nWatch;
  const pageItems = meaningful.slice(page * CHANGES_PER_PAGE, (page + 1) * CHANGES_PER_PAGE);
  const expandedT = expanded ? snapshot.positions.find((t) => t.position.id === expanded) ?? null : null;
  const componentsAt = (id: string, m: string): Components => {
    const c = byId.get(id)!; const i = months.indexOf(m); const out = {} as Components;
    for (const d of DIMENSIONS) out[d] = c.components[d][i] ?? null;
    return out;
  };

  return (
    <div className="relative flex h-full min-h-0 flex-col gap-3">
      {/* header + timeline */}
      <div className="card flex shrink-0 items-center gap-5 px-5 py-2.5">
        <div className="min-w-0">
          <Eyebrow>Continuous underwriting · crow's nest</Eyebrow>
          <h1 className="truncate font-display text-[24px] leading-tight">
            {elapsed === 0 ? <>Day one. <span className="text-muted">Chest allocated in {fmtMonth(result.config.asOf, "long")}.</span></> : <>{fmtMonth(curMonth, "long")}. <span className="text-muted">{elapsed} month{elapsed > 1 ? "s" : ""} after allocation.</span></>}
          </h1>
        </div>
        <div className="relative mx-4 min-w-0 flex-1 px-2 pt-1">
          <div className="absolute left-2 right-2 top-[9px] h-px bg-line-strong" />
          <motion.div className="absolute left-2 top-[9px] h-px bg-[#8a6512]" animate={{ width: `calc(${(elapsed / Math.max(1, lastIdx - startIdx)) * 100}% - ${(elapsed / Math.max(1, lastIdx - startIdx)) * 16}px)` }} transition={{ type: "spring", stiffness: 120, damping: 20 }} />
          <div className="relative flex justify-between">
            {months.slice(startIdx).map((m, i) => {
              const active = i === elapsed, past = i < elapsed;
              return (
                <button key={m} onClick={() => { setPlaying(false); setMonitorMonth(m); }} className="group flex flex-col items-center gap-1">
                  <span className={cx("h-[9px] w-[9px] rounded-full border-2 transition-all", active ? "scale-125 border-[#8a6512] bg-[#c9a227] shadow-[0_0_10px_#c9a227]" : past ? "border-[#8a6512] bg-[#8a6512]" : "border-line-strong bg-parch group-hover:border-ink")} />
                  <span className={cx("font-mono text-[10px] leading-none", active ? "text-fg" : "text-faint")}>{fmtMonth(m)}</span>
                </button>
              );
            })}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          <Button variant="outline" size="sm" onClick={() => setMonitorMonth(months[startIdx])} disabled={curIdx <= startIdx}><SkipBack size={13} /></Button>
          <Button size="sm" onClick={() => setPlaying((p) => !p)} disabled={curIdx >= lastIdx && !playing}>{playing ? <Pause size={13} /> : <Play size={13} />}{playing ? "Pause" : curIdx >= lastIdx ? "End of data" : "Advance time"}</Button>
          <Button variant="outline" size="sm" onClick={() => setMonitorMonth(months[Math.min(lastIdx, curIdx + 1)])} disabled={curIdx >= lastIdx}><SkipForward size={13} /></Button>
        </div>
      </div>

      {/* headline + trajectory */}
      <div className="grid shrink-0 grid-cols-[400px_1fr] gap-3" style={{ height: 176 }}>
        <div className="card flex flex-col justify-between p-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Eyebrow>Chest score</Eyebrow>
              <div className="flex items-baseline gap-2">
                <span className="tnum font-caps text-[44px] font-bold leading-none" style={{ color: scoreColor(snapshot.avgNow) }}><AnimatedNumber value={snapshot.avgNow} /></span>
                <span className="tnum font-caps text-base font-bold" style={{ color: snapshot.weightedDelta >= 0 ? "#2d6a4f" : "#8b1e2d" }}>{fmtDelta(snapshot.weightedDelta)}</span>
              </div>
              <div className="text-[11px] italic text-muted">was {snapshot.avgAtAllocation.toFixed(1)} at allocation</div>
            </div>
            <Stat label="Expected stress" value={<><AnimatedNumber value={snapshot.expectedStressNow * 100} digits={1} />%</>} hint={`was ${(result.expectedStress * 100).toFixed(1)}%`} tone={snapshot.expectedStressNow > result.expectedStress + 0.02 ? "negative" : undefined} />
          </div>
          <div className="grid grid-cols-4 gap-2">
            <Pill label="Falling" n={snapshot.nDeteriorating} tone="negative" />
            <Pill label="Watch" n={snapshot.nWatch} tone="warn" />
            <Pill label="Rising" n={snapshot.nImproving} tone="positive" />
            <Pill label="Alerts" n={snapshot.nAlerts} tone="negative" />
          </div>
        </div>
        <div className="card flex min-h-0 flex-col p-4">
          <div className="flex items-center justify-between">
            <Eyebrow>Chest trajectory · weighted average score, replayed from real monthly scores</Eyebrow>
            {snapshot.exposureDeteriorating > 0 && <span className="text-[11px] text-negative"><span className="tnum font-caps font-bold">{(snapshot.exposureDeteriorating * 100).toFixed(0)}%</span> of capital sits in deteriorating names</span>}
          </div>
          <div className="mt-1 min-h-0 flex-1"><AutoSize>{(w, h) => <ScoreHistory points={trajPoints} width={w} height={h} color="#8a6512" markers={[{ month: result.config.asOf, label: "allocation" }]} minY={Math.max(0, Math.min(...trajectory.map((t) => t.avg)) - 12)} />}</AutoSize></div>
        </div>
      </div>

      {/* changes */}
      <div className="card flex min-h-0 min-w-0 flex-1 flex-col p-4">
        <PanelHead eyebrow="Meaningful changes" title={meaningful.length === 0 ? "Nothing material yet" : `${meaningful.length} position${meaningful.length > 1 ? "s" : ""} moved materially`}
          right={<>
            {meaningful.length > CHANGES_PER_PAGE && <Pager page={page} pageSize={CHANGES_PER_PAGE} total={meaningful.length} onChange={setPage} />}
            {nActionable > 0 && <Button size="sm" onClick={() => nav("/monitor/actions")}>Actions <ArrowRight size={13} /></Button>}
          </>} />
        {meaningful.length === 0 ? (
          <div className="flex flex-1 items-center justify-center text-[13px] italic text-muted">Scores are moving within their normal range. Advance time to see the chest evolve.</div>
        ) : (
          <AnimatePresence mode="wait">
            <motion.div key={`${page}-${curMonth}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }} className="mt-2 grid min-h-0 flex-1 grid-cols-2 grid-rows-2 gap-3">
              {pageItems.map((t, i) => <ChangeCard key={t.position.id} t={t} index={i} onOpen={() => setExpanded(t.position.id)} />)}
            </motion.div>
          </AnimatePresence>
        )}
        {stable.length > 0 && (
          <div className="mt-2 flex shrink-0 items-center gap-2 border-t border-line pt-2">
            <Eyebrow className="shrink-0">Within range</Eyebrow>
            <div className="no-scrollbar flex min-w-0 flex-1 gap-1.5 overflow-x-auto">
              {stable.map((t) => (
                <button key={t.position.id} onClick={() => setOpenCompany(t.position.id)} className="inset flex shrink-0 items-center gap-2 px-2 py-1 text-[11px] hover:border-ink">
                  <span className="max-w-[110px] truncate">{t.position.name}</span>
                  <span className="tnum font-caps font-bold" style={{ color: scoreColor(t.scoreNow) }}>{t.scoreNow.toFixed(0)}</span>
                  <span className="tnum text-[10px]" style={{ color: t.delta >= 0 ? "#2d6a4f" : "#8b1e2d" }}>{fmtDelta(t.delta)}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* detail drawer */}
      <AnimatePresence>
        {expandedT && (
          <>
            <motion.div className="absolute inset-0 z-30 bg-[#0e0906]/55" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setExpanded(null)} />
            <motion.div className="card absolute inset-y-0 right-0 z-40 flex w-[560px] flex-col p-5" initial={{ x: 40, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: 40, opacity: 0 }} transition={{ type: "spring", stiffness: 300, damping: 30 }}>
              <div className="flex items-start justify-between">
                <div>
                  <Badge tone={STATUS_META[expandedT.status].tone} dot>{STATUS_META[expandedT.status].label}</Badge>
                  <div className="mt-1 font-display text-2xl uppercase">{expandedT.position.name}</div>
                  <div className="font-mono text-[10px] text-faint">{expandedT.position.id} · {(expandedT.position.weight * 100).toFixed(1)}% of capital</div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right"><div className="flex items-baseline gap-2"><span className="tnum font-caps text-lg text-muted line-through">{expandedT.scoreAtAllocation.toFixed(0)}</span><span className="tnum font-caps text-4xl font-bold" style={{ color: scoreColor(expandedT.scoreNow) }}>{expandedT.scoreNow.toFixed(0)}</span></div><div className="tnum text-[11px]" style={{ color: expandedT.delta >= 0 ? "#2d6a4f" : "#8b1e2d" }}>{fmtDelta(expandedT.delta)} since allocation</div></div>
                  <button onClick={() => setExpanded(null)} className="flex h-8 w-8 items-center justify-center rounded-[4px] border border-line-strong text-muted hover:text-fg"><X size={14} /></button>
                </div>
              </div>
              <div className="mt-4">
                <Eyebrow>Components · {fmtMonth(result.config.asOf)} → {fmtMonth(curMonth)}</Eyebrow>
                <p className="mb-2 mt-0.5 text-[10px] italic text-muted">Dashed = at allocation · solid = now</p>
                <ComponentBars components={componentsAt(expandedT.position.id, curMonth)} compare={componentsAt(expandedT.position.id, result.config.asOf)} />
              </div>
              <div className="mt-4 min-h-0 flex-1">
                <Eyebrow>Monthly path</Eyebrow>
                <div className="mt-1.5 space-y-1">
                  {expandedT.windowMonths.map((m, i) => {
                    const v = expandedT.window[i], prev = i > 0 ? expandedT.window[i - 1] : null;
                    const d = v != null && prev != null ? v - prev : null;
                    return (
                      <div key={m} className="flex items-center gap-3 text-[12px]">
                        <span className="w-14 font-mono text-faint">{fmtMonth(m)}</span>
                        <div className="h-2 flex-1 overflow-hidden rounded-sm bg-line"><div className="h-full rounded-sm" style={{ width: `${v ?? 0}%`, background: scoreColor(v) }} /></div>
                        <span className="tnum font-caps w-8 text-right font-bold">{v?.toFixed(0) ?? "—"}</span>
                        <span className="tnum w-12 text-right" style={{ color: d == null ? "var(--faint)" : d >= 0 ? "#2d6a4f" : "#8b1e2d" }}>{d == null ? "" : fmtDelta(d)}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
              <div className="mt-3 flex items-center justify-between border-t border-line pt-3 text-[12px] text-muted">
                <span>{expandedT.persistent ? "Move is persistent, not a single-month anomaly." : expandedT.delta <= -8 ? "Move is recent — could still be a one-month anomaly." : ""}</span>
                <button onClick={() => setOpenCompany(expandedT.position.id)} className="font-caps text-[10px] font-semibold uppercase tracking-[0.14em] text-accent hover:underline">Spider chart & all metrics →</button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

function rank(s: PositionStatus) { return s === "deteriorating" ? 0 : s === "watch" ? 1 : s === "improving" ? 2 : 3; }

function Pill({ label, n, tone }: { label: string; n: number; tone: "negative" | "positive" | "warn" }) {
  const cls = tone === "negative" ? "text-negative" : tone === "positive" ? "text-positive" : "text-warn";
  return (
    <div className="inset px-2.5 py-1.5">
      <div className={cx("tnum font-caps text-xl font-bold leading-none", n > 0 ? cls : "text-faint")}><AnimatedNumber value={n} duration={0.5} /></div>
      <div className="font-caps mt-0.5 truncate text-[9px] uppercase tracking-[0.14em] text-muted">{label}</div>
    </div>
  );
}

function ChangeCard({ t, index, onOpen }: { t: PositionTimeline; index: number; onOpen: () => void }) {
  const meta = STATUS_META[t.status];
  const color = scoreColor(t.scoreNow);
  return (
    <motion.button onClick={onOpen} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.05, duration: 0.4 }}
      className={cx("inset flex min-h-0 flex-col p-3 text-left transition hover:border-ink", t.status === "deteriorating" && "border-negative/50", t.status === "improving" && "border-positive/50")}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-1.5"><Badge tone={meta.tone} dot>{meta.label}</Badge>{t.persistent && Math.abs(t.delta) >= 8 && <Badge tone="neutral">Persistent</Badge>}{!t.persistent && t.delta <= -8 && <Badge tone="neutral">Recent move</Badge>}{t.alertNow && <Badge tone="negative">Alert</Badge>}</div>
          <div className="mt-1 truncate font-display text-[19px] uppercase leading-tight">{t.position.name}</div>
          <div className="font-mono text-[9.5px] text-faint">{t.position.id} · {(t.position.weight * 100).toFixed(1)}% of capital</div>
        </div>
        <div className="shrink-0 text-right">
          <div className="flex items-baseline justify-end gap-1.5"><span className="tnum font-caps text-base text-muted line-through">{t.scoreAtAllocation.toFixed(0)}</span><span className="tnum font-caps text-[30px] font-bold leading-none" style={{ color }}><AnimatedNumber value={t.scoreNow} duration={0.8} /></span></div>
          <div className="tnum text-[10.5px]" style={{ color: t.delta >= 0 ? "#2d6a4f" : "#8b1e2d" }}>{fmtDelta(t.delta)} since allocation</div>
        </div>
      </div>
      <div className="mt-auto flex items-center gap-3 pt-2">
        <Sparkline values={t.window} width={120} height={30} color={color} domain={[Math.max(0, Math.min(...t.window.filter((v): v is number => v != null)) - 8), 100]} />
        <div className="min-w-0 flex-1 space-y-0.5 text-[11px] leading-tight text-muted">
          {t.driver && Math.abs(t.driver.delta) >= 2 && <div className="flex items-center gap-1.5 truncate"><span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: DIM_COLOR[t.driver.dim] }} /><span className="font-semibold text-fg">{DIM_LABEL[t.driver.dim]}</span> {t.driver.delta < 0 ? "removed" : "added"} <span className="tnum font-caps font-bold text-fg">{Math.abs(t.driver.delta).toFixed(1)} pts</span>{t.driverStreak >= 2 && t.driver.delta < 0 && <> · falling {t.driverStreak} periods</>}</div>}
          {t.onsetMonth && <div>Started <span className="font-semibold text-fg">{fmtMonth(t.onsetMonth, "long")}</span>{t.declineStreak >= 2 && <> · down {t.declineStreak} months in a row</>}</div>}
          {t.riseStreak >= 2 && t.delta > 0 && <div>Up <span className="font-semibold text-fg">{t.riseStreak} months in a row</span></div>}
          {t.stressNow > 0 && <div className="text-negative">{t.stressNow} stress flag{t.stressNow > 1 ? "s" : ""} active</div>}
        </div>
      </div>
    </motion.button>
  );
}
