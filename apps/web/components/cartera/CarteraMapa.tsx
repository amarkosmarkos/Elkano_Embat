"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Kpi } from "@/components/ui/Kpi";
import { ScatterMap, type Axis } from "@/components/charts/ScatterMap";
import { Card } from "@/components/ui/Card";
import type { Kpis } from "@/lib/data/portfolio";
import type { MapPoint } from "@/lib/data/mapa";
import { monthLabel, monthLabelLong, formatCount, formatScore } from "@/lib/format";
import { MONTH_COOKIE } from "@/lib/data/monthCookie";
import { Sparkline } from "@/components/ui/Sparkline";

const PLAY_MS = 900;

/**
 * Pantalla principal de la cartera: el scrubber de mes (migrado de components/datos/PortfolioScrubber)
 * mueve KPIs, mapa y "quién se mueve" a la vez, sin volver al servidor. Al cambiar de mes se
 * escribe la cookie global para que el resto de la plataforma siga el mismo mes.
 */
export default function CarteraMapa({ months, initialIdx, kpis, points }: { months: string[]; initialIdx: number; kpis: Kpis[]; points: MapPoint[] }) {
  const [idx, setIdx] = useState(initialIdx);
  const [playing, setPlaying] = useState(false);
  const [axis, setAxis] = useState<Axis>("momentum");
  const [layer, setLayer] = useState<"none" | "alert">("alert");

  useEffect(() => {
    if (!playing) return;
    const t = setInterval(() => setIdx((i) => { if (i >= months.length - 1) { setPlaying(false); return i; } return i + 1; }), PLAY_MS);
    return () => clearInterval(t);
  }, [playing, months.length]);

  useEffect(() => {
    document.cookie = `${MONTH_COOKIE}=${months[idx]}; path=/; max-age=31536000; samesite=lax`;
  }, [idx, months]);

  const k = kpis[idx];
  const movers = useMemo(() => {
    if (idx === 0) return { up: [], down: [] };
    const d = points.flatMap((p) => { const a = p.s[idx], b = p.s[idx - 1]; return a == null || b == null ? [] : [{ p, score: a, delta: a - b }]; });
    return { up: [...d].sort((a, b) => b.delta - a.delta).slice(0, 6), down: [...d].sort((a, b) => a.delta - b.delta).slice(0, 6) };
  }, [points, idx]);
  const meanSeries = kpis.map((x) => x.mean);

  return (
    <div className="flex flex-col gap-5">
      <div className="card-hi flex flex-wrap items-center gap-4 px-5 py-4">
        <button
          type="button"
          onClick={() => setPlaying((p) => { if (!p && idx >= months.length - 1) setIdx(0); return !p; })}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-ink text-panel  transition-transform hover:scale-105"
          aria-label={playing ? "Pausar" : "Reproducir"}
        >
          {playing ? (
            <svg viewBox="0 0 14 14" width={13} height={13}><rect x="2" y="1.5" width="3.4" height="11" fill="currentColor" /><rect x="8.6" y="1.5" width="3.4" height="11" fill="currentColor" /></svg>
          ) : (
            <svg viewBox="0 0 14 14" width={13} height={13} className="translate-x-px"><path d="M2.5 1.5L12 7L2.5 12.5V1.5Z" fill="currentColor" /></svg>
          )}
        </button>
        <input
          type="range" min={0} max={months.length - 1} step={1} value={idx}
          onChange={(e) => { setPlaying(false); setIdx(Number(e.target.value)); }}
          className="scrub min-w-0 flex-1" style={{ ["--p" as string]: `${(100 * idx) / (months.length - 1)}%` }}
          aria-label="Mes"
        />
        <div className="w-[190px] text-right">
          <div className="text-[18px] font-semibold leading-none text-ink">{monthLabelLong(months[idx])}</div>
          <div className="mt-1 text-[11px] text-ink-mute">{formatCount(k.nDeteriorating)} se tuercen · {formatCount(k.nImproving)} mejoran</div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
        <Kpi icon="gauge" label="Score medio" value={formatScore(k.mean)} delta={k.meanPrev == null ? null : k.mean - k.meanPrev} sub="vs mes anterior" />
        <Kpi icon="clock" label="Cambio a 6 meses" value={k.meanD6 == null ? "—" : `${k.meanD6 >= 0 ? "+" : "−"}${Math.abs(k.meanD6).toFixed(1)}`} tone={k.meanD6 == null ? "neutral" : k.meanD6 >= 0 ? "good" : "bad"} sub="media por empresa" />
        <Kpi icon="trend-up" label="Mejorando" value={formatCount(k.nImproving)} tone="good" sub="3 meses al alza" />
        <Kpi icon="trend-down" label="Deteriorando" value={formatCount(k.nDeteriorating)} tone="bad" sub="3 meses a peor" />
        <Kpi label="En el 20 % peor" value={formatCount(k.nAlert)} tone="warn" sub="alert = 1" />
        <Kpi icon="alert" label="Con alarma S" value={formatCount(k.nStress)} tone="warn" sub="≥ 1 de las 8" />
      </div>

      <Card
        title={`Mapa · ${formatCount(k.n)} empresas con score`}
        sub="Cada punto es una empresa. Pasa el ratón para verla; pincha para abrir su ficha."
        right={
          <div className="flex flex-wrap items-center gap-2 text-[11.5px]">
            <Seg value={axis} onChange={(v) => setAxis(v as Axis)} options={[["momentum", "Y: momentum 3m"], ["lane", "Y: carril fijo"], ["stress", "Y: alarmas"]]} />
            <Seg value={layer} onChange={(v) => setLayer(v as typeof layer)} options={[["alert", "Capa: 20 % peor"], ["none", "Sin capa"]]} />
          </div>
        }
      >
        <ScatterMap points={points} idx={idx} axis={axis} layer={layer} />
      </Card>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.2fr_1fr_1fr]">
        <Card title="Score medio de la cartera" sub="toda la serie · el mes elegido marcado">
          <div className="flex items-end gap-4">
            <Sparkline values={meanSeries} width={420} height={90} color="#e5e5e5" marker={idx} min={Math.min(...meanSeries) - 2} max={Math.max(...meanSeries) + 2} />
            <div className="num text-[12px] text-ink-mute">{monthLabel(months[0])} → {monthLabel(months[months.length - 1])}</div>
          </div>
          <div className="mt-4 grid grid-cols-3 gap-3 text-[12px]">
            <Stat l="Verde ≥ 70" v={k.nGreen} c="text-good" /><Stat l="Ámbar 40–70" v={k.nAmber} c="text-warn" /><Stat l="Rojo < 40" v={k.nRed} c="text-bad" />
          </div>
        </Card>
        <MoverList title="Más suben este mes" tone="good" items={movers.up} />
        <MoverList title="Más caen este mes" tone="bad" items={movers.down} />
      </div>
    </div>
  );
}

