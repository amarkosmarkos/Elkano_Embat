"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMarketplace } from "@/lib/products/marketplace/store";
import { PRICING } from "@/lib/products/marketplace/pricing";
import { Card } from "@/components/ui/Card";
import CompanyViewer from "./CompanyViewer";
import { Btn } from "./ui";
import { scoreColor } from "@/lib/score/colors";
import { fmtMoney, monthLabelLong } from "@/lib/format";

const pct = (v: number, d = 2) => `${(v * 100).toFixed(d).replace(".", ",")} %`;

/**
 * Paso 3 · cierre. Quién pone el dinero (el prestamista y lo que recibe), quién intermedia (Embat y su comisión)
 * y quién lo recibe (las receptoras y lo que pagan), cada cifra con cómo se calcula. Debajo, condiciones por receptora y cierre.
 */
export default function DealClose() {
  const { network, result, lenderId, byId, config, closeDeal, openCompany, setOpenCompany } = useMarketplace();
  const router = useRouter();
  const [confirm, setConfirm] = useState(false);
  const lender = lenderId ? byId.get(lenderId) ?? null : null;
  if (!network) return <div className="card p-6 text-[13px] text-ink-mute">Cargando…</div>;
  if (!result || result.positions.length === 0 || !lender) return <Card><div className="flex flex-col items-center py-14 text-center"><div className="text-[18px] font-semibold text-ink">No hay operación que cerrar.</div><p className="mt-2 text-[14px] text-ink-mute">Elige un prestamista y construye la cartera en los pasos 1 y 2.</p><Btn className="mt-5" onClick={() => router.push("/productos/marketplace")}>Ir al paso 1</Btn></div></Card>;
  const e = result.economics;
  const n = result.positions.length;
  const onClose = () => { const d = closeDeal(); if (d) router.push(`/productos/marketplace/monitor?deal=${d.id}`); };
  const fee = Math.round(PRICING.embatShare * 100);

  return (
    <div className={`grid grid-cols-1 gap-5 ${openCompany ? "xl:grid-cols-[minmax(0,1fr)_380px]" : ""}`}>
      <div className="flex flex-col gap-4">
        <div className="card grid grid-cols-1 gap-px overflow-hidden bg-line-soft p-0 md:grid-cols-[1fr_auto_1fr_auto_1fr]">
          <Party role="Pone el dinero" name={lender.name} amount={fmtMoney(e.amount)} tone="ink" line={`de su tesorería desplegable (${fmtMoney(config.capital)}) · a ${config.term} meses`} gets={`Recibe ${pct(e.netYield)} anual · ${fmtMoney(e.lenderNet)} netos`} getsTone="good" how={`Interés bruto ${fmtMoney(e.grossInterest)} − comisión ${fmtMoney(e.embatFee)} − pérdida esperada ${fmtMoney(e.expectedLoss)} (PD media ${pct(e.avgPd, 1)} × LGD ${Math.round(PRICING.lgd * 100)} %) = ${fmtMoney(e.lenderNet)}, anualizado sobre ${fmtMoney(e.amount)}.`} />
          <Arrow />
          <Party role="Intermedia" name="Embat" amount={fmtMoney(e.embatFee)} tone="good" line={`${fee} % del interés que pagan las empresas`} gets="Puntúa, casa, estructura y vigila" getsTone="mute" how={`${fee} % × ${fmtMoney(e.grossInterest)} de interés bruto en ${config.term} meses. No pone capital ni toma riesgo de crédito.`} center />
          <Arrow />
          <Party role="Reciben el dinero" name={`${n} empresas receptoras`} amount={fmtMoney(e.amount)} tone="pos" line={`${fmtMoney(config.ticket)} a ${fmtMoney(Math.max(...result.positions.map((x) => x.amount)))} cada una · ${config.term} meses`} gets={`Pagan ${pct(e.avgRate, 1)} anual · ${fmtMoney(e.grossInterest)} de interés`} getsTone="ink" how={`Suma de los ${n} importes de la cartera del paso 2 (${Math.round(config.maxExposure * 100)} % máx. por empresa). Cada una paga el tipo que marca su score.`} />
        </div>

        <Card title="Condiciones por receptora" sub={`Tipo = ${pct(PRICING.baseRate, 1)} base + PD anual × ${Math.round(PRICING.lgd * 100)} % LGD + margen por banda (prime ${pct(PRICING.margin.prime, 1)} · sana ${pct(PRICING.margin.healthy, 1)} · vigilar ${pct(PRICING.margin.watch, 1)}). Pincha una fila para verla en el visor.`}>
          <div className="grid grid-cols-[minmax(0,1.6fr)_54px_100px_70px_100px_100px_100px] gap-2 border-b border-line-soft pb-2 text-[12px] font-medium text-ink-mute"><span>Receptora</span><span className="text-right">Score</span><span className="text-right">Financiado</span><span className="text-right">Tipo</span><span className="text-right">Paga</span><span className="text-right">Embat</span><span className="text-right">Prestamista</span></div>
          <div className="divide-y divide-line-soft">
            {result.positions.map((p) => (
              <button type="button" key={p.id} onClick={() => setOpenCompany(p.id)} className={`grid w-full grid-cols-[minmax(0,1.6fr)_54px_100px_70px_100px_100px_100px] items-center gap-2 py-2 text-left text-[12.5px] hover:bg-panel-2 ${openCompany === p.id ? "bg-panel-2" : ""}`}>
                <span className="min-w-0"><span className="block truncate text-ink">{p.name}</span><span className="num block text-[11px] text-ink-mute">{p.id}{p.group ? ` · ${p.group}` : ""} · {(p.weight * 100).toFixed(1)} %</span></span>
                <span className="num text-right font-medium" style={{ color: scoreColor(p.score) }}>{p.score.toFixed(0)}</span>
                <span className="num text-right font-medium text-ink">{fmtMoney(p.amount)}</span>
                <span className="num text-right text-ink">{pct(p.pricing.rate, 1)}</span>
                <span className="num text-right text-ink-dim">{fmtMoney(p.pricing.grossInterest)}</span>
                <span className="num text-right text-ink-dim">{fmtMoney(p.pricing.embatFee)}</span>
                <span className={`num text-right font-medium ${p.pricing.lenderNet > 0 ? "text-good" : "text-bad"}`}>{fmtMoney(p.pricing.lenderNet)}</span>
              </button>
            ))}
          </div>
          <div className="mt-2 grid grid-cols-[minmax(0,1.6fr)_54px_100px_70px_100px_100px_100px] gap-2 border-t border-line pt-2 text-[12.5px] font-medium"><span className="text-ink">Total</span><span /><span className="num text-right text-ink">{fmtMoney(e.amount)}</span><span className="num text-right text-ink">{pct(e.avgRate, 1)}</span><span className="num text-right text-ink">{fmtMoney(e.grossInterest)}</span><span className="num text-right text-ink">{fmtMoney(e.embatFee)}</span><span className="num text-right text-good">{fmtMoney(e.lenderNet)}</span></div>
        </Card>

        <div className="card flex flex-wrap items-center justify-between gap-4 p-5">
          <div><div className="text-[15px] font-semibold text-ink">Cerrar la operación</div><p className="mt-1 text-[13px] text-ink-mute"><span className="text-ink">{lender.name}</span> presta {fmtMoney(e.amount)} a <span className="text-ink">{n} receptoras</span> · {config.term} meses · asignación en {monthLabelLong(config.asOf).toLowerCase()}. Pasa al monitor, donde riesgo e interés se recalculan mes a mes con los scores reales.</p></div>
          {!confirm ? <div className="flex gap-2"><Link href="/productos/marketplace/receptores" className="rounded-lg border border-line px-4 py-2 text-[14px] text-ink hover:bg-panel-2">← Ajustar cartera</Link><Btn size="lg" onClick={() => setConfirm(true)}>Cerrar la operación</Btn></div>
            : <div className="rounded-lg border border-line bg-panel-2 p-3"><div className="text-[13px] text-ink">¿Confirmas el cierre? Las condiciones quedan fijadas.</div><div className="mt-3 flex gap-2"><Btn onClick={onClose}>Sí, cerrar y monitorizar</Btn><Btn variant="outline" onClick={() => setConfirm(false)}>Cancelar</Btn></div></div>}
        </div>
      </div>
      <CompanyViewer mode="borrower" term={config.term} />
    </div>
  );
}

