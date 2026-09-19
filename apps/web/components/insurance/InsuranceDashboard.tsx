"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type Components = Record<"pago" | "liquidez" | "caja" | "deuda" | "concentracion", number | null>;
type Events = Record<"D1" | "D2" | "D3" | "D4" | "event" | "cure", number>;
type HistoryRow = {
  month: string;
  score: number;
  alert: number;
  explanation: string;
  components: Components;
  delta_3m: number | null;
  events: Events;
  stress_rate_6m: number;
  indicated_annual_rate: number;
  applied_annual_rate: number;
  monthly_premium: number;
};
type Company = { id: string; name: string; exposure: number; history: HistoryRow[] };
type InsuranceData = {
  meta: { observed_period: [string, string]; population: string };
  validation: {
    gini_h1: number;
    gini_h3: number;
    gini_h6: number;
    gini_new_event_h6: number;
    lead_time_median: number;
  };
  assumptions: {
    stress_to_default: number;
    loss_given_default: number;
    coverage: number;
    expenses_rate: number;
    capital_margin_rate: number;
    monthly_rate_cap: number;
    smoothing: number;
  };
  companies: Company[];
};

type Status = "review" | "watch" | "stable";
type SnapshotRow = { company: Company; row: HistoryRow };

const money = (value: number, compact = false) =>
  new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: compact ? 1 : 0,
    notation: compact ? "compact" : "standard",
  }).format(value);

const pct = (value: number, digits = 1) => `${(value * 100).toFixed(digits).replace(".", ",")}%`;
const signed = (value: number, digits = 1) => `${value > 0 ? "+" : value < 0 ? "−" : ""}${Math.abs(value).toFixed(digits).replace(".", ",")}`;
const monthLabel = (month: string) => new Intl.DateTimeFormat("es-ES", { month: "short", year: "numeric" })
  .format(new Date(`${month}-01T00:00:00`)).replace(" de ", " ");

const STATUS_LABEL: Record<Status, string> = { review: "Revisar", watch: "Vigilar", stable: "Estable" };
const EVENT_LABEL: Record<"D1" | "D2" | "D3" | "D4", string> = {
  D1: "Factura recibida vencida",
  D2: "Pago regular ausente",
  D3: "Saldo negativo recurrente",
  D4: "Pico de coste financiero",
};
const DIM_LABEL: Record<keyof Components, string> = {
  pago: "Pago",
  liquidez: "Liquidez",
  caja: "Caja",
  deuda: "Deuda",
  concentracion: "Concentración",
};

function status(row: HistoryRow): Status {
  const delta = row.delta_3m ?? 0;
  if (row.events.event || row.score < 40 || delta <= -15) return "review";
  if (row.alert || row.score < 60 || delta <= -7) return "watch";
  return "stable";
}

function newCoverage(row: HistoryRow, base: number) {
  const delta = row.delta_3m ?? 0;
  if (row.score < 40 || delta <= -15) return Math.min(base, 0.60);
  if (row.score < 55 || delta <= -8) return Math.min(base, 0.70);
  if (row.score < 70 || delta <= -4) return Math.min(base, 0.80);
  return base;
}

function atMonth(company: Company, month: string) {
  return [...company.history].reverse().find((row) => row.month <= month) ?? null;
}

function scoreTone(score: number) {
  return score >= 70 ? "text-good" : score >= 40 ? "text-warn" : "text-bad";
}

