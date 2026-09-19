import { useMemo, useState } from "react";
import { scaleLinear, scaleSqrt } from "d3-scale";
import { motion } from "framer-motion";
import { scoreColor } from "@/lib/colors";
import { fmtDelta } from "@/lib/format";

export interface BubbleDatum {
  id: string;
  name: string;
  score: number;
  momentum: number;
  size: number;     // 0–100
  qualified: boolean;
  alert: boolean;
  dimmed?: boolean;
}

interface Props {
  data: BubbleDatum[];
  width: number;
  height: number;
  onSelect?: (id: string) => void;
  sizeLabel: string;
  xThreshold?: number;
}

/** The charted waters: x = score, y = 3-month momentum, area = derived index, gold ring = qualified. */
export function BubbleMap({ data, width: W, height: H, onSelect, sizeLabel, xThreshold }: Props) {
  const padL = 40, padR = 18, padT = 22, padB = 42;
  const [hover, setHover] = useState<BubbleDatum | null>(null);
  const x = useMemo(() => scaleLinear().domain([0, 100]).range([padL, W - padR]), [W]);
  const yDom = useMemo(() => {
    const m = Math.max(15, ...data.map((d) => Math.abs(d.momentum)));
    return Math.min(40, Math.ceil(m / 5) * 5);
  }, [data]);
  const y = useMemo(() => scaleLinear().domain([-yDom, yDom]).range([H - padB, padT]), [yDom, H]);
  const rMax = Math.max(6, Math.min(13, H / 40));
  const r = useMemo(() => scaleSqrt().domain([0, 100]).range([1.8, rMax]), [rMax]);
  const sorted = useMemo(() => [...data].sort((a, b) => (a.qualified ? 1 : 0) - (b.qualified ? 1 : 0) || a.size - b.size), [data]);
  const cx0 = W - padR - 46, cy0 = padT + 46; // compass rose
  return (
    <div className="relative" style={{ width: W, height: H }}>
      <svg width={W} height={H} className="select-none">
        <defs>
          <radialGradient id="bubbleGlow"><stop offset="0%" stopColor="#c9a227" stopOpacity={0.55} /><stop offset="100%" stopColor="#c9a227" stopOpacity={0} /></radialGradient>
        </defs>
        <rect x={x(70)} y={padT} width={x(100) - x(70)} height={y(0) - padT} fill="#2d6a4f" opacity={0.07} />
        <rect x={x(70)} y={y(0)} width={x(100) - x(70)} height={H - padB - y(0)} fill="#b8861a" opacity={0.05} />
        <rect x={padL} y={padT} width={x(40) - padL} height={H - padB - padT} fill="#8b1e2d" opacity={0.05} />
        {[0, 20, 40, 60, 80, 100].map((t) => (
          <g key={t}>
            <line x1={x(t)} x2={x(t)} y1={padT} y2={H - padB} stroke="rgba(60,38,14,0.22)" strokeDasharray="2 5" />
            <text x={x(t)} y={H - 26} textAnchor="middle" fill="rgba(60,38,14,0.65)" fontSize={10} fontFamily="var(--font-caps)">{t}</text>
          </g>
        ))}
        {y.ticks(5).map((t) => (
          <g key={t}>
            <line x1={padL} x2={W - padR} y1={y(t)} y2={y(t)} stroke={t === 0 ? "rgba(60,38,14,0.5)" : "rgba(60,38,14,0.22)"} strokeDasharray={t === 0 ? undefined : "2 5"} />
            <text x={padL - 6} y={y(t) + 4} textAnchor="end" fill="rgba(60,38,14,0.65)" fontSize={10} fontFamily="var(--font-caps)">{t > 0 ? `+${t}` : t}</text>
          </g>
        ))}
        {xThreshold != null && <line x1={x(xThreshold)} x2={x(xThreshold)} y1={padT} y2={H - padB} stroke="#8a6512" strokeOpacity={0.8} strokeDasharray="5 4" />}
        <text x={W - padR} y={H - 8} textAnchor="end" fill="#4a3319" fontSize={9} fontFamily="var(--font-caps)" letterSpacing={2}>FINANCIAL HEALTH SCORE →</text>
        <text x={padL + 4} y={padT + 10} fill="#4a3319" fontSize={9} fontFamily="var(--font-caps)" letterSpacing={2}>↑ 3-MONTH MOMENTUM</text>
        <text x={x(70) + 8} y={padT + 10} fill="#2d6a4f" fontSize={9} fontFamily="var(--font-caps)" letterSpacing={2}>HEALTHY & RISING</text>
        {/* compass rose */}
        <g transform={`translate(${cx0} ${cy0})`} opacity={0.45}>
          <circle r={30} fill="none" stroke="#4a3319" strokeWidth={0.8} />
          <circle r={22} fill="none" stroke="#4a3319" strokeWidth={0.5} strokeDasharray="1 3" />
          {[0, 90, 180, 270].map((a) => <polygon key={a} points="0,-30 4,0 0,6 -4,0" fill="#4a3319" transform={`rotate(${a})`} />)}
          {[45, 135, 225, 315].map((a) => <polygon key={a} points="0,-20 3,0 0,4 -3,0" fill="#8a6512" transform={`rotate(${a})`} />)}
          <text y={-34} textAnchor="middle" fontSize={9} fontFamily="var(--font-caps)" fill="#4a3319">N</text>
        </g>
        {sorted.map((d, i) => {
          const c = scoreColor(d.score);
          const rr = r(d.size);
          return (
            <motion.g key={d.id} initial={{ opacity: 0, scale: 0 }} animate={{ opacity: d.dimmed ? 0.12 : 1, scale: 1 }}
              transition={{ delay: Math.min(0.8, i * 0.0008), duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
              style={{ transformOrigin: `${x(d.score)}px ${y(d.momentum)}px`, cursor: "pointer" }}
              onMouseEnter={() => setHover(d)} onMouseLeave={() => setHover(null)} onClick={() => onSelect?.(d.id)}>
              {d.qualified && !d.dimmed && <circle cx={x(d.score)} cy={y(d.momentum)} r={rr * 2.4} fill="url(#bubbleGlow)" />}
              <circle cx={x(d.score)} cy={y(d.momentum)} r={rr} fill={c} fillOpacity={d.qualified ? 0.95 : 0.4} stroke={d.qualified ? "#f3d97a" : c} strokeOpacity={d.qualified ? 0.95 : 0.6} strokeWidth={d.qualified ? 1.4 : 0.7} />
              {d.alert && <circle cx={x(d.score)} cy={y(d.momentum)} r={rr + 2.5} fill="none" stroke="#8b1e2d" strokeWidth={1} strokeDasharray="2 2" />}
            </motion.g>
          );
        })}
      </svg>
      {hover && (
        <div className="pointer-events-none absolute z-10 rounded-[4px] border border-line-strong bg-[#f4e6c6] px-2.5 py-1.5 text-xs shadow-xl"
          style={{ left: x(hover.score), top: y(hover.momentum), transform: `translate(${hover.score > 75 ? "-110%" : "14px"}, -50%)` }}>
          <div className="font-display text-sm">{hover.name}</div>
          <div className="font-mono text-[10px] text-faint">{hover.id}</div>
          <div className="mt-0.5 flex items-center gap-3">
            <span className="tnum font-caps text-base font-bold" style={{ color: scoreColor(hover.score) }}>{hover.score.toFixed(0)}</span>
            <span className="tnum" style={{ color: hover.momentum >= 0 ? "#2d6a4f" : "#8b1e2d" }}>{fmtDelta(hover.momentum)} / 3m</span>
          </div>
          <div className="text-muted">{sizeLabel}: <span className="tnum font-bold text-fg">{hover.size}</span>{hover.qualified && <span className="ml-2 text-accent">✦ qualified</span>}</div>
        </div>
      )}
    </div>
  );
}
