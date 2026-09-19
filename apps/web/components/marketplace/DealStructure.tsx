"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMarketplace } from "@/lib/products/marketplace/store";
import { RISK_PRESETS } from "@/lib/products/marketplace/portfolio";
import { PRICING } from "@/lib/products/marketplace/pricing";
import { Card } from "@/components/ui/Card";
import { Pill } from "@/components/ui/Pill";
import CompanyViewer from "./CompanyViewer";
import { Btn, Stat } from "./ui";
import { scoreColor } from "@/lib/score/colors";
import { fmtMoney, monthLabelLong } from "@/lib/format";

const pct = (v: number, d = 2) => `${(v * 100).toFixed(d).replace(".", ",")} %`;

/** Paso 3 · estructurar: las condiciones de cada operación, una por receptora, antes de revisar la economía. */
export default function DealStructure() {
  const { network, result, lenderId, byId, config, openCompany, setOpenCompany } = useMarketplace();
  const router = useRouter();
  const lender = lenderId ? byId.get(lenderId) ?? null : null;
  if (!network) return <div className="card p-6 text-[13px] text-ink-mute">Cargando…</div>;
  if (!result || result.positions.length === 0 || !lender) return <Card><div className="flex flex-col items-center py-14 text-center"><div className="text-[18px] font-semibold text-ink">No hay cartera que estructurar.</div><p className="mt-2 text-[14px] text-ink-mute">Elige un prestamista y construye la cartera en los pasos 1 y 2.</p><Btn className="mt-5" onClick={() => router.push("/productos/marketplace")}>Ir al paso 1</Btn></div></Card>;
  const eco = result.economics;
  const preset = RISK_PRESETS[config.risk];
  return (
    <div className={`grid grid-cols-1 gap-5 ${openCompany ? "xl:grid-cols-[minmax(0,1fr)_380px]" : ""}`}>
      <div className="flex flex-col gap-4">
        <div className="card px-6 py-4">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div><div className="text-[12px] text-ink-mute">Operación en borrador</div><div className="text-[18px] font-semibold text-ink">{lender.name} financia a {result.positions.length} empresas</div><div className="mt-1 text-[13px] text-ink-mute">{fmtMoney(eco.amount)} a {config.term} meses · perfil {preset.label.toLowerCase()} · asignación en {monthLabelLong(config.asOf).toLowerCase()}</div></div>
            <div className="flex gap-2"><Link href="/productos/marketplace/receptores" className="rounded-lg border border-line px-4 py-2 text-[14px] text-ink hover:bg-panel-2">← Ajustar cartera</Link><Btn onClick={() => router.push("/productos/marketplace/economia")}>Paso 4 · Economía y cierre →</Btn></div>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-4 border-t border-line-soft pt-4 md:grid-cols-6">
            <Stat label="Importe" value={fmtMoney(eco.amount)} />
            <Stat label="Plazo" value={`${config.term} m`} />
            <Stat label="Tipo medio" value={pct(eco.avgRate)} hint="anual, ponderado" />
            <Stat label="PD media" value={pct(eco.avgPd, 1)} hint="en el plazo" tone={eco.avgPd > 0.3 ? "bad" : eco.avgPd > 0.15 ? "warn" : "good"} />
            <Stat label="Rendimiento neto" value={pct(eco.netYield)} hint="prestamista, anual" tone="good" />
            <Stat label="Comisión Embat" value={fmtMoney(eco.embatFee)} hint={`${Math.round(PRICING.embatShare * 100)} % del interés`} />
          </div>
        </div>
        <Card title="Condiciones por receptora" sub={`Tipo = ${pct(PRICING.baseRate, 1)} base + PD anual × ${Math.round(PRICING.lgd * 100)} % LGD + margen por banda (prime ${pct(PRICING.margin.prime, 1)} · sana ${pct(PRICING.margin.healthy, 1)} · vigilar ${pct(PRICING.margin.watch, 1)}). PD de la calibración medida del score. Pincha una fila para verla en el visor.`}>
          <div className="grid grid-cols-[minmax(0,1.4fr)_54px_90px_62px_62px_84px_84px_84px_84px] gap-2 border-b border-line-soft pb-2 text-[12px] font-medium text-ink-mute"><span>Receptora</span><span className="text-right">Score</span><span className="text-right">Importe</span><span className="text-right">Tipo</span><span className="text-right">PD</span><span className="text-right">Interés</span><span className="text-right">P. esperada</span><span className="text-right">Embat</span><span className="text-right">Neto</span></div>
          <div className="divide-y divide-line-soft">
            {result.positions.map((p) => (
              <button type="button" key={p.id} onClick={() => setOpenCompany(p.id)} className={`grid w-full grid-cols-[minmax(0,1.4fr)_54px_90px_62px_62px_84px_84px_84px_84px] items-center gap-2 py-2 text-left text-[12.5px] hover:bg-panel-2 ${openCompany === p.id ? "bg-panel-2" : ""}`}>
                <span className="min-w-0"><span className="block truncate text-ink">{p.name}</span><span className="num block text-[11px] text-ink-mute">{p.id}{p.group ? ` · ${p.group}` : ""} · {(p.weight * 100).toFixed(1)} %</span></span>
                <span className="num text-right font-medium" style={{ color: scoreColor(p.score) }}>{p.score.toFixed(0)}</span>
                <span className="num text-right font-medium text-ink">{fmtMoney(p.amount)}</span>
                <span className="num text-right text-ink">{pct(p.pricing.rate, 1)}</span>
                <span className="num text-right text-ink-dim">{pct(p.pricing.pd, 0)}</span>
                <span className="num text-right text-ink-dim">{fmtMoney(p.pricing.grossInterest)}</span>
                <span className="num text-right text-bad">−{fmtMoney(p.pricing.expectedLoss)}</span>
                <span className="num text-right text-ink-dim">−{fmtMoney(p.pricing.embatFee)}</span>
                <span className={`num text-right font-medium ${p.pricing.lenderNet > 0 ? "text-good" : "text-bad"}`}>{fmtMoney(p.pricing.lenderNet)}</span>
              </button>
            ))}
          </div>
          <div className="mt-2 grid grid-cols-[minmax(0,1.4fr)_54px_90px_62px_62px_84px_84px_84px_84px] gap-2 border-t border-line pt-2 text-[12.5px] font-medium"><span className="text-ink">Total</span><span /><span className="num text-right text-ink">{fmtMoney(eco.amount)}</span><span className="num text-right text-ink">{pct(eco.avgRate, 1)}</span><span className="num text-right text-ink-dim">{pct(eco.avgPd, 0)}</span><span className="num text-right text-ink">{fmtMoney(eco.grossInterest)}</span><span className="num text-right text-bad">−{fmtMoney(eco.expectedLoss)}</span><span className="num text-right text-ink-dim">−{fmtMoney(eco.embatFee)}</span><span className="num text-right text-good">{fmtMoney(eco.lenderNet)}</span></div>
        </Card>
        <Card title="Comprobaciones antes de cerrar">
          <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
            {[
              [eco.netYield >= config.targetReturn, `Rendimiento neto ${pct(eco.netYield)} ${eco.netYield >= config.targetReturn ? "≥" : "<"} objetivo ${pct(config.targetReturn)}`],
              [eco.avgPd <= config.maxPd, `PD media ${pct(eco.avgPd, 1)} ${eco.avgPd <= config.maxPd ? "≤" : ">"} máxima ${pct(config.maxPd, 0)}`],
              [result.topWeight <= config.maxExposure + 1e-6, `Mayor posición ${(result.topWeight * 100).toFixed(1)} % ≤ tope ${Math.round(config.maxExposure * 100)} %`],
              [result.excludedRelated > 0 || !lender.group, lender.group ? `${result.excludedRelated} empresas del grupo del prestamista excluidas` : "El prestamista no tiene grupo"],
              [eco.coverage >= 1, `El neto cubre ${eco.coverage.toFixed(1)}× la pérdida esperada`],
              [result.allocated <= config.capital, `Capital asignado ${fmtMoney(result.allocated)} dentro de la tesorería desplegable ${fmtMoney(config.capital)}`],
            ].map(([ok, txt]) => <div key={txt as string} className={`flex items-center gap-2 rounded-lg px-3 py-2 text-[13px] ${ok ? "bg-good-dim text-ink" : "bg-bad-dim text-ink"}`}><span className={ok ? "text-good" : "text-bad"}>{ok ? "✓" : "✕"}</span>{txt as string}</div>)}
          </div>
          {(eco.netYield < config.targetReturn || eco.avgPd > config.maxPd) && <p className="mt-3 text-[12px] text-warn">Hay comprobaciones que fallan: puedes cerrar igualmente, pero conviene ajustar la configuración en el paso 2.</p>}
        </Card>
      </div>
      <CompanyViewer mode="borrower" term={config.term} />
    </div>
  );
}
