import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, ArrowRight, Check, Minus, Pause, RotateCcw, Search, TrendingDown, TrendingUp } from "lucide-react";
import { useNetwork } from "@/hooks/useNetwork";
import { useEffectiveResult } from "@/hooks/useEffectiveResult";
import { useApp } from "@/store/app";
import { monitorSnapshot } from "@/lib/monitor";
import { ACTION_META, applyActions, recommend, revalue, type ActionKind, type Recommendation } from "@/lib/actions";
import { riskLabel } from "@/lib/portfolio";
import { Badge, Button, Eyebrow, Pager, Skeleton } from "@/components/ui/primitives";
import { scoreColor } from "@/lib/colors";
import { fmtDelta, fmtMoney, fmtMonth, cx } from "@/lib/format";

const ICON: Record<ActionKind, typeof Pause> = { pause: Pause, reduce: TrendingDown, review: Search, monitor: Minus, increase: TrendingUp };
const PER_PAGE = 4;

/** Simple: a recommendation per position that moved, and one button to execute it on the chest. */
export function ActionCenter() {
  const { data } = useNetwork();
  const base = useApp((s) => s.result);
  const executed = useApp((s) => s.executed);
  const execute = useApp((s) => s.execute);
  const undoActions = useApp((s) => s.undoActions);
  const monitorMonth = useApp((s) => s.monitorMonth);
  const setOpenCompany = useApp((s) => s.setOpenCompany);
  const result = useEffectiveResult();
  const nav = useNavigate();
  const [page, setPage] = useState(0);

  const months = data?.meta.months ?? [];
  const curMonth = monitorMonth && months.includes(monitorMonth) ? monitorMonth : base?.config.asOf ?? null;
  // recommendations come from the chest as originally built (so executed ones stay visible as done)
  const snapshot = useMemo(() => (data && base && curMonth ? monitorSnapshot(data, base, curMonth) : null), [data, base, curMonth]);
  const recs = useMemo(() => (snapshot && data ? recommend(snapshot, data) : []), [snapshot, data]);
  const actionable = useMemo(() => recs.filter((r) => r.kind !== "monitor"), [recs]);
  const doneIds = useMemo(() => new Set(executed.filter((e) => e.month === curMonth).map((e) => e.id)), [executed, curMonth]);
  const before = useMemo(() => (base && snapshot ? revalue(base, snapshot) : null), [base, snapshot]);
  const after = useMemo(() => (result && snapshot ? revalue(result, snapshot) : null), [result, snapshot]);
  const allAfter = useMemo(() => (base && snapshot ? revalue(applyActions(base, actionable.map((r) => ({ id: r.id, kind: r.kind, multiplier: r.multiplier, month: curMonth ?? "", scoreThen: r.timeline.scoreNow }))), snapshot) : null), [base, snapshot, actionable, curMonth]);
  useEffect(() => { setPage((p) => Math.min(p, Math.max(0, Math.ceil(actionable.length / PER_PAGE) - 1))); }, [actionable.length]);

  if (!data) return <div className="grid h-full grid-cols-[1.3fr_1fr] gap-4"><Skeleton /><Skeleton /></div>;
  if (!base || !result || !snapshot || !before || !after || !curMonth) {
    return <div className="card flex h-full flex-col items-center justify-center p-12 text-center"><h1 className="font-display text-3xl">No chest to act on.</h1><Button className="mt-4" onClick={() => nav("/borrowers")}>Build one</Button></div>;
  }

  const pending = actionable.filter((r) => !doneIds.has(r.id));
  const freed = Math.max(0, before.allocated - after.allocated);
  const pageItems = actionable.slice(page * PER_PAGE, (page + 1) * PER_PAGE);
  const run = (r: Recommendation) => execute({ id: r.id, kind: r.kind, multiplier: r.multiplier, month: curMonth, scoreThen: r.timeline.scoreNow });

  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      <div className="card flex shrink-0 items-center gap-4 px-5 py-2.5">
        <Link to="/monitor" className="font-caps flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted hover:text-fg"><ArrowLeft size={14} /> Monitor</Link>
        <div className="h-6 w-px bg-line-strong" />
        <div className="min-w-0">
          <Eyebrow>Actions · {fmtMonth(curMonth, "long")}</Eyebrow>
          <h1 className="truncate font-display text-[24px] leading-tight">{actionable.length === 0 ? "Nothing to do — keep monitoring." : pending.length === 0 ? "All recommendations executed." : <>{pending.length} recommendation{pending.length > 1 ? "s" : ""} <span className="text-muted">waiting for your order.</span></>}</h1>
        </div>
        <div className="ml-auto flex shrink-0 items-center gap-2">
          <Button variant="outline" size="sm" onClick={undoActions} disabled={executed.length === 0}><RotateCcw size={12} />Undo all</Button>
          <Button size="sm" onClick={() => pending.forEach(run)} disabled={pending.length === 0}><Check size={12} />Execute all {pending.length > 0 ? pending.length : ""}</Button>
        </div>
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-[1.35fr_1fr] gap-3">
        <section className="card flex min-h-0 min-w-0 flex-col p-4">
          <div className="flex shrink-0 items-center justify-between">
            <Eyebrow>What the score behaviour recommends</Eyebrow>
            {actionable.length > PER_PAGE && <Pager page={page} pageSize={PER_PAGE} total={actionable.length} onChange={setPage} />}
          </div>
          <AnimatePresence mode="wait">
            <motion.div key={page} initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -8 }} transition={{ duration: 0.2 }} className="mt-2 grid min-h-0 flex-1 grid-rows-4 gap-2">
              {pageItems.map((r, i) => <RecRow key={r.id} r={r} index={i} done={doneIds.has(r.id)} onRun={() => run(r)} onOpen={() => setOpenCompany(r.id)} />)}
              {actionable.length === 0 && <div className="row-span-4 flex items-center justify-center italic text-muted">Every position is within its normal range.</div>}
            </motion.div>
          </AnimatePresence>
        </section>

        <aside className="card flex min-h-0 min-w-0 flex-col p-4">
          <Eyebrow>Effect on the chest</Eyebrow>
          <div className="font-display text-xl leading-tight">{executed.length === 0 ? "Nothing executed yet" : `${executed.length} action${executed.length > 1 ? "s" : ""} executed`}</div>
          <p className="text-[10.5px] italic leading-snug text-muted">Executing changes the chest for real: reduce / pause / review return capital to reserve, increase grows the position up to the cap. Undo all restores it.</p>
          <div className="mt-2 divide-y divide-line border-y border-line">
            <Row label="Chest score" before={before.avgScore} after={after.avgScore} all={allAfter?.avgScore} fmt={(v) => v.toFixed(1)} good="up" />
            <Row label="Expected stress" before={before.expectedStress * 100} after={after.expectedStress * 100} all={allAfter ? allAfter.expectedStress * 100 : undefined} fmt={(v) => `${v.toFixed(1)}%`} good="down" />
            <Row label="Capital deployed" before={before.allocated} after={after.allocated} all={allAfter?.allocated} fmt={(v) => fmtMoney(v)} good="none" />
            <Row label="Reserve" before={before.reserve} after={after.reserve} all={allAfter?.reserve} fmt={(v) => fmtMoney(v)} good="none" />
            <Row label="Effective positions" before={before.effectiveN} after={after.effectiveN} all={allAfter?.effectiveN} fmt={(v) => v.toFixed(1)} good="up" />
            <Row label="Risk profile" before={before.avgScore} after={after.avgScore} all={allAfter?.avgScore} fmt={(v) => riskLabel(v).label} good="up" />
          </div>
          <div className="mt-1 flex justify-end gap-3 text-[9px] font-caps uppercase tracking-[0.12em] text-faint"><span>now → executed</span><span className="text-muted">· if all executed</span></div>
          {freed > 0 && <div className="mt-2 rounded-[3px] border border-accent/50 bg-accent/10 px-3 py-1.5 text-[12px]"><span className="tnum font-caps font-bold text-accent">{fmtMoney(freed)}</span> <span className="text-muted">back in reserve — dry powder for the next voyage.</span></div>}
          <Eyebrow className="mt-3">Log</Eyebrow>
          <div className="mt-1 min-h-0 flex-1 space-y-1 overflow-hidden">
            {executed.length === 0 && <div className="text-[11.5px] italic text-muted">Orders you execute appear here.</div>}
            {executed.slice().reverse().slice(0, 9).map((e, i) => {
              const p = base.positions.find((x) => x.id === e.id);
              return (
                <div key={`${e.id}-${e.month}-${i}`} className="flex items-center gap-2 text-[11.5px]">
                  <Check size={11} className="shrink-0 text-positive" />
                  <span className="font-caps text-[9.5px] font-bold uppercase tracking-[0.1em]" style={{ color: ACTION_META[e.kind].tone === "positive" ? "#2d6a4f" : ACTION_META[e.kind].tone === "warn" ? "#b3701c" : "#8b1e2d" }}>{ACTION_META[e.kind].verb}</span>
                  <span className="truncate">{p?.name ?? e.id}</span>
                  <span className="ml-auto shrink-0 font-mono text-[10px] text-faint">{fmtMonth(e.month)} · {e.multiplier < 1 ? `−${Math.round((1 - e.multiplier) * 100)}%` : `+${Math.round((e.multiplier - 1) * 100)}%`}</span>
                </div>
              );
            })}
          </div>
          <div className="mt-2 flex shrink-0 justify-end gap-2"><Button variant="outline" size="sm" onClick={() => nav("/borrowers")}>Chest <ArrowRight size={12} /></Button><Button variant="outline" size="sm" onClick={() => nav("/monitor")}>Keep monitoring <ArrowRight size={12} /></Button></div>
        </aside>
      </div>
    </div>
  );
}

