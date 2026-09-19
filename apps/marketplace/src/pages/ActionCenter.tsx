import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, ArrowRight, Check, Minus, Pause, Search, TrendingDown, TrendingUp } from "lucide-react";
import { useNetwork } from "@/hooks/useNetwork";
import { useApp } from "@/store/app";
import { monitorSnapshot } from "@/lib/monitor";
import { ACTION_META, recommend, revalue, simulate, type ActionKind, type Recommendation } from "@/lib/actions";
import { riskLabel } from "@/lib/portfolio";
import { AnimatedNumber } from "@/components/ui/AnimatedNumber";
import { Badge, Button, Eyebrow, Pager, Skeleton } from "@/components/ui/primitives";
import { scoreColor } from "@/lib/colors";
import { fmtDelta, fmtMoney, fmtMonth, cx } from "@/lib/format";

const ICON: Record<ActionKind, typeof Pause> = { pause: Pause, reduce: TrendingDown, review: Search, monitor: Minus, increase: TrendingUp };
const PER_PAGE = 3;

export function ActionCenter() {
  const { data } = useNetwork();
  const result = useApp((s) => s.result);
  const monitorMonth = useApp((s) => s.monitorMonth);
  const accepted = useApp((s) => s.accepted);
  const toggleAccepted = useApp((s) => s.toggleAccepted);
  const setAccepted = useApp((s) => s.setAccepted);
  const nav = useNavigate();
  const [page, setPage] = useState(0);

  const months = data?.meta.months ?? [];
  const curMonth = monitorMonth && months.includes(monitorMonth) ? monitorMonth : result?.config.asOf ?? null;
  const snapshot = useMemo(() => (data && result && curMonth ? monitorSnapshot(data, result, curMonth) : null), [data, result, curMonth]);
  const recs = useMemo(() => (snapshot && data ? recommend(snapshot, data) : []), [snapshot, data]);
  const acceptedSet = useMemo(() => new Set(accepted), [accepted]);
  const before = useMemo(() => (result && snapshot ? revalue(result, snapshot) : null), [result, snapshot]);
  const after = useMemo(() => (result && snapshot ? simulate(result, recs, acceptedSet, snapshot) : null), [result, snapshot, recs, acceptedSet]);
  const actionable = useMemo(() => recs.filter((r) => r.kind !== "monitor"), [recs]);
  useEffect(() => { setPage((p) => Math.min(p, Math.max(0, Math.ceil(actionable.length / PER_PAGE) - 1))); }, [actionable.length]);

  if (!data) return <div className="grid h-full grid-cols-[1.25fr_1fr] gap-4"><Skeleton /><Skeleton /></div>;
  if (!result || !snapshot || !before || !after || !curMonth) {
    return <div className="card flex h-full flex-col items-center justify-center p-12 text-center"><h1 className="font-display text-3xl">No chest to act on.</h1><Button className="mt-4" onClick={() => nav("/portfolio")}>Open builder</Button></div>;
  }

  const monitoring = recs.filter((r) => r.kind === "monitor");
  const counts = recs.reduce<Record<ActionKind, number>>((acc, r) => { acc[r.kind]++; return acc; }, { pause: 0, reduce: 0, review: 0, monitor: 0, increase: 0 });
  const freed = Math.max(0, before.allocated - after.allocated);
  const expDet = (snap: typeof after) => snap.positions.filter((p) => snapshot.positions.find((t) => t.position.id === p.id)?.status === "deteriorating").reduce((s, p) => s + p.weight, 0);
  const wSumAfter = after.positions.reduce((s, p) => s + p.weight, 0) || 1;
  const wSumBefore = before.positions.reduce((s, p) => s + p.weight, 0) || 1;
  const pageItems = actionable.slice(page * PER_PAGE, (page + 1) * PER_PAGE);

  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      <div className="card flex shrink-0 items-center gap-4 px-5 py-2.5">
        <Link to="/monitor" className="font-caps flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted hover:text-fg"><ArrowLeft size={14} /> Monitor</Link>
        <div className="h-6 w-px bg-line-strong" />
        <div className="min-w-0">
          <Eyebrow>Action center · {fmtMonth(curMonth, "long")}</Eyebrow>
          <h1 className="truncate font-display text-[24px] leading-tight">{actionable.length === 0 ? "No action required." : <>{actionable.length} recommendation{actionable.length > 1 ? "s" : ""} <span className="text-muted">derived from score behaviour.</span></>}</h1>
        </div>
        <div className="ml-auto flex flex-wrap items-center gap-1.5">
          {(Object.keys(ACTION_META) as ActionKind[]).map((k) => counts[k] > 0 && <Badge key={k} tone={ACTION_META[k].tone === "neutral" ? "neutral" : ACTION_META[k].tone}>{ACTION_META[k].verb} <span className="tnum">{counts[k]}</span></Badge>)}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setAccepted([])} disabled={accepted.length === 0}>Reset</Button>
          <Button size="sm" onClick={() => setAccepted(actionable.map((r) => r.id))}>Accept all {actionable.length}</Button>
        </div>
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-[1.3fr_1fr] gap-3">
        {/* recommendations */}
        <section className="card flex min-h-0 min-w-0 flex-col p-4">
          <div className="flex shrink-0 items-center justify-between">
            <Eyebrow>Recommendations · each with the score-behaviour reasons</Eyebrow>
            {actionable.length > PER_PAGE && <Pager page={page} pageSize={PER_PAGE} total={actionable.length} onChange={setPage} />}
          </div>
          <AnimatePresence mode="wait">
            <motion.div key={page} initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -8 }} transition={{ duration: 0.2 }} className="mt-2 grid min-h-0 flex-1 grid-rows-3 gap-2.5">
              {pageItems.map((r, i) => <RecCard key={r.id} r={r} index={i} accepted={acceptedSet.has(r.id)} onToggle={() => toggleAccepted(r.id)} />)}
              {actionable.length === 0 && <div className="row-span-3 flex items-center justify-center italic text-muted">Every position is within its normal range — keep monitoring.</div>}
            </motion.div>
          </AnimatePresence>
          {monitoring.length > 0 && (
            <div className="mt-2 flex shrink-0 items-center gap-2 border-t border-line pt-2">
              <Eyebrow className="shrink-0">Keep monitoring</Eyebrow>
              <div className="no-scrollbar flex min-w-0 flex-1 gap-1.5 overflow-x-auto">
                {monitoring.map((r) => (
                  <Link key={r.id} to={`/company/${r.id}`} className="inset flex shrink-0 items-center gap-2 px-2 py-1 text-[11px] hover:border-ink">
                    <span className="max-w-[110px] truncate">{r.timeline.position.name}</span>
                    <span className="tnum font-caps font-bold" style={{ color: scoreColor(r.timeline.scoreNow) }}>{r.timeline.scoreNow.toFixed(0)}</span>
                    <span className="tnum text-[10px] text-faint">{fmtDelta(r.timeline.delta)}</span>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </section>

        {/* simulation */}
        <aside className="card flex min-h-0 min-w-0 flex-col p-4">
          <Eyebrow>Simulation</Eyebrow>
          <div className="font-display text-xl leading-tight">{accepted.length === 0 ? "Accept actions to see their effect" : `${accepted.length} action${accepted.length > 1 ? "s" : ""} applied`}</div>
          <p className="text-[10.5px] italic leading-snug text-muted">Reduce / pause shrink a position and return capital to reserve; increase grows it up to the exposure cap. Scores as of {fmtMonth(curMonth)}.</p>
          <div className="mt-2 divide-y divide-line border-y border-line">
            <Row label="Chest score" before={before.avgScore} after={after.avgScore} fmt={(v) => v.toFixed(1)} good="up" />
            <Row label="Expected stress" before={before.expectedStress * 100} after={after.expectedStress * 100} fmt={(v) => `${v.toFixed(1)}%`} good="down" />
            <Row label="Exposure to deteriorating" before={(expDet(before) / wSumBefore) * 100} after={(expDet(after) / wSumAfter) * 100} fmt={(v) => `${v.toFixed(0)}%`} good="down" />
            <Row label="Capital deployed" before={before.allocated} after={after.allocated} fmt={(v) => fmtMoney(v)} good="none" />
            <Row label="Effective positions" before={before.effectiveN} after={after.effectiveN} fmt={(v) => v.toFixed(1)} good="up" />
            <Row label="Risk profile" before={before.avgScore} after={after.avgScore} fmt={(v) => riskLabel(v).label} good="up" />
          </div>
          {freed > 0 && <div className="mt-2 rounded-[3px] border border-accent/50 bg-accent/10 px-3 py-1.5 text-[12px]"><span className="tnum font-caps font-bold text-accent">{fmtMoney(freed)}</span> <span className="text-muted">returned to reserve — dry powder for the next voyage.</span></div>}
          <Eyebrow className="mt-3">Composition after actions</Eyebrow>
          <div className="mt-1 grid min-h-0 flex-1 grid-flow-col gap-x-4" style={{ gridTemplateRows: `repeat(${Math.ceil(after.positions.length / 2)}, minmax(0, 1fr))` }}>
            {after.positions.slice().sort((a, b) => b.weight - a.weight).map((p) => {
              const b = before.positions.find((x) => x.id === p.id)!;
              const changed = Math.abs(p.weight - b.weight) > 1e-9;
              return (
                <div key={p.id} className="flex min-h-0 items-center gap-2 text-[11px]">
                  <span className={cx("w-24 truncate", changed ? "font-semibold text-fg" : "text-muted")}>{p.name}</span>
                  <div className="relative h-1.5 flex-1 overflow-hidden rounded-full bg-line">
                    {changed && <div className="absolute inset-y-0 left-0 rounded-full bg-ink/15" style={{ width: `${(b.weight / result.config.maxExposure) * 100}%` }} />}
                    <motion.div className="absolute inset-y-0 left-0 rounded-full" style={{ background: scoreColor(p.score) }} animate={{ width: `${(p.weight / result.config.maxExposure) * 100}%` }} transition={{ type: "spring", stiffness: 160, damping: 22 }} />
                  </div>
                  <span className="tnum font-caps w-10 text-right text-[10px] font-bold" style={{ color: changed ? (p.weight > b.weight ? "#2d6a4f" : "#8b1e2d") : "var(--faint)" }}>{(p.weight * 100).toFixed(1)}%</span>
                </div>
              );
            })}
          </div>
          <div className="mt-2 flex shrink-0 justify-end"><Button variant="outline" size="sm" onClick={() => nav("/portfolio")}>Rebuild with new constraints <ArrowRight size={12} /></Button></div>
        </aside>
      </div>
    </div>
  );
}

function Row({ label, before, after, fmt, good }: { label: string; before: number; after: number; fmt: (v: number) => string; good: "up" | "down" | "none" }) {
  const d = after - before;
  const tone = good === "none" || Math.abs(d) < 1e-6 ? "var(--muted)" : (good === "up" ? d > 0 : d < 0) ? "#2d6a4f" : "#8b1e2d";
  return (
    <div className="flex items-center justify-between py-1.5">
      <span className="text-[12px] text-muted">{label}</span>
      <div className="flex items-center gap-2">
        <span className="tnum font-caps text-[11px] text-faint">{fmt(before)}</span>
        <ArrowRight size={11} className="text-faint" />
        <span className="tnum font-caps text-[13px] font-bold" style={{ color: tone }}>{fmt(after)}</span>
      </div>
    </div>
  );
}

function RecCard({ r, index, accepted, onToggle }: { r: Recommendation; index: number; accepted: boolean; onToggle: () => void }) {
  const meta = ACTION_META[r.kind];
  const Icon = ICON[r.kind];
  const t = r.timeline;
  const toneCls = meta.tone === "negative" ? "text-negative border-negative/50" : meta.tone === "warn" ? "text-warn border-warn/50" : meta.tone === "positive" ? "text-positive border-positive/50" : "text-muted border-line";
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.05, duration: 0.4 }} className={cx("inset flex min-h-0 flex-col p-3 transition-colors", accepted && "border-accent bg-accent/5")}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <div className={cx("flex h-9 w-9 shrink-0 items-center justify-center rounded-[4px] border bg-surface-2", toneCls)}><Icon size={16} /></div>
          <div className="min-w-0">
            <div className={cx("font-caps text-[9.5px] font-bold uppercase tracking-[0.16em]", meta.tone === "negative" ? "text-negative" : meta.tone === "warn" ? "text-warn" : meta.tone === "positive" ? "text-positive" : "text-muted")}>{r.title}</div>
            <Link to={`/company/${r.id}`} className="block truncate font-display text-[19px] uppercase leading-tight hover:text-accent">{t.position.name}</Link>
            <div className="font-mono text-[9.5px] text-faint">{r.id} · {(t.position.weight * 100).toFixed(1)}% · {fmtMoney(t.position.amount)}</div>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-3">
          <div className="text-right">
            <div className="flex items-baseline justify-end gap-1.5"><span className="tnum font-caps text-sm text-muted">{t.scoreAtAllocation.toFixed(0)}</span><ArrowRight size={10} className="text-faint" /><span className="tnum font-caps text-[26px] font-bold leading-none" style={{ color: scoreColor(t.scoreNow) }}><AnimatedNumber value={t.scoreNow} duration={0.6} /></span></div>
            <div className="tnum text-[10px]" style={{ color: t.delta >= 0 ? "#2d6a4f" : "#8b1e2d" }}>{fmtDelta(t.delta)} pts</div>
          </div>
          <button onClick={onToggle} className={cx("font-caps flex h-8 items-center gap-1.5 rounded-[4px] border px-3 text-[10px] font-bold uppercase tracking-[0.12em] transition-all", accepted ? "border-[#8a6512] bg-[#c9a227] text-[#2a1b0e]" : "border-line-strong hover:bg-surface-2")}>
            {accepted ? <><Check size={12} /> Applied</> : <>Simulate</>}
          </button>
        </div>
      </div>
      <ul className="mt-1.5 grid min-h-0 gap-x-4 gap-y-0.5 text-[11.5px] leading-snug sm:grid-cols-2">
        {r.reasons.slice(0, 6).map((reason) => <li key={reason} className="flex items-start gap-1.5 text-fg-2"><span className="mt-[7px] h-1 w-1 shrink-0 rounded-full bg-ink/50" />{reason}</li>)}
      </ul>
      {accepted && <div className="mt-auto pt-1 text-[10.5px] text-accent">Simulated: exposure {(t.position.weight * 100).toFixed(1)}% → {(Math.min(0.25, t.position.weight * r.multiplier) * 100).toFixed(1)}% ({r.multiplier < 1 ? `−${Math.round((1 - r.multiplier) * 100)}%` : `+${Math.round((r.multiplier - 1) * 100)}%`}).</div>}
    </motion.div>
  );
}
