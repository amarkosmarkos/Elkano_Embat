"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useMarketplace, deployableCapital } from "@/lib/products/marketplace/store";
import { componentsAt } from "@/lib/products/marketplace/portfolio";
import { price, type Term } from "@/lib/products/marketplace/pricing";
import { componentPercentiles, componentRanks, momentum, trend } from "@/lib/score/derived";
import { Radar } from "@/components/charts/Radar";
import { Sparkline } from "@/components/ui/Sparkline";
import { Pill } from "@/components/ui/Pill";
import { ComponentBars } from "./ComponentBars";
import { Btn, TrendPill } from "./ui";
import { scoreColor } from "@/lib/score/colors";
import { METRICS } from "@/lib/score/meta";
import type { CardMetricId } from "@/lib/score/types";
import { fmtMetric, fmtMoney, monthLabelLong } from "@/lib/format";

const KEY: CardMetricId[] = ["colchon", "runway", "dias_negativo", "retraso_pago", "dso", "pct_cobro_vencido", "pct_dispuesto", "neto_operativo"];
const pct = (v: number) => `${(v * 100).toFixed(1).replace(".", ",")} %`;

/**
 * Visor de empresa: se actualiza al seleccionar cualquier empresa en la pantalla (burbuja, tarjeta, posición).
 * `mode` decide qué se destaca: como prestamista (tesorería, botón Prestar) o como receptora (necesidad, precio).
 */
