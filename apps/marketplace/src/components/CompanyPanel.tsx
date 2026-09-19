import { useMemo } from "react";
import { motion } from "framer-motion";
import { AlertTriangle, Check, Coins, ShieldCheck, Sparkles, X } from "lucide-react";
import { useNetwork, useCompany } from "@/hooks/useNetwork";
import { useApp } from "@/store/app";
import { RadarChart } from "@/components/charts/RadarChart";
import { Sparkline } from "@/components/charts/Sparkline";
import { ScoreHistory } from "@/components/charts/ScoreHistory";
import { AutoSize } from "@/components/ui/AutoSize";
import { TrendPill } from "@/components/ui/TrendPill";
import { Badge, Button, Eyebrow, Skeleton } from "@/components/ui/primitives";
import { assessProvider, assessReceiver, componentPercentiles, componentRanks, declineStreak, momentum, percentile, riseStreak, scoreVolatility, tier, TIER_LABEL, trend } from "@/lib/derived";
import { scoreColor, DIM_COLOR } from "@/lib/colors";
import { DIM_LABEL, fmtDelta, fmtMetric, fmtMonth, METRIC_META, parseExplanation, parseExplanationV2, STRESS_LABEL } from "@/lib/format";
import type { MetricId, StressFlag } from "@/lib/types";
import { DIMENSIONS } from "@/lib/types";

interface Props {
  id: string;
  onClose?: () => void;
  onLend?: (id: string) => void;
}

/** Everything we computed for one company, on one screen: spider chart of the five dimensions with the
 *  health score in the centre, derived indicators, the 24 base metrics, stress flags and the verdicts. */
