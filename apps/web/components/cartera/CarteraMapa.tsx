"use client";

import { useEffect, useState } from "react";
import { Kpi } from "@/components/ui/Kpi";
import { ScatterMap, type Axis } from "@/components/charts/ScatterMap";
import { Card } from "@/components/ui/Card";
import type { Kpis } from "@/lib/data/portfolio";
import type { MapPoint } from "@/lib/data/mapa";
import { formatCount, formatScore } from "@/lib/format";
import { MONTH_COOKIE } from "@/lib/data/monthCookie";
import { ScoreTrend } from "@/components/charts/ScoreTrend";
import MonthScrubber from "./MonthScrubber";

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
  const meanSeries = kpis.map((x) => x.mean);

  return (
    <div className="flex flex-col gap-5">
      <MonthScrubber
        months={months}
        idx={idx}
        playing={playing}
        onScrub={(i) => { setPlaying(false); setIdx(i); }}
        onTogglePlay={() => setPlaying((p) => { if (!p && idx >= months.length - 1) setIdx(0); return !p; })}
        note={`${formatCount(k.nDeteriorating)} se tuercen · ${formatCount(k.nImproving)} mejoran`}
      />

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
            <Seg value={axis} onChange={(v) => setAxis(v as Axis)} options={[["momentum", "Y: momentum 3m"], ["stress", "Y: alarmas"]]} />
            <Seg value={layer} onChange={(v) => setLayer(v as typeof layer)} options={[["alert", "Capa: 20 % peor"], ["none", "Sin capa"]]} />
          </div>
        }
      >
        <ScatterMap points={points} idx={idx} axis={axis} layer={layer} />
      </Card>

      <Card title="Score medio de la cartera" sub="toda la serie · pasa el ratón para ver un mes, pincha para ir a él">
        <div className="flex items-stretch gap-6">
          <div className="min-w-0 flex-1">
            <ScoreTrend months={months} values={meanSeries} idx={idx} onSelect={(i) => { setPlaying(false); setIdx(i); }} />
          </div>
          <div className="flex w-[220px] shrink-0 flex-col justify-center gap-3 border-l border-line-soft pl-6">
            <Stat l="Verde ≥ 70" v={k.nGreen} c="text-good" />
            <Stat l="Ámbar 40–70" v={k.nAmber} c="text-warn" />
            <Stat l="Rojo < 40" v={k.nRed} c="text-bad" />
          </div>
        </div>
      </Card>
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
