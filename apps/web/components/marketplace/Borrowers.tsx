"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMarketplace, deployableCapital } from "@/lib/products/marketplace/store";
import { buildPortfolio, RISK_PRESETS, OVERLAP_PENALTY, DEFAULT_CONFIG as DEFAULT_CFG, type PortfolioResult, type RiskTolerance } from "@/lib/products/marketplace/portfolio";
import { TERMS, type Term } from "@/lib/products/marketplace/pricing";
import { isRelated } from "@/lib/products/marketplace/assess";
import { TIER_LABEL, type Tier } from "@/lib/score/derived";
import { Card } from "@/components/ui/Card";
import { Pill } from "@/components/ui/Pill";
import { ScoreRing } from "@/components/ui/ScoreRing";
import { BubbleMap } from "./BubbleMap";
import { Treemap } from "./Treemap";
import { Bins } from "./Bins";
import CompanyViewer from "./CompanyViewer";
import { Btn, Seg, Skeleton, Slider, Stat } from "./ui";
import { scoreColor } from "@/lib/score/colors";
import { fmtMoney, monthLabel, monthLabelLong } from "@/lib/format";

type Tab = "map" | "distribution" | "crew";
const pct = (v: number, d = 1) => `${(v * 100).toFixed(d).replace(".", ",")} %`;

const STEP_MS = 320;
const CONFIG_KEYS: (keyof import("@/lib/products/marketplace/portfolio").PortfolioConfig)[] = ["capital", "risk", "maxExposure", "minScore", "maxPerGroup", "targetPositions", "asOf", "lenderId", "term", "targetReturn", "ticket", "maxPd"];

/**
 * Paso 2 · receptoras y cartera. La cartera NO se calcula sola: se configura (perfil de riesgo, plazo,
 * rentabilidad objetivo, capital, ticket, exposición, diversificación), se pulsa «Calcular» y se ve el
 * proceso paso a paso (embudo, ranking, selección, pesos, precio) antes del resultado.
 */
