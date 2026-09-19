import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";
import { scoreColor } from "@/lib/colors";
import { Sparkline } from "@/components/charts/Sparkline";
import { TrendPill } from "@/components/ui/TrendPill";
import { Badge } from "@/components/ui/primitives";
import { AnimatedNumber } from "@/components/ui/AnimatedNumber";
import type { Assessed } from "@/hooks/useAssessments";
import { cx } from "@/lib/format";

/** Compact parchment card for a financing candidate: healthy score + visible capital need. */
export function BorrowerCard({ a, index = 0, onOpen, inPortfolio }: { a: Assessed; index?: number; onOpen: () => void; inPortfolio?: boolean }) {
  const { c } = a;
  const color = scoreColor(c.latest.score);
  const candidate = a.receiver.eligible && a.receiver.need >= 25;
  return (
    <motion.div className="min-w-0" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(0.3, index * 0.04), duration: 0.45, ease: [0.16, 1, 0.3, 1] }}>
      <button onClick={onOpen} className={cx("card card-hover group flex h-full w-full flex-col overflow-hidden p-3 text-left", inPortfolio && "shadow-glow")} style={inPortfolio ? { outline: "2px solid #c9a227", outlineOffset: -2 } : undefined}>
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="truncate font-display text-[17px] leading-tight group-hover:text-accent">{c.name}</div>
            <div className="font-mono text-[10px] text-faint">{c.id}{c.country ? ` · ${c.country}` : ""}</div>
          </div>
          <div className="shrink-0 text-right">
            <div className="tnum font-caps text-[28px] font-bold leading-none" style={{ color }}><AnimatedNumber value={c.latest.score} duration={0.8} /></div>
            {a.momentum != null && <div className="tnum font-caps text-[10px] font-bold leading-none" style={{ color: a.momentum >= 0 ? "#2d6a4f" : "#8b1e2d" }}>{a.momentum > 0 ? "+" : ""}{a.momentum.toFixed(1)} / 3m</div>}
          </div>
        </div>
        <div className="mt-1.5 flex items-center justify-between gap-2">
          <TrendPill trend={a.trend} className="shrink-0" />
          <Sparkline values={c.scores} color={color} width={56} height={22} animate={false} className="shrink-0" />
        </div>
        <ul className="mt-1.5 space-y-0.5 text-[11px] leading-snug text-fg-2">
          {a.receiver.needSignals.slice(0, 2).map((r) => <li key={r} className="flex items-start gap-1.5"><span className="mt-[5px] h-1.5 w-1.5 shrink-0 rounded-full bg-accent-2" /><span className="truncate">{r}</span></li>)}
          {a.receiver.needSignals.length === 0 && <li className="italic text-muted">No capital-need signal this month</li>}
        </ul>
        <div className="mt-auto flex items-center justify-between gap-2 border-t border-line pt-2">
          <div className="flex min-w-0 flex-1 items-center gap-1.5">
            <div className="font-caps shrink-0 text-[9px] uppercase tracking-[0.16em] text-faint">Fit</div>
            <div className="h-1.5 min-w-[20px] flex-1 overflow-hidden rounded-full bg-line"><motion.div className="h-full rounded-full bg-[#1e5f66]" initial={{ width: 0 }} animate={{ width: `${a.receiver.fit}%` }} transition={{ duration: 0.9, delay: 0.2 }} /></div>
            <span className="tnum font-caps shrink-0 text-[11px] font-bold">{a.receiver.fit}</span>
          </div>
          {inPortfolio ? <Badge tone="accent" className="shrink-0">In chest</Badge> : candidate ? <Badge tone="accent" className="shrink-0"><Sparkles size={11} />Candidate</Badge> : c.latest.alert ? <Badge tone="negative" dot className="shrink-0">Alert</Badge> : <Badge tone="neutral" className="shrink-0">Not eligible</Badge>}
        </div>
      </button>
    </motion.div>
  );
}
