import { useMemo, useState } from "react";
import { Link, useParams } from "react-router";
import { motion } from "framer-motion";
import { ArrowLeft, Check, X, AlertTriangle, ShieldCheck, Sparkles } from "lucide-react";
import { useNetwork, useCompany } from "@/hooks/useNetwork";
import { useApp } from "@/store/app";
import { ScoreRing } from "@/components/ui/ScoreRing";
import { ScoreHistory } from "@/components/charts/ScoreHistory";
import { ComponentBars } from "@/components/charts/ComponentBars";
import { ComponentHistory } from "@/components/charts/ComponentHistory";
import { Sparkline } from "@/components/charts/Sparkline";
import { AutoSize } from "@/components/ui/AutoSize";
import { TrendPill } from "@/components/ui/TrendPill";
import { AnimatedNumber } from "@/components/ui/AnimatedNumber";
import { Badge, Eyebrow, PanelHead, Segmented, Skeleton } from "@/components/ui/primitives";
import { assessProvider, assessReceiver, mainDriver, momentum, percentile, scoreVolatility, tier, TIER_LABEL, trend } from "@/lib/derived";
import { scoreColor, DIM_COLOR } from "@/lib/colors";
import { DIM_DESC, DIM_LABEL, fmtDelta, fmtMetric, fmtMonth, METRIC_META, parseExplanation, parseExplanationV2, STRESS_LABEL } from "@/lib/format";
import type { Dimension, MetricId, StressFlag } from "@/lib/types";
import { DIMENSIONS } from "@/lib/types";

type Tab = "overview" | "history" | "metrics";

