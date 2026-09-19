"use client";

import { useEffect, useMemo, useState } from "react";
import { formatCount, formatScore, formatSignedScore, monthLabel, monthLabelLong } from "@/lib/format";
import type { MonthPortfolioKpis } from "@/lib/queries";

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

/**
 * Widget "Embat · Salud financiera de la cartera": mes a mes (con play automático), score medio
 * de la cartera y quién mejora / se tuerce. `monthsData` viene precalculado de Postgres
 * (lib/queries.ts · portfolioKpisByMonth) — aquí solo se pasea el índice, sin volver a pedir nada.
 */
export function PortfolioScrubber({ monthsData, defaultMonth }: { monthsData: MonthPortfolioKpis[]; defaultMonth: string | null }) {
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

  if (!kpis) return null;

  const delta = kpis.portfolioScoreDelta6m;

  return (
    <div className="rounded-2xl border border-line bg-panel p-6 shadow-sm sm:p-8">
      <div className="mb-6 flex items-center gap-2">
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[image:var(--brand-gradient)] text-xs font-bold text-white">
          E
        </span>
        <span className="text-[13px] font-semibold uppercase tracking-wide text-ink-mute">
          Embat · Salud financiera de la cartera
        </span>
      </div>

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
  );
}
