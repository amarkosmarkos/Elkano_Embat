"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useMarketplace, deployableCapital } from "@/lib/products/marketplace/store";
import { componentsAt } from "@/lib/products/marketplace/portfolio";
import { componentPercentiles, componentRanks, momentum, trend } from "@/lib/score/derived";
import { Radar } from "@/components/charts/Radar";
import { ScoreHistory } from "@/components/charts/ScoreHistory";
import { Pill } from "@/components/ui/Pill";
import { ComponentBars } from "./ComponentBars";
import { Btn, TrendPill } from "./ui";
import { scoreColor } from "@/lib/score/colors";
import { METRICS } from "@/lib/score/meta";
import type { CardMetricId } from "@/lib/score/types";
import { fmtMetric, fmtMoney, monthLabelLong } from "@/lib/format";

const KEY: CardMetricId[] = ["colchon", "runway", "dias_negativo", "retraso_pago", "pct_pago_tarde", "dso", "pct_cobro_vencido", "pct_dispuesto", "credito_disponible", "neto_operativo", "tendencia_6m", "deuda_cobros"];

/** Panel lateral de empresa dentro del marketplace: score, araña, historia, evaluación como prestamista y receptora, y el botón Prestar. */
export default function CompanyPanel() {
  const { network, assessed, openCompany, setOpenCompany, lenderId, setLender, byId } = useMarketplace();
  const a = useMemo(() => assessed.find((x) => x.c.id === openCompany) ?? null, [assessed, openCompany]);
  const ranks = useMemo(() => (network ? componentRanks(network.companies, network.months.length - 1) : null), [network]);
  if (!openCompany || !a || !network || !ranks) return null;
  const { c } = a;
  const idx = network.months.length - 1;
  const comps = componentsAt(c, idx);
  const axes = componentPercentiles(comps, ranks);
  const cap = deployableCapital(c, network.months);
  const isLender = lenderId === c.id;
  const lender = lenderId ? byId.get(lenderId) ?? null : null;
  const related = lender && lender.id !== c.id && lender.group != null && lender.group === c.group;
  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/60" onClick={() => setOpenCompany(null)}>
      <div className="card flex h-full w-[640px] max-w-full flex-col gap-5 overflow-y-auto rounded-none p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="num text-[12px] text-ink-mute">{c.id}{c.group ? ` · ${c.group}${c.groupSize ? ` (${c.groupSize})` : ""}` : ""}{c.country ? ` · ${c.country}` : ""}{c.currency && c.currency !== "EUR" ? ` · ${c.currency}` : ""}</div>
            <div className="mt-0.5 text-[22px] font-semibold leading-tight text-ink">{c.name}</div>
            <div className="mt-2 flex flex-wrap items-center gap-1.5"><TrendPill trend={trend(c.scores, idx)} delta={momentum(c.scores, idx)} />{c.latest.alert === 1 && <Pill tone="bad">20 % peor de la red</Pill>}{(c.latest.nStress ?? 0) > 0 && <Pill tone="warn">{c.latest.nStress} alarma{(c.latest.nStress ?? 0) > 1 ? "s" : ""}</Pill>}{isLender && <Pill tone="accent">Prestamista actual</Pill>}{related && <Pill tone="warn">Grupo del prestamista</Pill>}</div>
          </div>
          <div className="flex items-start gap-3"><div className="text-right"><div className="num text-[40px] font-semibold leading-none" style={{ color: scoreColor(c.latest.score) }}>{c.latest.score.toFixed(0)}</div><div className="text-[11px] text-ink-mute">{monthLabelLong(c.latest.month)}</div></div><button type="button" onClick={() => setOpenCompany(null)} className="flex h-8 w-8 items-center justify-center rounded-lg border border-line text-ink-mute hover:text-ink">✕</button></div>
        </div>

        <div className="flex flex-wrap items-center gap-2 border-y border-line-soft py-3">
          {a.provider.qualified ? (isLender ? <Btn size="sm" variant="outline" onClick={() => setLender(null)}>Dejar de prestar</Btn> : <Btn size="sm" onClick={() => { setLender(c.id); }}>Prestar como {c.name}</Btn>) : <Pill>No cualifica como prestamista</Pill>}
          {isLender && <Link href="/productos/marketplace/receptores" className="rounded-lg border border-line px-3 py-1.5 text-[13px] text-ink hover:bg-panel-2">Buscar receptores →</Link>}
          <Link href={`/empresas/${c.id}`} className="ml-auto text-[13px] text-ink-mute hover:text-ink">Ficha completa (24 métricas, alarmas, caja) →</Link>
        </div>

        {cap && (
          <div className="rounded-lg bg-panel-2 p-4">
            <div className="flex items-center justify-between"><span className="text-[14px] font-medium text-ink">Tesorería real</span><span className="text-[12px] text-ink-mute">caja reconstruida desde balances + transactions</span></div>
            <div className="mt-2 grid grid-cols-3 gap-3">
              <div><div className="text-[12px] text-ink-mute">Caja hoy</div><div className="num text-[18px] font-semibold text-ink">{fmtMoney(cap.cashNow)}</div></div>
              <div><div className="text-[12px] text-ink-mute">Suelo 12 meses</div><div className="num text-[18px] font-semibold text-ink">{fmtMoney(cap.floor12)}</div></div>
              <div><div className="text-[12px] text-ink-mute">Desplegable (50 % del suelo)</div><div className="num text-[18px] font-semibold text-good">{fmtMoney(cap.deployable)}</div></div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 gap-4 md:grid-cols-[300px_minmax(0,1fr)]">
          <div className="flex justify-center"><Radar axes={axes} contributions={comps} score={c.latest.score} size={290} /></div>
          <div><div className="mb-2 text-[13px] text-ink-mute">Contribuciones este mes</div><ComponentBars components={comps} /></div>
        </div>

        <div><div className="mb-2 text-[13px] text-ink-mute">Historia del score · sombreado = 20 % peor</div><ScoreHistory months={network.months} scores={c.scores} alerts={c.alerts} height={170} /></div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="rounded-lg bg-panel-2 p-4">
            <div className="flex items-center justify-between"><span className="text-[14px] font-medium text-ink">Como prestamista</span><Pill tone={a.provider.qualified ? "good" : "neutral"}>{a.provider.qualified ? `capacidad ${a.provider.capacity}` : "no cualifica"}</Pill></div>
            <ul className="mt-2 space-y-1 text-[12.5px] text-ink-dim">{a.provider.blockers.map((r) => <li key={r} className="flex gap-2"><span className="text-bad">✕</span>{r}</li>)}{a.provider.reasons.slice(0, 5).map((r) => <li key={r} className="flex gap-2"><span className="text-good">✓</span>{r}</li>)}</ul>
          </div>
          <div className="rounded-lg bg-panel-2 p-4">
            <div className="flex items-center justify-between"><span className="text-[14px] font-medium text-ink">Como receptora</span><Pill tone={a.receiver.eligible ? (a.receiver.fit >= 50 ? "good" : "warn") : "neutral"}>{a.receiver.eligible ? `encaje ${a.receiver.fit} · necesidad ${a.receiver.need}` : "no elegible"}</Pill></div>
            <ul className="mt-2 space-y-1 text-[12.5px] text-ink-dim">{a.receiver.risks.map((r) => <li key={r} className="flex gap-2"><span className="text-bad">✕</span>{r}</li>)}{a.receiver.needSignals.map((r) => <li key={r} className="flex gap-2"><span className="text-ink-mute">·</span>{r}</li>)}{a.receiver.strengths.slice(0, 3).map((r) => <li key={r} className="flex gap-2"><span className="text-good">✓</span>{r}</li>)}</ul>
          </div>
        </div>

        <div>
          <div className="mb-2 text-[13px] text-ink-mute">Métricas clave · {monthLabelLong(c.latest.month)}</div>
          <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
            {KEY.map((k) => <div key={k} className="rounded-lg bg-panel-2 px-3 py-2"><div className="text-[11px] text-ink-mute">{METRICS[k].short} <span className="num text-[10px]">{METRICS[k].code}</span></div><div className="num text-[15px] font-medium text-ink">{fmtMetric(k, c.latest.metrics[k])}</div></div>)}
          </div>
        </div>
      </div>
    </div>
  );
}
