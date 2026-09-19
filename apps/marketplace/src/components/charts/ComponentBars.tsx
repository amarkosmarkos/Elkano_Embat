import { motion } from "framer-motion";
import { DIM_COLOR } from "@/lib/colors";
import { DIM_LABEL, DIM_SHORT, fmtDelta } from "@/lib/format";
import type { Components, Dimension } from "@/lib/types";
import { DIMENSIONS } from "@/lib/types";

interface Props {
  components: Components;
  /** optional comparison (e.g. at allocation) */
  compare?: Components;
  max?: number;
  compact?: boolean;
  highlight?: Dimension | null;
  onSelect?: (d: Dimension) => void;
}

/** Diverging ink bars: how many points each dimension adds (→) or removes (←) from the score. */
export function ComponentBars({ components, compare, max, compact, highlight, onSelect }: Props) {
  const vals = DIMENSIONS.map((d) => Math.abs(components[d] ?? 0)).concat(compare ? DIMENSIONS.map((d) => Math.abs(compare[d] ?? 0)) : []);
  const m = Math.max(max ?? 0, 5, ...vals);
  return (
    <div className={compact ? "space-y-1" : "space-y-2.5"}>
      {DIMENSIONS.map((d) => {
        const v = components[d];
        const c = compare?.[d];
        const pct = v == null ? 0 : (Math.abs(v) / m) * 50;
        const cpct = c == null ? 0 : (Math.abs(c) / m) * 50;
        const color = DIM_COLOR[d];
        const dim = highlight && highlight !== d;
        return (
          <button key={d} onClick={() => onSelect?.(d)} className={`group block w-full text-left transition-opacity ${dim ? "opacity-40" : ""}`} disabled={!onSelect}>
            <div className="flex items-center gap-2.5">
              <div className={`${compact ? "w-[72px] text-[11px]" : "w-28 text-xs"} shrink-0 truncate text-muted transition-colors group-hover:text-fg`}>{compact ? DIM_SHORT[d] : DIM_LABEL[d]}</div>
              <div className={`relative flex-1 ${compact ? "h-2" : "h-2.5"}`}>
                <div className="absolute inset-y-0 left-1/2 w-px bg-line-strong" />
                {c != null && (
                  <div className="absolute inset-y-0 rounded-sm border border-dashed" style={{ borderColor: color, opacity: 0.6, left: c >= 0 ? "50%" : `${50 - cpct}%`, width: `${cpct}%` }} />
                )}
                {v == null ? (
                  <div className="absolute left-1/2 top-1/2 -translate-y-1/2 pl-2 text-[9px] italic text-faint">no data</div>
                ) : (
                  <motion.div
                    className="absolute inset-y-0 rounded-sm"
                    style={{ background: color, left: v >= 0 ? "50%" : undefined, right: v < 0 ? "50%" : undefined }}
                    initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
                  />
                )}
              </div>
              <div className={`tnum font-caps shrink-0 text-right font-bold ${compact ? "w-10 text-[11px]" : "w-14 text-xs"}`} style={{ color: v == null ? "var(--faint)" : v >= 0 ? "#2d6a4f" : "#8b1e2d" }}>
                {v == null ? "—" : fmtDelta(v, 1)}
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}
