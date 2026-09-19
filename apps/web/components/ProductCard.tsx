import Link from "next/link";
import type { Recommendation } from "@/lib/recommend";

const FIT_COLOR = (fit: number) => (fit >= 70 ? "text-good border-good" : fit >= 45 ? "text-warn border-warn" : "text-ink-mute border-line");

/** Tarjeta de producto recomendado para una empresa concreta — usa la razón que da el motor de reglas. */
export function RecommendationCard({ r }: { r: Recommendation }) {
  return (
    <div className="flex flex-col gap-2 rounded-sm border border-line bg-panel p-5">
      <div className="flex items-center justify-between gap-3">
        <h4 className="font-display text-lg font-bold">{r.title}</h4>
        <span className={`rounded-full border px-2 py-0.5 font-mono text-[10px] ${FIT_COLOR(r.fit)}`}>encaje {r.fit}</span>
      </div>
      <p className="text-sm text-ink-dim">{r.reason}</p>
      {r.detail && <p className="font-mono text-xs text-accent">{r.detail}</p>}
    </div>
  );
}

export function ProductSummaryCard({
  num,
  title,
  desc,
  statValue,
  statLabel,
  href,
}: {
  num: string;
  title: string;
  desc: string;
  statValue: string;
  statLabel: string;
  href: string;
}) {
  return (
    <Link href={href} className="group flex flex-col gap-3 rounded-sm border border-line bg-panel p-6 transition-colors hover:border-accent">
      <div className="font-mono text-[11px] tracking-wide text-accent">{num}</div>
      <h3 className="font-display text-xl font-bold group-hover:underline">{title}</h3>
      <p className="text-sm text-ink-dim">{desc}</p>
      <div className="mt-auto border-t border-dashed border-line pt-3">
        <div className="font-mono text-xl font-semibold text-accent">{statValue}</div>
        <div className="text-[11px] text-ink-mute">{statLabel}</div>
      </div>
    </Link>
  );
}
