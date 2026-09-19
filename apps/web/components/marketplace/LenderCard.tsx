"use client";

import Link from "next/link";
import { Sparkline } from "@/components/ui/Sparkline";
import { Pill } from "@/components/ui/Pill";
import { scoreColor } from "@/lib/score/colors";
import type { Assessed } from "@/lib/products/marketplace/assess";
import { TrendPill } from "./ui";

const PRIORITY = ["Score", "Runway", "La liquidez", "Nunca", "Momentum", "Paga", "Cero", "Sin alarmas", "meses de historia"];
const prioritise = (rs: string[]) => [...rs].sort((a, b) => { const r = (x: string) => { const i = PRIORITY.findIndex((k) => x.startsWith(k)); return i < 0 ? 99 : i; }; return r(a) - r(b); });

/** Tarjeta de prestamista: quién está en posición de prestar, de un vistazo. */
export function LenderCard({ a, selected, onLend }: { a: Assessed; selected: boolean; onLend: () => void }) {
  const { c } = a;
  const color = scoreColor(c.latest.score);
  const q = a.provider.qualified;
  return (
    <div className={`card flex h-full flex-col p-4 ${selected ? "ring-1 ring-ink/60" : ""}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <Link href={`/empresas/${c.id}`} className="block truncate text-[15px] font-semibold text-ink hover:underline">{c.name}</Link>
          <div className="num text-[11px] text-ink-mute">{c.id}{c.country ? ` · ${c.country}` : ""}{c.groupSize && c.groupSize > 1 ? ` · grupo de ${c.groupSize}` : ""}</div>
        </div>
        <div className="shrink-0 text-right">
          <div className="num text-[32px] font-semibold leading-none" style={{ color }}>{c.latest.score.toFixed(0)}</div>
          {a.momentum != null && <div className={`num text-[11px] ${a.momentum >= 0 ? "text-good" : "text-bad"}`}>{a.momentum > 0 ? "+" : ""}{a.momentum.toFixed(1)} / 3m</div>}
        </div>
      </div>
      <div className="mt-2 flex items-center justify-between gap-2"><TrendPill trend={a.trend} /><Sparkline values={c.scores} color={color} width={72} height={24} min={0} max={100} /></div>
      <ul className="mt-3 space-y-1 text-[12.5px] text-ink-dim">
        {(q ? prioritise(a.provider.reasons) : a.provider.blockers).slice(0, 4).map((r) => <li key={r} className="flex items-start gap-1.5"><span className={`mt-[6px] h-1.5 w-1.5 shrink-0 rounded-full ${q ? "bg-good" : "bg-bad"}`} /><span className="truncate">{r}</span></li>)}
      </ul>
      <div className="mt-auto flex items-center justify-between gap-2 border-t border-line-soft pt-3">
        <div className="flex min-w-0 flex-1 items-center gap-2 text-[12px] text-ink-mute">Capacidad<div className="h-1.5 min-w-[20px] flex-1 overflow-hidden rounded-full bg-panel-2"><div className="h-full rounded-full bg-ink" style={{ width: `${a.provider.capacity}%` }} /></div><span className="num text-ink">{a.provider.capacity}</span></div>
        {selected ? <Pill tone="accent">Presta</Pill> : q ? <button type="button" onClick={onLend} className="h-7 rounded-lg bg-ink px-3 text-[12px] font-medium text-panel hover:bg-ink/90">Prestar</button> : <Pill>No cualifica</Pill>}
      </div>
    </div>
  );
}
