import { DIMENSIONS, type Dimension } from "@/lib/score/types";
import { DIM_LABEL } from "@/lib/score/meta";
import { DIM_COLOR } from "@/lib/score/colors";
import { fmtDelta } from "@/lib/format";

/** Barras divergentes: cuántos puntos suma (→) o resta (←) cada dimensión. `compare` = punteado (en la asignación). */
export function ComponentBars({ components, compare }: { components: Record<Dimension, number | null>; compare?: Record<Dimension, number | null> }) {
  const vals = DIMENSIONS.map((d) => Math.abs(components[d] ?? 0)).concat(compare ? DIMENSIONS.map((d) => Math.abs(compare[d] ?? 0)) : []);
  const m = Math.max(5, ...vals);
  return (
    <div className="space-y-2.5">
      {DIMENSIONS.map((d) => {
        const v = components[d], c = compare?.[d];
        const pct = v == null ? 0 : (Math.abs(v) / m) * 50, cpct = c == null ? 0 : (Math.abs(c) / m) * 50;
        return (
          <div key={d} className="flex items-center gap-3 text-[13px]">
            <div className="w-28 shrink-0 truncate text-ink-mute">{DIM_LABEL[d]}</div>
            <div className="relative h-2.5 flex-1">
              <div className="absolute inset-y-0 left-1/2 w-px bg-line" />
              {c != null && <div className="absolute inset-y-0 rounded-sm border border-dashed" style={{ borderColor: DIM_COLOR[d], opacity: 0.6, left: c >= 0 ? "50%" : `${50 - cpct}%`, width: `${cpct}%` }} />}
              {v != null && <div className="absolute inset-y-0 rounded-sm" style={{ background: DIM_COLOR[d], left: v >= 0 ? "50%" : undefined, right: v < 0 ? "50%" : undefined, width: `${pct}%`, transition: "width 600ms cubic-bezier(.2,.7,.2,1)" }} />}
            </div>
            <div className={`num w-14 shrink-0 text-right font-medium ${v == null ? "text-ink-mute" : v >= 0 ? "text-good" : "text-bad"}`}>{v == null ? "—" : fmtDelta(v, 1)}</div>
          </div>
        );
      })}
    </div>
  );
}
