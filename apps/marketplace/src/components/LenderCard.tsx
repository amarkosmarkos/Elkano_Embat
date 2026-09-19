import { motion } from "framer-motion";
import { Check, Coins, ShieldCheck } from "lucide-react";
import { scoreColor } from "@/lib/colors";
import { Sparkline } from "@/components/charts/Sparkline";
import { TrendPill } from "@/components/ui/TrendPill";
import { Badge } from "@/components/ui/primitives";
import { AnimatedNumber } from "@/components/ui/AnimatedNumber";
import type { Assessed } from "@/hooks/useAssessments";
import { cx } from "@/lib/format";

const PRIORITY = ["Score", "Runway", "Liquidity", "Never below", "Momentum", "Pays", "Zero days", "No stress", "months of scored"];
/** Most telling reasons first (score level, liquidity, floor, momentum…). */
function prioritise(reasons: string[]): string[] {
  const rank = (r: string) => { const i = PRIORITY.findIndex((k) => r.startsWith(k)); return i < 0 ? 99 : i; };
  return [...reasons].sort((a, b) => rank(a) - rank(b));
}

/** Big parchment card: who is in a position to lend, at a glance. */
export function LenderCard({ a, index = 0, selected, onOpen, onLend }: { a: Assessed; index?: number; selected: boolean; onOpen: () => void; onLend: () => void }) {
  const { c } = a;
  const color = scoreColor(c.latest.score);
  const q = a.provider.qualified;
  return (
    <motion.div className="min-w-0" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(0.3, index * 0.04), duration: 0.45, ease: [0.16, 1, 0.3, 1] }}>
      <div className={cx("card card-hover group relative flex h-full flex-col overflow-hidden p-3.5", selected && "shadow-glow")} style={selected ? { outline: "2px solid #c9a227", outlineOffset: -2 } : undefined}>
        <button onClick={onOpen} className="block min-w-0 text-left">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="truncate font-display text-[20px] leading-tight group-hover:text-accent">{c.name}</div>
              <div className="font-mono text-[10px] text-faint">{c.id}{c.country ? ` · ${c.country}` : ""}{c.groupSize && c.groupSize > 1 ? ` · group of ${c.groupSize}` : ""}</div>
            </div>
            <div className="shrink-0 text-right">
              <div className="tnum font-caps text-[44px] font-bold leading-none" style={{ color }}><AnimatedNumber value={c.latest.score} duration={0.8} /></div>
              {a.momentum != null ? <div className="tnum font-caps text-[10px] font-bold leading-none" style={{ color: a.momentum >= 0 ? "#2d6a4f" : "#8b1e2d" }}>{a.momentum > 0 ? "+" : ""}{a.momentum.toFixed(1)} / 3m</div> : <div className="font-caps text-[8px] uppercase tracking-[0.2em] text-faint">health</div>}
            </div>
          </div>
          <div className="mt-2 flex items-center justify-between gap-2">
            <TrendPill trend={a.trend} className="shrink-0" />
            <Sparkline values={c.scores} color={color} width={64} height={24} animate={false} className="shrink-0" />
          </div>
          <ul className="mt-2.5 space-y-1 text-[12px] leading-snug text-fg-2">
            {(q ? prioritise(a.provider.reasons) : a.provider.blockers).slice(0, 5).map((r) => (
              <li key={r} className="flex items-start gap-1.5 truncate"><span className={cx("mt-[5px] h-1.5 w-1.5 shrink-0 rounded-full", q ? "bg-positive" : "bg-negative")} /><span className="truncate">{r}</span></li>
            ))}
          </ul>
        </button>
        <div className="mt-auto flex items-center justify-between gap-2 border-t border-line pt-2">
          <div className="flex min-w-0 flex-1 items-center gap-1.5">
            <div className="font-caps shrink-0 text-[9px] uppercase tracking-[0.16em] text-faint">Capacity</div>
            <div className="h-1.5 min-w-[20px] flex-1 overflow-hidden rounded-full bg-line"><motion.div className="h-full rounded-full bg-[#b8891c]" initial={{ width: 0 }} animate={{ width: `${a.provider.capacity}%` }} transition={{ duration: 0.9, delay: 0.2 }} /></div>
            <span className="tnum font-caps shrink-0 text-[11px] font-bold">{a.provider.capacity}</span>
          </div>
          {selected ? (
            <Badge tone="accent" className="shrink-0"><Check size={11} />Lending</Badge>
          ) : q ? (
            <button onClick={onLend} className="font-caps brass gold-text flex h-7 shrink-0 items-center gap-1.5 rounded-[4px] px-2.5 text-[10px] font-bold uppercase tracking-[0.12em] hover:brightness-125"><Coins size={11} />Lend</button>
          ) : (
            <Badge tone="neutral" className="shrink-0"><ShieldCheck size={11} />Not qualified</Badge>
          )}
        </div>
      </div>
    </motion.div>
  );
}