export function CompanyProfile() {
  const { id } = useParams();
  const { data } = useNetwork();
  const { detail } = useCompany(id);
  const globalPerspective = useApp((s) => s.perspective);
  const [override, setOverride] = useState<"provider" | "receiver" | null>(null);
  const [highlight, setHighlight] = useState<Dimension | null>(null);
  const [tab, setTab] = useState<Tab>("overview");

  const c = useMemo(() => data?.companies.find((x) => x.id === id) ?? null, [data, id]);
  const months = data?.meta.months ?? [];
  const idx = months.length - 1;
  const all = useMemo(() => data?.companies.map((x) => x.latest.score) ?? [], [data]);
  const provider = useMemo(() => (c ? assessProvider(c, months, all) : null), [c, months, all]);
  const receiver = useMemo(() => (c ? assessReceiver(c, months) : null), [c, months]);
  const perspective = override ?? (provider?.qualified ? "provider" : receiver?.eligible && (receiver.need ?? 0) >= 25 ? "receiver" : globalPerspective);

  if (!data || !c || !provider || !receiver) return <ProfileSkeleton />;

  const s = c.latest.score;
  const color = scoreColor(s);
  const tr = trend(c.scores, idx);
  const mom = momentum(c.scores, idx);
  const d6 = idx - 6 >= 0 && c.scores[idx - 6] != null ? s - c.scores[idx - 6]! : null;
  const vol = scoreVolatility(c.scores, idx);
  const pct = Math.min(99, percentile(all, s));
  const driver = mainDriver(c.latest.components);
  const ex = parseExplanation(c.latest.explanation);
  const ex2 = parseExplanationV2(c.latest.explanationV2);
  const activeFlags = (Object.keys(STRESS_LABEL) as StressFlag[]).filter((f) => c.latest.stress[f] === 1);
  const historyPoints = months.map((m, i) => ({ month: m, score: c.scores[i], alert: c.alerts[i] === 1, note: detail ? explanationNote(detail.explanation[detail.months.indexOf(m)]) : null }));

  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      {/* header bar */}
      <div className="card flex shrink-0 items-center gap-4 px-4 py-2.5">
        <Link to="/" className="font-caps flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted hover:text-fg"><ArrowLeft size={14} /> Network</Link>
        <div className="h-6 w-px bg-line-strong" />
        <div className="min-w-0">
          <div className="flex items-baseline gap-3">
            <h1 className="truncate font-display text-[26px] leading-none">{c.name}</h1>
            <span className="font-mono text-[11px] text-faint">{c.id}{c.group ? ` · ${c.group}` : ""}</span>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <TrendPill trend={tr} delta={mom} />
          <Badge tone={tier(s) === "prime" || tier(s) === "healthy" ? "positive" : tier(s) === "watch" ? "warn" : "negative"}>{TIER_LABEL[tier(s)]}</Badge>
          {c.latest.alert === 1 && <Badge tone="negative" dot>Bottom 20%</Badge>}
          {c.country && <Badge>{c.country}</Badge>}
          {c.currency && c.currency !== "EUR" && <Badge>{c.currency}</Badge>}
          {c.erp && <Badge>{c.erp}</Badge>}
        </div>
        <div className="ml-auto flex items-center gap-2">
          <Segmented value={perspective} onChange={(v) => setOverride(v)} size="sm" options={[{ value: "provider", label: "As lender" }, { value: "receiver", label: "As borrower" }]} />
          <Segmented value={tab} onChange={setTab} size="sm" options={[{ value: "overview", label: "Overview" }, { value: "history", label: "History" }, { value: "metrics", label: "Metrics" }]} />
        </div>
      </div>

      {tab === "overview" && (
        <div className="grid min-h-0 flex-1 grid-rows-[minmax(0,1.4fr)_minmax(0,1fr)] gap-3">
          <div className="grid min-h-0 grid-cols-[260px_1fr_1.15fr] gap-3">
            {/* score */}
            <div className="card flex min-h-0 flex-col items-center p-4">
              <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.6 }}>
                <ScoreRing score={s} size={176} stroke={11} label="Financial health" sublabel={fmtMonth(c.latest.month, "long")} />
              </motion.div>
              <div className="mt-3 w-full space-y-1.5 border-t border-line pt-3">
                <KV label="Percentile of network" value={<><AnimatedNumber value={pct} /><span className="text-[10px] text-faint">th</span></>} />
                <KV label="6-month change" value={fmtDelta(d6)} color={d6 == null ? undefined : d6 >= 0 ? "#2d6a4f" : "#8b1e2d"} />
                <KV label="Score volatility (σ)" value={vol == null ? "—" : vol.toFixed(1)} />
              </div>
              <div className="mt-auto hidden w-full pt-2 text-[10px] italic leading-snug text-faint [@media(min-height:800px)]:block">Score = 100 − probability (%) of a stress event in the next 3–6 months · {c.nScored} months scored</div>
            </div>
            {/* why + components */}
            <div className="card flex min-h-0 flex-col p-4">
              <Eyebrow>Why this score</Eyebrow>
              <div className="mt-1.5 space-y-1 text-[12.5px] leading-snug">
                {driver && (
                  <div className="flex items-start gap-2"><span className="mt-1.5 h-2 w-2 shrink-0 rounded-full" style={{ background: DIM_COLOR[driver.dim] }} /><div><span className="font-semibold">{DIM_LABEL[driver.dim]}</span> is the dominant factor: it {driver.value >= 0 ? "adds" : "removes"} <span className="tnum font-caps font-bold" style={{ color: driver.value >= 0 ? "#2d6a4f" : "#8b1e2d" }}>{Math.abs(driver.value).toFixed(1)} pts</span>.</div></div>
                )}
                {ex && <div className="flex items-start gap-2"><span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-ink/40" /><div>Last month it <span className="font-semibold">{ex.delta >= 0 ? "rose" : "fell"} {Math.abs(ex.delta).toFixed(1)} pts</span>, driven by {DIM_LABEL[ex.dim].toLowerCase()}.</div></div>}
                {ex2 && METRIC_META[ex2.metric] && <div className="flex items-start gap-2"><span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-ink/40" /><div>Underlying metric: <span className="font-semibold">{METRIC_META[ex2.metric].label}</span> moved <span className="tnum">{fmtMetric(ex2.metric, ex2.from)} → {fmtMetric(ex2.metric, ex2.to)}</span>.</div></div>}
                {activeFlags.length > 0 ? (
                  <div className="flex items-start gap-2 text-negative"><AlertTriangle size={13} className="mt-0.5 shrink-0" /><div>{activeFlags.map((f) => STRESS_LABEL[f]).join(" · ")}</div></div>
                ) : (
                  <div className="flex items-start gap-2 text-positive"><ShieldCheck size={13} className="mt-0.5 shrink-0" /><div>No stress flags active this month.</div></div>
                )}
              </div>
              <div className="mt-2 border-t border-line pt-2">
                <Eyebrow>Score components · {fmtMonth(c.latest.month)}</Eyebrow>
                <div className="mt-1.5"><ComponentBars components={c.latest.components} compact highlight={highlight} onSelect={(d) => setHighlight(highlight === d ? null : d)} /></div>
                <div className="mt-1.5 hidden text-[11px] italic leading-snug text-muted [@media(min-height:800px)]:block">{highlight ? <><span className="font-semibold not-italic text-fg">{DIM_LABEL[highlight]}</span> — {DIM_DESC[highlight]}</> : "Points each dimension adds (→) or removes (←) from the score, per the v3 model. Click a bar for its definition."}</div>
              </div>
            </div>
            {/* assessment */}
            {perspective === "provider" ? (
              <div className="card flex min-h-0 flex-col p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5"><ShieldCheck size={14} className="text-accent" /><Eyebrow className="text-accent">Why it could act as a lender</Eyebrow></div>
                  {provider.qualified ? <Badge tone="accent"><ShieldCheck size={11} />Qualified</Badge> : <Badge tone="warn">Not qualified</Badge>}
                </div>
                <div className="mt-1 flex items-end gap-2">
                  <div className="tnum font-caps text-4xl font-bold leading-none"><AnimatedNumber value={provider.capacity} /></div>
                  <div className="pb-0.5 text-[12px] italic text-muted">provider capacity index</div>
                </div>
                <ul className="mt-3 space-y-1 text-[13px] leading-snug">
                  {provider.reasons.map((r) => <li key={r} className="flex items-start gap-2"><Check size={13} className="mt-0.5 shrink-0 text-positive" />{r}</li>)}
                  {provider.blockers.map((r) => <li key={r} className="flex items-start gap-2 text-negative"><X size={13} className="mt-0.5 shrink-0" />{r}</li>)}
                </ul>
                <div className="mt-auto pt-2 text-[10px] italic leading-snug text-faint">Capacity = 45% score level · 20% stability · 20% liquidity signals (runway, cushion, overdraft days, liquidity contribution) · 15% momentum.</div>
              </div>
            ) : (
              <div className="card flex min-h-0 flex-col p-4">
                <div className="flex items-center gap-1.5"><Sparkles size={14} className="text-accent-2" /><Eyebrow className="text-accent-2">Why it could receive financing</Eyebrow></div>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  <DualGauge label="Financial health" value={s} color={color} hint={`score ${s.toFixed(0)}`} />
                  <DualGauge label="Financing need" value={receiver.need} color="#1e5f66" hint={`${receiver.needSignals.length} signal${receiver.needSignals.length === 1 ? "" : "s"}`} />
                </div>
                <div className="inset mt-2 px-3 py-1.5 text-[12px] leading-snug">
                  {receiver.eligible && receiver.need >= 25
                    ? <><span className="font-semibold text-accent-2">Healthy and in need of capital.</span> Needing financing is not a sign of weakness here: the score stays above the floor and payment behaviour holds.</>
                    : receiver.eligible ? <>Healthy, but no clear financing need is visible in this month's metrics.</> : <>Not eligible: the score or payment behaviour does not clear the financing floor.</>}
                </div>
                <div className="mt-2 grid min-h-0 flex-1 grid-cols-2 gap-3 overflow-hidden">
                  <div><Eyebrow>Positive factors</Eyebrow><ul className="mt-1 space-y-0.5 text-[12px] leading-snug">{receiver.strengths.map((r) => <li key={r} className="flex items-start gap-1.5"><Check size={12} className="mt-0.5 shrink-0 text-positive" />{r}</li>)}</ul></div>
                  <div>
                    <Eyebrow>Capital need signals</Eyebrow>
                    <ul className="mt-1 space-y-0.5 text-[12px] leading-snug">
                      {receiver.needSignals.map((r) => <li key={r} className="flex items-start gap-1.5"><span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-accent-2" />{r}</li>)}
                      {receiver.needSignals.length === 0 && <li className="italic text-muted">None visible this month.</li>}
                    </ul>
                    {receiver.risks.length > 0 && <ul className="mt-1 space-y-0.5 text-[12px]">{receiver.risks.map((r) => <li key={r} className="flex items-start gap-1.5 text-negative"><X size={12} className="mt-0.5 shrink-0" />{r}</li>)}</ul>}
                  </div>
                </div>
              </div>
            )}
          </div>
          {/* history */}
          <div className="card flex min-h-0 flex-col p-4">
            <PanelHead eyebrow="Score history" title={`${fmtMonth(c.firstMonth, "long")} → ${fmtMonth(c.lastMonth, "long")}`} right={<div className="flex items-center gap-3 text-[10px] italic text-muted"><span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-negative" />bottom-20% month</span><span>hover for the monthly explanation</span></div>} />
            <div className="mt-1 min-h-0 flex-1"><AutoSize>{(w, h) => <ScoreHistory points={historyPoints} width={w} height={h} />}</AutoSize></div>
          </div>
        </div>
      )}

      {tab === "history" && (
        <div className="grid min-h-0 flex-1 grid-rows-2 gap-3">
          <div className="card flex min-h-0 flex-col p-4">
            <PanelHead eyebrow="Score history" title="The route so far" right={<div className="text-[10px] italic text-muted">hover for the monthly explanation · X marks the latest month</div>} />
            <div className="mt-1 min-h-0 flex-1"><AutoSize>{(w, h) => <ScoreHistory points={historyPoints} width={w} height={h} />}</AutoSize></div>
          </div>
          <div className="card flex min-h-0 flex-col p-4">
            <PanelHead eyebrow="Components over time" title="Where the strength (or weakness) has been coming from" />
            <div className="mt-1 min-h-0 flex-1">{detail ? <AutoSize>{(w, h) => <ComponentHistory months={detail.months} components={detail.components} width={w} height={h} highlight={highlight} onHighlight={setHighlight} />}</AutoSize> : <Skeleton className="h-full w-full" />}</div>
          </div>
        </div>
      )}

      {tab === "metrics" && (
        <div className="grid min-h-0 flex-1 grid-rows-[minmax(0,1fr)_auto] gap-3">
          {!detail ? (
            <div className="grid grid-cols-5 gap-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-full" />)}</div>
          ) : (
            <div className="grid min-h-0 grid-cols-5 gap-3">
              {DIMENSIONS.map((dim) => {
                const ids = (Object.keys(METRIC_META) as MetricId[]).filter((m) => METRIC_META[m].dim === dim);
                const rows = ids.map((m) => ({ m, series: detail.metrics[m], last: detail.metrics[m][detail.metrics[m].length - 1] })).filter((r) => r.last != null);
                return (
                  <motion.div key={dim} className={`card flex min-h-0 flex-col p-3 transition-opacity ${highlight && highlight !== dim ? "opacity-60" : ""}`} onMouseEnter={() => setHighlight(dim)} onMouseLeave={() => setHighlight(null)} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full" style={{ background: DIM_COLOR[dim] }} /><span className="font-display text-[15px]">{DIM_LABEL[dim]}</span></div>
                      <span className="tnum font-caps text-xs font-bold" style={{ color: (c.latest.components[dim] ?? 0) >= 0 ? "#2d6a4f" : "#8b1e2d" }}>{fmtDelta(c.latest.components[dim], 1)}</span>
                    </div>
                    <div className="mt-1 divide-y divide-line">
                      {rows.length === 0 && <div className="py-2 text-[11px] italic text-muted">No data for this dimension (e.g. no invoices or no debt products connected).</div>}
                      {rows.map(({ m, series, last }) => {
                        const meta = METRIC_META[m];
                        const prev3 = series.length >= 4 ? series[series.length - 4] : null;
                        const d = prev3 != null && last != null ? last - prev3 : null;
                        const good = d == null ? null : meta.higherIsBetter ? d > 0 : d < 0;
                        const vals = series.filter((v): v is number => v != null);
                        const lo = Math.min(...vals), hi = Math.max(...vals);
                        return (
                          <div key={m} className="flex items-center gap-2 py-2">
                            <div className="min-w-0 flex-1"><div className="truncate text-[13px] text-fg">{meta.label}</div><div className="truncate text-[10px] italic leading-tight text-muted">{meta.hint}</div></div>
                            <Sparkline values={series} domain={[lo === hi ? lo - 1 : lo, hi === lo ? hi + 1 : hi]} width={56} height={18} color={DIM_COLOR[dim]} animate={false} />
                            <div className="w-16 text-right"><div className="tnum font-caps text-[13px] font-bold">{fmtMetric(m, last)}</div>{d != null && Math.abs(d) > 1e-6 && <div className="tnum text-[9px]" style={{ color: good ? "#2d6a4f" : "#8b1e2d" }}>{d > 0 ? "▲" : "▼"} 3m</div>}</div>
                          </div>
                        );
                      })}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
          <div className="card flex shrink-0 items-center gap-3 px-4 py-2.5">
            <Eyebrow>Stress flags</Eyebrow>
            <div className="grid flex-1 grid-cols-8 gap-2">
              {(Object.keys(STRESS_LABEL) as StressFlag[]).map((f) => {
                const on = c.latest.stress[f] === 1;
                const n = (detail?.stress[f] ?? []).filter((v) => v === 1).length;
                return (
                  <div key={f} className={`rounded-[3px] border px-2 py-1.5 text-[11px] leading-tight ${on ? "border-negative/60 bg-negative/10 text-negative" : "border-line bg-surface-2 text-fg-2"}`}>
                    <div className="flex items-center justify-between font-caps text-[9px] text-muted"><span>{f.slice(0, 2)}</span>{on ? <span className="h-1.5 w-1.5 rounded-full bg-negative" /> : n > 0 ? <span className="tnum">{n}× in history</span> : <span>never</span>}</div>
                    <div className="truncate">{STRESS_LABEL[f]}</div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function explanationNote(e: string | null | undefined): string | null {
  const p = parseExplanation(e);
  if (!p) return null;
  return `${p.delta >= 0 ? "▲" : "▼"} ${Math.abs(p.delta).toFixed(1)} pts · ${DIM_LABEL[p.dim]}`;
}

function KV({ label, value, color }: { label: string; value: React.ReactNode; color?: string }) {
  return (
    <div className="flex items-baseline justify-between gap-2">
      <Eyebrow className="truncate">{label}</Eyebrow>
      <span className="tnum font-caps text-lg font-bold leading-none" style={{ color }}>{value}</span>
    </div>
  );
}

function DualGauge({ label, value, color, hint }: { label: string; value: number; color: string; hint: string }) {
  return (
    <div className="inset p-2.5">
      <Eyebrow>{label}</Eyebrow>
      <div className="tnum font-caps mt-0.5 text-3xl font-bold leading-none" style={{ color }}><AnimatedNumber value={value} /></div>
      <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-line"><motion.div className="h-full rounded-full" style={{ background: color }} initial={{ width: 0 }} animate={{ width: `${value}%` }} transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }} /></div>
      <div className="mt-1 text-[10px] italic text-muted">{hint}</div>
    </div>
  );
}

function ProfileSkeleton() {
  return (
    <div className="flex h-full flex-col gap-3">
      <Skeleton className="h-12 w-full" />
      <div className="grid min-h-0 flex-1 grid-rows-2 gap-3"><div className="grid grid-cols-[260px_1fr_1.15fr] gap-3"><Skeleton className="h-full" /><Skeleton className="h-full" /><Skeleton className="h-full" /></div><Skeleton className="h-full" /></div>
    </div>
  );
}