export default function CompanyViewer({ mode, term = 6 }: { mode: "lender" | "borrower"; term?: Term }) {
  const { network, assessed, openCompany, setOpenCompany, lenderId, setLender, byId, config } = useMarketplace();
  const a = useMemo(() => assessed.find((x) => x.c.id === openCompany) ?? null, [assessed, openCompany]);
  const ranks = useMemo(() => (network ? componentRanks(network.companies, network.months.length - 1) : null), [network]);
  if (!openCompany || !network || !ranks || !a) return null;
  const { c } = a;
  const idx = network.months.length - 1;
  const comps = componentsAt(c, idx);
  const axes = componentPercentiles(comps, ranks);
  const cap = deployableCapital(c, network.months);
  const isLender = lenderId === c.id;
  const lender = lenderId ? byId.get(lenderId) ?? null : null;
  const related = !!lender && lender.id !== c.id && lender.group != null && lender.group === c.group;
  const quote = price(100_000, c.latest.score, term, network.calibration);
  return (
    <div className="card flex flex-col gap-4 p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="num text-[11px] text-ink-mute">{c.id}{c.group ? ` · ${c.group}` : ""}{c.country ? ` · ${c.country}` : ""}</div>
          <div className="truncate text-[18px] font-semibold text-ink">{c.name}</div>
          <div className="mt-1.5 flex flex-wrap gap-1.5"><TrendPill trend={trend(c.scores, idx)} delta={momentum(c.scores, idx)} />{c.latest.alert === 1 && <Pill tone="bad">20 % peor</Pill>}{(c.latest.nStress ?? 0) > 0 && <Pill tone="warn">{c.latest.nStress} alarma{(c.latest.nStress ?? 0) > 1 ? "s" : ""}</Pill>}{isLender && <Pill tone="accent">Prestamista</Pill>}{related && <Pill tone="warn">Grupo del prestamista</Pill>}</div>
        </div>
        <div className="flex items-start gap-2"><div className="text-right"><div className="num text-[34px] font-semibold leading-none" style={{ color: scoreColor(c.latest.score) }}>{c.latest.score.toFixed(0)}</div><div className="text-[11px] text-ink-mute">{monthLabelLong(c.latest.month)}</div></div><button type="button" onClick={() => setOpenCompany(null)} aria-label="Cerrar" className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-line text-ink-mute hover:text-ink">✕</button></div>
      </div>

      {mode === "lender" ? (
        <div className="rounded-lg bg-panel-2 p-3.5">
          <div className="flex items-center justify-between"><span className="text-[13px] font-medium text-ink">Tesorería real</span><Pill tone={a.provider.qualified ? "good" : "neutral"}>{a.provider.qualified ? `cualifica · capacidad ${a.provider.capacity}` : "no cualifica"}</Pill></div>
          {cap ? <div className="mt-2 grid grid-cols-3 gap-2 text-[12px]"><div><div className="text-ink-mute">Caja hoy</div><div className="num font-semibold text-ink">{fmtMoney(cap.cashNow)}</div></div><div><div className="text-ink-mute">Suelo 12 m</div><div className="num font-semibold text-ink">{fmtMoney(cap.floor12)}</div></div><div><div className="text-ink-mute">Desplegable</div><div className="num font-semibold text-good">{fmtMoney(cap.deployable)}</div></div></div> : <p className="mt-1 text-[12px] text-ink-mute">Sin caja reconstruida suficiente.</p>}
          <ul className="mt-2 space-y-0.5 text-[12px] text-ink-dim">{a.provider.blockers.slice(0, 3).map((r) => <li key={r} className="flex gap-1.5"><span className="text-bad">✕</span><span className="truncate">{r}</span></li>)}{a.provider.reasons.slice(0, 3).map((r) => <li key={r} className="flex gap-1.5"><span className="text-good">✓</span><span className="truncate">{r}</span></li>)}</ul>
          <div className="mt-3 flex gap-2">
            {a.provider.qualified ? (isLender ? <Btn size="sm" variant="outline" onClick={() => setLender(null)}>Dejar de prestar</Btn> : <Btn size="sm" onClick={() => setLender(c.id)}>Elegir como prestamista</Btn>) : <Pill>No puede prestar</Pill>}
            {isLender && <Link href="/productos/marketplace/receptores" className="rounded-lg border border-line px-3 py-1.5 text-[13px] text-ink hover:bg-panel-2">Buscar receptores →</Link>}
          </div>
        </div>
      ) : (
        <div className="rounded-lg bg-panel-2 p-3.5">
          <div className="flex items-center justify-between"><span className="text-[13px] font-medium text-ink">Como receptora</span><Pill tone={a.receiver.eligible ? (a.receiver.fit >= 50 ? "good" : "warn") : "neutral"}>{a.receiver.eligible ? `encaje ${a.receiver.fit} · necesidad ${a.receiver.need}` : "no elegible"}</Pill></div>
          <div className="mt-2 grid grid-cols-3 gap-2 text-[12px]"><div><div className="text-ink-mute">PD a {term} m</div><div className="num font-semibold text-ink">{pct(quote.pd)}</div></div><div><div className="text-ink-mute">Tipo exigido</div><div className="num font-semibold text-ink">{pct(quote.rate)}</div></div><div><div className="text-ink-mute">Neto prestamista</div><div className={`num font-semibold ${quote.netYield >= 0.03 ? "text-good" : "text-warn"}`}>{pct(quote.netYield)}</div></div></div>
          <ul className="mt-2 space-y-0.5 text-[12px] text-ink-dim">{a.receiver.risks.slice(0, 3).map((r) => <li key={r} className="flex gap-1.5"><span className="text-bad">✕</span><span className="truncate">{r}</span></li>)}{a.receiver.needSignals.slice(0, 3).map((r) => <li key={r} className="flex gap-1.5"><span className="text-ink-mute">·</span><span className="truncate">{r}</span></li>)}{a.receiver.strengths.slice(0, 2).map((r) => <li key={r} className="flex gap-1.5"><span className="text-good">✓</span><span className="truncate">{r}</span></li>)}</ul>
          {cap && <div className="num mt-2 text-[11px] text-ink-mute">Caja hoy {fmtMoney(cap.cashNow)} · suelo 12 m {fmtMoney(cap.floor12)}</div>}
          {config.asOf !== network.asOf && <div className="mt-1 text-[11px] text-ink-mute">Evaluación a {monthLabelLong(network.asOf).toLowerCase()}; la cartera se asigna con los datos de {monthLabelLong(config.asOf).toLowerCase()}.</div>}
        </div>
      )}

      <div className="flex justify-center"><Radar axes={axes} contributions={comps} score={c.latest.score} size={250} /></div>
      <ComponentBars components={comps} />
      <div><div className="mb-1 text-[12px] text-ink-mute">Historia del score</div><Sparkline values={c.scores} width={360} height={44} color={scoreColor(c.latest.score)} min={0} max={100} /></div>
      <div className="grid grid-cols-2 gap-1.5">{KEY.map((k) => <div key={k} className="flex items-baseline justify-between rounded-lg bg-panel-2 px-2.5 py-1.5 text-[12px]"><span className="text-ink-mute">{METRICS[k].short}</span><span className="num font-medium text-ink">{fmtMetric(k, c.latest.metrics[k])}</span></div>)}</div>
      <Link href={`/empresas/${c.id}`} className="text-[12px] text-ink-mute hover:text-ink">Ficha completa: 24 métricas, alarmas, caja →</Link>
    </div>
  );
}
