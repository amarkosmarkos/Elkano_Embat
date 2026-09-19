"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/Card";
import type { MapPoint } from "@/lib/data/mapa";
import { scoreScale } from "@/lib/score/colors";
import { monthLabel } from "@/lib/format";

type Mode = "fallers" | "risers" | "worst" | "best" | "stress" | "alerts";
const MODES: [Mode, string][] = [["fallers", "Más caen (3m)"], ["risers", "Más suben (3m)"], ["worst", "Peor score"], ["best", "Mejor score"], ["stress", "Más alarmas"], ["alerts", "Más meses en el 20 % peor"]];

/** Calor: densidad de la red (tramo × mes) + 60 empresas elegidas por criterio, en canvas. */
export default function HeatPanel({ months, idx, points }: { months: string[]; idx: number; points: MapPoint[] }) {
  const [mode, setMode] = useState<Mode>("fallers");
  const [n, setN] = useState(60);
  const density = useMemo(() => {
    const bins = 20;
    const m = months.map(() => new Array(bins).fill(0) as number[]);
    for (const p of points) p.s.forEach((s, i) => { if (s != null) m[i][Math.min(bins - 1, Math.floor((s / 100) * bins))]++; });
    return m;
  }, [points, months]);
  const rows = useMemo(() => {
    const key = (p: MapPoint): number | null => {
      const s = p.s[idx];
      if (s == null) return null;
      const p3 = idx >= 3 ? p.s[idx - 3] : null;
      switch (mode) {
        case "fallers": return p3 == null ? null : s - p3;
        case "risers": return p3 == null ? null : -(s - p3);
        case "worst": return s;
        case "best": return -s;
        case "stress": return -(p.n[idx] ?? 0) - (100 - s) / 1000;
        case "alerts": return -p.a.filter((a) => a === 1).length - (100 - s) / 1000;
      }
    };
    return points.map((p) => ({ p, k: key(p) })).filter((r): r is { p: MapPoint; k: number } => r.k != null).sort((a, b) => a.k - b.k).slice(0, n).map((r) => r.p);
  }, [points, idx, mode, n]);

  return (
    <div className="flex flex-col gap-5">
      <Card title="Densidad de la red" sub="Cuántas empresas hay en cada tramo de score, mes a mes. Se lee como una marea: si la masa baja, la cartera se deteriora.">
        <Density months={months} density={density} idx={idx} />
      </Card>
      <Card
        title={`Empresas · ${rows.length}`}
        sub="Una fila por empresa, una columna por mes. Pasa el ratón para leer; pincha para abrir la ficha."
        right={
          <div className="flex flex-wrap items-center gap-2 text-[11.5px]">
            <div className="flex rounded-lg border border-line bg-panel p-0.5">
              {MODES.map(([v, l]) => <button key={v} type="button" onClick={() => setMode(v)} className={`rounded-lg px-2.5 py-1 ${mode === v ? "bg-panel-hi text-ink" : "text-ink-mute hover:text-ink-dim"}`}>{l}</button>)}
            </div>
            <div className="flex rounded-lg border border-line bg-panel p-0.5">
              {[40, 60, 120].map((v) => <button key={v} type="button" onClick={() => setN(v)} className={`num rounded-lg px-2.5 py-1 ${n === v ? "bg-panel-hi text-ink" : "text-ink-mute hover:text-ink-dim"}`}>{v}</button>)}
            </div>
          </div>
        }
      >
        <Heat months={months} rows={rows} idx={idx} />
      </Card>
    </div>
  );
}

function Density({ months, density, idx }: { months: string[]; density: number[][]; idx: number }) {
  const bins = density[0]?.length ?? 20;
  const max = Math.max(...density.flat(), 1);
  const cw = 100 / months.length;
  return (
    <div>
      <div className="relative" style={{ height: 220 }}>
        <svg viewBox={`0 0 ${months.length * 10} ${bins * 10}`} preserveAspectRatio="none" className="h-full w-full">
          {density.map((col, i) => col.map((v, b) => (
            <rect key={`${i}-${b}`} x={i * 10 + 0.4} y={(bins - 1 - b) * 10 + 0.4} width={9.2} height={9.2} rx={1.2} fill={scoreScale(((b + 0.5) / bins) * 100)} opacity={0.08 + 0.92 * Math.sqrt(v / max)} stroke={i === idx ? "rgba(250,250,250,0.55)" : "none"} strokeWidth={0.5} />
          )))}
        </svg>
        <div className="pointer-events-none absolute inset-y-0 -left-9 flex flex-col justify-between text-[9.5px] text-ink-mute"><span>100</span><span>70</span><span>40</span><span>0</span></div>
      </div>
      <div className="mt-1 flex text-[9.5px] text-ink-mute">
        {months.map((m, i) => <span key={m} style={{ width: `${cw}%` }} className={`truncate text-center ${i === idx ? "text-accent" : ""}`}>{i % 2 === months.length % 2 ? monthLabel(m) : ""}</span>)}
      </div>
    </div>
  );
}