export default function Borrowers() {
  const { network, assessed, config, setConfig, setRisk, lenderId, setLender, result, setResult, byId, openCompany, setOpenCompany } = useMarketplace();
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("map");
  const [view, setView] = useState<"candidates" | "portfolio">("portfolio");

  const months = network?.months ?? [];
  const asOfOptions = useMemo(() => months.filter((_, i) => i >= 6), [months]);
  const lender = useMemo(() => assessed.find((a) => a.c.id === lenderId) ?? null, [assessed, lenderId]);
  const cap = useMemo(() => (lender && network ? deployableCapital(lender.c, network.months) : null), [lender, network]);
  const topLenders = useMemo(() => assessed.filter((a) => a.provider.qualified).sort((x, y) => (y.provider.deployable ?? 0) - (x.provider.deployable ?? 0)).slice(0, 5), [assessed]);

  // la cartera es una función pura de (red, configuración), pero solo se materializa al pulsar «Calcular»
  const preview: PortfolioResult | null = useMemo(() => (network && months.includes(config.asOf) ? buildPortfolio(network, { ...config, lenderId }) : null), [network, config, lenderId, months]);
  const [phase, setPhase] = useState<"idle" | "running" | "done">(result ? "done" : "idle");
  const [step, setStep] = useState(0);
  const stale = !!result && CONFIG_KEYS.some((k) => result.config[k] !== (k === "lenderId" ? lenderId : config[k]));
  const steps = useMemo(() => (preview ? processSteps(preview, config, preset0(config.risk)) : []), [preview, config]);
  useEffect(() => {
    if (phase !== "running") return;
    if (step >= steps.length) { setResult(preview); setPhase("done"); return; }
    const t = setTimeout(() => setStep((x) => x + 1), STEP_MS);
    return () => clearTimeout(t);
  }, [phase, step, steps.length, preview, setResult]);
  const compute = () => { if (!preview) return; setView("portfolio"); setStep(0); setPhase("running"); };
  const shown = phase === "done" ? result : null;

  const candidates = useMemo(() => assessed.filter((a) => a.receiver.eligible && a.receiver.need >= 25 && !isRelated(lender?.c ?? null, a.c)).sort((x, y) => y.receiver.fit - x.receiver.fit), [assessed, lender]);
  const inChest = useMemo(() => new Set(shown?.positions.map((p) => p.id) ?? []), [shown]);
  const bubbles = useMemo(() => { const cand = new Set(candidates.map((a) => a.c.id)); return assessed.map((a) => ({ id: a.c.id, name: a.c.name, score: a.c.latest.score, momentum: a.momentum ?? 0, size: inChest.has(a.c.id) ? 100 : a.receiver.fit, qualified: inChest.has(a.c.id), alert: a.c.latest.alert === 1, dimmed: !cand.has(a.c.id) && !inChest.has(a.c.id) })); }, [assessed, candidates, inChest]);

  const eco = shown?.economics ?? null;
  const preset = RISK_PRESETS[config.risk];

  return (
    <div className={`grid grid-cols-1 gap-5 ${openCompany ? "xl:grid-cols-[340px_minmax(0,1fr)_380px]" : "xl:grid-cols-[340px_minmax(0,1fr)]"}`}>
      <aside className="flex flex-col gap-4">
        {lender ? (
          <div className="card p-4 ring-1 ring-ink/40">
            <div className="flex items-center justify-between text-[12px] text-ink-mute"><span>Presta</span><Link href="/productos/marketplace" className="hover:text-ink">cambiar</Link></div>
            <div className="mt-1 flex items-center justify-between gap-2"><button type="button" onClick={() => setOpenCompany(lender.c.id)} className="truncate text-left text-[15px] font-semibold text-ink hover:underline">{lender.c.name}</button><span className="num text-[22px] font-semibold" style={{ color: scoreColor(lender.c.latest.score) }}>{lender.c.latest.score.toFixed(0)}</span></div>
            <div className="mt-2 text-[12px] text-ink-dim">Cartera a medida: capital = 50 % de su suelo de caja real ({cap ? fmtMoney(cap.floor12) : "—"}), su grupo excluido, perfiles de riesgo parecidos penalizados hasta {Math.round(OVERLAP_PENALTY * 100)} %.{cap && config.capital !== cap.deployable && <button type="button" onClick={() => setConfig({ capital: cap.deployable })} className="ml-1 text-ink underline">restaurar capital real</button>}</div>
          </div>
        ) : (
          <Card title="¿Quién presta?" sub="Elige el prestamista: la cartera se construye para él.">
            <div className="flex flex-wrap gap-1.5">{topLenders.map((a) => <button key={a.c.id} type="button" onClick={() => setLender(a.c.id)} className="rounded-lg border border-line px-2.5 py-1 text-[12px] text-ink hover:bg-panel-2">{a.c.name} <span className="num text-ink-mute">{fmtMoney(a.provider.deployable ?? 0)}</span></button>)}</div>
          </Card>
        )}
        <Card title="Configuración" sub="ajusta y pulsa Calcular para construir la cartera">
          <div className="space-y-4">
            <div><div className="mb-1.5 text-[13px] text-ink-mute">Perfil de riesgo</div><Seg className="w-full" value={config.risk} onChange={(v: RiskTolerance) => setRisk(v)} options={(Object.keys(RISK_PRESETS) as RiskTolerance[]).map((k) => ({ value: k, label: RISK_PRESETS[k].label }))} /><p className="mt-1.5 text-[12px] text-ink-mute">{preset.blurb}</p></div>
            <div><div className="mb-1.5 text-[13px] text-ink-mute">Plazo</div><Seg className="w-full" value={String(config.term)} onChange={(v) => setConfig({ term: Number(v) as Term })} options={TERMS.map((t) => ({ value: String(t), label: `${t} meses` }))} /><p className="mt-1.5 text-[12px] text-ink-mute">Más plazo ⇒ más probabilidad de impago en la ventana, más tipo y más rendimiento bruto.</p></div>
            <Slider label="Rentabilidad neta objetivo" value={config.targetReturn} min={0} max={0.08} step={0.0025} onChange={(v) => setConfig({ targetReturn: v })} format={(v) => pct(v)} />
            <Slider label="Capital disponible" value={config.capital} min={100_000} max={100_000_000} step={100_000} onChange={(v) => setConfig({ capital: v })} format={(v) => fmtMoney(v)} />
            <div className="grid grid-cols-2 gap-4">
              <Slider label="Ticket mínimo" value={config.ticket} min={10_000} max={1_000_000} step={10_000} onChange={(v) => setConfig({ ticket: v })} format={(v) => fmtMoney(v)} />
              <Slider label="Exposición máx." value={config.maxExposure} min={0.04} max={0.25} step={0.01} onChange={(v) => setConfig({ maxExposure: v })} format={(v) => `${Math.round(v * 100)} %`} />
              <Slider label="Score mínimo" value={config.minScore} min={55} max={90} step={1} onChange={(v) => setConfig({ minScore: v })} />
              <Slider label="PD máxima" value={config.maxPd} min={0.05} max={0.7} step={0.01} onChange={(v) => setConfig({ maxPd: v })} format={(v) => pct(v, 0)} />
              <Slider label="Posiciones" value={config.targetPositions} min={4} max={40} step={1} onChange={(v) => setConfig({ targetPositions: v })} />
              <Slider label="Máx. por grupo" value={config.maxPerGroup} min={1} max={3} step={1} onChange={(v) => setConfig({ maxPerGroup: v })} />
            </div>
            <div><div className="mb-1.5 text-[13px] text-ink-mute">Mes de asignación</div><div className="flex flex-wrap gap-1">{asOfOptions.map((m) => <button key={m} type="button" onClick={() => setConfig({ asOf: m })} className={`num rounded-lg border px-2 py-0.5 text-[11px] transition-colors ${config.asOf === m ? "border-ink bg-ink text-panel" : "border-line text-ink-dim hover:bg-panel-2"}`}>{monthLabel(m)}</button>)}</div></div>
            <Btn size="lg" className="w-full" onClick={compute} disabled={!preview || !lender || phase === "running"}>{phase === "running" ? "Calculando…" : shown && !stale ? "Recalcular cartera" : stale ? "Recalcular · configuración cambiada" : "Calcular cartera"}</Btn>
            {!lender && <p className="text-[12px] text-warn">Elige primero quién presta.</p>}
          </div>
        </Card>
        {shown && (
          <Card title="Embudo de selección" sub="por qué se descarta cada candidata">
            <div className="space-y-1 text-[12px]">
              {[["Con score en el mes", shown.funnel.scored], ["− prestamista y su grupo", -shown.funnel.related], ["− en el 20 % peor", -shown.funnel.alerted], [`− más de ${preset.maxStress} alarma`, -shown.funnel.stressed], ["− menos de 6 meses de historia", -shown.funnel.history], [`− score < ${config.minScore}`, -shown.funnel.belowScore], [`− PD a ${config.term} m > ${pct(config.maxPd, 0)}`, -shown.funnel.abovePd], [`− rendimiento neto < ${pct(config.targetReturn)}`, -shown.funnel.belowReturn], ["= elegibles", shown.funnel.eligible], [`→ posiciones (capital / ticket, tope ${config.targetPositions})`, shown.positions.length]].map(([l, v]) => <div key={l as string} className={`flex justify-between ${String(l).startsWith("=") || String(l).startsWith("→") ? "border-t border-line-soft pt-1 text-ink" : "text-ink-mute"}`}><span>{l as string}</span><span className={`num ${(v as number) < 0 ? "text-bad" : "text-ink"}`}>{v as number}</span></div>)}
            </div>
          </Card>
        )}
      </aside>

      <section className="flex min-w-0 flex-col gap-4">
        {!network ? <Skeleton className="h-[520px]" /> : phase === "running" ? <Process steps={steps} step={step} /> : !shown ? (
          <Card>
            <div className="flex flex-col items-center py-14 text-center">
              <div className="text-[18px] font-semibold text-ink">{lender ? `Cartera para ${lender.c.name}` : "Sin prestamista"}</div>
              <p className="mt-2 max-w-md text-[14px] text-ink-mute">{lender ? `Con ${fmtMoney(config.capital)} de tesorería desplegable, perfil ${preset.label.toLowerCase()} a ${config.term} meses. Ajusta la configuración y calcula: verás el embudo, el ranking, la selección y el precio de cada receptora.` : "Elige quién presta en el paso 1 o en la lista de la izquierda."}</p>
              <Btn size="lg" className="mt-5" onClick={compute} disabled={!preview || !lender}>Calcular cartera</Btn>
            </div>
          </Card>
        ) : (
          <>
            {stale && <div className="flex items-center justify-between gap-3 rounded-lg border border-warn/40 bg-warn/10 px-4 py-2 text-[13px] text-ink"><span>La configuración ha cambiado desde el último cálculo: esta cartera ya no la refleja.</span><Btn size="sm" onClick={compute}>Recalcular</Btn></div>}
            <div className="card flex flex-col gap-4 px-6 py-4">
              <div className="flex flex-wrap items-center gap-6">
                <ScoreRing score={shown.avgScore} size={84} stroke={7} label="cartera" />
                <div className="grid min-w-0 flex-1 grid-cols-2 gap-x-6 gap-y-3 md:grid-cols-3 2xl:grid-cols-5">
                  <Stat label="Asignado" value={fmtMoney(shown.allocated)} hint={`${shown.positions.length} posiciones · ${shown.reserve > 0 ? `${fmtMoney(shown.reserve)} en reserva` : "todo el capital"}`} />
                  <Stat label="Rendimiento neto" value={eco ? pct(eco.netYield) : "—"} hint="anual, tras pérdida esperada y comisión" tone={eco && eco.netYield >= config.targetReturn ? "good" : "warn"} />
                  <Stat label="Tipo medio" value={eco ? pct(eco.avgRate) : "—"} hint="que pagan las receptoras" />
                  <Stat label="PD media" value={eco ? pct(eco.avgPd) : "—"} hint={`a ${config.term} meses · pérdida esperada ${eco ? fmtMoney(eco.expectedLoss) : "—"}`} tone={eco && eco.avgPd > 0.3 ? "bad" : eco && eco.avgPd > 0.15 ? "warn" : "good"} />
                  <Stat label="Diversificación" value={shown.effectiveN.toFixed(1)} hint={`N efectivo · mayor ${(shown.topWeight * 100).toFixed(0)} % · solap. ${shown.avgOverlap == null ? "—" : shown.avgOverlap.toFixed(2)}`} />
                </div>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line-soft pt-4">
                <div className="flex flex-wrap items-center gap-2"><Seg value={view} onChange={setView} options={[{ value: "portfolio", label: "Cartera" }, { value: "candidates", label: "Candidatas" }]} />{view === "portfolio" && <Seg value={tab} onChange={setTab} options={[{ value: "map", label: "Mapa" }, { value: "distribution", label: "Distribución" }, { value: "crew", label: "Posiciones" }]} />}</div>
                <Btn size="sm" onClick={() => router.push("/productos/marketplace/cierre")} disabled={shown.positions.length === 0}>Paso 3 · Cierre →</Btn>
              </div>
            </div>

            {view === "candidates" && (
              <Card title={lender ? `Candidatas para ${lender.c.name}` : "Candidatas a financiación"} sub={`${candidates.length} sanas con necesidad visible de capital · en blanco las que entran en la cartera · pincha para verla en el visor`}>
                <BubbleMap data={bubbles} onSelect={(id) => setOpenCompany(id)} selected={openCompany} sizeLabel="Encaje" xThreshold={config.minScore} thresholdLabel={`SCORE MÍNIMO ${config.minScore}`} height={400} />
              </Card>
            )}
            {view === "portfolio" && shown.positions.length === 0 && <Card><p className="py-10 text-center text-[13px] text-ink-mute">Ninguna receptora cumple la configuración. Baja la rentabilidad objetivo, sube la PD máxima o cambia de perfil.</p></Card>}
            {view === "portfolio" && shown.positions.length > 0 && tab === "map" && (
              <Card title={`Cartera · ${shown.positions.length} receptoras`} sub={`a ${monthLabelLong(shown.config.asOf).toLowerCase()} · área = capital · color = score · pincha para verla en el visor`}>
                <Treemap items={shown.positions.map((p) => ({ id: p.id, name: p.name, value: p.amount, score: p.score, sub: `${pct(p.pricing.rate)} · PD ${pct(p.pricing.pd, 0)}`, dimmed: openCompany != null && inChest.has(openCompany) && openCompany !== p.id }))} onSelect={(id) => setOpenCompany(id)} selected={openCompany} />
              </Card>
            )}
            {view === "portfolio" && shown.positions.length > 0 && tab === "distribution" && (
              <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                <Card title="Capital por tramo de score"><Bins bins={shown.histogram.map((b) => ({ from: b.from, to: b.to, value: b.weight }))} height={150} fmt={(v) => `${(v * 100).toFixed(0)} % del capital`} marker={shown.avgScore} markerLabel={`media ${shown.avgScore.toFixed(0)}`} />
                  <div className="mt-4 flex h-2.5 w-full overflow-hidden rounded-full">{(["prime", "healthy", "watch", "risk"] as Tier[]).map((t) => shown.tiers[t] > 0 && <div key={t} style={{ width: `${shown.tiers[t] * 100}%`, background: scoreColor(t === "prime" ? 88 : t === "healthy" ? 74 : t === "watch" ? 55 : 30) }} />)}</div>
                  <div className="mt-2 flex flex-wrap gap-4 text-[12px] text-ink-mute">{(["prime", "healthy", "watch", "risk"] as Tier[]).map((t) => shown.tiers[t] > 0 && <span key={t}>{TIER_LABEL[t]} <span className="num text-ink">{(shown.tiers[t] * 100).toFixed(0)} %</span></span>)}</div>
                </Card>
                <Card title="Cómo se ha construido" sub="las reglas que producen exactamente esta cartera">
                  <div className="grid grid-cols-2 gap-4"><Stat big label="Mayor posición" value={`${(shown.topWeight * 100).toFixed(1)} %`} hint={`tope ${Math.round(config.maxExposure * 100)} %`} /><Stat big label="Grupos distintos" value={String(shown.groups)} hint={`máx. ${config.maxPerGroup} por grupo`} /><Stat big label="Rango de score" value={`${shown.minScore.toFixed(0)}–${shown.maxScore.toFixed(0)}`} hint={`suelo ${config.minScore}`} /><Stat big label="Rango de tipo" value={`${pct(Math.min(...shown.positions.map((p) => p.pricing.rate)))}–${pct(Math.max(...shown.positions.map((p) => p.pricing.rate)))}`} hint="peor score ⇒ más tipo" /></div>
                  <p className="mt-4 border-t border-line-soft pt-3 text-[12px] leading-relaxed text-ink-mute">Ranking = {Math.round(preset.wScore * 100)} % score · {Math.round(preset.wMomentum * 100)} % momentum · {Math.round(preset.wStability * 100)} % estabilidad · {Math.round(preset.wReturn * 100)} % rendimiento neto, × (1 − {OVERLAP_PENALTY} × solapamiento con el prestamista). Pesos ∝ rango^{preset.gamma}, tope {Math.round(config.maxExposure * 100)} %. Tipo = 2,5 % base + PD anual × 10 % LGD (el evento es estrés, no quiebra) + margen por banda; PD de la calibración medida del score a {config.term} meses.</p>
                </Card>
              </div>
            )}
            {view === "portfolio" && shown.positions.length > 0 && tab === "crew" && (
              <Card title="Posiciones" sub="ordenadas por rango · pincha para verla en el visor">
                <div className="grid grid-cols-[28px_minmax(0,1fr)_56px_64px_64px_70px_90px] gap-2 border-b border-line-soft pb-2 text-[12px] font-medium text-ink-mute"><span>#</span><span>Empresa</span><span className="text-right">Score</span><span className="text-right">Tipo</span><span className="text-right">PD</span><span className="text-right">Neto</span><span className="text-right">Importe</span></div>
                <div className="divide-y divide-line-soft">{shown.positions.map((p) => <button type="button" key={p.id} onClick={() => setOpenCompany(p.id)} className={`grid w-full grid-cols-[28px_minmax(0,1fr)_56px_64px_64px_70px_90px] items-center gap-2 py-2 text-left text-[13px] hover:bg-panel-2 ${openCompany === p.id ? "bg-panel-2" : ""}`}><span className="num text-ink-mute">{p.rank}</span><span className="min-w-0"><span className="block truncate text-ink">{p.name}</span></span><span className="num text-right font-medium" style={{ color: scoreColor(p.score) }}>{p.score.toFixed(0)}</span><span className="num text-right text-ink">{pct(p.pricing.rate)}</span><span className="num text-right text-ink-dim">{pct(p.pricing.pd, 0)}</span><span className={`num text-right ${p.pricing.netYield >= config.targetReturn ? "text-good" : "text-warn"}`}>{pct(p.pricing.netYield)}</span><span className="num text-right font-medium text-ink">{fmtMoney(p.amount)}</span></button>)}</div>
              </Card>
            )}
          </>
        )}
      </section>
      <CompanyViewer mode="borrower" term={config.term} />
    </div>
  );
}

