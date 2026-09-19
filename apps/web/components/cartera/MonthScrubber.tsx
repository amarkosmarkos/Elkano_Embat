"use client";

import { monthLabelLong } from "@/lib/format";

/** Barra de scrubber de mes, común a las páginas de Cartera (mapa, movimientos, bandeja). */
export default function MonthScrubber({
  months,
  idx,
  playing,
  onScrub,
  onTogglePlay,
  note,
  hidePlay,
}: {
  months: string[];
  idx: number;
  playing: boolean;
  onScrub: (idx: number) => void;
  onTogglePlay: () => void;
  note?: string;
  hidePlay?: boolean;
}) {
  return (
    <div className="card-hi flex flex-wrap items-center gap-4 px-5 py-4">
      {!hidePlay && (
        <button
          type="button"
          onClick={onTogglePlay}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-ink text-panel  transition-transform hover:scale-105"
          aria-label={playing ? "Pausar" : "Reproducir"}
        >
          {playing ? (
            <svg viewBox="0 0 14 14" width={13} height={13}><rect x="2" y="1.5" width="3.4" height="11" fill="currentColor" /><rect x="8.6" y="1.5" width="3.4" height="11" fill="currentColor" /></svg>
          ) : (
            <svg viewBox="0 0 14 14" width={13} height={13} className="translate-x-px"><path d="M2.5 1.5L12 7L2.5 12.5V1.5Z" fill="currentColor" /></svg>
          )}
        </button>
      )}
      <input
        type="range" min={0} max={months.length - 1} step={1} value={idx}
        onChange={(e) => onScrub(Number(e.target.value))}
        className="scrub min-w-0 flex-1" style={{ ["--p" as string]: `${(100 * idx) / (months.length - 1)}%` }}
        aria-label="Mes"
      />
      <div className="w-[190px] text-right">
        <div className="text-[18px] font-semibold leading-none text-ink">{monthLabelLong(months[idx])}</div>
        {note && <div className="mt-1 text-[11px] text-ink-mute">{note}</div>}
      </div>
    </div>
  );
}
