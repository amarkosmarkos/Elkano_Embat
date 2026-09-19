import Link from "next/link";
import { notFound } from "next/navigation";
import { getStore } from "@/lib/data/store";
import { currentMonth } from "@/lib/data/month";
import { getBundle } from "@/lib/data/company";
import { ScoreRing } from "@/components/ui/ScoreRing";
import { Pill } from "@/components/ui/Pill";
import SubTabs from "@/components/shell/SubTabs";
import { COMPANY_TABS } from "@/components/shell/nav";
import { scoreAt, tier, trend, TIER_LABEL, TREND_LABEL, momentum } from "@/lib/score/derived";
import { parseExplanation, parseExplanationV2, DIM_LABEL, METRICS } from "@/lib/score/meta";
import { monthLabelLong, fmtMetric } from "@/lib/format";

export default async function CompanyLayout({ children, params }: { children: React.ReactNode; params: Promise<{ id: string }> }) {
  const { id } = await params;
  const store = await getStore();
  const { idx, month } = await currentMonth(store.months);
  const b = await getBundle(id, idx);
  if (!b) notFound();
  const { c, d } = b;
  const s = c.scores[idx];
  const eff = scoreAt(c.scores, idx);
  const t = tier(eff), tr = trend(c.scores, idx);
  const mom = momentum(c.scores, idx);
  const di = d.months.indexOf(month);
  const ex = di >= 0 ? parseExplanation(d.explanation[di]) : null;
  const ex2 = di >= 0 ? parseExplanationV2(d.explanationV2[di]) : null;
  const nStress = c.stress[idx] ?? 0;
  return (
    <>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-6">
        <div className="flex items-start gap-6">
          <ScoreRing score={s} size={128} label={s == null ? "sin score" : TIER_LABEL[t]} sub={`${monthLabelLong(month).slice(0, 3).toLowerCase()} ${month.slice(0, 4)}`} />
          <div className="min-w-0 pt-1">
            <div className="num text-[11.5px] text-ink-mute">{c.id}{c.group ? <> · <Link href={`/grupos/${c.group}`} className="hover:text-accent">{c.group}</Link>{c.groupSize ? ` (${c.groupSize} empresas)` : ""}</> : null}{c.erp ? ` · ${c.erp}` : ""}{c.country ? ` · ${c.country}` : ""}{c.currency && c.currency !== "EUR" ? ` · ${c.currency}` : ""}</div>
            <h1 className="mt-1 text-[24px] font-bold leading-tight tracking-[-0.6px] text-ink">{c.name}</h1>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <Pill tone={tr === "improving" ? "good" : tr === "deteriorating" ? "bad" : "neutral"}>{TREND_LABEL[tr]}</Pill>
              {mom != null && <Pill mono tone={mom >= 0 ? "good" : "bad"}>{mom >= 0 ? "+" : "−"}{Math.abs(mom).toFixed(1)} en 3 meses</Pill>}
              {c.alerts[idx] === 1 && <Pill tone="bad">20 % peor de la red</Pill>}
              {nStress > 0 && <Pill tone="warn">{nStress} alarma{nStress > 1 ? "s" : ""} de estrés</Pill>}
            </div>
            {(ex || ex2) && (
              <p className="mt-3 max-w-2xl text-[14px] leading-relaxed text-ink-dim">
                {ex && <>Este mes el score <span className={ex.delta >= 0 ? "text-good" : "text-bad"}>{ex.delta >= 0 ? "sube" : "baja"} {Math.abs(ex.delta).toFixed(1)} pts</span> y el motivo es <span className="text-ink">{DIM_LABEL[ex.dim].toLowerCase()}</span>.</>}
                {ex2 && <> La métrica que más se mueve: <span className="text-ink">{METRICS[ex2.metric]?.label ?? ex2.metric}</span> {fmtMetric(ex2.metric, ex2.from)} → {fmtMetric(ex2.metric, ex2.to)}.</>}
              </p>
            )}
            {s == null && <p className="mt-3 text-[13px] text-warn">Sin score en {monthLabelLong(month)}: la empresa empieza a puntuar en {c.firstMonth} (necesita 6 meses de historia).</p>}
          </div>
        </div>
      </div>
      <SubTabs tabs={COMPANY_TABS(id)} />
      <div className="mt-6">{children}</div>
    </>
  );
}