function Heat({ months, rows, idx }: { months: string[]; rows: MapPoint[]; idx: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const [hover, setHover] = useState<{ r: number; c: number; x: number; y: number } | null>(null);
  const router = useRouter();
  const LABEL = 210, CELL_H = 14, GAP = 2;
  const width = 1100, height = rows.length * (CELL_H + GAP);
  const cellW = (width - LABEL) / months.length;

  useEffect(() => {
    const cv = ref.current;
    if (!cv) return;
    const dpr = window.devicePixelRatio || 1;
    cv.width = width * dpr; cv.height = height * dpr;
    const ctx = cv.getContext("2d")!;
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, width, height);
    ctx.font = "11px Inter, sans-serif";
    ctx.textBaseline = "middle";
    rows.forEach((p, r) => {
      const y = r * (CELL_H + GAP);
      ctx.fillStyle = "#d4d4d4";
      const name = p.name.length > 30 ? p.name.slice(0, 29) + "…" : p.name;
      ctx.fillText(name, 0, y + CELL_H / 2);
      p.s.forEach((s, c) => {
        const x = LABEL + c * cellW;
        ctx.fillStyle = s == null ? "rgba(255,255,255,0.05)" : scoreScale(s);
        ctx.globalAlpha = s == null ? 1 : 0.92;
        roundRect(ctx, x + 1, y, cellW - 2, CELL_H, 3);
        ctx.fill();
        ctx.globalAlpha = 1;
        if (p.a[c] === 1) { ctx.fillStyle = "rgba(23,23,23,0.85)"; ctx.beginPath(); ctx.arc(x + cellW / 2, y + CELL_H / 2, 1.6, 0, Math.PI * 2); ctx.fill(); }
      });
      const xm = LABEL + idx * cellW;
      ctx.strokeStyle = "rgba(250,250,250,0.6)"; ctx.lineWidth = 1;
      roundRect(ctx, xm + 0.5, y - 0.5, cellW - 1, CELL_H + 1, 3); ctx.stroke();
    });
  }, [rows, months, idx, width, height, cellW]);

  const onMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const sx = width / rect.width, sy = height / rect.height;
    const x = (e.clientX - rect.left) * sx, y = (e.clientY - rect.top) * sy;
    const r = Math.floor(y / (CELL_H + GAP)), c = Math.floor((x - LABEL) / cellW);
    if (r < 0 || r >= rows.length || c < 0 || c >= months.length) { setHover(null); return; }
    setHover({ r, c, x: e.clientX - rect.left, y: e.clientY - rect.top });
  };
  const h = hover ? rows[hover.r] : null;
  return (
    <div className="relative">
      <div className="mb-1 flex pl-[19%] text-[9.5px] text-ink-mute">
        {months.map((m, i) => <span key={m} className={`flex-1 truncate text-center ${i === idx ? "text-accent" : ""}`}>{i % 2 === months.length % 2 ? monthLabel(m) : ""}</span>)}
      </div>
      <canvas ref={ref} style={{ width: "100%", height: `${height}px`, cursor: h ? "pointer" : "default" }} onMouseMove={onMove} onMouseLeave={() => setHover(null)} onClick={() => h && router.push(`/empresas/${h.id}`)} />
      {h && hover && (
        <div className="pointer-events-none absolute z-10 rounded-lg border border-line bg-panel-hi/95 px-3 py-2 text-[11.5px] shadow-[var(--shadow-float)]" style={{ left: Math.min(hover.x + 12, 800), top: hover.y + 12 }}>
          <div className="font-medium text-ink">{h.name}</div>
          <div className="num text-ink-mute">{h.id} · {monthLabel(months[hover.c])}</div>
          <div className="num mt-1 text-[14px] text-ink">{h.s[hover.c] == null ? "sin score" : (h.s[hover.c] as number).toFixed(1)}{h.a[hover.c] === 1 && <span className="ml-2 text-[10px] text-bad">20 % peor</span>}{(h.n[hover.c] ?? 0) > 0 && <span className="ml-2 text-[10px] text-warn">{h.n[hover.c]} alarmas</span>}</div>
        </div>
      )}
    </div>
  );
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y); ctx.lineTo(x + w - r, y); ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r); ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h); ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r); ctx.quadraticCurveTo(x, y, x + r, y); ctx.closePath();
}
