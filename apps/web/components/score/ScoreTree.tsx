"use client";

import { useState } from "react";
import { Card } from "@/components/ui/Card";
import { Pill } from "@/components/ui/Pill";
import { DIMENSIONS, STRESS_FLAGS, type Dimension, type MetricId } from "@/lib/score/types";
import { DIM_LABEL, DIM_QUESTION, DIM_DESC, DIM_WEIGHT_V1, METRICS, METRICS_BY_DIM, STRESS } from "@/lib/score/meta";
import { DIM_COLOR } from "@/lib/score/colors";

/** Drill 1 → 5 → 24 → 105: pincha una dimensión para ver sus métricas; una métrica para ver de qué está hecha. */
export default function ScoreTree({ dimGini, metricGini, weak, pairs }: { dimGini: Record<string, number>; metricGini: Record<string, { gini: number; coverage: number }>; weak: string[]; pairs: [string, string, number][] }) {
  const [dim, setDim] = useState<Dimension | null>(null);
  const [metric, setMetric] = useState<MetricId | null>(null);
  const shown = dim ? METRICS_BY_DIM[dim] : (Object.keys(METRICS) as MetricId[]);
  const m = metric ? METRICS[metric] : null;
  const g = metric ? metricGini[metric] : null;
  return (
    <div className="grid grid-cols-1 gap-5 xl:grid-cols-[300px_minmax(0,1fr)_360px]">
      <div className="flex flex-col gap-4">
        <div className="card-hi p-5">
          <div className="eyebrow">Nivel 0 · el número</div>
          <div className="mt-2 text-[30px] font-semibold leading-none tracking-tight text-ink">score</div>
          <p className="mt-2 text-[12.5px] text-ink-dim">Publicado con suavizado 0,7·hoy + 0,3·mes anterior. <span className="num">alert</span> = 1 si está en el 20 % peor del mes. La explicación en texto dice qué dimensión manda.</p>
        </div>
        <Card title="Nivel 1 · 5 dimensiones" sub="contribución en puntos, con signo. Gini = cuánto predice cada una sola (h6)">
          <div className="flex flex-col gap-2">
            <button type="button" onClick={() => { setDim(null); setMetric(null); }} className={`rounded-xl px-3 py-2 text-left text-[12.5px] ${dim == null ? "bg-panel-hi text-ink" : "text-ink-mute hover:bg-panel-2"}`}>Todas las dimensiones</button>
            {DIMENSIONS.map((d) => {
              const gv = dimGini[`c_${d}`] ?? 0;
              return (
                <button key={d} type="button" onClick={() => { setDim(d); setMetric(null); }} className={`rounded-xl px-3 py-2.5 text-left transition-colors ${dim === d ? "bg-panel-hi" : "hover:bg-panel-2"}`}>
                  <div className="flex items-center justify-between text-[13px]"><span className="flex items-center gap-2 text-ink"><span className="h-2.5 w-2.5 rounded-sm" style={{ background: DIM_COLOR[d] }} />{DIM_LABEL[d]}</span><span className="num text-[11px] text-ink-mute">peso v1 {Math.round(DIM_WEIGHT_V1[d] * 100)} %</span></div>
                  <div className="mt-1.5 flex items-center gap-2"><div className="h-[5px] flex-1 overflow-hidden rounded-lg bg-panel-2"><div className="h-full rounded-lg" style={{ width: `${Math.min(100, Math.abs(gv) * 400)}%`, background: DIM_COLOR[d] }} /></div><span className="num w-10 text-right text-[11px] text-ink-dim">{gv.toFixed(2)}</span></div>
                  <div className="mt-1 text-[11px] text-ink-mute">{DIM_QUESTION[d]}</div>
                </button>
              );
            })}
          </div>
        </Card>
      </div>

      <Card title={`Nivel 2 · ${shown.length} métricas${dim ? ` · ${DIM_LABEL[dim]}` : ""}`} sub={dim ? DIM_DESC[dim] : "cada una cubre un punto ciego de las otras. Barra = |Gini| univariante a 6 meses; gris = cobertura"}>
        <div className="flex flex-col divide-y divide-line-soft">
          {shown.map((id) => {
            const mm = METRICS[id];
            const gg = metricGini[id];
            const isWeak = weak.includes(id);
            return (
              <button key={id} type="button" onClick={() => setMetric(id)} className={`-mx-2 grid grid-cols-[46px_minmax(0,1fr)_110px_60px] items-center gap-3 rounded-lg px-2 py-2.5 text-left transition-colors ${metric === id ? "bg-panel-hi" : "hover:bg-panel-2"}`}>
                <span className="num text-[11px] text-accent">{mm.code}</span>
                <span className="min-w-0"><span className="block truncate text-[13px] text-ink">{mm.label}</span><span className="block truncate text-[11px] text-ink-mute">{mm.higherIsBetter ? "más = mejor" : "menos = mejor"}{isWeak ? " · débil en este dataset" : ""}</span></span>
                <span className="flex flex-col gap-1"><span className="h-[5px] overflow-hidden rounded-lg bg-panel-2"><span className="block h-full rounded-lg" style={{ width: `${Math.min(100, Math.abs(gg?.gini ?? 0) * 400)}%`, background: DIM_COLOR[mm.dim] }} /></span><span className="h-[3px] overflow-hidden rounded-lg bg-panel-2"><span className="block h-full rounded-lg bg-ink-mute/60" style={{ width: `${Math.round((gg?.coverage ?? 0) * 100)}%` }} /></span></span>
                <span className="num text-right text-[12px] text-ink-dim">{gg ? Math.abs(gg.gini).toFixed(2) : "—"}</span>
              </button>
            );
          })}
        </div>
        <div className="mt-4 rounded-xl bg-panel-2 p-3.5 text-[11.5px] text-ink-dim">
          <span className="text-ink">Pares redundantes (|ρ| &gt; 0,8):</span> {pairs.map((p) => `${METRICS[p[0] as MetricId]?.short ?? p[0]} ~ ${METRICS[p[1] as MetricId]?.short ?? p[1]} (${p[2]})`).join(" · ")}. v2 se queda con una de cada par; v3 deja que el modelo decida.
        </div>
      </Card>

      <div className="flex flex-col gap-4">
        <Card title="Nivel 3 · de qué está hecha" sub={m ? `${m.code} · ${m.label}` : "elige una métrica"}>
          {!m ? <p className="text-[12.5px] text-ink-mute">Pincha una métrica para ver su fórmula, sus datos de origen y sus columnas de trayectoria.</p> : (
            <div className="flex flex-col gap-3 text-[12.5px]">
              <p className="text-ink-dim">{m.desc}</p>
              <div className="rounded-xl bg-ground p-3"><div className="eyebrow mb-1">Fórmula</div><code className="num block whitespace-pre-wrap text-[11.5px] leading-relaxed text-accent">{m.formula}</code></div>
              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-xl bg-panel-2 p-3"><div className="eyebrow">Gini h6</div><div className="num font-semibold mt-1 text-[18px] text-ink">{g ? g.gini.toFixed(3) : "—"}</div><div className="text-[10.5px] text-ink-mute">signo + = menor valor ⇒ evento</div></div>
                <div className="rounded-xl bg-panel-2 p-3"><div className="eyebrow">Cobertura</div><div className="num font-semibold mt-1 text-[18px] text-ink">{g ? `${Math.round(g.coverage * 100)} %` : "—"}</div><div className="text-[10.5px] text-ink-mute">de los pares empresa-mes</div></div>
              </div>
              <div><div className="eyebrow mb-1">Necesita</div><div className="text-ink-dim">{m.needs}</div></div>
              <div>
                <div className="eyebrow mb-1.5">Columnas en el vector (4 de 105)</div>
                <div className="flex flex-wrap gap-1.5">
                  {[metric, `${metric}__delta_3m`, `${metric}__delta_12m`, `${metric}__racha`].map((c) => <Pill key={c} mono>{c}</Pill>)}
                </div>
                <p className="mt-2 text-[11.5px] text-ink-mute">Δ3m = M_t − M_{"{t−3}"} · Δ12m = M_t − M_{"{t−12}"} · racha = meses seguidos empeorando. Es lo que separa 45 → 65 de 82 → 68.</p>
              </div>
            </div>
          )}
        </Card>
        <Card title="Y las 9 de estrés" sub="8 alarmas binarias + n_stress · 24 + 72 + 9 = 105">
          <div className="flex flex-col gap-1.5">
            {STRESS_FLAGS.map((f) => <div key={f} className="flex items-baseline gap-2 text-[12px]"><span className="num w-6 text-warn">{STRESS[f].code}</span><span className="text-ink-dim">{STRESS[f].label}</span><span className="num ml-auto text-[10.5px] text-ink-mute">{STRESS[f].rule}</span></div>)}
          </div>
        </Card>
      </div>
    </div>
  );
}