function Stat({ l, v, c }: { l: string; v: number; c: string }) {
  return <div className="rounded-xl bg-panel-2 px-3 py-2"><div className="text-[10.5px] text-ink-mute">{l}</div><div className={`num font-semibold text-[18px] ${c}`}>{formatCount(v)}</div></div>;
}

function Seg({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: [string, string][] }) {
  return (
    <div className="flex rounded-lg border border-line bg-panel p-0.5">
      {options.map(([v, l]) => (
        <button key={v} type="button" onClick={() => onChange(v)} className={`rounded-lg px-2.5 py-1 transition-colors ${value === v ? "bg-panel-hi text-ink" : "text-ink-mute hover:text-ink-dim"}`}>{l}</button>
      ))}
    </div>
  );
}

function MoverList({ title, tone, items }: { title: string; tone: "good" | "bad"; items: { p: MapPoint; score: number; delta: number }[] }) {
  return (
    <Card title={title}>
      {items.length === 0 ? <p className="text-[12px] text-ink-mute">Elige un mes con anterior para comparar.</p> : (
        <div className="flex flex-col divide-y divide-line-soft">
          {items.map((it) => (
            <Link key={it.p.id} href={`/empresas/${it.p.id}`} className="-mx-2 flex items-center justify-between gap-3 rounded-lg px-2 py-2 text-[13px] transition-colors hover:bg-panel-2">
              <span className="min-w-0 truncate text-ink">{it.p.name}<span className="num ml-2 text-[10px] text-ink-mute">{it.p.id}</span></span>
              <span className="num flex shrink-0 items-center gap-2 text-[12px]"><span className="text-ink-mute">{it.score.toFixed(0)}</span><span className={tone === "good" ? "text-good" : "text-bad"}>{it.delta >= 0 ? "+" : "−"}{Math.abs(it.delta).toFixed(1)}</span></span>
            </Link>
          ))}
        </div>
      )}
    </Card>
  );
}
