import { useId, useMemo, useState } from "react";
import { area, line, curveMonotoneX } from "d3-shape";
import { scaleLinear } from "d3-scale";
import { motion } from "framer-motion";
import { scoreColor } from "@/lib/colors";
import { fmtMonth } from "@/lib/format";

export interface HistoryPoint { month: string; score: number | null; alert?: boolean; note?: string | null }

interface Props {
  points: HistoryPoint[];
  width: number;
  height: number;
  color?: string;
  markers?: { month: string; label: string }[];
  bands?: boolean;
  compare?: { label: string; points: (number | null)[]; color?: string };
  minY?: number;
  /** forward scenarios drawn after the last point: paths per horizon month */
  fan?: { months: string[]; p10: number[]; p25: number[]; p50: number[]; p75: number[]; p90: number[] };
}

/** Score trajectory drawn as an ink route on parchment, with an X at the latest point. */
export function ScoreHistory({ points, width: W, height: H, color, markers = [], bands = true, compare, minY, fan }: Props) {
  const id = useId();
  const padL = 34, padR = fan ? 44 : 14, padT = 14, padB = 24;
  const [hover, setHover] = useState<number | null>(null);
  const valid = points.map((p, i) => [i, p.score] as [number, number | null]).filter((d): d is [number, number] => d[1] != null);
  const fanN = fan ? fan.months.length : 0;
  const lo = minY ?? Math.max(0, Math.min(...valid.map((d) => d[1]), ...(compare?.points.filter((v): v is number => v != null) ?? [100]), ...(fan?.p10 ?? [100])) - 10);
  const x = scaleLinear().domain([0, Math.max(1, points.length - 1 + fanN)]).range([padL, W - padR]);
  const y = scaleLinear().domain([Math.floor(lo / 10) * 10, 100]).range([H - padB, padT]);
  const l = line<[number, number]>().x((d) => x(d[0])).y((d) => y(d[1])).curve(curveMonotoneX);
  const a = area<[number, number]>().x((d) => x(d[0])).y0(H - padB).y1((d) => y(d[1])).curve(curveMonotoneX);
  const last = valid[valid.length - 1];
  const stroke = color ?? scoreColor(last?.[1] ?? null);
  const ticks = useMemo(() => y.ticks(4), [y]);
  const cmp = compare?.points.map((v, i) => [i, v] as [number, number | null]).filter((d): d is [number, number] => d[1] != null) ?? [];
  const labelEvery = Math.max(1, Math.ceil((points.length + fanN) / Math.max(3, Math.floor(W / 90))));
  const lastI = valid.length ? valid[valid.length - 1][0] : 0;
  const fanPath = (arr: number[]) => valid.length ? l([[lastI, valid[valid.length - 1][1]] as [number, number], ...arr.map((v, k) => [lastI + k + 1, v] as [number, number])]) ?? "" : "";
  const fanArea = (hi: number[], loArr: number[]) => {
    if (!valid.length) return "";
    const s0 = valid[valid.length - 1][1];
    const up = [[lastI, s0], ...hi.map((v, k) => [lastI + k + 1, v])] as [number, number][];
    const dn = [[lastI, s0], ...loArr.map((v, k) => [lastI + k + 1, v])] as [number, number][];
    return `${l(up) ?? ""} L ${dn.slice().reverse().map((p) => `${x(p[0])} ${y(p[1])}`).join(" L ")} Z`;
  };

  function onMove(e: React.MouseEvent<SVGSVGElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const px = e.clientX - rect.left;
    setHover(Math.max(0, Math.min(points.length - 1, Math.round(x.invert(px)))));
  }
  const hp = hover != null ? points[hover] : null;
  return (
    <div className="relative" style={{ width: W, height: H }}>
      <svg width={W} height={H} className="select-none" onMouseMove={onMove} onMouseLeave={() => setHover(null)}>
        <defs>
          <linearGradient id={`area${id}`} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor={stroke} stopOpacity={0.28} />
            <stop offset="100%" stopColor={stroke} stopOpacity={0.02} />
          </linearGradient>
        </defs>
        {bands && (
          <>
            <rect x={padL} y={y(100)} width={W - padL - padR} height={Math.max(0, y(70) - y(100))} fill="#2d6a4f" opacity={0.06} />
            <rect x={padL} y={y(70)} width={W - padL - padR} height={Math.max(0, y(Math.max(40, y.domain()[0])) - y(70))} fill="#b8861a" opacity={0.06} />
            {y.domain()[0] < 40 && <rect x={padL} y={y(40)} width={W - padL - padR} height={Math.max(0, y(y.domain()[0]) - y(40))} fill="#8b1e2d" opacity={0.07} />}
          </>
        )}
        {ticks.map((t) => (
          <g key={t}>
            <line x1={padL} x2={W - padR} y1={y(t)} y2={y(t)} stroke="rgba(60,38,14,0.25)" strokeDasharray="2 4" />
            <text x={padL - 6} y={y(t) + 4} textAnchor="end" fill="rgba(60,38,14,0.6)" fontSize={11} fontFamily="var(--font-caps)">{t}</text>
          </g>
        ))}
        {points.map((p, i) => (i % labelEvery === 0 || (i === points.length - 1 && !fan)) && (
          <text key={p.month} x={x(i)} y={H - 7} textAnchor={i === 0 ? "start" : "middle"} fill="rgba(60,38,14,0.6)" fontSize={11} fontFamily="var(--font-mono)">{fmtMonth(p.month)}</text>
        ))}
        {fan && (
          <g>
            <rect x={x(lastI)} y={padT} width={x(lastI + fanN) - x(lastI)} height={H - padB - padT} fill="rgba(60,38,14,0.04)" />
            <line x1={x(lastI)} x2={x(lastI)} y1={padT} y2={H - padB} stroke="#4a3319" strokeOpacity={0.5} strokeDasharray="3 3" />
            <text x={x(lastI) + 5} y={padT + 9} fill="#4a3319" fontSize={9} fontFamily="var(--font-caps)" letterSpacing={1.5}>SCENARIOS →</text>
            <path d={fanArea(fan.p90, fan.p10)} fill="#8a6512" fillOpacity={0.12} />
            <path d={fanArea(fan.p75, fan.p25)} fill="#8a6512" fillOpacity={0.18} />
            <path d={fanPath(fan.p90)} fill="none" stroke="#2d6a4f" strokeWidth={1} strokeDasharray="2 3" />
            <path d={fanPath(fan.p10)} fill="none" stroke="#8b1e2d" strokeWidth={1} strokeDasharray="2 3" />
            <path d={fanPath(fan.p50)} fill="none" stroke="#4a3319" strokeWidth={1.8} strokeDasharray="5 3" />
            {fan.months.map((m, k) => (k === fanN - 1 || (k + 1) % 3 === 0) && <text key={m} x={x(lastI + k + 1)} y={H - 7} textAnchor="middle" fill="rgba(60,38,14,0.6)" fontSize={11} fontFamily="var(--font-mono)">{fmtMonth(m)}</text>)}
            {([["p90", fan.p90, "#2d6a4f"], ["median", fan.p50, "#4a3319"], ["p10", fan.p10, "#8b1e2d"]] as const).map(([lab, arr, col]) => (
              <text key={lab} x={x(lastI + fanN) + 4} y={y(arr[fanN - 1]) + 3} fill={col} fontSize={9} fontFamily="var(--font-caps)" fontWeight={700}>{lab} {arr[fanN - 1].toFixed(0)}</text>
            ))}
          </g>
        )}
        {markers.map((m) => {
          const i = points.findIndex((p) => p.month === m.month);
          if (i < 0) return null;
          return (
            <g key={m.month}>
              <line x1={x(i)} x2={x(i)} y1={padT} y2={H - padB} stroke="#4a3319" strokeOpacity={0.6} strokeDasharray="3 4" />
              <text x={x(i) + 6} y={padT + 9} fill="#4a3319" fontSize={9} fontFamily="var(--font-caps)" letterSpacing={1.5}>{m.label.toUpperCase()}</text>
            </g>
          );
        })}
        {cmp.length > 1 && <path d={l(cmp) ?? ""} fill="none" stroke={compare?.color ?? "#6d5233"} strokeWidth={1.5} strokeDasharray="4 4" opacity={0.8} />}
        <motion.path d={a(valid) ?? ""} fill={`url(#area${id})`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 1.2 }} />
        {/* ink route: dashed trail under a solid line */}
        <motion.path d={l(valid) ?? ""} fill="none" stroke={stroke} strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round"
          initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 1.4, ease: [0.16, 1, 0.3, 1] }} />
        {points.map((p, i) => p.alert && p.score != null && (
          <circle key={`a${i}`} cx={x(i)} cy={y(p.score)} r={3.5} fill="#8b1e2d" stroke="#ecd9b0" strokeWidth={1.2} />
        ))}
        {last && (
          <g transform={`translate(${x(last[0])} ${y(last[1])})`}>
            <line x1={-5} y1={-5} x2={5} y2={5} stroke={stroke} strokeWidth={3} strokeLinecap="round" />
            <line x1={-5} y1={5} x2={5} y2={-5} stroke={stroke} strokeWidth={3} strokeLinecap="round" />
          </g>
        )}
        {hp && hp.score != null && (
          <g>
            <line x1={x(hover!)} x2={x(hover!)} y1={padT} y2={H - padB} stroke="#2a1b0e" strokeOpacity={0.3} />
            <circle cx={x(hover!)} cy={y(hp.score)} r={5} fill={scoreColor(hp.score)} stroke="#ecd9b0" strokeWidth={2} />
          </g>
        )}
      </svg>
      {hp && hp.score != null && (
        <div className="pointer-events-none absolute top-1 z-10 rounded-[4px] border border-line-strong bg-[#f4e6c6] px-2.5 py-1.5 text-xs shadow-lg"
          style={{ left: x(hover!), transform: `translateX(${x(hover!) > W * 0.7 ? "-105%" : "8px"})` }}>
          <div className="font-mono text-faint">{fmtMonth(hp.month, "long")}</div>
          <div className="tnum font-caps text-base font-bold" style={{ color: scoreColor(hp.score) }}>{hp.score.toFixed(1)}</div>
          {compare && compare.points[hover!] != null && <div className="text-muted">{compare.label}: <span className="tnum">{compare.points[hover!]!.toFixed(1)}</span></div>}
          {hp.note && <div className="mt-0.5 max-w-[200px] text-fg-2">{hp.note}</div>}
          {hp.alert && <div className="mt-0.5 text-negative">Bottom 20% this month</div>}
        </div>
      )}
    </div>
  );
}