export function CompanyPanel({ id, onClose, onLend }: Props) {
  const { data } = useNetwork();
  const { detail } = useCompany(id);
  const lenderId = useApp((s) => s.lenderId);
  const c = useMemo(() => data?.companies.find((x) => x.id === id) ?? null, [data, id]);
  const months = data?.meta.months ?? [];
  const idx = months.length - 1;
  const all = useMemo(() => data?.companies.map((x) => x.latest.score) ?? [], [data]);
  const ranks = useMemo(() => (data ? componentRanks(data.companies) : null), [data]);
  const provider = useMemo(() => (c ? assessProvider(c, months, all) : null), [c, months, all]);
  const receiver = useMemo(() => (c ? assessReceiver(c, months) : null), [c, months]);
  if (!data || !c || !provider || !receiver || !ranks) return <PanelSkeleton />;

  const s = c.latest.score;
  const color = scoreColor(s);
  const axes = componentPercentiles(c.latest.components, ranks);
  const tr = trend(c.scores, idx);
  const mom = momentum(c.scores, idx);
  const d6 = idx - 6 >= 0 && c.scores[idx - 6] != null ? s - c.scores[idx - 6]! : null;
  const vol = scoreVolatility(c.scores, idx);
  const pct = Math.min(99, percentile(all, s));
  const ds = declineStreak(c.scores, idx), rs = riseStreak(c.scores, idx);
  const ex = parseExplanation(c.latest.explanation);
  const ex2 = parseExplanationV2(c.latest.explanationV2);
  const activeFlags = (Object.keys(STRESS_LABEL) as StressFlag[]).filter((f) => c.latest.stress[f] === 1);
  const isLender = lenderId === c.id;

  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      {/* header */}
      <div className="card flex shrink-0 items-center gap-4 px-4 py-2.5">
        <div className="min-w-0">
          <div className="flex items-baseline gap-3">
            <h1 className="truncate font-display text-[26px] leading-none">{c.name}</h1>
            <span className="font-mono text-[11px] text-faint">{c.id}{c.group ? ` · ${c.group}` : ""}{c.groupSize && c.groupSize > 1 ? ` (${c.groupSize} companies)` : ""}</span>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <TrendPill trend={tr} delta={mom} />
          <Badge tone={tier(s) === "prime" || tier(s) === "healthy" ? "positive" : tier(s) === "watch" ? "warn" : "negative"}>{TIER_LABEL[tier(s)]}</Badge>
          {c.latest.alert === 1 && <Badge tone="negative" dot>Bottom 20%</Badge>}
          {provider.qualified && <Badge tone="accent"><ShieldCheck size={11} />Can lend</Badge>}
          {receiver.eligible && receiver.need >= 25 && <Badge tone="accent"><Sparkles size={11} />Could borrow</Badge>}
          {c.country && <Badge>{c.country}</Badge>}
          {c.currency && c.currency !== "EUR" && <Badge>{c.currency}</Badge>}
          {c.erp && <Badge>{c.erp}</Badge>}
        </div>
        <div className="ml-auto flex items-center gap-2">
          {onLend && (isLender ? <Badge tone="accent"><Coins size={11} />Lending as this company</Badge> : provider.qualified && <Button size="sm" onClick={() => onLend(c.id)}><Coins size={13} />Lend as {c.name.split(" ")[0]}</Button>)}
          {onClose && <button onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-[4px] border border-line-strong text-muted hover:text-fg" aria-label="Close"><X size={14} /></button>}
        </div>
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-[400px_1fr] gap-3">
        {/* spider + derived */}
        <div className="card flex min-h-0 flex-col items-center p-3">
          <Eyebrow>Financial health · {fmtMonth(c.latest.month, "long")}</Eyebrow>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="-mt-1"><RadarChart axes={axes} contributions={c.latest.components} score={s} width={376} height={318} /></motion.div>
          <div className="w-full border-t border-line pt-2">
            <div className="grid grid-cols-4 gap-2">
              <KV label="Percentile" value={`${pct.toFixed(0)}th`} />
              <KV label="6-mo change" value={fmtDelta(d6)} color={d6 == null ? undefined : d6 >= 0 ? "#2d6a4f" : "#8b1e2d"} />
              <KV label="Volatility σ" value={vol == null ? "—" : vol.toFixed(1)} />
              <KV label="Streak" value={ds >= 2 ? `↓ ${ds} mo` : rs >= 2 ? `↑ ${rs} mo` : "—"} color={ds >= 2 ? "#8b1e2d" : rs >= 2 ? "#2d6a4f" : undefined} />
            </div>
            <div className="mt-2 flex items-center gap-3">
              <Sparkline values={c.scores} color={color} width={150} height={30} animate={false} />
              <div className="min-w-0 flex-1 text-[11.5px] leading-snug text-fg-2">
                {ex ? <>Last month it <span className="font-semibold">{ex.delta >= 0 ? "rose" : "fell"} {Math.abs(ex.delta).toFixed(1)} pts</span>, driven by {DIM_LABEL[ex.dim].toLowerCase()}{ex2 && METRIC_META[ex2.metric] ? <> — <span className="font-semibold">{METRIC_META[ex2.metric].label}</span> {fmtMetric(ex2.metric, ex2.from)} → {fmtMetric(ex2.metric, ex2.to)}</> : null}.</> : <>{c.nScored} months scored since {fmtMonth(c.firstMonth, "long")}.</>}
              </div>
            </div>
            <div className="mt-2 grid grid-cols-2 gap-2">
              <div className={`inset px-2.5 py-1.5 ${provider.qualified ? "border-accent/60" : ""}`}>
                <div className="flex items-center justify-between"><Eyebrow className="text-accent">Lender capacity</Eyebrow><span className="tnum font-caps text-lg font-bold leading-none">{provider.capacity}</span></div>
                <div className="mt-1 text-[10.5px] leading-snug text-fg-2">{provider.qualified ? provider.reasons.slice(0, 2).join(" · ") : provider.blockers[0]}</div>
              </div>
              <div className={`inset px-2.5 py-1.5 ${receiver.eligible && receiver.need >= 25 ? "border-accent-2/60" : ""}`}>
                <div className="flex items-center justify-between"><Eyebrow className="text-accent-2">Financing need</Eyebrow><span className="tnum font-caps text-lg font-bold leading-none">{receiver.need}</span></div>
                <div className="mt-1 text-[10.5px] leading-snug text-fg-2">{receiver.eligible ? (receiver.needSignals[0] ?? "No capital-need signal this month") : receiver.risks[0]}</div>
              </div>
            </div>
          </div>
        </div>

        {/* all metrics */}
        <div className="card flex min-h-0 min-w-0 flex-col p-3">
          <div className="flex items-center justify-between">
            <Eyebrow>All computed metrics · 24 base metrics ({detail ? detail.metricMonths.length : "…"} months) + trajectory · 8 stress flags</Eyebrow>
            <div className="text-[10px] italic text-muted">value at {fmtMonth(c.latest.month)} · sparkline = full history · ▲▼ = pipeline delta_3m / delta_12m (green = better) · racha = months worsening · n/a = not measurable (no invoices / debt data)</div>
          </div>
          {!detail ? (
            <div className="mt-2 grid flex-1 grid-cols-5 gap-2">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-full" />)}</div>
          ) : (
            <div className="mt-2 grid shrink-0 grid-cols-5 gap-2">
              {DIMENSIONS.map((dim) => {
                const ids = (Object.keys(METRIC_META) as MetricId[]).filter((m) => METRIC_META[m].dim === dim);
                return (
                  <div key={dim} className="inset flex min-h-0 flex-col px-2 py-1.5">
                    <div className="flex items-center justify-between border-b border-line pb-1">
                      <div className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full" style={{ background: DIM_COLOR[dim] }} /><span className="font-display text-[14px]">{DIM_LABEL[dim]}</span></div>
                      <span className="tnum font-caps text-[11px] font-bold" style={{ color: (c.latest.components[dim] ?? 0) >= 0 ? "#2d6a4f" : "#8b1e2d" }}>{fmtDelta(c.latest.components[dim], 1)}</span>
                    </div>
                    <div className="min-h-0 flex-1 divide-y divide-line">
                      {ids.map((m) => {
                        const meta = METRIC_META[m];
                        const series = detail.metrics[m];
                        const li = detail.metricMonths.indexOf(c.latest.month);
                        const last = li >= 0 ? series[li] : series[series.length - 1];
                        // trajectory as computed by the pipeline (metrics_v1.parquet: __delta_3m, __delta_12m, __racha)
                        const tr = detail.trajectory[m];
                        const d3 = tr?.delta3 ?? null, d12 = tr?.delta12 ?? null, streak = tr?.streak ?? 0;
                        const good3 = d3 == null ? null : meta.higherIsBetter ? d3 > 0 : d3 < 0;
                        const good12 = d12 == null ? null : meta.higherIsBetter ? d12 > 0 : d12 < 0;
                        const vals = series.filter((v): v is number => v != null);
                        const lo = vals.length ? Math.min(...vals) : 0, hi = vals.length ? Math.max(...vals) : 1;
                        return (
                          <div key={m} className="py-1.5" title={meta.hint}>
                            <div className="flex items-baseline justify-between gap-2">
                              <div className="min-w-0 truncate text-[12.5px] leading-tight text-fg">{meta.label}</div>
                              <div className={`tnum font-caps shrink-0 text-[13px] font-bold leading-tight ${last == null ? "text-faint" : ""}`}>{last == null ? "n/a" : fmtMetric(m, last)}</div>
                            </div>
                            <div className="hidden truncate text-[9.5px] italic leading-tight text-muted [@media(min-height:800px)]:block">{meta.hint}</div>
                            {last != null && (
                              <div className="mt-1 flex items-center gap-2">
                                <Sparkline values={series} domain={[lo === hi ? lo - 1 : lo, hi === lo ? hi + 1 : hi]} width={52} height={16} color={DIM_COLOR[dim]} animate={false} className="shrink-0" />
                                <div className="flex min-w-0 flex-wrap gap-x-2 font-caps text-[9px] leading-none text-muted">
                                  <span>3m <span className="tnum" style={{ color: d3 == null ? undefined : good3 ? "#2d6a4f" : "#8b1e2d" }}>{d3 == null ? "—" : `${d3 > 0 ? "▲" : "▼"}${fmtMetric(m, Math.abs(d3))}`}</span></span>
                                  <span>12m <span className="tnum" style={{ color: d12 == null ? undefined : good12 ? "#2d6a4f" : "#8b1e2d" }}>{d12 == null ? "—" : `${d12 > 0 ? "▲" : "▼"}${fmtMetric(m, Math.abs(d12))}`}</span></span>
                                  {streak >= 2 && <span className="text-negative">worse {streak} mo</span>}
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          {/* score route */}
          <div className="mt-2 hidden min-h-[110px] min-w-0 flex-1 flex-col border-t border-line pt-2 [@media(min-height:800px)]:flex">
            <div className="flex items-center justify-between"><Eyebrow>Score history · {fmtMonth(c.firstMonth)} → {fmtMonth(c.lastMonth)}</Eyebrow><span className="text-[10px] italic text-muted">hover for the monthly explanation · ✕ = latest</span></div>
            <div className="min-h-0 flex-1"><AutoSize>{(w, h) => <ScoreHistory width={w} height={h} points={months.map((m, i) => ({ month: m, score: c.scores[i], alert: c.alerts[i] === 1, note: detail ? noteFor(detail.explanation[detail.months.indexOf(m)]) : null }))} />}</AutoSize></div>
          </div>
          {/* stress flags */}
          <div className="mt-2 flex shrink-0 items-center gap-2 border-t border-line pt-2">
            <Eyebrow className="shrink-0">Stress flags</Eyebrow>
            <div className="grid flex-1 grid-cols-8 gap-1.5">
              {(Object.keys(STRESS_LABEL) as StressFlag[]).map((f) => {
                const on = c.latest.stress[f] === 1;
                const n = (detail?.stress[f] ?? []).filter((v) => v === 1).length;
                return (
                  <div key={f} className={`rounded-[3px] border px-1.5 py-1 text-[10px] leading-tight ${on ? "border-negative/60 bg-negative/10 text-negative" : "border-line bg-surface-2 text-fg-2"}`}>
                    <div className="flex items-center justify-between font-caps text-[8.5px] text-muted"><span>{f.slice(0, 2)}</span>{on ? <AlertTriangle size={9} className="text-negative" /> : n > 0 ? <span className="tnum">{n}×</span> : <Check size={9} className="text-positive" />}</div>
                    <div className="truncate">{STRESS_LABEL[f]}</div>
                  </div>
                );
              })}
            </div>
          </div>
          {activeFlags.length > 0 && <div className="mt-1 text-[10.5px] text-negative">Active now: {activeFlags.map((f) => STRESS_LABEL[f]).join(" · ")}</div>}
        </div>
      </div>
    </div>
  );
}

function noteFor(e: string | null | undefined): string | null {
  const p = parseExplanation(e);
  return p ? `${p.delta >= 0 ? "▲" : "▼"} ${Math.abs(p.delta).toFixed(1)} pts · ${DIM_LABEL[p.dim]}` : null;
}

function KV({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="min-w-0">
      <Eyebrow className="truncate">{label}</Eyebrow>
      <div className="tnum font-caps text-[15px] font-bold leading-none" style={{ color }}>{value}</div>
    </div>
  );
}

function PanelSkeleton() {
  return (
    <div className="flex h-full flex-col gap-3">
      <Skeleton className="h-12 w-full" />
      <div className="grid min-h-0 flex-1 grid-cols-[400px_1fr] gap-3"><Skeleton className="h-full" /><Skeleton className="h-full" /></div>
    </div>
  );
}
