"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMarketplace } from "@/lib/products/marketplace/store";
import { PRICING } from "@/lib/products/marketplace/pricing";
import { Card } from "@/components/ui/Card";
import { Pill } from "@/components/ui/Pill";
import { Donut } from "@/components/charts/Donut";
import { Btn, Stat } from "./ui";
import { fmtMoney, monthLabelLong } from "@/lib/format";

const pct = (v: number, d = 2) => `${(v * 100).toFixed(d).replace(".", ",")} %`;

/** Paso 4 · economía de la operación y cierre: cuánto paga cada parte, cuánto recibe y si compensa. */
export default function DealEconomics() {
  const { network, result, lenderId, byId, config, closeDeal } = useMarketplace();
  const router = useRouter();
  const [confirm, setConfirm] = useState(false);
  const lender = lenderId ? byId.get(lenderId) ?? null : null;
  if (!network) return <div className="card p-6 text-[13px] text-ink-mute">Cargando…</div>;
  if (!result || result.positions.length === 0 || !lender) return <Card><div className="flex flex-col items-center py-14 text-center"><div className="text-[18px] font-semibold text-ink">No hay operación que revisar.</div><Btn className="mt-5" onClick={() => router.push("/productos/marketplace")}>Ir al paso 1</Btn></div></Card>;
  const e = result.economics;
  const base = e.amount * PRICING.baseRate * (config.term / 12);
  const attractive = e.attractiveness >= 60 ? "good" : e.attractiveness >= 30 ? "warn" : "bad";
  const bars = [
    { l: "Interés que pagan las receptoras", v: e.grossInterest, c: "#3b82f6", sign: "+" },
    { l: "Pérdida esperada (PD × LGD)", v: -e.expectedLoss, c: "#ef4444", sign: "−" },
    { l: "Comisión de Embat", v: -e.embatFee, c: "#a1a1a1", sign: "−" },
    { l: "Neto para el prestamista", v: e.lenderNet, c: "#10b981", sign: "=" },
  ];
  const max = Math.max(...bars.map((b) => Math.abs(b.v)), 1);
  const onClose = () => { const d = closeDeal(); if (d) router.push(`/productos/marketplace/monitor?deal=${d.id}`); };
  return (
    <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
      <div className="flex flex-col gap-4">
        <div className="card px-6 py-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div><div className="text-[12px] text-ink-mute">Economía de la operación · {config.term} meses</div><div className="text-[18px] font-semibold text-ink">{lender.name} → {result.positions.length} receptoras · {fmtMoney(e.amount)}</div></div>
            <div className="text-right"><div className="text-[12px] text-ink-mute">Atractivo para el prestamista</div><div className={`num text-[34px] font-semibold leading-none ${attractive === "good" ? "text-good" : attractive === "warn" ? "text-warn" : "text-bad"}`}>{e.attractiveness}<span className="text-[14px] text-ink-mute"> / 100</span></div></div>
          </div>
          <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-panel-2"><div className={`h-full rounded-full ${attractive === "good" ? "bg-good" : attractive === "warn" ? "bg-warn" : "bg-bad"}`} style={{ width: `${e.attractiveness}%` }} /></div>
          <p className="mt-2 text-[12px] text-ink-mute">Rendimiento neto {pct(e.netYield)} frente al {pct(PRICING.baseRate, 1)} de un depósito ({e.netYield > PRICING.baseRate ? "+" : ""}{pct(e.netYield - PRICING.baseRate)} de exceso) · el neto cubre {e.coverage.toFixed(1)}× la pérdida esperada. 100 = +4 puntos sobre el depósito con cobertura ≥ 2×.</p>
          <div className="mt-5 grid grid-cols-2 gap-4 md:grid-cols-4">
            <Stat label="Capital prestado" value={fmtMoney(e.amount)} hint={`${result.positions.length} operaciones`} />
            <Stat label="Interés de las receptoras" value={fmtMoney(e.grossInterest)} hint={`${pct(e.avgRate)} anual medio`} />
            <Stat label="Rendimiento del prestamista" value={fmtMoney(e.lenderNet)} hint={`${pct(e.netYield)} anual neto`} tone="good" />
            <Stat label="Comisión de Embat" value={fmtMoney(e.embatFee)} hint={`${Math.round(PRICING.embatShare * 100)} % del interés`} />
          </div>
        </div>
        <Card title="De dónde sale y a dónde va cada euro" sub="en el plazo de la operación">
          <div className="space-y-3">
            {bars.map((b) => (
              <div key={b.l} className="grid grid-cols-[minmax(0,1fr)_110px] items-center gap-3 text-[13px]">
                <div><div className="flex justify-between"><span className="text-ink-dim">{b.l}</span></div><div className="mt-1 h-3 w-full overflow-hidden rounded-full bg-panel-2"><div className="h-full rounded-full" style={{ width: `${(100 * Math.abs(b.v)) / max}%`, background: b.c }} /></div></div>
                <div className={`num text-right font-medium ${b.v < 0 ? "text-bad" : b.sign === "=" ? "text-good" : "text-ink"}`}>{b.sign === "=" ? "" : b.sign}{fmtMoney(Math.abs(b.v))}</div>
              </div>
            ))}
          </div>
          <div className="mt-4 grid grid-cols-1 gap-3 border-t border-line-soft pt-4 md:grid-cols-3 text-[12.5px]">
            <div className="rounded-lg bg-panel-2 p-3"><div className="text-ink-mute">Frente a un depósito al {pct(PRICING.baseRate, 1)}</div><div className="num mt-1 text-[16px] font-semibold text-ink">{fmtMoney(base)}</div><div className="text-ink-mute">habría rendido en el plazo · esta operación deja <span className={e.lenderNet >= base ? "text-good" : "text-bad"}>{e.lenderNet >= base ? "+" : ""}{fmtMoney(e.lenderNet - base)}</span></div></div>
            <div className="rounded-lg bg-panel-2 p-3"><div className="text-ink-mute">Riesgo</div><div className="num mt-1 text-[16px] font-semibold text-ink">{pct(e.avgPd, 1)} PD media</div><div className="text-ink-mute">pérdida esperada {pct(e.lossRate)} del capital · LGD {Math.round(PRICING.lgd * 100)} %</div></div>
            <div className="rounded-lg bg-panel-2 p-3"><div className="text-ink-mute">Peor caso plausible</div><div className="num mt-1 text-[16px] font-semibold text-bad">−{fmtMoney(e.expectedLoss * 2)}</div><div className="text-ink-mute">si el impago dobla lo esperado, el neto sería {fmtMoney(e.lenderNet - e.expectedLoss)}</div></div>
          </div>
        </Card>
      </div>
      <div className="flex flex-col gap-4">
        <Card title="Reparto del interés" sub="quién se queda cada parte del interés bruto">
          <Donut parts={[{ label: "Prestamista (neto)", value: Math.max(0, e.lenderNet), color: "#10b981" }, { label: "Pérdida esperada", value: e.expectedLoss, color: "#ef4444" }, { label: "Embat", value: e.embatFee, color: "#a1a1a1" }]} center={fmtMoney(e.grossInterest)} centerSub="interés bruto" size={170} />
        </Card>
        <Card title="Win · win · win">
          <div className="space-y-2 text-[13px]">
            <div className="flex items-center justify-between rounded-lg bg-panel-2 px-3 py-2"><span className="text-ink-dim">{lender.name}</span><span className="num font-medium text-good">+{fmtMoney(e.lenderNet)} · {pct(e.netYield)} anual</span></div>
            <div className="flex items-center justify-between rounded-lg bg-panel-2 px-3 py-2"><span className="text-ink-dim">{result.positions.length} receptoras</span><span className="num font-medium text-pos">{fmtMoney(e.amount)} al {pct(e.avgRate)}</span></div>
            <div className="flex items-center justify-between rounded-lg bg-panel-2 px-3 py-2"><span className="text-ink-dim">Embat</span><span className="num font-medium text-ink">+{fmtMoney(e.embatFee)}</span></div>
          </div>
        </Card>
        <div className="card p-5">
          <div className="text-[15px] font-semibold text-ink">Cerrar la operación</div>
          <p className="mt-1 text-[13px] text-ink-mute">Se firma la cartera tal como está ({result.positions.length} operaciones, {fmtMoney(e.amount)}, {config.term} meses, asignación en {monthLabelLong(config.asOf).toLowerCase()}) y pasa a Operaciones y al monitor, donde riesgo y beneficio se recalculan mes a mes con los scores reales.</p>
          <div className="mt-3 flex flex-wrap gap-1.5"><Pill tone={e.netYield >= config.targetReturn ? "good" : "warn"}>neto {pct(e.netYield)} vs objetivo {pct(config.targetReturn)}</Pill><Pill tone={e.avgPd <= config.maxPd ? "good" : "warn"}>PD {pct(e.avgPd, 1)} vs máx. {pct(config.maxPd, 0)}</Pill></div>
          {!confirm ? <div className="mt-4 flex gap-2"><Btn size="lg" className="flex-1" onClick={() => setConfirm(true)}>Cerrar la operación</Btn><Link href="/productos/marketplace/estructurar" className="rounded-lg border border-line px-4 py-2 text-[14px] text-ink hover:bg-panel-2">← Condiciones</Link></div>
            : <div className="mt-4 rounded-lg border border-line bg-panel-2 p-3"><div className="text-[13px] text-ink">¿Confirmas el cierre? Las condiciones quedan fijadas y la cartera en borrador se vacía.</div><div className="mt-3 flex gap-2"><Btn onClick={onClose}>Sí, cerrar y monitorizar</Btn><Btn variant="outline" onClick={() => setConfirm(false)}>Cancelar</Btn></div></div>}
        </div>
      </div>
    </div>
  );
}