function Row({ label, before, after, all, fmt, good }: { label: string; before: number; after: number; all?: number; fmt: (v: number) => string; good: "up" | "down" | "none" }) {
  const d = after - before;
  const tone = good === "none" || Math.abs(d) < 1e-6 ? "var(--muted)" : (good === "up" ? d > 0 : d < 0) ? "#2d6a4f" : "#8b1e2d";
  return (
    <div className="flex items-center justify-between py-1.5">
      <span className="text-[12px] text-muted">{label}</span>
      <div className="flex items-center gap-2">
        <span className="tnum font-caps text-[11px] text-faint">{fmt(before)}</span>
        <ArrowRight size={11} className="text-faint" />
        <span className="tnum font-caps text-[13px] font-bold" style={{ color: tone }}>{fmt(after)}</span>
        {all != null && <span className="tnum font-caps w-16 text-right text-[10px] text-muted">· {fmt(all)}</span>}
      </div>
    </div>
  );
}

function RecRow({ r, index, done, onRun, onOpen }: { r: Recommendation; index: number; done: boolean; onRun: () => void; onOpen: () => void }) {
  const meta = ACTION_META[r.kind];
  const Icon = ICON[r.kind];
  const t = r.timeline;
  const toneText = meta.tone === "negative" ? "text-negative" : meta.tone === "warn" ? "text-warn" : meta.tone === "positive" ? "text-positive" : "text-muted";
  const toneBorder = meta.tone === "negative" ? "border-negative/60" : meta.tone === "warn" ? "border-warn/60" : meta.tone === "positive" ? "border-positive/60" : "border-line";
  const why = r.reasons.filter((x) => !x.startsWith("Move is")).slice(0, 2);
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.05, duration: 0.4 }} className={cx("inset grid min-h-0 grid-cols-[170px_1fr_auto] items-center gap-4 px-4", done && "opacity-70")}>
      <div className={cx("flex items-center gap-2 border-r pr-3", toneBorder)}>
        <div className={cx("flex h-11 w-11 shrink-0 items-center justify-center rounded-[4px] border bg-surface-2", toneBorder, toneText)}><Icon size={20} /></div>
        <div className="min-w-0"><div className={cx("font-caps text-[15px] font-bold uppercase leading-tight tracking-[0.12em]", toneText)}>{meta.verb}</div><div className="line-clamp-2 text-[10px] italic leading-tight text-muted">{meta.effect}</div></div>
      </div>
      <div className="min-w-0">
        <div className="flex items-baseline gap-3">
          <button onClick={onOpen} className="truncate font-display text-[22px] leading-tight hover:text-accent">{t.position.name}</button>
          <span className="tnum font-caps shrink-0 text-[12px] text-muted">{t.scoreAtAllocation.toFixed(0)} → <span className="text-[19px] font-bold" style={{ color: scoreColor(t.scoreNow) }}>{t.scoreNow.toFixed(0)}</span> <span style={{ color: t.delta >= 0 ? "#2d6a4f" : "#8b1e2d" }}>({fmtDelta(t.delta)})</span></span>
          <span className="shrink-0 font-mono text-[10px] text-faint">{(t.position.weight * 100).toFixed(1)}% · {fmtMoney(t.position.amount)}</span>
        </div>
        <ul className="mt-1 text-[12.5px] leading-snug text-fg-2">
          {why.map((w) => <li key={w} className="flex items-start gap-1.5 truncate"><span className="mt-[6px] h-1 w-1 shrink-0 rounded-full bg-ink/50" /><span className="truncate">{w}</span></li>)}
        </ul>
      </div>
      <div className="shrink-0">
        {done ? (
          <Badge tone="positive" className="h-9"><Check size={12} /> Executed</Badge>
        ) : (
          <button onClick={onRun} className="font-caps brass gold-text flex h-11 items-center gap-1.5 rounded-[4px] px-5 text-[12px] font-bold uppercase tracking-[0.14em] hover:brightness-125">Execute</button>
        )}
      </div>
    </motion.div>
  );
}