function linePath(values: number[], width: number, height: number, min: number, max: number) {
  const x = (i: number) => 12 + (i / Math.max(1, values.length - 1)) * (width - 24);
  const y = (v: number) => 10 + ((max - v) / Math.max(0.0001, max - min)) * (height - 22);
  return values.map((v, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(" ");
}

function PortfolioChart({ points }: { points: { month: string; premium: number; score: number }[] }) {
  const width = 760, height = 252;
  const premiums = points.map((p) => p.premium);
  const scores = points.map((p) => p.score);
  const pMin = Math.min(...premiums) * 0.92, pMax = Math.max(...premiums) * 1.05;
  const sMin = Math.max(0, Math.min(...scores) - 4), sMax = Math.min(100, Math.max(...scores) + 4);
  const premiumPath = linePath(premiums, width, height, pMin, pMax);
  const scorePath = linePath(scores, width, height, sMin, sMax);
  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-ink-mute">Evolución de cartera</div>
          <h2 className="mt-1 text-xl font-semibold tracking-tight text-ink">Primas simuladas y riesgo de la cartera</h2>
        </div>
        <div className="flex gap-4 text-xs text-ink-dim">
          <span className="flex items-center gap-1.5"><i className="h-0.5 w-5 bg-accent" /> Primas simuladas</span>
          <span className="flex items-center gap-1.5"><i className="h-0.5 w-5 bg-pos" /> Score</span>
        </div>
      </div>
      <svg viewBox={`0 0 ${width} ${height}`} className="h-[260px] w-full" role="img" aria-label="Evolución de prima y score">
        {[0, 1, 2, 3, 4].map((i) => <line key={i} x1="12" x2={width - 12} y1={12 + i * 55} y2={12 + i * 55} stroke="var(--color-line-soft)" />)}
        <path d={premiumPath} fill="none" stroke="var(--color-accent)" strokeWidth="3" strokeLinecap="round" />
        <path d={scorePath} fill="none" stroke="var(--color-pos)" strokeWidth="2.5" strokeLinecap="round" />
        {points.map((p, i) => i % 3 === 0 || i === points.length - 1 ? (
          <text key={p.month} x={12 + (i / Math.max(1, points.length - 1)) * (width - 24)} y={height - 1} textAnchor={i === 0 ? "start" : i === points.length - 1 ? "end" : "middle"} fontSize="10" fill="var(--color-ink-mute)">{monthLabel(p.month)}</text>
        ) : null)}
      </svg>
      <div className="mt-2 flex justify-between border-t border-line-soft pt-3 text-xs text-ink-mute">
        <span>Primas del mes: <strong className="font-mono text-ink">{money(points.at(-1)?.premium ?? 0)}</strong></span>
        <span>Score: <strong className="font-mono text-ink">{points.at(-1)?.score.toFixed(1)}</strong></span>
      </div>
    </div>
  );
}

function MiniHistory({ company, until }: { company: Company; until: string }) {
  const rows = company.history.filter((r) => r.month <= until);
  const values = rows.map((r) => r.score);
  const path = linePath(values, 520, 150, 0, 100);
  return (
    <svg viewBox="0 0 520 150" className="h-40 w-full" role="img" aria-label={`Histórico del score de ${company.name}`}>
      {[20, 40, 60, 80].map((v) => <g key={v}><line x1="12" x2="508" y1={10 + ((100 - v) / 100) * 128} y2={10 + ((100 - v) / 100) * 128} stroke="var(--color-line-soft)" /><text x="14" y={6 + ((100 - v) / 100) * 128} fontSize="9" fill="var(--color-ink-mute)">{v}</text></g>)}
      <path d={path} fill="none" stroke="var(--color-accent)" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

function Kpi({ label, value, note, tone = "text-ink" }: { label: string; value: string; note: string; tone?: string }) {
  return (
    <div className="rounded-2xl border border-line bg-panel p-5 shadow-sm">
      <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-mute">{label}</div>
      <div className={`mt-3 font-mono text-3xl font-semibold tracking-tight ${tone}`}>{value}</div>
      <div className="mt-2 text-xs text-ink-mute">{note}</div>
    </div>
  );
}

export default function InsuranceDashboard() {
  const [data, setData] = useState<InsuranceData | null>(null);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState<"all" | Status>("all");
  const [contractFilter, setContractFilter] = useState<"all" | "insured" | "available">("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [view, setView] = useState<"portfolio" | "report">("portfolio");
  const [acceptedIds, setAcceptedIds] = useState<Set<string>>(new Set());
  const [acceptanceReady, setAcceptanceReady] = useState(false);

  useEffect(() => {
    fetch("/data/insurance-portfolio.json")
      .then((r) => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
      .then((payload: InsuranceData) => {
        setData(payload);
        setSelectedId([...payload.companies].sort((a, b) => a.name.localeCompare(b.name))[0]?.id ?? null);
        const stored = window.localStorage.getItem("embat-insurance-accepted-v2");
        let initial: string[] | null = null;
        if (stored) {
          try { initial = JSON.parse(stored); } catch { initial = null; }
        }
        if (!Array.isArray(initial)) {
          initial = [...payload.companies]
            .sort((a, b) => a.name.localeCompare(b.name))
            .filter((_, index) => index % 3 !== 0)
            .map((company) => company.id);
        }
        setAcceptedIds(new Set(initial.filter((id) => payload.companies.some((company) => company.id === id))));
        setAcceptanceReady(true);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "No se pudieron cargar los datos"));
  }, []);

  useEffect(() => {
    if (acceptanceReady) window.localStorage.setItem("embat-insurance-accepted-v2", JSON.stringify([...acceptedIds]));
  }, [acceptedIds, acceptanceReady]);

  const toggleAccepted = (id: string) => setAcceptedIds((current) => {
    const next = new Set(current);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });

  const months = useMemo(() => data ? Array.from(new Set(data.companies.flatMap((c) => c.history.map((h) => h.month)))).sort() : [], [data]);
  const month = months.at(-1) ?? "";

  const snapshot = useMemo(() => {
    if (!data || !month) return null;
    const allRows: SnapshotRow[] = data.companies.map((company) => ({ company, row: atMonth(company, month) })).filter((x): x is SnapshotRow => x.row != null);
    const rows = allRows.filter((x) => acceptedIds.has(x.company.id));
    const exposure = rows.reduce((s, x) => s + x.company.exposure, 0);
    const premium = rows.reduce((s, x) => s + x.row.monthly_premium, 0);
    const weightedScore = exposure ? rows.reduce((s, x) => s + x.row.score * x.company.exposure, 0) / exposure : 0;
    const review = rows.filter((x) => status(x.row) === "review");
    const watch = rows.filter((x) => status(x.row) === "watch");
    return {
      allRows, rows, exposure, premium, weightedScore, review, watch,
      reviewExposure: review.reduce((s, x) => s + x.company.exposure, 0),
      premiumAtRisk: review.reduce((s, x) => s + x.row.monthly_premium, 0),
    };
  }, [data, month, acceptedIds]);

  const previous = useMemo(() => {
    if (!data || months.length < 2) return null;
    const previousMonth = months.at(-2)!;
    const rows = data.companies.map((company) => ({ company, row: atMonth(company, previousMonth) })).filter((x): x is SnapshotRow => x.row != null).filter((x) => acceptedIds.has(x.company.id));
    return {
      premium: rows.reduce((s, x) => s + x.row.monthly_premium, 0),
    };
  }, [data, months, acceptedIds]);

  const trajectory = useMemo(() => {
    if (!data) return [];
    return months.map((m) => {
      const rows = data.companies.map((company) => ({ company, row: atMonth(company, m) })).filter((x): x is SnapshotRow => x.row != null).filter((x) => acceptedIds.has(x.company.id));
      const exposure = rows.reduce((s, x) => s + x.company.exposure, 0);
      return {
        month: m,
        premium: rows.reduce((s, x) => s + x.row.monthly_premium, 0),
        score: exposure ? rows.reduce((s, x) => s + x.row.score * x.company.exposure, 0) / exposure : 0,
      };
    });
  }, [data, months, acceptedIds]);

  const selected = useMemo(() => data?.companies.find((c) => c.id === selectedId) ?? null, [data, selectedId]);
  const selectedRow = selected && month ? atMonth(selected, month) : null;

  if (error) return <main className="mx-auto max-w-3xl px-4 py-20"><div className="rounded-2xl border border-bad bg-bad-dim p-6 text-bad">No se pudo cargar la cartera: {error}</div></main>;
  if (!data || !snapshot) return <main className="mx-auto flex min-h-[60vh] max-w-6xl items-center justify-center px-4"><div className="font-mono text-sm text-ink-mute">Cargando cartera asegurada…</div></main>;

  const premiumDelta = previous?.premium ? snapshot.premium / previous.premium - 1 : 0;
  const previousMonth = months.at(-2);
  const pricingChanges = previousMonth ? snapshot.rows.map(({ company, row }) => {
    const prior = atMonth(company, previousMonth);
    const change = prior?.monthly_premium ? row.monthly_premium / prior.monthly_premium - 1 : 0;
    return { company, row, change };
  }).filter((item) => Math.abs(item.change) >= 0.01) : [];
  const priceIncreases = pricingChanges.filter((item) => item.change > 0).length;
  const priceDecreases = pricingChanges.filter((item) => item.change < 0).length;
  const filteredRows = snapshot.allRows
    .filter((x) => contractFilter === "all" || (contractFilter === "insured" ? acceptedIds.has(x.company.id) : !acceptedIds.has(x.company.id)))
    .filter((x) => filter === "all" || status(x.row) === filter)
    .sort((a, b) => ({ review: 0, watch: 1, stable: 2 }[status(a.row)] - ({ review: 0, watch: 1, stable: 2 }[status(b.row)]) || a.row.score - b.row.score));

  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-10">
      <section className="relative overflow-hidden rounded-3xl border border-line bg-panel px-6 py-7 shadow-sm sm:px-8">
        <div className="pointer-events-none absolute -right-20 -top-28 h-72 w-72 rounded-full bg-accent/10 blur-3xl" />
        <div className="relative">
          <div>
            <Link href="/productos" className="text-xs font-medium text-accent hover:underline">← Todos los productos</Link>
            <div className="mt-5 flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-good-dim px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-good">Simulación de producto</span>
              <span className="rounded-full border border-line px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-ink-mute">Score financiero</span>
              <span className="rounded-full border border-line px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-ink-mute">Revisión mensual</span>
              <span className="rounded-full border border-line px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-ink-mute">Actualizado / {monthLabel(month)}</span>
            </div>
            <h1 className="mt-4 max-w-5xl text-4xl font-bold tracking-tight text-ink sm:text-5xl">Revisa el riesgo y entiende cómo cambia la prima.</h1>
            <p className="mt-4 max-w-4xl text-base leading-relaxed text-ink-dim">Seguro de crédito con una prima que evoluciona con el riesgo de cada cliente. Las facturas ya admitidas conservan sus condiciones; el precio y la cobertura cambian para el siguiente periodo.</p>
          </div>
        </div>
      </section>

      <aside className="mt-5 rounded-xl border border-warn/30 bg-warn-dim p-4 text-sm text-ink-dim" aria-label="Alcance de la simulación">
        <strong className="text-ink">Demo con trayectorias de score reales.</strong> La exposición y las primas son simuladas. Marcar una póliza solo cambia esta demo y su historial se recalcula con la selección actual.
        <details className="mt-2"><summary className="cursor-pointer">Supuestos de precio</summary><p className="mt-2">Conversión de estrés a impago: {pct(data.assumptions.stress_to_default)}. Pérdida en caso de impago: {pct(data.assumptions.loss_given_default)}. Cobertura base: {pct(data.assumptions.coverage)}. Gastos: {pct(data.assumptions.expenses_rate, 2)}. Margen: {pct(data.assumptions.capital_margin_rate, 2)}. Son hipótesis de producto, no una tarifa actuarial validada.</p></details>
      </aside>
      <div className="mt-6 flex gap-2 border-b border-line-soft">
        {(["portfolio", "report"] as const).map((item) => <button key={item} onClick={() => setView(item)} className={`border-b-2 px-4 py-3 text-sm font-medium transition-colors ${view === item ? "border-accent text-ink" : "border-transparent text-ink-mute hover:text-ink"}`}>{item === "portfolio" ? "Cartera asegurada" : "Informe de prima"}</button>)}
      </div>

      {view === "portfolio" ? <>
        <section className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Kpi label="Clientes asegurados" value={`${snapshot.rows.length} / ${snapshot.allRows.length}`} note={`${pct(snapshot.rows.length / Math.max(1, snapshot.allRows.length), 0)} de adopción en la base de clientes`} />
          <Kpi label="Primas simuladas este mes" value={money(snapshot.premium)} note={`${signed(premiumDelta * 100)}% frente al mes anterior`} tone={premiumDelta > 0.01 ? "text-good" : "text-ink"} />
          <Kpi label="Volumen anualizado" value={money(snapshot.premium * 12, true)} note="Prima mensual actual × 12" tone="text-accent" />
          <Kpi label="Exposición protegida" value={money(snapshot.exposure, true)} note={`${snapshot.review.length} pólizas requieren revisión`} tone={snapshot.review.length ? "text-warn" : "text-good"} />
        </section>

        <section className="mt-6 grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1.8fr)_minmax(300px,0.8fr)]">
          <div className="rounded-2xl border border-line bg-panel p-5 shadow-sm sm:p-6"><PortfolioChart points={trajectory} /></div>
          <div className="rounded-2xl border border-line bg-panel p-5 shadow-sm sm:p-6">
            <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-ink-mute">Gestión operativa</div>
            <h2 className="mt-1 text-xl font-semibold tracking-tight text-ink">Cambios que comunicar</h2>
            <div className={`mt-5 rounded-2xl p-5 ${pricingChanges.length ? "bg-warn-dim" : "bg-good-dim"}`}>
              <div className={`font-mono text-4xl font-semibold ${pricingChanges.length ? "text-warn" : "text-good"}`}>{pricingChanges.length}</div>
              <div className="mt-1 font-semibold text-ink">pólizas cambian de precio</div>
              <p className="mt-2 text-xs leading-relaxed text-ink-dim">Variaciones de al menos un 1% frente al recibo anterior que conviene explicar al cliente.</p>
            </div>
            <div className="mt-5 divide-y divide-line-soft text-sm">
              <SignalRow label="Subidas de prima" value={priceIncreases.toString()} bad={priceIncreases > 0} />
              <SignalRow label="Bajadas de prima" value={priceDecreases.toString()} />
              <SignalRow label="Pólizas que requieren revisión" value={snapshot.review.length.toString()} bad={snapshot.review.length > 0} />
              <SignalRow label="Primas mensuales en revisión" value={money(snapshot.premiumAtRisk)} bad={snapshot.premiumAtRisk > 0} />
              <SignalRow label="Exposición que requiere revisión" value={snapshot.exposure ? pct(snapshot.reviewExposure / snapshot.exposure, 0) : "0%"} />
            </div>
          </div>
        </section>

        <section className="mt-6 overflow-hidden rounded-2xl border border-line bg-panel shadow-sm">
          <div className="flex flex-col justify-between gap-4 border-b border-line-soft p-5 sm:flex-row sm:items-center sm:px-6">
            <div><div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-ink-mute">Gestión de contratación</div><h2 className="mt-1 text-xl font-semibold tracking-tight text-ink">Base de clientes y pólizas</h2><p className="mt-1 text-xs text-ink-mute">Marca qué clientes han aceptado la póliza. El panel se recalcula de inmediato.</p></div>
            <div className="flex flex-wrap justify-end gap-2">
              <div className="flex rounded-full bg-panel-2 p-1">
                {(["all", "insured", "available"] as const).map((item) => <button key={item} onClick={() => setContractFilter(item)} className={`rounded-full px-3 py-1.5 text-[11px] font-medium ${contractFilter === item ? "bg-panel-hi text-ink shadow-sm" : "text-ink-mute"}`}>{item === "all" ? "Todos" : item === "insured" ? "Con póliza" : "Sin póliza"}</button>)}
              </div>
              <div className="flex rounded-full bg-panel-2 p-1">
                {(["all", "review", "watch", "stable"] as const).map((item) => <button key={item} onClick={() => setFilter(item)} className={`rounded-full px-3 py-1.5 text-[11px] font-medium ${filter === item ? "bg-panel-hi text-ink shadow-sm" : "text-ink-mute"}`}>{item === "all" ? "Cualquier riesgo" : STATUS_LABEL[item]}</button>)}
              </div>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-left text-sm">
              <thead className="bg-panel-2 text-[10px] uppercase tracking-[0.12em] text-ink-mute"><tr><th className="px-6 py-3">Cliente</th><th className="px-4 py-3">Póliza aceptada</th><th className="px-4 py-3">Exposición</th><th className="px-4 py-3">Score</th><th className="px-4 py-3">Señal</th><th className="px-4 py-3">Tarifa anual</th><th className="px-4 py-3">Prima / mes</th><th className="px-4 py-3">Cobertura nueva</th></tr></thead>
              <tbody className="divide-y divide-line-soft">
                {filteredRows.map(({ company, row }) => {
                  const st = status(row);
                  const insured = acceptedIds.has(company.id);
                  return <tr key={company.id} onClick={() => { setSelectedId(company.id); setView("report"); }} className={`cursor-pointer transition-colors hover:bg-panel-2 ${selectedId === company.id ? "bg-panel-2" : ""}`}>
                    <td className="px-6 py-3.5"><div className="font-medium text-ink">{company.name}</div></td>
                    <td className="px-4 py-3.5" onClick={(event) => event.stopPropagation()}><label className="inline-flex cursor-pointer items-center gap-2"><input aria-label={`${insured ? "Retirar" : "Aceptar"} póliza de ${company.name}`} type="checkbox" checked={insured} onChange={() => toggleAccepted(company.id)} className="h-4 w-4 accent-accent" /><span className={`text-xs font-medium ${insured ? "text-good" : "text-ink-mute"}`}>{insured ? "Sí" : "No"}</span></label></td>
                    <td className="px-4 py-3.5 font-mono text-xs">{money(company.exposure)}</td>
                    <td className={`px-4 py-3.5 font-mono font-semibold ${scoreTone(row.score)}`}>{row.score.toFixed(0)}</td>
                    <td className="px-4 py-3.5"><StatusPill status={st} /></td>
                    <td className="px-4 py-3.5 font-mono text-xs">{insured ? pct(row.applied_annual_rate) : <span className="text-ink-mute">Sin dato</span>}</td>
                    <td className={`px-4 py-3.5 font-mono text-xs ${insured ? "text-ink" : "text-ink-mute"}`}>{insured ? money(row.monthly_premium) : "Sin dato"}</td>
                    <td className="px-4 py-3.5 font-mono text-xs">{insured ? pct(newCoverage(row, data.assumptions.coverage), 0) : <span className="text-ink-mute">Sin dato</span>}</td>
                  </tr>;
                })}
              </tbody>
            </table>
          </div>
        </section>

      </> : <ClientReport data={data} company={selected} row={selectedRow} month={month} onSelect={setSelectedId} accepted={selected ? acceptedIds.has(selected.id) : false} onToggle={toggleAccepted} />}
    </main>
  );
}

function SignalRow({ label, value, bad = false }: { label: string; value: string; bad?: boolean }) {
  return <div className="flex items-center justify-between gap-4 py-3"><span className="text-ink-dim">{label}</span><strong className={`font-mono ${bad ? "text-bad" : "text-ink"}`}>{value}</strong></div>;
}

function StatusPill({ status: value }: { status: Status }) {
  const color = { review: "bg-bad-dim text-bad", watch: "bg-warn-dim text-warn", stable: "bg-good-dim text-good" }[value];
  return <span className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ${color}`}>{STATUS_LABEL[value]}</span>;
}

function DetailStat({ label, value }: { label: string; value: string }) {
  return <div className="rounded-xl border border-line-soft p-4"><div className="text-[10px] uppercase tracking-wide text-ink-mute">{label}</div><div className="mt-2 font-mono text-lg font-semibold text-ink">{value}</div></div>;
}

function riskBand(score: number) {
  if (score <= 29.79) return { label: "Riesgo muy alto", tone: "text-bad", bg: "bg-bad-dim" };
  if (score <= 48.23) return { label: "Riesgo alto", tone: "text-bad", bg: "bg-bad-dim" };
  if (score <= 67.61) return { label: "Riesgo medio", tone: "text-warn", bg: "bg-warn-dim" };
  if (score <= 81.16) return { label: "Riesgo moderado", tone: "text-warn", bg: "bg-warn-dim" };
  return { label: "Riesgo bajo relativo", tone: "text-good", bg: "bg-good-dim" };
}

function ClientReport({ data, company, row, month, onSelect, accepted, onToggle }: {
  data: InsuranceData;
  company: Company | null;
  row: HistoryRow | null;
  month: string;
  onSelect: (id: string) => void;
  accepted: boolean;
  onToggle: (id: string) => void;
}) {
  if (!company || !row) return <section className="mt-6 rounded-2xl border border-line bg-panel p-8 text-center text-ink-mute">Selecciona un cliente para generar su informe de prima.</section>;

  const history = company.history.filter((item) => item.month <= month);
  const previous = history.length > 1 ? history.at(-2)! : null;
  const rateChange = previous ? row.applied_annual_rate - previous.applied_annual_rate : 0;
  const premiumChange = previous ? row.monthly_premium - previous.monthly_premium : 0;
  const scoreChange = previous ? row.score - previous.score : 0;
  const band = riskBand(row.score);
  const currentStatus = status(row);
  const coverage = newCoverage(row, data.assumptions.coverage);
  const overhead = data.assumptions.expenses_rate + data.assumptions.capital_margin_rate;
  const expectedLossRate = Math.max(0, row.indicated_annual_rate - overhead);
  const dimensions = (Object.entries(row.components) as [keyof Components, number | null][])
    .sort((a, b) => Math.abs(b[1] ?? 0) - Math.abs(a[1] ?? 0));
  const maxDimension = Math.max(1, ...dimensions.map(([, value]) => Math.abs(value ?? 0)));
  const activeEvents = (["D1", "D2", "D3", "D4"] as const).filter((key) => row.events[key]);
  const movement = premiumChange > 1 ? "aumenta" : premiumChange < -1 ? "disminuye" : "se mantiene prácticamente estable";

  return <section className="mt-6 space-y-6">
    <div className="flex flex-col justify-between gap-5 rounded-2xl border border-line bg-panel p-6 shadow-sm lg:flex-row lg:items-center">
      <div>
        <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-accent">Informe explicativo de prima / {monthLabel(month)}</div>
        <h2 className="mt-2 text-3xl font-bold tracking-tight text-ink">{company.name}</h2>
        <p className="mt-1 font-mono text-xs text-ink-mute">Revisión mensual de la póliza</p>
      </div>
      <div className="w-full lg:w-[370px]">
        <label htmlFor="report-company" className="text-[10px] font-semibold uppercase tracking-wide text-ink-mute">Seleccionar cliente</label>
        <select id="report-company" value={company.id} onChange={(e) => onSelect(e.target.value)} className="mt-2 w-full rounded-xl border border-line bg-panel-2 px-4 py-3 text-sm text-ink outline-none focus:border-accent">
          {[...data.companies].sort((a, b) => a.name.localeCompare(b.name)).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
        </select>
        <button onClick={() => onToggle(company.id)} className={`mt-2 w-full rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors ${accepted ? "border border-line bg-panel-hi text-ink hover:bg-panel-2" : "bg-accent text-ground hover:opacity-90"}`}>{accepted ? "✓ Póliza aceptada / retirar de cartera" : "Añadir como póliza aceptada"}</button>
      </div>
    </div>

    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
      <Kpi label="Score" value={row.score.toFixed(1)} note={`${signed(row.delta_3m ?? 0)} puntos en 3 meses`} tone={scoreTone(row.score)} />
      <Kpi label="Banda de riesgo" value={band.label} note={`Estrés observado: ${pct(row.stress_rate_6m)}`} tone={band.tone} />
      <Kpi label="Tarifa aplicada" value={pct(row.applied_annual_rate)} note={`${rateChange >= 0 ? "+" : ""}${pct(rateChange, 2)} frente al mes anterior`} tone={rateChange > 0 ? "text-warn" : "text-ink"} />
      <Kpi label="Prima mensual" value={money(row.monthly_premium)} note={`${premiumChange >= 0 ? "+" : ""}${money(premiumChange)} en un mes`} tone={premiumChange > 0 ? "text-bad" : "text-good"} />
      <Kpi label="Cobertura futura" value={pct(coverage, 0)} note="Las facturas admitidas no cambian" tone={coverage < data.assumptions.coverage ? "text-warn" : "text-good"} />
    </div>

    <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1.05fr_0.95fr]">
      <div className="rounded-2xl border border-line bg-panel p-6 shadow-sm">
        <div className="flex items-start justify-between gap-4">
          <div><div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-ink-mute">Evidencia financiera</div><h3 className="mt-1 text-2xl font-semibold tracking-tight text-ink">Qué explica el score de {row.score.toFixed(1)}</h3></div>
          <StatusPill status={currentStatus} />
        </div>
        <div className="mt-5 rounded-xl border border-line-soft bg-panel-2 p-4">
          <div className="text-[10px] font-semibold uppercase tracking-wide text-ink-mute">Cambio detectado por el score</div>
          <p className="mt-2 text-sm leading-relaxed text-ink">{row.explanation || "El score no registra una variación material adicional durante este mes."}</p>
        </div>
        {activeEvents.length > 0 && <div className="mt-4"><div className="text-[10px] font-semibold uppercase tracking-wide text-ink-mute">Señales activas</div><div className="mt-2 flex flex-wrap gap-2">{activeEvents.map((key) => <span key={key} className="rounded-full bg-bad-dim px-3 py-1.5 text-xs font-medium text-bad">{EVENT_LABEL[key]}</span>)}</div></div>}
        <div className="mt-6 space-y-4">
          {dimensions.map(([key, value]) => {
            const numeric = value ?? 0;
            const positive = numeric > 0;
            const neutral = Math.abs(numeric) < 0.01;
            return <div key={key}>
              <div className="mb-1.5 flex items-center justify-between gap-4 text-sm"><span className="font-medium text-ink">{DIM_LABEL[key]}</span><span className={`font-mono text-xs ${neutral ? "text-ink-mute" : positive ? "text-good" : "text-bad"}`}>{value == null ? "Sin dato" : `${signed(numeric, 2)} pts`}</span></div>
              <div className="h-2 overflow-hidden rounded-full bg-line-soft"><div className={`h-full rounded-full ${neutral ? "bg-line" : positive ? "bg-good" : "bg-bad"}`} style={{ width: `${Math.max(neutral ? 3 : 7, Math.abs(numeric) / maxDimension * 100)}%` }} /></div>
              <p className="mt-1 text-[11px] text-ink-mute">{value == null ? "No existe evidencia suficiente para esta dimensión." : neutral ? "No modifica de forma material el score este mes." : positive ? "Refuerza la salud financiera observada." : "Reduce el score y aumenta la atención requerida."}</p>
            </div>;
          })}
        </div>
      </div>

      <div className="space-y-5">
        <div className="rounded-2xl border border-line bg-panel p-6 shadow-sm">
          <div className="flex items-center justify-between"><div><div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-ink-mute">Trayectoria</div><h3 className="mt-1 text-xl font-semibold tracking-tight text-ink">El cambio no se evalúa de forma aislada</h3></div><strong className={`font-mono text-2xl ${scoreTone(row.score)}`}>{row.score.toFixed(1)}</strong></div>
          <div className="mt-3 rounded-xl bg-panel-2 p-3"><MiniHistory company={company} until={month} /></div>
          <div className="mt-3 grid grid-cols-3 divide-x divide-line-soft text-center">
            <div><div className="font-mono text-lg text-ink">{signed(scoreChange)}</div><div className="text-[10px] text-ink-mute">score en 1 mes</div></div>
            <div><div className="font-mono text-lg text-ink">{signed(row.delta_3m ?? 0)}</div><div className="text-[10px] text-ink-mute">score en 3 meses</div></div>
            <div><div className="font-mono text-lg text-ink">{history.length}</div><div className="text-[10px] text-ink-mute">meses observados</div></div>
          </div>
        </div>
        <div className={`rounded-2xl p-6 ${band.bg}`}>
          <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-ink-mute">Lectura de riesgo</div>
          <h3 className={`mt-2 text-2xl font-semibold ${band.tone}`}>{band.label}</h3>
          <p className="mt-3 text-sm leading-relaxed text-ink-dim">Empresas con un score comparable registraron eventos de estrés a seis meses en el <strong className="text-ink">{pct(row.stress_rate_6m)}</strong> de las observaciones de validación. Esta cifra sirve para ordenar el riesgo y definir el precio; no se presenta como probabilidad literal de impago.</p>
        </div>
      </div>
    </div>

    <div className="rounded-2xl border border-line bg-panel p-6 shadow-sm">
      <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-ink-mute">Trazabilidad del precio</div>
      <h3 className="mt-1 text-2xl font-semibold tracking-tight text-ink">Por qué la prima es {money(row.monthly_premium)} este mes</h3>
      <div className="mt-6 grid grid-cols-1 gap-3 lg:grid-cols-4">
        <PriceStep n="1" title="Riesgo observado" value={`${row.score.toFixed(1)} / ${band.label}`} text={`El score sitúa al cliente en una banda con ${pct(row.stress_rate_6m)} de eventos de estrés observados.`} />
        <PriceStep n="2" title="Coste esperado del riesgo" value={pct(expectedLossRate)} text={`La política aseguradora convierte la banda en un coste esperado, considerando impago, recuperaciones y ${pct(data.assumptions.coverage, 0)} de cobertura.`} />
        <PriceStep n="3" title="Tarifa indicada" value={pct(row.indicated_annual_rate)} text={`Incluye el coste esperado y ${pct(overhead, 2)} para operación y capital de la cobertura.`} />
        <PriceStep n="4" title="Tarifa aplicada" value={pct(row.applied_annual_rate)} text={`El ajuste se incorpora gradualmente para evitar que un único mes produzca un salto injustificado.`} />
      </div>
      <div className="mt-5 grid grid-cols-1 gap-4 rounded-xl bg-panel-2 p-5 md:grid-cols-3">
        <DetailStat label="Exposición asegurada" value={money(company.exposure)} />
        <DetailStat label="Coste anual aplicado" value={money(company.exposure * row.applied_annual_rate)} />
        <DetailStat label="Prima mensual resultante" value={money(row.monthly_premium)} />
      </div>
    </div>

    <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1.3fr_0.7fr]">
      <div className="rounded-2xl border border-accent/30 bg-panel p-6 shadow-sm">
        <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-accent">Explicación para el cliente</div>
        <h3 className="mt-2 text-xl font-semibold tracking-tight text-ink">Mensaje que Embat puede mostrar junto al recibo</h3>
        <p className="mt-4 border-l-2 border-accent pl-4 text-base leading-relaxed text-ink-dim">En {monthLabel(month)}, el score de salud financiera de {company.name} es <strong className="text-ink">{row.score.toFixed(1)}</strong> y se sitúa en la banda <strong className={band.tone}>{band.label.toLowerCase()}</strong>. {row.explanation ? `${row.explanation.charAt(0).toUpperCase()}${row.explanation.slice(1)}.` : "No se ha detectado un cambio financiero material adicional."} Como consecuencia, la prima mensual {movement} hasta <strong className="text-ink">{money(row.monthly_premium)}</strong> para una exposición de <strong className="text-ink">{money(company.exposure)}</strong>. Las facturas ya admitidas mantienen su cobertura.</p>
        <div className="mt-5 flex flex-wrap gap-2"><span className="rounded-full border border-line px-3 py-1.5 text-xs text-ink-dim">Variación mensual: {premiumChange >= 0 ? "+" : ""}{money(premiumChange)}</span><span className="rounded-full border border-line px-3 py-1.5 text-xs text-ink-dim">Cobertura nueva: {pct(coverage, 0)}</span><span className="rounded-full border border-line px-3 py-1.5 text-xs text-ink-dim">Estado: {STATUS_LABEL[currentStatus]}</span></div>
      </div>
      <div className="rounded-2xl border border-line bg-panel p-6 shadow-sm">
        <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-ink-mute">Garantías de transparencia</div>
        <ul className="mt-4 space-y-3 text-sm leading-relaxed text-ink-dim">
          <li className="flex gap-2"><span className="text-good">✓</span><span>La póliza identifica las señales concretas que explican el score.</span></li>
          <li className="flex gap-2"><span className="text-good">✓</span><span>El precio separa la evidencia del score y la política aseguradora.</span></li>
          <li className="flex gap-2"><span className="text-good">✓</span><span>Los cambios se aplican al periodo futuro y quedan registrados.</span></li>
          <li className="flex gap-2"><span className="text-good">✓</span><span>Los casos sensibles pasan por revisión humana.</span></li>
        </ul>
        <p className="mt-5 border-t border-line-soft pt-4 text-[11px] leading-relaxed text-ink-mute">La conversión de estrés a impago y la severidad son parámetros de demostración hasta disponer de siniestros y recuperaciones reales. Se muestran aquí para que Embat pueda distinguir una observación del modelo de una decisión de producto.</p>
      </div>
    </div>
  </section>;
}

function PriceStep({ n, title, value, text }: { n: string; title: string; value: string; text: string }) {
  return <div className="relative rounded-xl border border-line-soft p-4"><div className="flex items-center justify-between gap-3"><span className="flex h-6 w-6 items-center justify-center rounded-full bg-accent text-[10px] font-semibold text-white">{n}</span><strong className="font-mono text-lg text-ink">{value}</strong></div><h4 className="mt-4 text-sm font-semibold text-ink">{title}</h4><p className="mt-2 text-xs leading-relaxed text-ink-mute">{text}</p></div>;
}
