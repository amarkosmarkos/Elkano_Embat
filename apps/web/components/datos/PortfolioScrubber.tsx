"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { formatCount, formatScore, formatSignedScore, monthLabel, monthLabelLong } from "@/lib/format";
import type { CompanyScoreSeries, MonthPortfolioKpis, RegimeCode } from "@/lib/queries";

const PLAY_INTERVAL_MS = 900;

type Tone = "neutral" | "good" | "bad";
type IconName = "gauge" | "history" | "trendUp" | "trendDown" | "alert";

const TONE_TEXT: Record<Tone, string> = { neutral: "text-ink", good: "text-good", bad: "text-bad" };
const TONE_BADGE: Record<Tone, string> = { neutral: "bg-accent/12 text-accent", good: "bg-good-dim text-good", bad: "bg-bad-dim text-bad" };

function Arrow({ direction, className }: { direction: "up" | "down"; className?: string }) {
  const d = direction === "up" ? "M3 11L11 3M11 3H5M11 3V9" : "M3 3L11 11M11 11H5M11 11V5";
  return (
    <svg viewBox="0 0 14 14" width={12} height={12} className={`shrink-0 ${className ?? ""}`} aria-hidden="true">
      <path d={d} fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

const ICON_PATHS: Record<IconName, string> = {
  gauge: "M12 15l3.5-3.5 M20.3 18c.4-1 .7-2.2.7-3.4C21 9.8 17 6 12 6s-9 3.8-9 8.6c0 1.2.3 2.4.7 3.4",
  history: "M3 12a9 9 0 1 0 2.6-6.34M3 3v5h5 M12 7v5l4 2",
  trendUp: "M2 17l6.5-6.5 5 5L22 7 M16 7h6v6",
  trendDown: "M2 7l6.5 6.5 5-5L22 17 M16 17h6v-6",
  alert: "M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z M12 9v4 M12 17h.01",
};

function Icon({ name, className }: { name: IconName; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" width={17} height={17} fill="none" className={className} aria-hidden="true">
      <path d={ICON_PATHS[name]} stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function Kpi({
  label,
  value,
  icon,
  tone = "neutral",
  arrow,
}: {
  label: string;
  value: string;
  icon: IconName;
  tone?: Tone;
  arrow?: "up" | "down";
}) {
  return (
    <div className="rounded-2xl border border-line-soft bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center gap-2.5">
        <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${TONE_BADGE[tone]}`}>
          <Icon name={icon} />
        </span>
        <span className="text-[12px] font-medium leading-tight text-ink-mute">{label}</span>
      </div>
      <div className="flex items-baseline gap-1">
        <span className={`font-mono text-2xl font-semibold ${TONE_TEXT[tone]}`}>{value}</span>
        {arrow && <Arrow direction={arrow} className={arrow === "up" ? "text-good" : "text-bad"} />}
      </div>
    </div>
  );
}

const REGIME_COLOR: Record<RegimeCode, string> = {
  i: "var(--color-good)",
  s: "var(--color-ink-mute)",
  d: "var(--color-bad)",
  p: "var(--color-warn)",
};
const REGIME_LABEL: Record<RegimeCode, string> = {
  i: "Mejorando",
  s: "Estable",
  d: "Deteriorando",
  p: "Bache puntual",
};

/** Hash determinista (FNV-1a) de un id a [0,1) — solo para las empresas que este mes no tienen dato
 * propio (entran/salen del dataset): se les da un carril estable para que su punto desvanecido
 * ("fade out") no salte de sitio en vez de participar en el apilado por densidad. */
function hashToUnit(id: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < id.length; i++) {
    h ^= id.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return ((h >>> 0) % 100000) / 100000;
}

/** Slot 0 → centro; slots impares suben, pares bajan, cada vez más lejos del centro
 * (0, +1, -1, +2, -2, …) — así los puntos que comparten score se apilan en abanico y la nube
 * entera dibuja la silueta de la distribución en vez de una fila plana. */
function beeswarmOffset(slot: number): number {
  if (slot === 0) return 0;
  const k = Math.ceil(slot / 2);
  return slot % 2 === 1 ? k : -k;
}

/**
 * Beeswarm animado: un punto por empresa, posicionado en X por su score y apilado en Y según cuántas
 * empresas más comparten ese mismo score este mes — así la propia nube de puntos es la distribución
 * de la cartera (dónde se concentra, si hay dos modas, si se desplaza a la derecha con el tiempo),
 * no solo un enjambre de puntos sueltos. Se recalcula el apilado en cada `monthIndex` y se anima por
 * transform/CSS (scrubber o play) — sin volver a pedir nada a Postgres, `series` ya trae los 9 meses
 * de las ~1.280 empresas de una vez.
 */
function CompanyScatter({
  series,
  monthIndex,
  meanScore,
}: {
  series: CompanyScoreSeries[];
  monthIndex: number;
  meanScore?: number;
}) {
  const W = 760;
  const H = 280;
  const padL = 22;
  const padR = 16;
  const padT = 14;
  const padB = 28;
  const centerY = padT + (H - padT - padB) / 2;
  const dotR = 2.2;
  const spacing = 5.4;
  const binWidth = 5;
  const x = (score: number) => padL + (score / 100) * (W - padL - padR);

  const fallbackLanes = useMemo(() => new Map(series.map((s) => [s.companyId, hashToUnit(s.companyId)])), [series]);

  const dots = useMemo(() => {
    const live: { companyId: string; displayName: string; score: number; regime: RegimeCode }[] = [];
    const faded: { companyId: string; displayName: string; score: number; regime: RegimeCode }[] = [];

    for (const s of series) {
      const current = s.points[monthIndex];
      if (current) {
        live.push({ companyId: s.companyId, displayName: s.displayName, score: current.score, regime: current.regime ?? "s" });
        continue;
      }
      // sin dato este mes (entra/sale del dataset): se queda en su última posición conocida y se desvanece
      let point = undefined as (typeof s.points)[number] | undefined;
      for (let i = monthIndex - 1; i >= 0 && !point; i--) point = s.points[i];
      for (let i = monthIndex + 1; i < s.points.length && !point; i++) point = s.points[i];
      if (point) faded.push({ companyId: s.companyId, displayName: s.displayName, score: point.score, regime: point.regime ?? "s" });
    }

    // ordenar por score para que el apilado por bin salga limpio (izquierda→derecha, abanico simétrico)
    live.sort((a, b) => a.score - b.score || a.companyId.localeCompare(b.companyId));
    const slotByBin = new Map<number, number>();
    const positioned = live.map((d) => {
      const bin = Math.round((x(d.score) - padL) / binWidth);
      const slot = slotByBin.get(bin) ?? 0;
      slotByBin.set(bin, slot + 1);
      const rawY = centerY + beeswarmOffset(slot) * spacing;
      const y = Math.min(H - padB - dotR, Math.max(padT + dotR, rawY));
      return { ...d, x: x(d.score), y, opacity: 0.75 };
    });

    const positionedFaded = faded.map((d) => ({
      ...d,
      x: x(d.score),
      y: padT + fallbackLanes.get(d.companyId)! * (H - padT - padB),
      opacity: 0,
    }));

    return [...positioned, ...positionedFaded];
  }, [series, monthIndex, fallbackLanes]);

  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Distribución de score de cada empresa, mes a mes">
        {[0, 40, 70, 100].map((v) => (
          <line key={v} x1={x(v)} x2={x(v)} y1={padT} y2={H - padB} stroke="var(--color-line-soft)" strokeWidth={1} />
        ))}
        {[0, 40, 70, 100].map((v) => (
          <text key={v} x={x(v)} y={H - padB + 16} textAnchor="middle" fontFamily="var(--font-mono)" fontSize={9.5} fill="var(--color-ink-mute)">
            {v}
          </text>
        ))}
        {meanScore != null && (
          <g style={{ transform: `translateX(${x(meanScore)}px)`, transition: "transform 650ms cubic-bezier(.4,0,.2,1)" }}>
            <line x1={0} x2={0} y1={padT} y2={H - padB} stroke="var(--color-accent)" strokeWidth={1} strokeDasharray="3 3" opacity={0.6} />
            <text x={4} y={padT + 8} fontFamily="var(--font-mono)" fontSize={9.5} fill="var(--color-accent)">
              media
            </text>
          </g>
        )}
        {dots.map((d) => (
          <g
            key={d.companyId}
            style={{ transform: `translate(${d.x}px, ${d.y}px)`, transition: "transform 650ms cubic-bezier(.4,0,.2,1), opacity 300ms" }}
            opacity={d.opacity}
          >
            <circle r={6} fill="transparent" />
            <circle r={dotR} fill={REGIME_COLOR[d.regime]} />
            <title>{`${d.displayName} · ${d.score} / 100 · ${REGIME_LABEL[d.regime]}`}</title>
          </g>
        ))}
      </svg>
      <div className="mt-1 flex flex-wrap gap-x-5 gap-y-1.5 text-[11px] text-ink-mute">
        {(["i", "s", "d", "p"] as const).map((code) => (
          <span key={code} className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full" style={{ background: REGIME_COLOR[code] }} />
            {REGIME_LABEL[code]}
          </span>
        ))}
      </div>
    </div>
  );
}

type Mover = { companyId: string; displayName: string; score: number; delta: number };

/** Top N que más suben / más caen entre `monthIndex - 1` y `monthIndex`, a partir de la misma
 * `series` que ya trae el gráfico — nada de ir a Postgres otra vez por cada mes del scrubber. */
function computeMovers(series: CompanyScoreSeries[], monthIndex: number, n = 6): { risers: Mover[]; fallers: Mover[] } {
  if (monthIndex === 0) return { risers: [], fallers: [] };
  const deltas: Mover[] = [];
  for (const s of series) {
    const cur = s.points[monthIndex];
    const prev = s.points[monthIndex - 1];
    if (!cur || !prev) continue;
    deltas.push({ companyId: s.companyId, displayName: s.displayName, score: cur.score, delta: cur.score - prev.score });
  }
  const risers = [...deltas].sort((a, b) => b.delta - a.delta).slice(0, n);
  const fallers = [...deltas].sort((a, b) => a.delta - b.delta).slice(0, n);
  return { risers, fallers };
}

function MoverList({ title, tone, items }: { title: string; tone: "good" | "bad"; items: Mover[] }) {
  return (
    <div className="rounded-2xl border border-line-soft bg-white p-4 shadow-sm">
      <div className={`mb-2 text-sm font-semibold ${tone === "good" ? "text-good" : "text-bad"}`}>{title}</div>
      {items.length === 0 ? (
        <p className="text-xs text-ink-mute">Sin datos suficientes para comparar.</p>
      ) : (
        <div className="flex flex-col divide-y divide-line-soft">
          {items.map((it) => (
            <Link
              key={it.companyId}
              href={`/empresas/${it.companyId}`}
              className="-mx-1 flex items-center justify-between gap-3 rounded-md px-1 py-2 text-sm transition-colors hover:bg-panel-2"
            >
              <span className="truncate text-ink">{it.displayName}</span>
              <span className="flex shrink-0 items-center gap-2 font-mono text-xs">
                <span className="text-ink-mute">{it.score}</span>
                <span className={tone === "good" ? "text-good" : "text-bad"}>
                  {it.delta >= 0 ? "+" : ""}
                  {it.delta}
                </span>
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * Widget "Embat · Salud financiera de la cartera": mes a mes (con play automático), score medio
 * de la cartera y quién mejora / se tuerce. `monthsData` viene precalculado de Postgres
 * (lib/queries.ts · portfolioKpisByMonth) — aquí solo se pasea el índice, sin volver a pedir nada.
 */
export function PortfolioScrubber({
  monthsData,
  defaultMonth,
  series,
}: {
  monthsData: MonthPortfolioKpis[];
  defaultMonth: string | null;
  series: CompanyScoreSeries[];
}) {
  const months = useMemo(() => monthsData.map((m) => m.month), [monthsData]);
  const initialIndex = Math.max(0, defaultMonth ? months.indexOf(defaultMonth) : months.length - 1);
  const [monthIndex, setMonthIndex] = useState(initialIndex === -1 ? months.length - 1 : initialIndex);
  const [isPlaying, setIsPlaying] = useState(false);

  const kpis = monthsData[monthIndex];

  useEffect(() => {
    if (!isPlaying) return;
    const id = setInterval(() => {
      setMonthIndex((i) => {
        if (i >= months.length - 1) {
          setIsPlaying(false);
          return i;
        }
        return i + 1;
      });
    }, PLAY_INTERVAL_MS);
    return () => clearInterval(id);
  }, [isPlaying, months.length]);

  function togglePlay() {
    setIsPlaying((playing) => {
      if (!playing && monthIndex >= months.length - 1) setMonthIndex(0);
      return !playing;
    });
  }

  const movers = useMemo(() => computeMovers(series, monthIndex), [series, monthIndex]);

  if (!kpis) return null;

  const delta = kpis.portfolioScoreDelta6m;

  return (
    <div className="flex flex-col gap-6">
      <div className="rounded-2xl border border-line bg-panel p-6 shadow-sm sm:p-8">
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center gap-4">
            <button
              type="button"
              onClick={togglePlay}
              aria-label={isPlaying ? "Pausar" : "Reproducir"}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[image:var(--brand-gradient)] text-white shadow-sm transition-opacity hover:opacity-90"
            >
              {isPlaying ? (
                <svg viewBox="0 0 14 14" width={13} height={13} aria-hidden="true">
                  <rect x="2" y="1.5" width="3.4" height="11" fill="currentColor" />
                  <rect x="8.6" y="1.5" width="3.4" height="11" fill="currentColor" />
                </svg>
              ) : (
                <svg viewBox="0 0 14 14" width={13} height={13} className="translate-x-px" aria-hidden="true">
                  <path d="M2.5 1.5L12 7L2.5 12.5V1.5Z" fill="currentColor" />
                </svg>
              )}
            </button>

            <input
              type="range"
              min={0}
              max={months.length - 1}
              step={1}
              value={monthIndex}
              onChange={(e) => {
                setIsPlaying(false);
                setMonthIndex(Number(e.target.value));
              }}
              className="h-1.5 min-w-0 flex-1 accent-accent"
              aria-label="Mes"
              aria-valuetext={monthLabelLong(kpis.month)}
            />

            <span className="shrink-0 text-[13px] text-ink-mute">
              Mostrando <span className="font-medium text-ink">{monthLabelLong(kpis.month)}</span>
            </span>
          </div>

          <p className="text-xl font-semibold leading-snug tracking-tight text-ink sm:text-2xl">
            {formatCount(kpis.deterioratingCompanies)} empresas se tuercen y {formatCount(kpis.improvingCompanies)}{" "}
            mejoran en {monthLabel(kpis.month)}
          </p>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          <Kpi
            label="Score medio"
            value={formatScore(kpis.portfolioScore)}
            icon="gauge"
            arrow={delta === null ? undefined : delta >= 0 ? "up" : "down"}
          />
          <Kpi
            label="Cambio 6 meses"
            value={delta === null ? "—" : formatSignedScore(delta)}
            icon="history"
            tone={delta === null ? "neutral" : delta >= 0 ? "good" : "bad"}
            arrow={delta === null ? undefined : delta >= 0 ? "up" : "down"}
          />
          <Kpi label="Mejorando" value={formatCount(kpis.improvingCompanies)} icon="trendUp" tone="good" />
          <Kpi label="Deteriorando" value={formatCount(kpis.deterioratingCompanies)} icon="trendDown" tone="bad" />
          <Kpi label="Alertas nuevas" value={formatCount(kpis.newAlerts)} icon="alert" tone="bad" />
        </div>
      </div>

      <div className="rounded-2xl border border-line bg-panel p-6 shadow-sm sm:p-8">
        <div className="mb-3 text-[13px] font-semibold uppercase tracking-wide text-ink-mute">
          Cómo se mueve la cartera · {formatCount(series.length)} empresas
        </div>
        <CompanyScatter series={series} monthIndex={monthIndex} meanScore={kpis.portfolioScore} />
      </div>

      <div className="rounded-2xl border border-line bg-panel p-6 shadow-sm sm:p-8">
        <div className="mb-3 text-[13px] font-semibold uppercase tracking-wide text-ink-mute">
          Quién se mueve{monthIndex > 0 ? ` · ${monthLabel(kpis.month)} vs ${monthLabel(months[monthIndex - 1])}` : ""}
        </div>
        {monthIndex === 0 ? (
          <p className="text-sm text-ink-mute">Elige un mes con anterior para comparar (desliza el scrubber de arriba).</p>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <MoverList title="Más suben" tone="good" items={movers.risers} />
            <MoverList title="Más caen" tone="bad" items={movers.fallers} />
          </div>
        )}
      </div>
    </div>
  );
}
