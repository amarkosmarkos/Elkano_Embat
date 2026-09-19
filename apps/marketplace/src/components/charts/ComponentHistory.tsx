import { useId, useState } from "react";
import { line, curveMonotoneX } from "d3-shape";
import { scaleLinear } from "d3-scale";
import { motion } from "framer-motion";
import { DIM_COLOR } from "@/lib/colors";
import { DIM_SHORT, fmtDelta, fmtMonth } from "@/lib/format";
import type { Dimension } from "@/lib/types";
import { DIMENSIONS } from "@/lib/types";

interface Props {
  months: string[];
  components: Record<Dimension, (number | null)[]>;
  width: number;
  height: number;
  highlight?: Dimension | null;
  onHighlight?: (d: Dimension | null) => void;
  markers?: { month: string; label: string }[];
}

/** Multi-line chart of the five dimension contributions over time (legend inside the box). */
export function ComponentHistory({ months, components, width: W, height: HT, highlight, onHighlight, markers = [] }: Props) {
  const id = useId();
  const legendH = 22;
  const H = HT - legendH;
  const padL = 34, padR = 14, padT = 10, padB = 22;
  const [hover, setHover] = useState<number | null>(null);
  const all = DIMENSIONS.flatMap((d) => components[d].filter((v): v is number => v != null));
  const lo = Math.min(-5, ...all), hi = Math.max(5, ...all);
  const x = scaleLinear().domain([0, Math.max(1, months.length - 1)]).range([padL, W - padR]);
  const y = scaleLinear().domain([lo, hi]).nice().range([H - padB, padT]);
  const l = line<[number, number]>().x((d) => x(d[0])).y((d) => y(d[1])).curve(curveMonotoneX);
  const labelEvery = Math.max(1, Math.ceil(months.length / Math.max(3, Math.floor(W / 90))));
  function onMove(e: React.MouseEvent<SVGSVGElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    setHover(Math.max(0, Math.min(months.length - 1, Math.round(x.invert(e.clientX - rect.left)))));
  }
  return (
    <div style={{ width: W, height: HT }}>
      <svg width={W} height={H} className="select-none" onMouseMove={onMove} onMouseLeave={() => setHover(null)}>
        {y.ticks(4).map((t) => (
          <g key={t}>
            <line x1={padL} x2={W - padR} y1={y(t)} y2={y(t)} stroke={t === 0 ? "rgba(60,38,14,0.5)" : "rgba(60,38,14,0.22)"} strokeDasharray={t === 0 ? undefined : "2 4"} />
            <text x={padL - 6} y={y(t) + 4} textAnchor="end" fill="rgba(60,38,14,0.6)" fontSize={10} fontFamily="var(--font-caps)">{t > 0 ? `+${t}` : t}</text>
          </g>
        ))}
        {months.map((m, i) => (i % labelEvery === 0 || i === months.length - 1) && (
          <text key={m} x={x(i)} y={H - 6} textAnchor={i === months.length - 1 ? "end" : i === 0 ? "start" : "middle"} fill="rgba(60,38,14,0.6)" fontSize={10} fontFamily="var(--font-mono)">{fmtMonth(m)}</text>
        ))}
        {markers.map((mk) => {
          const i = months.indexOf(mk.month);
          return i < 0 ? null : <line key={mk.month} x1={x(i)} x2={x(i)} y1={padT} y2={H - padB} stroke="#4a3319" strokeOpacity={0.5} strokeDasharray="3 4" />;
        })}
        {DIMENSIONS.map((d) => {
          const pts = components[d].map((v, i) => [i, v] as [number, number | null]).filter((p): p is [number, number] => p[1] != null);
          if (pts.length < 2) return null;
          const dim = highlight && highlight !== d;
          return (
            <motion.path key={`${id}${d}`} d={l(pts) ?? ""} fill="none" stroke={DIM_COLOR[d]} strokeWidth={dim ? 1.2 : 2.2} strokeLinecap="round"
              initial={{ pathLength: 0 }} animate={{ pathLength: 1, opacity: dim ? 0.25 : 1 }} transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
              onMouseEnter={() => onHighlight?.(d)} onMouseLeave={() => onHighlight?.(null)} style={{ cursor: "pointer" }} />
          );
        })}
        {hover != null && <line x1={x(hover)} x2={x(hover)} y1={padT} y2={H - padB} stroke="#2a1b0e" strokeOpacity={0.3} />}
      </svg>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 px-1" style={{ height: legendH }}>
        {DIMENSIONS.map((d) => (
          <button key={d} onMouseEnter={() => onHighlight?.(d)} onMouseLeave={() => onHighlight?.(null)} className={`flex items-center gap-1 text-[11px] transition-opacity ${highlight && highlight !== d ? "opacity-40" : ""}`}>
            <span className="h-2 w-2 rounded-full" style={{ background: DIM_COLOR[d] }} />
            <span className="text-muted">{DIM_SHORT[d]}</span>
            {hover != null && <span className="tnum font-caps text-[10px] font-bold">{fmtDelta(components[d][hover], 1)}</span>}
          </button>
        ))}
        {hover != null && <span className="ml-auto font-mono text-[11px] text-faint">{fmtMonth(months[hover], "long")}</span>}
      </div>
    </div>
  );
}
