"use client";

import { useMemo, useState } from "react";
import { scoreScale } from "@/lib/score/colors";
import { TXT } from "@/components/charts/axes";

export interface BubbleDatum { id: string; name: string; score: number; momentum: number; size: number; sizeText?: string; qualified: boolean; alert: boolean; dimmed?: boolean }

/** Mapa de la red: x = score, y = momentum a 3 meses, área = índice derivado, anillo = cualificada. */
export function BubbleMap({ data, onSelect, selected, sizeLabel, xThreshold, thresholdLabel, height = 420 }: { data: BubbleDatum[]; onSelect?: (id: string) => void; selected?: string | null; sizeLabel: string; xThreshold?: number; thresholdLabel?: string; height?: number }) {
  const W = 1000, H = height, padL = 40, padR = 18, padT = 22, padB = 34;
  const [hover, setHover] = useState<BubbleDatum | null>(null);
  const yDom = useMemo(() => Math.min(40, Math.max(15, Math.ceil(Math.max(...data.map((d) => Math.abs(d.momentum)), 0) / 5) * 5)), [data]);
  const x = (s: number) => padL + (s / 100) * (W - padL - padR);
  const y = (m: number) => padT + (1 - (Math.max(-yDom, Math.min(yDom, m)) + yDom) / (2 * yDom)) * (H - padT - padB);
  const r = (v: number) => 1.8 + Math.sqrt(Math.max(0, Math.min(100, v)) / 100) * 11;
  const sorted = useMemo(() => [...data].sort((a, b) => (a.qualified ? 1 : 0) - (b.qualified ? 1 : 0) || a.size - b.size), [data]);
  const yt = [-yDom, -yDom / 2, 0, yDom / 2, yDom];
  return (
    <div className="relative">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full select-none" onMouseLeave={() => setHover(null)}>
        <rect x={x(70)} y={padT} width={x(100) - x(70)} height={H - padT - padB} fill="rgba(16,185,129,0.05)" />
        <rect x={padL} y={padT} width={x(40) - padL} height={H - padT - padB} fill="rgba(239,68,68,0.05)" />
        {[0, 20, 40, 60, 80, 100].map((t) => <g key={t}><line x1={x(t)} x2={x(t)} y1={padT} y2={H - padB} stroke="rgba(255,255,255,0.08)" strokeDasharray="2 5" /><text x={x(t)} y={H - padB + 16} textAnchor="middle" {...TXT}>{t}</text></g>)}
        {yt.map((t) => <g key={t}><line x1={padL} x2={W - padR} y1={y(t)} y2={y(t)} stroke={t === 0 ? "rgba(255,255,255,0.3)" : "rgba(255,255,255,0.08)"} strokeDasharray={t === 0 ? undefined : "2 5"} /><text x={padL - 8} y={y(t) + 3.5} textAnchor="end" {...TXT}>{t > 0 ? `+${t}` : t}</text></g>)}
        {xThreshold != null && <g><line x1={x(xThreshold)} x2={x(xThreshold)} y1={padT} y2={H - padB} stroke="#e5e5e5" strokeOpacity={0.8} strokeWidth={1.2} strokeDasharray="5 4" />{thresholdLabel && <text x={x(xThreshold) - 6} y={H - padB - 8} textAnchor="end" {...TXT} fill="#e5e5e5" fontWeight={600}>{thresholdLabel} ▸</text>}</g>}
        <text x={W - padR} y={padT - 8} textAnchor="end" {...TXT}>score →</text>
        <text x={padL} y={padT - 8} {...TXT}>↑ momentum 3 meses</text>
        {sorted.map((d) => {
          const c = scoreScale(d.score), rr = r(d.size);
          return (
            <g key={d.id} style={{ cursor: "pointer", opacity: d.dimmed ? 0.12 : 1, transition: "opacity 300ms" }} onMouseEnter={() => setHover(d)} onClick={() => onSelect?.(d.id)}>
              <circle cx={x(d.score)} cy={y(d.momentum)} r={rr + 6} fill="transparent" />
              <circle cx={x(d.score)} cy={y(d.momentum)} r={rr} fill={c} fillOpacity={d.qualified ? 0.95 : 0.4} stroke={d.qualified ? "#fafafa" : c} strokeOpacity={d.qualified ? 0.9 : 0.6} strokeWidth={d.qualified ? 1.4 : 0.7} />
              {selected === d.id && <circle cx={x(d.score)} cy={y(d.momentum)} r={rr + 5} fill="none" stroke="#fafafa" strokeWidth={1.6} />}
              {d.alert && <circle cx={x(d.score)} cy={y(d.momentum)} r={rr + 2.5} fill="none" stroke="#ef4444" strokeWidth={1} strokeDasharray="2 2" />}
            </g>
          );
        })}
      </svg>
      {hover && (
        <div className="pointer-events-none absolute z-10 w-[220px] rounded-lg border border-line bg-panel-hi/95 p-3 text-[12px] shadow-[var(--shadow-float)]" style={{ left: `min(calc(${(100 * x(hover.score)) / W}% + 12px), calc(100% - 230px))`, top: `${(100 * y(hover.momentum)) / H}%` }}>
          <div className="text-[13px] font-medium text-ink">{hover.name}</div>
          <div className="num text-ink-mute">{hover.id}</div>
          <div className="mt-1 flex items-center gap-3"><span className="num text-[16px] font-semibold text-ink">{hover.score.toFixed(0)}</span><span className={`num ${hover.momentum >= 0 ? "text-good" : "text-bad"}`}>{hover.momentum > 0 ? "+" : ""}{hover.momentum.toFixed(1)} / 3m</span></div>
          <div className="text-ink-mute">{sizeLabel}: <span className="num text-ink">{hover.sizeText ?? Math.round(hover.size)}</span>{hover.qualified && <span className="ml-2 text-good">✦ cualificada</span>}</div>
        </div>
      )}
    </div>
  );
}
