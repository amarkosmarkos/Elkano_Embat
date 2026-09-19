import { useId } from "react";
import { area, line, curveMonotoneX } from "d3-shape";
import { scaleLinear } from "d3-scale";
import { motion } from "framer-motion";

interface Props {
  values: (number | null)[];
  width?: number;
  height?: number;
  color?: string;
  domain?: [number, number];
  className?: string;
  animate?: boolean;
  markerIdx?: number;
}

export function Sparkline({ values, width = 120, height = 36, color = "#b8891c", domain = [0, 100], className, animate = true, markerIdx }: Props) {
  const id = useId();
  const pts = values.map((v, i) => [i, v] as [number, number | null]).filter((d): d is [number, number] => d[1] != null);
  if (pts.length < 2) return <svg width={width} height={height} className={className} />;
  const x = scaleLinear().domain([0, values.length - 1]).range([2, width - 2]);
  const y = scaleLinear().domain(domain).range([height - 2, 2]);
  const l = line<[number, number]>().x((d) => x(d[0])).y((d) => y(d[1])).curve(curveMonotoneX);
  const a = area<[number, number]>().x((d) => x(d[0])).y0(height).y1((d) => y(d[1])).curve(curveMonotoneX);
  const last = pts[pts.length - 1];
  return (
    <svg width={width} height={height} className={className} overflow="visible">
      <defs>
        <linearGradient id={`g${id}`} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity={0.35} />
          <stop offset="100%" stopColor={color} stopOpacity={0} />
        </linearGradient>
      </defs>
      <path d={a(pts) ?? ""} fill={`url(#g${id})`} />
      <motion.path d={l(pts) ?? ""} fill="none" stroke={color} strokeWidth={1.75} strokeLinecap="round"
        initial={animate ? { pathLength: 0 } : false} animate={{ pathLength: 1 }} transition={{ duration: 1, ease: "easeOut" }} />
      {markerIdx != null && values[markerIdx] != null && (
        <line x1={x(markerIdx)} x2={x(markerIdx)} y1={0} y2={height} stroke="var(--line-strong)" strokeDasharray="2 3" />
      )}
      <circle cx={x(last[0])} cy={y(last[1])} r={2.5} fill={color} />
    </svg>
  );
}