type Step = { title: string; detail: string; value: string; tone?: "bad" | "good" };
const preset0 = (r: RiskTolerance) => RISK_PRESETS[r];

/** Los pasos del cálculo, con la cifra real que produce cada uno en esta configuración. */
function processSteps(r: PortfolioResult, cfg: typeof DEFAULT_CFG, preset: (typeof RISK_PRESETS)["balanced"]): Step[] {
  const f = r.funnel, e = r.economics;
  const rates = r.positions.map((p) => p.pricing.rate);
  return [
    { title: "Universo", detail: `empresas con score en ${monthLabelLong(cfg.asOf).toLowerCase()}`, value: `${f.scored}` },
    { title: "Fuera el prestamista y su grupo", detail: "no se financia a sí mismo ni a sus filiales", value: `−${f.related}`, tone: "bad" },
    { title: "Fuera el 20 % peor de la red", detail: "empresas en alerta este mes", value: `−${f.alerted}`, tone: "bad" },
    { title: `Más de ${preset.maxStress} alarma de estrés`, detail: "descubiertos, coste disparado, cobros vencidos…", value: `−${f.stressed}`, tone: "bad" },
    { title: "Menos de 6 meses de historia", detail: "sin trayectoria no hay señal", value: `−${f.history}`, tone: "bad" },
    { title: `Score < ${cfg.minScore}`, detail: `suelo del perfil ${preset.label.toLowerCase()}`, value: `−${f.belowScore}`, tone: "bad" },
    { title: `PD a ${cfg.term} meses > ${pct(cfg.maxPd, 0)}`, detail: "probabilidad de evento de la calibración medida del score", value: `−${f.abovePd}`, tone: "bad" },
    { title: `Rendimiento neto < ${pct(cfg.targetReturn)}`, detail: "tras pérdida esperada y comisión, no compensa", value: `−${f.belowReturn}`, tone: "bad" },
    { title: "Elegibles", detail: "candidatas que superan todos los filtros", value: `${f.eligible}`, tone: "good" },
    { title: "Ranking", detail: `${Math.round(preset.wScore * 100)} % score · ${Math.round(preset.wMomentum * 100)} % momentum · ${Math.round(preset.wStability * 100)} % estabilidad · ${Math.round(preset.wReturn * 100)} % rendimiento · −${Math.round(OVERLAP_PENALTY * 100)} % si se parece al prestamista`, value: `${f.eligible} ordenadas` },
    { title: "Selección", detail: `máx. ${cfg.maxPerGroup} por grupo · capital ÷ ticket ${fmtMoney(cfg.ticket)} · tope ${cfg.targetPositions} posiciones`, value: `${r.positions.length} receptoras`, tone: "good" },
    { title: "Pesos", detail: `∝ rango^${preset.gamma}, ninguna por encima del ${Math.round(cfg.maxExposure * 100)} %`, value: `mayor ${(r.topWeight * 100).toFixed(1)} %` },
    { title: "Precio", detail: `${pct(0.025)} base + PD anual × 10 % LGD + margen por banda`, value: rates.length ? `${pct(Math.min(...rates))} – ${pct(Math.max(...rates))}` : "—" },
    { title: "Cartera", detail: `${fmtMoney(r.allocated)} asignados · rendimiento neto ${pct(e.netYield)} · PD media ${pct(e.avgPd)}`, value: fmtMoney(r.allocated), tone: "good" },
  ];
}

function Process({ steps, step }: { steps: Step[]; step: number }) {
  return (
    <Card title="Calculando la cartera" sub="cada paso, con lo que hace y lo que deja">
      <div className="space-y-1">
        {steps.map((s, i) => {
          const done = i < step, cur = i === step;
          return (
            <div key={s.title} className={`flex items-center gap-3 rounded-lg px-3 py-2 transition-all duration-300 ${cur ? "bg-panel-2" : ""} ${done || cur ? "opacity-100" : "opacity-25"}`}>
              <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] ${done ? "bg-good/20 text-good" : cur ? "animate-pulse bg-ink text-panel" : "bg-panel-2 text-ink-mute"}`}>{done ? "✓" : i + 1}</span>
              <div className="min-w-0 flex-1"><div className="text-[13.5px] font-medium text-ink">{s.title}</div><div className="truncate text-[12px] text-ink-mute">{s.detail}</div></div>
              <span className={`num shrink-0 text-[14px] font-semibold ${!(done || cur) ? "text-transparent" : s.tone === "bad" ? "text-bad" : s.tone === "good" ? "text-good" : "text-ink"}`}>{s.value}</span>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
