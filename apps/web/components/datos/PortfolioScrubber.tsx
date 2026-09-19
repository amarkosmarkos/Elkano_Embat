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

/** Hash determinista (FNV-1a) de un id a [0,1) — cada empresa se queda siempre en el mismo "carril"
 * vertical del gráfico, así solo se mueve en horizontal (su score) al cambiar de mes. */
function hashToUnit(id: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < id.length; i++) {
    h ^= id.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return ((h >>> 0) % 100000) / 100000;
}

/**
 * Dispersión animada: un punto por empresa (score en X, régimen en color), un carril vertical fijo
 * por empresa para que el ojo pueda seguir "esta empresa se mueve a la derecha" mes a mes. Se anima
 * por transform/CSS al cambiar `monthIndex` (scrubber o play) — sin volver a pedir nada a Postgres,
 * `series` ya trae los 9 meses de las ~1.280 empresas de una vez.
 */
function CompanyScatter({ series, monthIndex }: { series: CompanyScoreSeries[]; monthIndex: number }) {
  const W = 760;
  const H = 220;
  const padL = 22;
  const padR = 16;
  const padT = 14;
  const padB = 28;
  const x = (score: number) => padL + (score / 100) * (W - padL - padR);

  const lanes = useMemo(() => new Map(series.map((s) => [s.companyId, hashToUnit(s.companyId)])), [series]);

  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Score de cada empresa, mes a mes">
        {[0, 40, 70, 100].map((v) => (
          <line key={v} x1={x(v)} x2={x(v)} y1={padT} y2={H - padB} stroke="var(--color-line-soft)" strokeWidth={1} />
        ))}
        {[0, 40, 70, 100].map((v) => (
          <text key={v} x={x(v)} y={H - padB + 16} textAnchor="middle" fontFamily="var(--font-mono)" fontSize={9.5} fill="var(--color-ink-mute)">
            {v}
          </text>
        ))}
        {series.map((s) => {
          const lane = lanes.get(s.companyId)!;
          const y = padT + lane * (H - padT - padB);
          const current = s.points[monthIndex];
          // si a esta empresa le falta el dato de este mes (entra/sale del dataset), se queda en su
          // última posición conocida y se desvanece, en vez de saltar a 0 o desaparecer de golpe
          let point = current;
          if (!point) {
            for (let i = monthIndex - 1; i >= 0 && !point; i--) point = s.points[i];
            for (let i = monthIndex + 1; i < s.points.length && !point; i++) point = s.points[i];
          }
          if (!point) return null;
          const color = REGIME_COLOR[point.regime ?? "s"];
          return (
            <g
              key={s.companyId}
              style={{ transform: `translate(${x(point.score)}px, ${y}px)`, transition: "transform 650ms cubic-bezier(.4,0,.2,1), opacity 300ms" }}
              opacity={current ? 0.75 : 0}
            >
              <circle r={7} fill="transparent" />
              <circle r={2.6} fill={color} />
              <title>
                {s.displayName} · {point.score} / 100 · {REGIME_LABEL[point.regime ?? "s"]}
              </title>
            </g>
          );
        })}
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
        <CompanyScatter series={series} monthIndex={monthIndex} />
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