function Party({ role, name, amount, tone, line, gets, getsTone, how, center }: { role: string; name: string; amount: string; tone: "pos" | "ink" | "good"; line: string; gets: string; getsTone: "good" | "ink" | "mute"; how: string; center?: boolean }) {
  const c = tone === "good" ? "text-good" : tone === "pos" ? "text-pos" : "text-ink";
  const g = getsTone === "good" ? "text-good" : getsTone === "ink" ? "text-ink" : "text-ink-mute";
  return (
    <div className={`flex flex-col bg-panel p-5 ${center ? "md:justify-center" : ""}`}>
      <div className="text-[12px] font-medium uppercase tracking-wide text-ink-mute">{role}</div>
      <div className="mt-0.5 truncate text-[17px] font-semibold text-ink">{name}</div>
      <div className={`num mt-2 text-[36px] font-semibold leading-none tracking-tight ${c}`}>{amount}</div>
      <div className="mt-1.5 text-[12.5px] text-ink-mute">{line}</div>
      <div className={`mt-2 text-[13.5px] font-medium ${g}`}>→ {gets}</div>
      <div className="mt-3 border-t border-line-soft pt-2 text-[11.5px] leading-snug text-ink-mute"><span className="font-medium text-ink-dim">Cómo se calcula · </span>{how}</div>
    </div>
  );
}

function Arrow() {
  return <div className="hidden items-center justify-center bg-panel px-2 text-ink-mute md:flex"><svg viewBox="0 0 24 24" width={20} height={20} fill="none"><path d="M4 12h16 M13 5l7 7-7 7" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" /></svg></div>;
}
