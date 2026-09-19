"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { MapPoint } from "@/lib/data/mapa";
import { scoreScale } from "@/lib/score/colors";
import { TXT } from "./axes";

export type Axis = "momentum" | "lane" | "stress";

function hashToUnit(id: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < id.length; i++) { h ^= id.charCodeAt(i); h = Math.imul(h, 0x01000193); }
  return ((h >>> 0) % 100000) / 100000;
}

/**
 * Mapa de la red: X = score, Y = momentum a 3 meses (o carril fijo por empresa, o nº de alarmas).
 * Transiciones CSS al cambiar de mes (migrado del CompanyScatter de /datos). Hover con ficha rápida.
 */
export function ScatterMap({ points, idx, axis, layer }: { points: MapPoint[]; idx: number; axis: Axis; layer: "none" | "alert" | "stress" }) {
  const W = 1100, H = 420, padL = 44, padR = 20, padT = 22, padB = 34;
  const router = useRouter();
  const [hover, setHover] = useState<string | null>(null);
  const lanes = useMemo(() => new Map(points.map((p) => [p.id, hashToUnit(p.id)])), [points]);
  const x = (s: number) => padL + (s / 100) * (W - padL - padR);
  const yMom = (m: number) => padT + (1 - (Math.max(-30, Math.min(30, m)) + 30) / 60) * (H - padT - padB);
  const yStress = (n: number, j: number) => padT + (1 - (Math.min(8, n) + 0.15 + j * 0.7) / 9) * (H - padT - padB);
  const yLane = (u: number) => padT + u * (H - padT - padB);

  const pos = points.map((p) => {
    let s = p.s[idx], faded = false;
    if (s == null) { for (let i = idx - 1; i >= 0 && s == null; i--) s = p.s[i]; faded = true; }
    if (s == null) return null;
    const prev = idx - 3 >= 0 ? p.s[idx - 3] : null;
    const mom = prev == null || p.s[idx] == null ? null : (p.s[idx] as number) - prev;
    const n = p.n[idx] ?? 0;
    const u = lanes.get(p.id)!;
    const cy = axis === "momentum" ? yMom(mom ?? 0) : axis === "stress" ? yStress(n, u) : yLane(u);
    return { p, s, mom, n, faded: faded || (axis === "momentum" && mom == null), cx: x(s), cy, alert: p.a[idx] === 1 };
  }).filter((v): v is NonNullable<typeof v> => v != null);

  const hov = hover ? pos.find((v) => v.p.id === hover) : null;
  const sameGroup = hov?.p.group ? new Set(points.filter((q) => q.group === hov.p.group).map((q) => q.id)) : null;

  return (
    <div className="relative">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" onMouseLeave={() => setHover(null)}>
        <rect x={x(0)} y={padT} width={x(40) - x(0)} height={H - padT - padB} fill="rgba(239,68,68,0.05)" />
        <rect x={x(40)} y={padT} width={x(70) - x(40)} height={H - padT - padB} fill="rgba(245,158,11,0.035)" />
        <rect x={x(70)} y={padT} width={x(100) - x(70)} height={H - padT - padB} fill="rgba(16,185,129,0.045)" />
        {[0, 20, 40, 60, 70, 80, 100].map((v) => (
          <g key={v}>
            <line x1={x(v)} x2={x(v)} y1={padT} y2={H - padB} stroke="rgba(255,255,255,0.09)" strokeDasharray={v === 40 || v === 70 ? undefined : "2 5"} />
            <text x={x(v)} y={H - padB + 16} textAnchor="middle" {...TXT}>{v}</text>
          </g>
        ))}
        {axis === "momentum" && [-20, -10, 0, 10, 20].map((v) => (
          <g key={v}>
            <line x1={padL} x2={W - padR} y1={yMom(v)} y2={yMom(v)} stroke={v === 0 ? "rgba(255,255,255,0.4)" : "rgba(255,255,255,0.07)"} strokeDasharray={v === 0 ? undefined : "2 5"} />
            <text x={padL - 8} y={yMom(v) + 3.5} textAnchor="end" {...TXT}>{v > 0 ? `+${v}` : v}</text>
          </g>
        ))}
        {axis === "stress" && [0, 2, 4, 6, 8].map((v) => (
          <text key={v} x={padL - 8} y={yStress(v, 0.5) + 3.5} textAnchor="end" {...TXT}>{v}</text>
        ))}
        <text x={W - padR} y={padT - 8} textAnchor="end" {...TXT}>score →</text>
        <text x={padL} y={padT - 8} {...TXT}>{axis === "momentum" ? "↑ momentum 3 meses (pts)" : axis === "stress" ? "↑ alarmas de estrés activas" : "carril fijo por empresa"}</text>
        {pos.map((v) => {
          const dim = sameGroup ? !sameGroup.has(v.p.id) : false;
          const r = hover === v.p.id ? 6 : 3.1;
          return (
            <g
              key={v.p.id}
              style={{ transform: `translate(${v.cx}px, ${v.cy}px)`, transition: "transform 650ms cubic-bezier(.4,0,.2,1), opacity 300ms", cursor: "pointer" }}
              opacity={v.faded ? 0.12 : dim ? 0.15 : 0.9}
              onMouseEnter={() => setHover(v.p.id)}
              onClick={() => router.push(`/empresas/${v.p.id}`)}
            >
              <circle r={9} fill="transparent" />
              {layer === "alert" && v.alert && <circle r={r + 3} fill="none" stroke="#ef4444" strokeWidth={1} opacity={0.7} />}
              {layer === "stress" && v.n > 0 && <circle r={r + 2 + Math.min(4, v.n)} fill="#f59e0b" opacity={0.18} />}
              <circle r={r} fill={scoreScale(v.s)} stroke={hover === v.p.id ? "#fafafa" : "none"} strokeWidth={1.5} />
            </g>
          );
        })}
      </svg>
      {hov && (
        <div className="pointer-events-none absolute z-10 w-[240px] rounded-xl border border-line bg-panel-hi/95 p-3 shadow-[var(--shadow-float)] backdrop-blur" style={{ left: `min(calc(${(100 * hov.cx) / W}% + 12px), calc(100% - 250px))`, top: `${(100 * hov.cy) / H}%` }}>
          <div className="text-[13px] font-medium text-ink">{hov.p.name}</div>
          <div className="num text-[10.5px] text-ink-mute">{hov.p.id}{hov.p.group ? ` · ${hov.p.group}` : ""}</div>
          <div className="mt-2 grid grid-cols-3 gap-2 text-[11px]">
            <div><div className="text-ink-mute">Score</div><div className="num text-[15px] text-ink">{hov.s.toFixed(0)}</div></div>
            <div><div className="text-ink-mute">3 meses</div><div className={`num text-[15px] ${hov.mom == null ? "text-ink-mute" : hov.mom >= 0 ? "text-good" : "text-bad"}`}>{hov.mom == null ? "—" : `${hov.mom >= 0 ? "+" : "−"}${Math.abs(hov.mom).toFixed(1)}`}</div></div>
            <div><div className="text-ink-mute">Alarmas</div><div className={`num text-[15px] ${hov.n > 0 ? "text-warn" : "text-ink"}`}>{hov.n}</div></div>
          </div>
          {hov.alert && <div className="mt-1.5 text-[10.5px] text-bad">En el 20 % peor de la red este mes</div>}
        </div>
      )}
    </div>
  );
}
