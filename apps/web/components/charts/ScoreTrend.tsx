"use client";

import { useRef, useState } from "react";
import { scale, niceTicks, GridY, monthTicks, TXT } from "./axes";
import { monthLabel, formatScore } from "@/lib/format";

const ZONES: { from: number; to: number; color: string }[] = [
  { from: 70, to: 100, color: "var(--color-good)" },
  { from: 40, to: 70, color: "var(--color-warn)" },
  { from: 0, to: 40, color: "var(--color-bad)" },
];

/** Serie del score medio de la cartera: bandas verde/ámbar/rojo de fondo, eje de meses,
 * cruceta con tooltip al pasar el ratón y una marca sólida en el mes elegido; el click cambia de mes. */
export function ScoreTrend({
  months, values, idx, onSelect, width = 960, height = 170,
}: { months: string[]; values: number[]; idx: number; onSelect: (i: number) => void; width?: number; height?: number }) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);

  const padL = 30, padR = 8, padT = 10, padB = 22;
  const n = values.length;
  const lo = Math.min(...values) - 2;
  const hi = Math.max(...values) + 2;
  const y = scale(lo, hi, height - padB, padT);
  const x = (i: number) => (n === 1 ? padL : padL + (i / (n - 1)) * (width - padL - padR));
  const clampY = (v: number) => Math.min(height - padB, Math.max(padT, y(v)));
  const ticks = niceTicks(lo, hi, 4);
  const monthTickIdx = monthTicks(months);

  const d = values.map((v, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(" ");

  const indexFromClientX = (clientX: number) => {
    const rect = wrapRef.current?.getBoundingClientRect();
    if (!rect || rect.width === 0) return null;
    const scaleX = rect.width / width;
    const vx = (clientX - rect.left) / scaleX;
    const raw = ((vx - padL) / (width - padL - padR)) * (n - 1);
    return Math.min(n - 1, Math.max(0, Math.round(raw)));
  };

  const rect = wrapRef.current?.getBoundingClientRect();
  const scaleX = rect && rect.width > 0 ? rect.width / width : 1;

  return (
    <div
      ref={wrapRef}
      className="relative"
      onMouseMove={(e) => setHoverIdx(indexFromClientX(e.clientX))}
      onMouseLeave={() => setHoverIdx(null)}
      onClick={() => { if (hoverIdx != null) onSelect(hoverIdx); }}
    >
      <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" className="block cursor-pointer overflow-visible">
        {ZONES.map((z) => {
          const y0 = clampY(z.from), y1 = clampY(z.to);
          const top = Math.min(y0, y1), h = Math.abs(y0 - y1);
          if (h <= 0) return null;
          return <rect key={z.from} x={padL} y={top} width={width - padL - padR} height={h} fill={z.color} opacity={0.09} />;
        })}
        <GridY ticks={ticks} y={y} x0={padL} x1={width - padR} fmt={(v) => v.toFixed(0)} />
        {monthTickIdx.map((i) => (
          <text key={i} x={x(i)} y={height - 6} textAnchor="middle" {...TXT}>{monthLabel(months[i])}</text>
        ))}
        <path d={d} fill="none" stroke="var(--color-accent-2)" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
        {hoverIdx != null && (
          <>
            <line x1={x(hoverIdx)} x2={x(hoverIdx)} y1={padT} y2={height - padB} stroke="var(--color-ink)" strokeWidth={1} strokeDasharray="2 3" opacity={0.4} />
            <circle cx={x(hoverIdx)} cy={y(values[hoverIdx])} r={4} fill="var(--color-accent-2)" stroke="var(--color-ground)" strokeWidth={1.5} />
          </>
        )}
        <line x1={x(idx)} x2={x(idx)} y1={padT} y2={height - padB} stroke="var(--color-ink)" strokeWidth={1.2} opacity={0.55} />
        <circle cx={x(idx)} cy={y(values[idx])} r={4} fill="var(--color-ink)" />
      </svg>
      {hoverIdx != null && (
        <div
          className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-[calc(100%+8px)] whitespace-nowrap rounded-lg border border-line bg-panel-hi px-2.5 py-1.5 text-[11px] shadow-lg"
          style={{ left: x(hoverIdx) * scaleX, top: y(values[hoverIdx]) }}
        >
          <div className="text-ink-mute">{monthLabel(months[hoverIdx])}</div>
          <div className="num font-semibold text-ink">{formatScore(values[hoverIdx])}</div>
        </div>
      )}
    </div>
  );
}
