import { motion } from "framer-motion";
import { scoreColor } from "@/lib/colors";

interface Bin { from: number; to: number; value: number }

interface Props {
  bins: Bin[];
  height?: number;
  highlight?: (b: Bin) => boolean;
  valueLabel?: (v: number) => string;
  marker?: number;
  markerLabel?: string;
}

/** Score distribution bars coloured by score (height follows the given px height). */
export function Histogram({ bins, height = 120, highlight, valueLabel, marker, markerLabel }: Props) {
  const max = Math.max(1e-9, ...bins.map((b) => b.value));
  const domainLo = bins[0]?.from ?? 0, domainHi = bins[bins.length - 1]?.to ?? 100;
  return (
    <div className="relative">
      <div className="flex items-end gap-[3px]" style={{ height }}>
        {bins.map((b, i) => {
          const h = (b.value / max) * 100;
          const c = scoreColor((b.from + b.to) / 2);
          const hl = highlight ? highlight(b) : true;
          return (
            <div key={i} className="group relative flex h-full flex-1 items-end">
              <motion.div className="w-full rounded-t-[2px]" style={{ background: c, opacity: hl ? 0.9 : 0.3 }}
                initial={{ height: 0 }} animate={{ height: `${Math.max(b.value > 0 ? 3 : 0, h)}%` }} transition={{ duration: 0.8, delay: i * 0.03, ease: [0.16, 1, 0.3, 1] }} />
              <div className="pointer-events-none absolute -top-7 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-[3px] border border-line-strong bg-[#f4e6c6] px-2 py-0.5 text-[10px] opacity-0 shadow transition-opacity group-hover:opacity-100">
                {b.from}–{b.to}: <span className="tnum font-bold">{valueLabel ? valueLabel(b.value) : b.value}</span>
              </div>
            </div>
          );
        })}
      </div>
      {marker != null && (
        <div className="pointer-events-none absolute inset-y-0" style={{ left: `${((marker - domainLo) / (domainHi - domainLo)) * 100}%` }}>
          <div className="h-full w-px bg-ink/60" />
          {markerLabel && <div className="font-caps absolute -top-1 left-1.5 whitespace-nowrap text-[9px] text-muted">{markerLabel}</div>}
        </div>
      )}
      <div className="font-caps mt-1 flex justify-between text-[9px] text-faint">
        <span>{domainLo}</span><span>{Math.round((domainLo + domainHi) / 2)}</span><span>{domainHi}</span>
      </div>
    </div>
  );
}
