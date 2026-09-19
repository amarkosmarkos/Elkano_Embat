import { motion } from "framer-motion";
import { Link } from "react-router";
import { ShieldCheck, Sparkles } from "lucide-react";
import { scoreColor } from "@/lib/colors";
import { Sparkline } from "@/components/charts/Sparkline";
import { ComponentBars } from "@/components/charts/ComponentBars";
import { TrendPill } from "@/components/ui/TrendPill";
import { Badge } from "@/components/ui/primitives";
import type { Assessed } from "@/hooks/useAssessments";
import type { Perspective } from "@/store/app";
import { AnimatedNumber } from "@/components/ui/AnimatedNumber";

/** Compact parchment card (~210px tall) so a row of four fits under the map. */
export function CompanyCard({ a, perspective, index = 0 }: { a: Assessed; perspective: Perspective; index?: number }) {
  const { c } = a;
  const color = scoreColor(c.latest.score);
  const qualified = perspective === "provider" ? a.provider.qualified : a.receiver.eligible && a.receiver.need >= 25;
  const indexValue = perspective === "provider" ? a.provider.capacity : a.receiver.fit;
  const indexLabel = perspective === "provider" ? "Capacity" : "Fit";
  return (
    <motion.div className="min-w-0" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(0.3, index * 0.04), duration: 0.45, ease: [0.16, 1, 0.3, 1] }}>
      <Link to={`/company/${c.id}`} className="card card-hover group block h-full overflow-hidden p-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="truncate font-display text-[17px] leading-tight">{c.name}</div>
            <div className="font-mono text-[10px] text-faint">{c.id}{c.country ? ` · ${c.country}` : ""}{c.currency && c.currency !== "EUR" ? ` · ${c.currency}` : ""}</div>
          </div>
          <div className="shrink-0 text-right">
            <div className="tnum font-caps text-[26px] font-bold leading-none" style={{ color }}>
              <AnimatedNumber value={c.latest.score} duration={0.8} />
            </div>
            {a.momentum != null && <div className="tnum font-caps text-[10px] font-bold leading-none" style={{ color: a.momentum >= 0 ? "#2d6a4f" : "#8b1e2d" }}>{a.momentum > 0 ? "+" : ""}{a.momentum.toFixed(1)} / 3m</div>}
          </div>
        </div>
        <div className="mt-2 flex items-center justify-between gap-2">
          <TrendPill trend={a.trend} className="shrink-0" />
          <Sparkline values={c.scores} color={color} width={60} height={24} animate={false} className="shrink-0" />
        </div>
        <div className="mt-2.5">
          <ComponentBars components={c.latest.components} compact />
        </div>
        <div className="mt-2.5 flex items-center justify-between border-t border-line pt-2">
          <div className="flex min-w-0 flex-1 items-center gap-1.5">
            <div className="font-caps shrink-0 text-[9px] uppercase tracking-[0.16em] text-faint">{indexLabel}</div>
            <div className="h-1.5 min-w-[20px] flex-1 overflow-hidden rounded-full bg-line">
              <motion.div className="h-full rounded-full bg-[#b8891c]" initial={{ width: 0 }} animate={{ width: `${indexValue}%` }} transition={{ duration: 0.9, delay: 0.2 }} />
            </div>
            <span className="tnum font-caps shrink-0 text-[11px] font-bold">{indexValue}</span>
          </div>
          {qualified ? (
            <Badge tone="accent" className="ml-2 shrink-0">{perspective === "provider" ? <ShieldCheck size={11} /> : <Sparkles size={11} />}{perspective === "provider" ? "Qualified" : "Candidate"}</Badge>
          ) : c.latest.alert ? (
            <Badge tone="negative" dot className="ml-2 shrink-0">Alert</Badge>
          ) : (
            <Badge tone="neutral" className="ml-2 shrink-0">{perspective === "provider" ? "Not qualified" : "Not eligible"}</Badge>
          )}
        </div>
      </Link>
    </motion.div>
  );
}
